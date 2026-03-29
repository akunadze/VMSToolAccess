import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import ws from 'ws';
import {Tool, User, Response, PortalUser} from "./data"
import * as data from "./data";
import path from "path";
import https from "https";
import http from "http";
import fs from "fs";
import bcrypt from "bcrypt";
import * as config from "./config";

const app = express();

app.use(cookieParser());
app.use(session({secret: config.SESSION_SECRET, saveUninitialized: false, resave: true}));

// Uncomment to see full request/response bodies in the log
// import morganBody from 'morgan-body';
// morganBody(app)

data.initData();

interface LastSeen {
  toolMac: string;
  timestamp: number;
  updated: boolean;
  offline: boolean;
  version?: number;
};

let watchdog:LastSeen[] = [];

let latestVersion:number = 0;

const saltRounds = 10;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.use('/updates', express.static(path.join(__dirname, '../../updates')));

function getTime() { return Math.floor(Date.now() / 1000);}

// let adminPass = data.getAdminPass();
// if (!adminPass) {
//   adminPass = bcrypt.hashSync(config.DEFAULT_ADMIN_PASS, saltRounds);
// }

function isAuthorized(req:any) {
  return req.session.loggedIn;
}

function audit(req:any, action:string) {
  if (!isAuthorized(req)) {
    console.log("Trying to add to audit log without a logged in user");
    return;
  }
  
  data.addAuditEntry(req.session.userId, action);
}

app.post('/api/login', (req,res) => {
  const user = req.body.user;
  const pass = req.body.password;

  if (!user && !pass && req.session.loggedIn) {
    res.json(Response.mkData({id: req.session.userId}));
    return;
  }

  if (!user || !pass) {
    res.status(401).json(Response.mkErr("Failed authentication"));
    return;
  }

  if (!req.session) {
    res.status(500).json(Response.mkErr("Session not initialized"));
    return;
  }

  const portalUsers = data.getPortalUsers();
  const portalUser = portalUsers.find(x => x.name === user);
  if (portalUser && (bcrypt.compareSync(pass, portalUser.password) || !portalUser.password)) {
    console.log('User ' + user + ' logged in');
    req.session.loggedIn = true;
    req.session.userId = portalUser.id;
    req.session.cookie.maxAge = 1000 * 60 * 60 * 24; // 1 day
    req.session.save((err) => {});
    res.json(Response.mkData({id: portalUser.id}));
  } else {
    res.status(401).json(Response.mkErr("Failed authentication"));
  }
});

app.post('/api/changePassword', (req,res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  const userId = req.session.userId;

  const oldPass = req.body.oldPass;
  const newPass = req.body.newPass;

  if (!oldPass || !newPass) {
    res.status(401).json(Response.mkErr("Failed authentication"));
    return;
  }

  const portalUsers = data.getPortalUsers();
  const portalUser = portalUsers.find(x => x.id === userId);
  if (!portalUser) {
    res.status(401).json(Response.mkErr("Failed authentication"));
    return;
  }

  if (!bcrypt.compareSync(oldPass, portalUser.password)) {
    res.status(401).json(Response.mkErr("Failed authentication"));
    return;
  }

  const newPassHash = bcrypt.hashSync(newPass, saltRounds);
  if (data.editPortalUser(userId, portalUser.name, newPassHash)) {
    audit(req, "Changed password");
    res.status(200).json(Response.mkOk());
  } else {
    res.status(500).json(Response.mkErr("Internal error"));
  }
});


app.get('/api/logout', (req,res) => {
  console.log('Logout called');
  req.session.destroy((err) => {});
  res.status(200).json(Response.mkOk());
});


