"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Response = exports.Tool = exports.LogEntry = exports.User = void 0;
exports.initData = initData;
exports.getTools = getTools;
exports.getToolsUtilStats = getToolsUtilStats;
exports.getUsers = getUsers;
exports.addTool = addTool;
exports.deleteTool = deleteTool;
exports.editTool = editTool;
exports.setToolUsers = setToolUsers;
exports.addUser = addUser;
exports.editUser = editUser;
exports.deleteUser = deleteUser;
exports.addLogEntry = addLogEntry;
exports.getAdminPass = getAdminPass;
exports.setAdminPass = setAdminPass;
exports.findDoorCardName = findDoorCardName;
exports.isToolCardRegistered = isToolCardRegistered;
exports.registerToolCard = registerToolCard;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
var db;
var stmtGetTools;
var stmtGetUsers;
var stmtGetGroupUsers;
var stmtGetToolUsers;
var stmtGetToolLog;
var stmtAddTool;
var stmtDeleteTool;
var stmtEditTool;
var stmtAddPermission;
var stmtDeleteAllPermissions;
var stmtAddUser;
var stmtEditUser;
var stmtAddGroupMapEntry;
var stmtDeleteGroupMap;
var stmtDeleteUser;
var stmtAddLogEntry;
var stmtGetSetting;
var stmtPutSetting;
var stmtGetToolUtil;
var stmtGetAllToolsUtil;
var stmtDoorCardQuery;
var stmtRegisterToolCard;
var stmtIsToolCardRegistered;
var stmtGetGroupId;
function nullIfEmpty(x) {
    if (x) {
        return x;
    }
    else {
        return null;
    }
}
class User {
    constructor(id, fullname, email, card, doorCard, group, members) {
        this.id = id;
        this.fullName = fullname;
        this.email = email;
        this.card = card;
        this.doorCard = doorCard;
        this.group = group;
        this.members = members;
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
        this.currentUserId = 0;
        this.offline = true;
        this.utilization = 0;
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
        PRAGMA foreign_keys = off;
        BEGIN TRANSACTION;
        
        -- Table: AccessLog
        CREATE TABLE IF NOT EXISTS AccessLog (
            toolId    INTEGER REFERENCES Tools (id) ON DELETE CASCADE
                                                    ON UPDATE CASCADE,
            userId    INTEGER REFERENCES Users (id) ON DELETE CASCADE
                                                    ON UPDATE CASCADE,
            op        TEXT  NOT NULL,
            timestamp INTEGER DEFAULT (strftime('%s', 'now') ),
            card      TEXT
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
            [Key] TEXT NOT NULL
                         PRIMARY KEY,
            Value TEXT NOT NULL
        );
        
        
        -- Table: Tools
        CREATE TABLE IF NOT EXISTS Tools (
            id   INTEGER PRIMARY KEY ASC,
            name TEXT,
            mac  TEXT  UNIQUE
        );
        
        
        -- Table: UserGroupMap
        CREATE TABLE IF NOT EXISTS UserGroupMap (
            groupId INTEGER REFERENCES Users (id),
            userId  INTEGER REFERENCES Users (id) ON DELETE CASCADE
        );
        
        
        -- Table: Users
        CREATE TABLE IF NOT EXISTS Users (
            id       INTEGER PRIMARY KEY ASC,
            fullName TEXT  NOT NULL
                             DEFAULT ('New User ' || LAST_INSERT_ROWID() ),
            email    TEXT,
            card     TEXT  UNIQUE,
            doorCard TEXT  UNIQUE ON CONFLICT IGNORE,
            isGroup  BOOLEAN DEFAULT (FALSE) 
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
        PRAGMA foreign_keys = on;
        `);
        stmtGetTools = db.prepare('SELECT id, name, mac FROM Tools');
        stmtGetToolUsers = db.prepare('SELECT userId FROM Permissions WHERE toolId = ?');
        stmtGetToolLog = db.prepare('SELECT userId, op, timestamp, card FROM AccessLog WHERE toolId = ? ORDER BY timestamp DESC');
        stmtGetUsers = db.prepare('SELECT id, fullName, email, card, doorCard, isGroup FROM Users ORDER BY isGroup DESC, fullName');
        stmtGetGroupUsers = db.prepare('SELECT id FROM Users INNER JOIN UserGroupMap ON Users.id = UserGroupMap.userId WHERE UserGroupMap.groupId = ?');
        stmtAddTool = db.prepare('INSERT INTO Tools(mac) VALUES(?)');
        stmtDeleteTool = db.prepare('DELETE FROM Tools WHERE id = ?');
        stmtEditTool = db.prepare('UPDATE Tools SET name = ? WHERE id = ?');
        stmtAddPermission = db.prepare('INSERT INTO Permissions (toolId, userId) VALUES (?,?)');
        stmtAddUser = db.prepare('INSERT INTO Users(fullName, email, card, doorCard, isGroup) VALUES(IFNULL(?, \'New User \' || (select max(id) + 1 from Users)),?,?,?,?)');
        stmtDeleteAllPermissions = db.prepare('DELETE FROM Permissions WHERE toolId = ?');
        stmtAddLogEntry = db.prepare('INSERT INTO AccessLog (toolId, userId, timestamp, op, card) VALUES (?,?,?,?,?)');
        stmtEditUser = db.prepare('UPDATE Users SET fullName = ?, email = ?, card = ?, doorCard = ? WHERE id = ?');
        stmtAddGroupMapEntry = db.prepare('INSERT INTO UserGroupMap(groupId, userId) VALUES(?,?)');
        stmtDeleteGroupMap = db.prepare('DELETE FROM UserGroupMap WHERE groupId = ?');
        stmtDeleteUser = db.prepare('DELETE FROM Users WHERE id = ?');
        stmtGetSetting = db.prepare('SELECT Value FROM Settings WHERE Key = ?');
        stmtPutSetting = db.prepare('REPLACE INTO Settings(Key, Value) VALUES (?,?)');
        stmtGetToolUtil = db.prepare('with lengths as (select *, IIF(op = \'out\' AND (LAG(op) OVER ()) = \'in\' AND userId = (LAG(userId) OVER ()), timestamp - LAG(timestamp, 1, 0) OVER (), 0) as length from AccessLog WHERE toolId = ? ORDER BY timestamp) select ROUND(SUM(length) * 100.0 / (strftime(\'%s\',\'now\') - MIN(timestamp)), 2) as util from lengths');
        stmtGetAllToolsUtil = db.prepare("with lengths as (select *, IIF(op = 'out' AND (LAG(op) OVER ()) = 'in' AND userId = (LAG(userId) OVER ()), timestamp - LAG(timestamp, 1, 0) OVER (), 0) as length from AccessLog ORDER BY timestamp) select toolId, name, ROUND((SUM(length) * (7*24.0)) / (strftime('%s','now') - MIN(timestamp)), 1) as HoursPerWeek from lengths JOIN tools ON toolId = id GROUP BY toolId");
        stmtDoorCardQuery = db.prepare("SELECT id, fullName, card FROM Users WHERE doorCard = ?");
        stmtRegisterToolCard = db.prepare("UPDATE Users SET card = ? WHERE doorCard = ? AND card IS NULL");
        stmtIsToolCardRegistered = db.prepare("SELECT fullName FROM Users WHERE card = ?");
        stmtGetGroupId = db.prepare("SELECT id FROM Users WHERE fullName = ?");
    }
    catch (e) {
        console.log('Error in initData: ' + e);
    }
}
function getTools() {
    try {
        const result = stmtGetTools.all();
        return result.map(x => {
            const newTool = new Tool(x.id, x.name, x.mac);
            newTool.users = stmtGetToolUsers.all(x.id).map(u => u.userId);
            const logEntries = stmtGetToolLog.all(x.id);
            newTool.log = logEntries.map(l => new LogEntry(l.userId, l.timestamp, l.op, l.card));
            newTool.currentUserId = newTool.log.length > 0 && newTool.log[0].op === "in" ? newTool.log[0].userId : 0;
            const utilResult = stmtGetToolUtil.get(x.id);
            newTool.utilization = utilResult.util;
            return newTool;
        });
    }
    catch (e) {
        console.log('Error in getTools: ' + e);
        return [];
    }
}
function getToolsUtilStats() {
    try {
        const result = stmtGetAllToolsUtil.all();
        return result;
    }
    catch (e) {
        console.log('Error in getToolsUtilStats: ' + e);
        return [];
    }
}
function getUsers() {
    try {
        const result = stmtGetUsers.all();
        const map = result.map(x => new this.User(x.id, x.fullName, x.email, x.card, x.doorCard, x.isGroup, x.isGroup ? stmtGetGroupUsers.all(x.id).map(y => y.id) : []));
        return map;
    }
    catch (e) {
        console.log('Error in getUsers: ' + e);
        return [];
    }
}
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
function setToolUsers(toolId, userIds) {
    try {
        const result = db.transaction(() => {
            stmtDeleteAllPermissions.run(toolId);
            for (const userId of userIds) {
                stmtAddPermission.run(toolId, userId);
            }
        });
        result();
        return true;
    }
    catch (e) {
        console.log('Error in setToolUsers: ' + e);
        return false;
    }
}
function addUser(userName, userEmail, userCard, doorCard, isGroup, groupMembers) {
    try {
        const addUserTrans = db.transaction(() => {
            const result = stmtAddUser.run(nullIfEmpty(userName), nullIfEmpty(userEmail), nullIfEmpty(userCard), nullIfEmpty(doorCard), isGroup ? 1 : 0);
            if (isGroup) {
                for (const memberId of groupMembers) {
                    stmtAddGroupMapEntry.run(result.lastInsertRowid, memberId);
                }
            }
        });
        addUserTrans();
        return true;
    }
    catch (e) {
        console.log('Error in addUser: ' + e);
        return false;
    }
}
function editUser(userId, userName, userEmail, userCard, doorCard, isGroup, groupMembers) {
    try {
        const editUserTrans = db.transaction(() => {
            console.log('User edit: name=' + userName + ', email=' + userEmail + ', card=' + userCard + ', doorCard=' + nullIfEmpty(doorCard));
            stmtEditUser.run(userName, nullIfEmpty(userEmail), nullIfEmpty(userCard), nullIfEmpty(doorCard), userId);
            stmtDeleteGroupMap.run(userId);
            if (isGroup) {
                for (const memberId of groupMembers) {
                    stmtAddGroupMapEntry.run(userId, memberId);
                }
            }
        });
        editUserTrans();
        return true;
    }
    catch (e) {
        console.log('Error in editUser: ' + e);
        return false;
    }
}
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
function findDoorCardName(doorCard) {
    try {
        const result = stmtDoorCardQuery.get(doorCard);
        if (result) {
            if (result.card) {
                return { error: "Toolcard already assigned" };
            }
            else {
                return { value: result.fullName };
            }
        }
        else {
            if (addUser("", "", "", doorCard, false, null)) {
                const newUser = stmtDoorCardQuery.get(doorCard);
                if (newUser) {
                    const group = stmtGetGroupId.get("Everyone");
                    if (group) {
                        stmtAddGroupMapEntry.run(group.id, newUser.id);
                    }
                    else {
                        return { error: "Error adding user to the group" };
                    }
                    return { value: newUser.fullName };
                }
                else {
                    return { error: "Error adding user" };
                }
            }
            else {
                return { error: "Error adding user" };
            }
        }
    }
    catch (e) {
        console.log('Error in findDoorCardName: ' + e);
        return { error: "Internal error" };
    }
}
function isToolCardRegistered(toolCard) {
    try {
        const result = stmtIsToolCardRegistered.get(toolCard);
        if (result && result.fullName) {
            return true;
        }
        else {
            return false;
        }
    }
    catch (e) {
        console.log('Error in isToolCardRegistered: ' + e);
        return false;
    }
}
function registerToolCard(doorCard, toolCard) {
    try {
        const result = stmtRegisterToolCard.run(toolCard, doorCard);
        if (result && result.changes == 1) {
            return true;
        }
        else {
            return false;
        }
    }
    catch (e) {
        console.log('Error in registerToolCard: ' + e);
        return false;
    }
}
//# sourceMappingURL=data.js.map