"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const ws_1 = __importDefault(require("ws"));
const data_1 = require("./data");
const data = __importStar(require("./data"));
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const config = __importStar(require("./config"));
const app = express_1.default();
app.use(cookie_parser_1.default());
app.use(express_session_1.default({ secret: config.SESSION_SECRET, saveUninitialized: false, resave: true }));
// Uncomment to see full request/response bodies in the log
//import morganBody from 'morgan-body';
//morganBody(app)
data.initData();
let users = data.getUsers();
let tools = data.getTools();
;
let watchdog = [];
const saltRounds = 10;
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../../dist')));
function getTime() { return Math.floor(Date.now() / 1000); }
let adminPass = data.getAdminPass();
if (!adminPass) {
    adminPass = bcrypt_1.default.hashSync(config.DEFAULT_ADMIN_PASS, saltRounds);
}
app.post('/api/login', (req, res) => {
    const user = req.body.user;
    const pass = req.body.password;
    if (!user && !pass && req.session.loggedIn) {
        res.json(data_1.Response.mkOk());
        return;
    }
    if (user === 'admin' && bcrypt_1.default.compareSync(pass, adminPass)) {
        req.session.loggedIn = true;
        req.session.save((err) => { });
        const r = data_1.Response.mkOk();
        res.json(r);
    }
    else {
        res.status(401).json(data_1.Response.mkErr("Failed authentication"));
    }
});
app.post('/api/changePassword', (req, res) => {
    if (!req.session.loggedIn) {
        res.status(401).json(data_1.Response.mkErr("Not logged in"));
        return;
    }
    const oldPass = req.body.oldPass;
    const newPass = req.body.newPass;
    if (!oldPass || !newPass) {
        res.status(400).json(data_1.Response.mkErr("Failed authentication"));
        return;
    }
    if (!bcrypt_1.default.compareSync(oldPass, adminPass)) {
        res.status(400).json(data_1.Response.mkErr("Failed authentication"));
        return;
    }
    const newPassHash = bcrypt_1.default.hashSync(newPass, saltRounds);
    if (data.setAdminPass(newPassHash)) {
        adminPass = newPassHash;
        res.status(200).json(data_1.Response.mkOk());
    }
    else {
        res.status(500).json(data_1.Response.mkErr("Internal error"));
    }
});
app.get('/api/logout', (req, res) => {
    console.log('Logout called');
    req.session.destroy((err) => { });
    res.status(200).json(data_1.Response.mkOk());
});
app.post('/api/hello', (req, res) => {
    //console.log('Hello from tool ' + req.body.mac);
    let response = {
        userCards: [],
        time: getTime()
    };
    const lastSeen = watchdog.find(x => x.toolMac === req.body.mac);
    if (lastSeen) {
        lastSeen.timestamp = getTime();
    }
    else {
        watchdog.push({ toolMac: req.body.mac, timestamp: getTime() });
    }
    const existingTool = tools.find(x => x.mac === req.body.mac);
    if (existingTool) {
        response.userCards = existingTool.users.map(x => {
            const user = users.find(u => u.id == x);
            return user ? user.card : "";
        });
        class log_entry {
        }
        const logs = req.body.logs;
        for (let log of logs) {
            const user = users.find(x => x.card === log.card);
            if (log.op === "err") {
                data.addLogEntry(existingTool.id, user ? user.id : null, log.time, log.op, log.card);
            }
            else if (log.op === "in" || log.op === "out") {
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
    }
    else {
        data.addTool(req.body.mac);
        sendUpdateNotification();
    }
    res.json(response);
});
app.get('/api/users', (req, res) => {
    if (!req.session.loggedIn) {
        res.status(401).json(data_1.Response.mkErr("Not logged in"));
        return;
    }
    console.log('api/users called');
    users = data.getUsers();
    res.json(data_1.Response.mkData(users));
});
app.get('/api/tools', (req, res) => {
    if (!req.session.loggedIn) {
        res.status(401).json(data_1.Response.mkErr("Not logged in"));
        return;
    }
    console.log('api/tools called.');
    tools = data.getTools();
    for (const tool of tools) {
        const lastSeen = watchdog.find(x => x.toolMac === tool.mac);
        tool.offline = !lastSeen || (getTime() - lastSeen.timestamp) > 30;
    }
    res.json(data_1.Response.mkData(tools));
});
app.post('/api/tool/delete', (req, res) => {
    if (!req.session.loggedIn) {
        res.status(401).json(data_1.Response.mkErr("Not logged in"));
        return;
    }
    console.log('api/tool/delete called.');
    const toolId = req.body.id;
    if (!tools.find(x => x.id === toolId)) {
        res.status(400).json(data_1.Response.mkErr("Tool not found"));
        return;
    }
    if (data.deleteTool(toolId)) {
        res.json(data_1.Response.mkOk());
    }
    else {
        res.json(data_1.Response.mkErr("Internal error"));
    }
    sendUpdateNotification();
});
app.post('/api/tool/edit', (req, res) => {
    if (!req.session.loggedIn) {
        res.status(401).json(data_1.Response.mkErr("Not logged in"));
        return;
    }
    console.log('api/tool/edit called');
    const toolId = req.body.toolId;
    let tool = tools.find(x => x.id === toolId);
    if (!tool) {
        res.status(400).json(data_1.Response.mkErr("Tool not found"));
        return;
    }
    if (req.body.toolName) {
        data.editTool(tool.id, req.body.toolName);
    }
    if (req.body.toolUsers) {
        let newUsers = [];
        req.body.toolUsers.forEach((toolUser) => {
            if (users.find(x => x.id === toolUser)) {
                newUsers.push(toolUser);
            }
            else {
                console.log("User " + toolUser + " not found");
            }
        });
        data.setToolUsers(tool.id, newUsers);
    }
    res.json(data_1.Response.mkOk());
    sendUpdateNotification();
});
app.post('/api/user/add', (req, res) => {
    if (!req.session.loggedIn) {
        res.status(401).json(data_1.Response.mkErr("Not logged in"));
        return;
    }
    console.log('api/user/add called.');
    const userName = req.body.name;
    const userEmail = req.body.email;
    const userCard = req.body.card;
    if (!userName || !userCard) {
        res.status(400).json(data_1.Response.mkErr("Malformed request"));
        return;
    }
    if (data.addUser(userName, userEmail, userCard)) {
        res.json(data_1.Response.mkOk());
    }
    else {
        res.json(data_1.Response.mkErr("Internal error"));
    }
    sendUpdateNotification();
});
app.post('/api/user/edit', (req, res) => {
    if (!req.session.loggedIn) {
        res.status(401).json(data_1.Response.mkErr("Not logged in"));
        return;
    }
    console.log('api/user/edit called.');
    const userId = req.body.id;
    const userName = req.body.name;
    const userEmail = req.body.email;
    const userCard = req.body.card;
    if (!userId || !userName || !userCard) {
        res.status(400).json(data_1.Response.mkErr("Malformed request"));
        return;
    }
    let user = users.find(x => x.id === userId);
    if (!user) {
        console.log('User not found');
        res.status(404).json(data_1.Response.mkErr("User not found"));
        return;
    }
    if (data.editUser(userId, userName, userEmail, userCard)) {
        res.json(data_1.Response.mkOk());
    }
    else {
        res.json(data_1.Response.mkErr("Internal error"));
    }
    sendUpdateNotification();
});
app.post('/api/user/delete', (req, res) => {
    if (!req.session.loggedIn) {
        res.status(401).json(data_1.Response.mkErr("Not logged in"));
        return;
    }
    console.log('api/user/delete called.');
    const userId = req.body.id;
    let user = users.find(x => x.id === userId);
    if (!user) {
        console.log('User not found');
        res.status(404).json(data_1.Response.mkErr("User not found"));
        return;
    }
    if (data.deleteUser(userId)) {
        res.json(data_1.Response.mkOk());
    }
    else {
        res.json(data_1.Response.mkErr("Internal error"));
    }
    sendUpdateNotification();
});
function sendUpdateNotification() {
    console.log('Sending updates');
    sockets.forEach((x) => x.send('update'));
}
function sendCardInfo(card) {
    console.log('Sending card');
    sockets.forEach((x) => x.send(card));
}
let server = https_1.default.createServer({
    key: fs_1.default.readFileSync('server.key'),
    cert: fs_1.default.readFileSync('server.pem')
}, app).listen(config.SERVER_PORT, function () {
    console.log('Listening on port ' + config.SERVER_PORT);
});
const wsServer = new ws_1.default.Server({ server: server, path: '/ws' });
const sockets = new Set();
wsServer.on('connection', (socket) => {
    console.log('WebSocket connected');
    sockets.add(socket);
    socket.onclose = function (ev) {
        sockets.delete(socket);
    };
    console.log("Sockets: " + sockets.size);
});
setInterval(() => {
    let change = false;
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
}, 10000);
Promise.resolve().then(() => __importStar(require('./mfrc522'))).then(rfid => {
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
//# sourceMappingURL=server.js.map