app.post('/api/hello', (req, res) => {
  console.log('Hello from tool ' + req.body.mac);

  let users: User[] = data.getUsers();
  let tools: Tool[] = data.getTools();

  let response: {
    userCards: string[];
    time: number;
  } = {
    userCards: [],
    time: getTime()
  };

  const lastSeen = watchdog.find(x => x.toolMac === req.body.mac);
  if (lastSeen) {
    lastSeen.timestamp = getTime();
    if (req.body.version) {
      lastSeen.version = req.body.version;
    }
  } else {
    watchdog.push({toolMac: req.body.mac, timestamp: getTime(), updated: false, offline: false, version: req.body.version});
  }

  const existingTool = tools.find(x => x.mac === req.body.mac);
  if (existingTool) {
    response.userCards = [];
    if (!existingTool.isLocked) {
      existingTool.users.forEach(x => {
        const user = users.find(u => u.id == x);
        if (user) {
          if (user.group) {
            for (const member of user.members) {
              const memberUser = users.find(u => u.id == member);
              if (memberUser && memberUser.card != "") {
                response.userCards.push(memberUser.card);
              }
            }
          } else {
            if (user.card) {
              response.userCards.push(user.card);
            }
          }
        }
      });
    }
    
    class log_entry {
      card:string;
      op:string;
      time:number;
      spindleTime:number;
    }

    const logs:log_entry[] = req.body.logs;
    for (let log of logs) {
      const user = users.find(x => x.card === log.card);

      if (log.op === "err") {
        data.addLogEntry(existingTool.id, user ? user.id : null, log.time, log.op, log.card, 0);
      } else if (log.op === "in" || log.op === "out") {
        if (!user) {
          console.log("Can't find user with card " + log.card);
          continue;
        }

        data.addLogEntry(existingTool.id, user.id, log.time, log.op, null, log.spindleTime);
      }
    }

    if (logs && logs.length) {
      sendUpdateNotification();
    }
  } else {
    data.addTool(req.body.mac);
    sendUpdateNotification();
  }

  res.json(response);
});

app.get('/api/tools/utilstats', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/tools/utilstats called.')
  const result = data.getToolsUtilStats();

  res.json(Response.mkData(result));
});

app.post('/api/tools/topusers', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  let tools: Tool[] = data.getTools();
  
  const toolId = req.body.toolId;
  
  if (!tools.find(x => x.id === toolId)) {
    res.status(400).json(Response.mkErr("Tool not found"));
    return;
  }

  console.log('api/tools/topusers called.')
  const result = data.getToolTopUsers(toolId);

  res.json(Response.mkData(result));
});


app.post('/api/users/toptools', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  const userId = req.body.userId;

  if (!userId) {
    res.status(400).json(Response.mkErr("Malformed request"));
    return;
  }

  let users: User[] = data.getUsers();

  if (!users.find(x => x.id === userId)) {
    res.status(400).json(Response.mkErr("User not found"));
    return;
  }

  console.log('api/users/toptools called.')
  const result = data.getUserTopTools(userId);

  res.json(Response.mkData(result));
});


app.get('/api/users', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/users called')
  let users: User[] = data.getUsers();

  res.json(Response.mkData(users));
});

app.get('/api/tools', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/tools called.')
  let tools: Tool[] = data.getTools();
  
  for (const tool of tools) {
    const lastSeen = watchdog.find(x => x.toolMac === tool.mac);
    tool.offline = !lastSeen || (getTime() - lastSeen.timestamp) > 30;
    tool.version = lastSeen ? lastSeen.version : undefined;
  }
  res.json(Response.mkData(tools));
});

app.get('/api/portalusers', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/portalusers called')
  let portalUsers: PortalUser[] = data.getPortalUsers();
  portalUsers.forEach(user => {
    user.password = undefined; // Don't send password hashes
  });

  res.json(Response.mkData(portalUsers));
});

app.post('/api/portaluser/add', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/portaluser/add called.')

  const userName = req.body.name;
  const userPassword = req.body.password;

  if (!userName || !userPassword) {
    res.status(400).json(Response.mkErr("Malformed request"));
    return;
  }

  if (data.addPortalUser(userName, userPassword)) {
    audit(req, `Added portal user ${userName}`);
    res.json(Response.mkOk());
  } else {
    res.json(Response.mkErr("Internal error"));
  }

  sendUpdateNotification();
});

app.post('/api/portaluser/edit', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/portaluser/edit called.')

  const userId = req.body.id;
  const userName = req.body.name;
  const newPassword = req.body.password;
  let passHash;

  if (!userId || !userName) {
    res.status(401).json(Response.mkErr("Malformed request"));
    return;
  }

  let portalUsers: PortalUser[] = data.getPortalUsers();
  let user = portalUsers.find(x => x.id === userId);

  if (!user) {
    res.status(401).json(Response.mkErr("Malformed request"));
    return;
  }

  if (newPassword) {
    passHash = bcrypt.hashSync(newPassword, saltRounds);
  } else {
    passHash = user.password;
  }

  if (data.editPortalUser(userId, userName, passHash)) {
    audit(req, `Editted portal user ${userName}(${userId})`);
    res.json(Response.mkOk());
  } else {
    res.json(Response.mkErr("Internal error"));
  }

  sendUpdateNotification();
});

