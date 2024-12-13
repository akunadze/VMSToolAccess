import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import ws from 'ws';
import {Tool, User, Response} from "./data"
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
//import morganBody from 'morgan-body';
//morganBody(app)

data.initData();

// let users: User[] = data.getUsers();
// let tools: Tool[] = data.getTools();

interface LastSeen {
  toolMac: string;
  timestamp: number;
};

let watchdog:LastSeen[] = [];

let latestVersion:number = 0;

const saltRounds = 10;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../dist')));
app.use('/updates', express.static(path.join(__dirname, '../../updates')));

function getTime() { return Math.floor(Date.now() / 1000);}

let adminPass = data.getAdminPass();
if (!adminPass) {
  adminPass = bcrypt.hashSync(config.DEFAULT_ADMIN_PASS, saltRounds);
}

app.post('/api/login', (req,res) => {
  const user = req.body.user;
  const pass = req.body.password;

  if (!user && !pass && req.session.loggedIn) {
    res.json(Response.mkOk());
    return;
  }

  if (user === 'admin' && bcrypt.compareSync(pass, adminPass)) {
    req.session.loggedIn = true;
    req.session.save((err) => {});
    const r = Response.mkOk();
    res.json(r);
  } else {
    res.status(401).json(Response.mkErr("Failed authentication"));
  }
});

app.post('/api/changePassword', (req,res) => {
  if (!req.session.loggedIn) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  const oldPass = req.body.oldPass;
  const newPass = req.body.newPass;

  if (!oldPass || !newPass) {
    res.status(400).json(Response.mkErr("Failed authentication"));
    return;
  }

  if (!bcrypt.compareSync(oldPass, adminPass)) {
    res.status(400).json(Response.mkErr("Failed authentication"));
    return;
  }

  const newPassHash = bcrypt.hashSync(newPass, saltRounds);
  if (data.setAdminPass(newPassHash)) {
    adminPass = newPassHash;
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
  //console.log('Hello from tool ' + req.body.mac);

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
  } else {
    watchdog.push({toolMac: req.body.mac, timestamp: getTime()});
  }

  const existingTool = tools.find(x => x.mac === req.body.mac);
  if (existingTool) {
    response.userCards = [];
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

    class log_entry {
      card:string;
      op:string;
      time:number;
    }

    const logs:log_entry[] = req.body.logs;
    for (let log of logs) {
      const user = users.find(x => x.card === log.card);

      if (log.op === "err") {
        data.addLogEntry(existingTool.id, user ? user.id : null, log.time, log.op, log.card);
      } else if (log.op === "in" || log.op === "out") {
        if (!user) {
          console.log("Can't find user with card " + log.card);
          continue;
        }

        data.addLogEntry(existingTool.id, user.id, log.time, log.op, null);
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
  if (!req.session.loggedIn) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/tools/utilstats called.')
  const result = data.getToolsUtilStats();

  res.json(Response.mkData(result));
});

app.get('/api/users', (req, res) => {
  if (!req.session.loggedIn) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/users called')
  let users: User[] = data.getUsers();

  res.json(Response.mkData(users));
});

app.get('/api/tools', (req, res) => {
  if (!req.session.loggedIn) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/tools called.')
  let tools: Tool[] = data.getTools();
  
  for (const tool of tools) {
    const lastSeen = watchdog.find(x => x.toolMac === tool.mac);
    tool.offline = !lastSeen || (getTime() - lastSeen.timestamp) > 30;
  }
  res.json(Response.mkData(tools));
});

app.post('/api/tool/delete', (req, res) => {
  if (!req.session.loggedIn) {
    res.status(401).json(Response.mkErr("Not logged in"));
    return;
  }

  console.log('api/tool/delete called.')
  let tools: Tool[] = data.getTools();
  
  const toolId = req.body.id;
  
  if (!tools.find(x => x.id === toolId)) {
    res.status(400).json(Response.mkErr("Tool not found"));
    return;
  }
  
  if (data.deleteTool(toolId)) {
    res.json(Response.mkOk());
  } else {
    res.json(Response.mkErr("Internal error"));
  }

  sendUpdateNotification();
});

app.post('/api/tool/edit', (req, res) => {
  if (!req.session.loggedIn) {
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
    data.editTool(tool.id, req.body.toolName);
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
    
    data.setToolUsers(tool.id, newUsers);
  }
  
  res.json(Response.mkOk());
  sendUpdateNotification();
});

app.post('/api/user/add', (req, res) => {
  if (!req.session.loggedIn) {
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
  if (!req.session.loggedIn) {
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
  if (!req.session.loggedIn) {
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

function sendCardInfo(card:string) {
  console.log('Sending card');
  sockets.forEach((x:WebSocket) => x.send(card));
}


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


setInterval(() => {
  let change = false;

  let tools: Tool[] = data.getTools();

  for (const tool of tools) {
    const lastSeen = watchdog.find(x => x.toolMac === tool.mac);
    const oldOffline = tool.offline;
    tool.offline = !lastSeen || (getTime() - lastSeen.timestamp) > 30;
    if (oldOffline != tool.offline) {
      change = true;
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

import('./mfrc522').then(rfid => {
  rfid.initRFID();

  let lastCard = "";

  setInterval(() => {
    let card = rfid.readCard();

    if (card !== lastCard) {
      lastCard = card;
      if (lastCard != "") {
        console.log("Card detected: " + lastCard);
        sendCardInfo(card);
      }
    }

  }, 1000);
}).catch(e => {
  console.log("RFID reader not detected");
});