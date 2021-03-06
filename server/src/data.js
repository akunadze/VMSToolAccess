"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAdminPass = exports.getAdminPass = exports.addLogEntry = exports.deleteUser = exports.editUser = exports.addUser = exports.setToolUsers = exports.editTool = exports.deleteTool = exports.addTool = exports.getUsers = exports.getTools = exports.initData = exports.Response = exports.Tool = exports.LogEntry = exports.User = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
var db;
var stmtGetTools;
var stmtGetUsers;
var stmtGetToolUsers;
var stmtGetToolLog;
var stmtAddTool;
var stmtDeleteTool;
var stmtEditTool;
var stmtAddPermission;
var stmtDeleteAllPermissions;
var stmtAddUser;
var stmtEditUser;
var stmtDeleteUser;
var stmtAddLogEntry;
var stmtGetSetting;
var stmtPutSetting;
class User {
    constructor(id, fullname, email, card) {
        this.id = id;
        this.fullName = fullname;
        this.email = email;
        this.card = card;
    }
}
exports.User = User;
class LogEntry {
    constructor(userId, timestamp, op, card) {
        this.userId = userId;
        this.timestamp = timestamp;
        this.op = op;
        this.card = card;
    }
}
exports.LogEntry = LogEntry;
class Tool {
    constructor(id, name, mac) {
        this.id = id;
        this.name = name;
        this.mac = mac;
        this.users = [];
        this.log = [];
    }
}
exports.Tool = Tool;
class Response {
    static mkOk() {
        let obj = new Response();
        obj.data = {};
        obj.error = null;
        return obj;
    }
    static mkData(data) {
        let obj = new Response();
        obj.data = data;
        obj.error = null;
        return obj;
    }
    static mkErr(message) {
        let obj = new Response();
        obj.data = null;
        obj.error = message;
        return obj;
    }
}
exports.Response = Response;
function initData() {
    try {
        db = new better_sqlite3_1.default(__dirname + '/../data/toolaccess.db');
        db.exec(`
        BEGIN TRANSACTION;
        
        -- Table: AccessLog
        CREATE TABLE IF NOT EXISTS AccessLog (
            toolId    INTEGER REFERENCES Tools (id) ON DELETE CASCADE
                                                    ON UPDATE CASCADE,
            userId    INTEGER REFERENCES Users (id) ON DELETE CASCADE
                                                    ON UPDATE CASCADE,
            op        STRING  NOT NULL,
            timestamp INTEGER DEFAULT (strftime('%s', 'now') ),
            card      STRING
        );
        
        
        -- Table: Permissions
        CREATE TABLE IF NOT EXISTS Permissions (
            toolId INTEGER REFERENCES Tools (id) ON DELETE CASCADE
                                                 ON UPDATE CASCADE,
            userId INTEGER REFERENCES Users (id) ON DELETE CASCADE
                                                 ON UPDATE CASCADE,
            UNIQUE (
                toolId,
                userId
            )
            ON CONFLICT REPLACE
        );
        
        
        -- Table: Settings
        CREATE TABLE IF NOT EXISTS Settings (
            [Key] STRING NOT NULL
                         PRIMARY KEY,
            Value STRING NOT NULL
        );
        
        
        -- Table: Tools
        CREATE TABLE IF NOT EXISTS Tools (
            id   INTEGER PRIMARY KEY ASC,
            name STRING,
            mac  STRING  UNIQUE
        );
        
        
        -- Table: Users
        CREATE TABLE IF NOT EXISTS Users (
            id       INTEGER PRIMARY KEY ASC,
            fullName STRING  NOT NULL,
            email    STRING,
            card     STRING  NOT NULL
        );
        
        
        -- Trigger: DefaultName
        CREATE TRIGGER IF NOT EXISTS DefaultName
                 AFTER INSERT
                    ON Tools
              FOR EACH ROW
                  WHEN NEW.name IS NULL
        BEGIN
            UPDATE Tools
               SET name = '<New Tool ' || NEW.id || '>'
             WHERE rowid = NEW.rowid;
        END;
        
        
        COMMIT TRANSACTION;
        `);
        stmtGetTools = db.prepare('SELECT id, name, mac FROM Tools');
        stmtGetToolUsers = db.prepare('SELECT userId FROM Permissions WHERE toolId = ?');
        stmtGetToolLog = db.prepare('SELECT userId, op, timestamp, card FROM AccessLog WHERE toolId = ? ORDER BY rowid DESC');
        stmtGetUsers = db.prepare('SELECT id, fullName, email, card FROM Users');
        stmtAddTool = db.prepare('INSERT INTO Tools(mac) VALUES(?)');
        stmtDeleteTool = db.prepare('DELETE FROM Tools WHERE id = ?');
        stmtEditTool = db.prepare('UPDATE Tools SET name = ? WHERE id = ?');
        stmtAddPermission = db.prepare('INSERT INTO Permissions (toolId, userId) VALUES (?,?)');
        stmtAddUser = db.prepare('INSERT INTO Users(fullName, email, card) VALUES(?,?,?)');
        stmtDeleteAllPermissions = db.prepare('DELETE FROM Permissions WHERE toolId = ?');
        stmtAddLogEntry = db.prepare('INSERT INTO AccessLog (toolId, userId, timestamp, op, card) VALUES (?,?,?,?,?)');
        stmtEditUser = db.prepare('UPDATE Users SET fullName = ?, email = ?, card = ? WHERE id = ?');
        stmtDeleteUser = db.prepare('DELETE FROM Users WHERE id = ?');
        stmtGetSetting = db.prepare('SELECT Value FROM Settings WHERE Key = ?');
        stmtPutSetting = db.prepare('REPLACE INTO Settings(Key, Value) VALUES (?,?)');
    }
    catch (e) {
        console.log('Error in initData: ' + e);
    }
}
exports.initData = initData;
function getTools() {
    try {
        const result = stmtGetTools.all();
        return result.map(x => {
            const newTool = new Tool(x.id, x.name, x.mac);
            newTool.users = stmtGetToolUsers.all(x.id).map(u => u.userId);
            const logEntries = stmtGetToolLog.all(x.id);
            newTool.log = logEntries.map(l => new LogEntry(l.userId, l.timestamp, l.op, l.card));
            newTool.currentUserId = newTool.log.length > 0 && newTool.log[0].op === "in" ? newTool.log[0].userId : 0;
            return newTool;
        });
    }
    catch (e) {
        console.log('Error in getTools: ' + e);
        return [];
    }
}
exports.getTools = getTools;
function getUsers() {
    try {
        const result = stmtGetUsers.all();
        const map = result.map(x => new this.User(x.id, x.fullName, x.email, x.card));
        return map;
    }
    catch (e) {
        console.log('Error in getUsers: ' + e);
        return [];
    }
}
exports.getUsers = getUsers;
function addTool(toolMac) {
    try {
        const result = stmtAddTool.run(toolMac);
        return true;
    }
    catch (e) {
        console.log('Error in addTool: ' + e);
        return false;
    }
}
exports.addTool = addTool;
function deleteTool(toolId) {
    try {
        const result = stmtDeleteTool.run(toolId);
        return true;
    }
    catch (e) {
        console.log('Error in deleteTool: ' + e);
        return false;
    }
}
exports.deleteTool = deleteTool;
function editTool(toolId, toolName) {
    try {
        const result = stmtEditTool.run(toolName, toolId);
        return true;
    }
    catch (e) {
        console.log('Error in addTool: ' + e);
        return false;
    }
}
exports.editTool = editTool;
function setToolUsers(toolId, userIds) {
    try {
        const result = db.transaction(() => {
            stmtDeleteAllPermissions.run(toolId);
            for (const userId of userIds) {
                stmtAddPermission.run(toolId, userId);
            }
        });
        result();
        console.log(result);
        return true;
    }
    catch (e) {
        console.log('Error in setToolUsers: ' + e);
        return false;
    }
}
exports.setToolUsers = setToolUsers;
function addUser(userName, userEmail, userCard) {
    try {
        const result = stmtAddUser.run(userName, userEmail, userCard);
        return true;
    }
    catch (e) {
        console.log('Error in addUser: ' + e);
        return false;
    }
}
exports.addUser = addUser;
function editUser(userId, userName, userEmail, userCard) {
    try {
        const result = stmtEditUser.run(userName, userEmail, userCard, userId);
        return true;
    }
    catch (e) {
        console.log('Error in editUser: ' + e);
        return false;
    }
}
exports.editUser = editUser;
function deleteUser(userId) {
    try {
        const result = stmtDeleteUser.run(userId);
        return true;
    }
    catch (e) {
        console.log('Error in deleteUser: ' + e);
        return false;
    }
}
exports.deleteUser = deleteUser;
function addLogEntry(toolId, userId, time, op, card) {
    try {
        const result = stmtAddLogEntry.run(toolId, userId, time, op, card);
        return true;
    }
    catch (e) {
        console.log('Error in addUser: ' + e);
        return false;
    }
}
exports.addLogEntry = addLogEntry;
function getAdminPass() {
    try {
        const result = stmtGetSetting.get('AdminPass');
        if (result) {
            return result.Value;
        }
        else {
            return null;
        }
    }
    catch (e) {
        console.log('Error in getAdminPass: ' + e);
        return null;
    }
}
exports.getAdminPass = getAdminPass;
function setAdminPass(newPass) {
    try {
        const result = stmtPutSetting.run('AdminPass', newPass);
        return true;
    }
    catch (e) {
        console.log('Error in setAdminPass: ' + e);
        return false;
    }
}
exports.setAdminPass = setAdminPass;
//# sourceMappingURL=data.js.map