app.post('/api/portaluser/delete', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/portaluser/delete called.')

  const userId = req.body.id;

  let portalUsers: PortalUser[] = data.getPortalUsers();
  let user = portalUsers.find(x => x.id === userId);

  if (!user) {
    res.status(401).json(Response.mkErr("Malformed request"));
    return;
  }

  if (data.deletePortalUser(userId)) {
    audit(req, `Deleted portal user ${user.name}(${userId})`);
    res.json(Response.mkOk());
  } else {
    res.json(Response.mkErr("Internal error"));
  }

  sendUpdateNotification();
});

app.post('/api/tool/delete', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/tool/delete called.')
  let tools: Tool[] = data.getTools();
  
  const toolId = req.body.id;
  const tool = tools.find(x => x.id === toolId);
  
  if (!tool) {
    res.status(400).json(Response.mkErr("Tool not found"));
    return;
  }
  
  if (data.deleteTool(toolId)) {
    audit(req, `Deleted tool ${tool.name}(${toolId})`);
    res.json(Response.mkOk());
  } else {
    res.json(Response.mkErr("Internal error"));
  }

  sendUpdateNotification();
});

app.post('/api/tool/setlockout', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/tool/setlockout called.')
  let tools: Tool[] = data.getTools();
  
  const toolId = req.body.id;
  const isLocked = req.body.islocked;
  const tool = tools.find(x => x.id === toolId);
  
  if (!tool) {
    res.status(400).json(Response.mkErr("Tool not found"));
    return;
  }
  
  if (!(isLocked === true || isLocked === false)) {
    res.status(400).json(Response.mkErr("Malformed request"));
    return;
  }

  if (data.setToolLockout(toolId, isLocked)) {
    audit(req, (isLocked ? "Locked out " : "Unlocked ") + `${tool.name}(${toolId})`);
    res.json(Response.mkOk());
  } else {
    res.json(Response.mkErr("Internal error"));
  }

  sendUpdateNotification();
});


app.post('/api/tool/edit', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/tool/edit called');
  let users: User[] = data.getUsers();
  let tools: Tool[] = data.getTools();
    
  const toolId = req.body.toolId;
  let tool = tools.find(x => x.id === toolId);
  if (!tool) {
    res.status(400).json(Response.mkErr("Tool not found"));
    return;
  }

  if (req.body.toolName) {
    if (data.editTool(tool.id, req.body.toolName)) {
      audit(req, `Renamed ${tool.name}(${toolId})`);
    }
  }
    
  if (req.body.toolUsers) {
    let newUsers: number[] = [];
    
    req.body.toolUsers.forEach((toolUser: number) => {
      if (users.find(x => x.id === toolUser)) {
        newUsers.push(toolUser);
      } else {
        console.log("User " + toolUser + " not found");
      }
    });
    
    if (data.setToolUsers(tool.id, newUsers)) {
      let add: number[] = newUsers.filter(x => !tool.users.includes(x));
      let del: number[] = tool.users.filter(x => !newUsers.includes(x));
      
      audit(req, `Set tool users for ${tool.name}(${toolId}): add ` + add.join(",") + ", remove " + del.join(","));
    }
  }
  
  res.json(Response.mkOk());
  sendUpdateNotification();
});

app.post('/api/user/add', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/user/add called.')

  const userName = req.body.name;
  const userEmail = req.body.email;
  const userCard = req.body.card;
  const doorCard = req.body.doorCard;
  const groupMembers = req.body.members;
  const isGroup = Array.isArray(groupMembers);
  
  if (!userName || (isGroup && groupMembers.length > 0 && isNaN(groupMembers[0]))) {
    res.status(400).json(Response.mkErr("Malformed request"));
    return;
  }
  
  if (data.addUser(userName, userEmail, userCard, doorCard, isGroup, groupMembers)) {
    res.json(Response.mkOk());
  } else {
    res.json(Response.mkErr("Internal error"));
  }

  sendUpdateNotification();
});

app.post('/api/user/edit', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/user/edit called.')

  let users: User[] = data.getUsers();

  const userId = req.body.id;
  const userName = req.body.name;
  const userEmail = req.body.email;
  const userCard = req.body.card;
  const doorCard = req.body.doorCard;
  const groupMembers = req.body.members;
  const isGroup = Array.isArray(groupMembers);
  
  if (!userId || !userName || (isGroup && groupMembers.length > 0 && isNaN(groupMembers[0]))) {
    res.status(400).json(Response.mkErr("Malformed request"));
    return;
  }
  
  let user = users.find(x => x.id === userId);
  if (!user) {
    console.log('User not found');
    res.status(404).json(Response.mkErr("User not found"));
    return;
  }

  if (data.editUser(userId, userName, userEmail, userCard, doorCard, isGroup, groupMembers)) {
    res.json(Response.mkOk());
  } else {
    res.json(Response.mkErr("Internal error"));
  }

  sendUpdateNotification();
});

app.post('/api/user/delete', (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/user/delete called.')

  let users: User[] = data.getUsers();
  
  const userId = req.body.id;
  
  let user = users.find(x => x.id === userId);
  if (!user) {
    console.log('User not found');
    res.status(404).json(Response.mkErr("User not found"));
    return;
  }

  if (data.deleteUser(userId)) {
    res.json(Response.mkOk());
  } else {
    res.json(Response.mkErr("Internal error"));
  }

  sendUpdateNotification();
});

app.post('/api/enroll/query', (req, res) => {
  let doorCard = req.body.doorCard;

  if (!doorCard) {
    res.status(400).json(Response.mkErr("Malformed request"));
    return;
  }

  let result = data.findDoorCardName(doorCard);
  
  if (result && result.value) {
    res.status(200).json(Response.mkData(result.value));
  } else {
    res.status(200).json(Response.mkErr(result.error));
  }
});

app.post('/api/enroll/register', (req, res) => {
  let doorCard = req.body.doorCard;
  let toolCard = req.body.toolCard;

  if (!doorCard || !toolCard) {
    res.status(400).json(Response.mkErr("Malformed request"));
    return;
  }

  if (data.isToolCardRegistered(toolCard)) {
    res.status(200).json(Response.mkErr("Tool card already registered"));
    return;
  }

  let result = data.registerToolCard(doorCard, toolCard);
  
  if (result) {
    res.status(200).json(Response.mkOk());
  } else {
    res.status(404).end(Response.mkErr("Internal error"));
  }
});

app.post('/api/update', (req,res) => {
  let ver = req.body.version;

  console.log('Update called. Version = ' + ver);

  let response:any = {
  };

  if (ver < latestVersion) {
    console.log('Update available.');
    response.updateAvailable = latestVersion;
  }

  res.status(200).json(response);
});



function sendUpdateNotification() {
  console.log('Sending updates');
  sockets.forEach((x:WebSocket) => x.send('update'));
}

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist', 'index.html'));
});

let server = https.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.pem')
}, app).listen(config.SERVER_PORT, function () {
  console.log('Listening on port ' + config.SERVER_PORT);
})

const wsServer = new ws.Server({ server: server, path: '/ws' });
const sockets = new Set();
wsServer.on('connection', (socket: WebSocket) => {
  console.log('WebSocket connected');
  sockets.add(socket);
  socket.onclose = function (this: WebSocket, ev: CloseEvent) {
    sockets.delete(socket);
  };
  console.log("Sockets: " + sockets.size);
});
wsServer.on('error', console.error);


setInterval(() => {
  let change = false;

  let tools: Tool[] = data.getTools();

  for (const tool of tools) {
    var lastSeen = watchdog.find(x => x.toolMac === tool.mac);
    if (!lastSeen) {
      lastSeen = {toolMac: tool.mac, timestamp: 0, updated: false, offline: false};
      watchdog.push(lastSeen);
    }
    
    const offline = (getTime() - lastSeen.timestamp) > 30;
    if (!lastSeen.updated || offline != lastSeen.offline) {
      change = true;
      lastSeen.updated = true;
      lastSeen.offline = offline;
    }
  }

  if (change) {
    sendUpdateNotification();
  }

  try {
    let ver = 0;
    fs.readdirSync(path.join(__dirname, '../../updates')).forEach(file => {
      let match = file.match('^(\[0-9]+)\.bin');
      if (match) {
        if (+match[1] > ver) {
          ver = +match[1];
        }
      }
    });
    if (latestVersion !== ver) {
      console.log("Update version available: " + ver);
    }
    latestVersion = ver;
  } catch(e) {
    console.log('Error scanning updates: ' + e);
  }

}, 10000);

