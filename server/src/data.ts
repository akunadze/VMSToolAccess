import sqlite3 from 'better-sqlite3';

var db: sqlite3.Database;
var stmtGetTools: sqlite3.Statement;
var stmtGetUsers: sqlite3.Statement;
var stmtGetGroupUsers: sqlite3.Statement;
var stmtGetToolUsers: sqlite3.Statement;
var stmtGetToolLog: sqlite3.Statement;
var stmtAddTool: sqlite3.Statement;
var stmtDeleteTool: sqlite3.Statement;
var stmtEditTool: sqlite3.Statement;
var stmtAddPermission: sqlite3.Statement;
var stmtDeleteAllPermissions: sqlite3.Statement;
var stmtAddUser: sqlite3.Statement;
var stmtEditUser: sqlite3.Statement;
var stmtAddGroupMapEntry: sqlite3.Statement;
var stmtDeleteGroupMap: sqlite3.Statement;
var stmtDeleteUser: sqlite3.Statement;
var stmtAddLogEntry: sqlite3.Statement;
var stmtGetSetting: sqlite3.Statement;
var stmtPutSetting: sqlite3.Statement;
var stmtGetToolUtil: sqlite3.Statement;
var stmtGetAllToolsUtil: sqlite3.Statement;
var stmtGetTopToolUsers: sqlite3.Statement;
var stmtDoorCardQuery: sqlite3.Statement;
var stmtRegisterToolCard: sqlite3.Statement;
var stmtIsToolCardRegistered: sqlite3.Statement;
var stmtGetGroupId:  sqlite3.Statement;
var stmtSetToolLockout:  sqlite3.Statement;

interface ToolData {
    id: number;
    name: string;
    mac: string;
    lockedout: number;
    spindleTime: number;
}

interface ToolUserData {
    userId: number;
}

interface LogEntryData {
    userId: number;
    timestamp: number;
    op: string;
    card: string;
    spindleTime: number;
}

interface UtilizationData {
    util: number;
}

interface UserData {
    id: number;
    fullName: string;
    email: string;
    card: string;
    doorCard: string;
    isGroup: boolean;
}

interface SettingData {
    Key: string;
    Value: string;
}

interface DoorCardData {
    id: number;
    fullName: string;
    card: string;
}

interface GroupIdData {
    id: number;
}

interface ToolCardRegisteredData {
    fullName: string;
}

function nullIfEmpty(x: string) {
    if (x) {
        return x;
    } else {
        return null;
    }
}

export class User {
    id: number;
    fullName: string;
    email: string;
    card: string;
    doorCard: string;
    group: boolean;
    members: number[];

    constructor(id: number, fullname: string, email: string, card: string, doorCard: string, group: boolean, members: number[]) {
        this.id = id;
        this.fullName = fullname;
        this.email = email;
        this.card = card;
        this.doorCard = doorCard;
        this.group = group;
        this.members = members;
    }
}
      
export class LogEntry {
    userId: number;
    timestamp: number;
    op: string;
    card: string;
    spindleTime: number;

    constructor(userId: number, timestamp: number, op: string, card: string, spindleTime: number) {
        this.userId = userId;
        this.timestamp = timestamp;
        this.op = op;
        this.card = card;
        this.spindleTime = spindleTime;
    }
}

export class Tool {
    id: number;
    name: string;
    users: number[];
    log: LogEntry[];
    currentUserId: number;
    mac: string;
    offline: boolean;
    utilization: number;
    isLocked: boolean;
    spindleTime: number;
    version?: number;

    constructor(id: number, name: string, mac: string, lockedout: number, spindleTime: number) {
        this.id = id;
        this.name = name;
        this.mac = mac;
        this.isLocked = (lockedout === 1);
        this.users = [];
        this.log = [];
        this.currentUserId = 0;
        this.offline = true;
        this.utilization = 0;
        this.spindleTime = spindleTime;
    }
}

export class Response {
    data?: any;
    error?: string;

    static mkOk() {
        let obj = new Response();
        obj.data = {};
        obj.error = null;
        return obj;
    }

    static mkData(data: any) {
        let obj = new Response();
        obj.data = data;
        obj.error = null;
        return obj;
    }

    static mkErr(message: string) {
        let obj = new Response();
        obj.data = null;
        obj.error = message;
        return obj;
    }
}

export function initData() {
    try {
        db = new sqlite3(__dirname + '/../data/toolaccess.db');

        db.exec(`
        PRAGMA foreign_keys = off;
        BEGIN TRANSACTION;
        
        -- Table: AccessLog
        CREATE TABLE IF NOT EXISTS AccessLog (
            toolId    INTEGER REFERENCES Tools (id) ON DELETE CASCADE
                                                    ON UPDATE CASCADE,
            userId    INTEGER REFERENCES Users (id) ON DELETE CASCADE
                                                    ON UPDATE CASCADE,
            op        STRING  NOT NULL,
            timestamp INTEGER DEFAULT (strftime('%s', 'now') ),
            card      STRING,
            spindleTime INTEGER DEFAULT (0)
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
            mac  STRING  UNIQUE,
            lockedout INTEGER DEFAULT (0) 
        );
        
        
        -- Table: UserGroupMap
        CREATE TABLE IF NOT EXISTS UserGroupMap (
            groupId INTEGER REFERENCES Users (id),
            userId  INTEGER REFERENCES Users (id) ON DELETE CASCADE
        );
        
        
        -- Table: Users
        CREATE TABLE IF NOT EXISTS Users (
            id       INTEGER PRIMARY KEY ASC,
            fullName STRING  NOT NULL
                             DEFAULT ('New User ' || LAST_INSERT_ROWID() ),
            email    STRING,
            card     STRING  UNIQUE,
            doorCard STRING  UNIQUE ON CONFLICT IGNORE,
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

        stmtGetTools = db.prepare(`
            SELECT id, name, mac, lockedout, coalesce(sum(al.spindleTime), 0) as spindleTime 
            FROM Tools 
            LEFT JOIN AccessLog al 
            ON id = al.toolId AND al.op = 'out'
            GROUP BY id
        `);
        stmtGetToolUsers = db.prepare(`
            SELECT userId 
            FROM Permissions 
            WHERE toolId = ?
        `);
        stmtGetToolLog = db.prepare(`
            SELECT userId, op, timestamp, card, spindleTime 
            FROM AccessLog 
            WHERE toolId = ? 
            ORDER BY timestamp DESC
        `);
        stmtGetUsers = db.prepare(`
            SELECT id, fullName, email, card, doorCard, isGroup 
            FROM Users 
            ORDER BY isGroup DESC, fullName COLLATE NOCASE
        `);
        stmtGetGroupUsers = db.prepare(`
            SELECT id 
            FROM Users 
            INNER JOIN UserGroupMap ON Users.id = UserGroupMap.userId 
            WHERE UserGroupMap.groupId = ?
        `);
        stmtAddTool = db.prepare(`
            INSERT INTO Tools(mac) 
            VALUES(?)
        `);
        stmtDeleteTool = db.prepare(`
            DELETE FROM Tools 
            WHERE id = ?
        `);
        stmtEditTool = db.prepare(`
            UPDATE Tools 
            SET name = ? 
            WHERE id = ?
        `);
        stmtAddPermission = db.prepare(`
            INSERT INTO Permissions (toolId, userId) 
            VALUES (?,?)
        `);
        stmtAddUser = db.prepare(`
            INSERT INTO Users(fullName, email, card, doorCard, isGroup) 
            VALUES(IFNULL(?, 'New User ' || (select max(id) + 1 from Users)),?,?,?,?)
        `);
        stmtDeleteAllPermissions = db.prepare(`
            DELETE FROM Permissions 
            WHERE toolId = ?
        `);
        stmtAddLogEntry = db.prepare(`
            INSERT INTO AccessLog (toolId, userId, timestamp, op, card, spindleTime) 
            VALUES (?,?,?,?,?,?)
        `);
        stmtEditUser = db.prepare(`
            UPDATE Users 
            SET fullName = ?, email = ?, card = ?, doorCard = ? 
            WHERE id = ?
        `);
        stmtAddGroupMapEntry = db.prepare(`
            INSERT INTO UserGroupMap(groupId, userId) 
            VALUES(?,?)
        `);
        stmtDeleteGroupMap = db.prepare(`
            DELETE FROM UserGroupMap 
            WHERE groupId = ?
        `);
        stmtDeleteUser = db.prepare(`
            DELETE FROM Users 
            WHERE id = ?
        `);
        stmtGetSetting = db.prepare(`
            SELECT Value 
            FROM Settings 
            WHERE Key = ?
        `);
        stmtPutSetting = db.prepare(`
            REPLACE INTO Settings(Key, Value) 
            VALUES (?,?)
        `);
        stmtGetToolUtil = db.prepare(`
            WITH lengths AS (
            SELECT *, 
                    IIF(op = 'out' AND (LAG(op) OVER (PARTITION BY userId ORDER BY timestamp)) = 'in' AND userId = (LAG(userId) OVER (PARTITION BY userId ORDER BY timestamp)), 
                    timestamp - LAG(timestamp, 1, 0) OVER (PARTITION BY userId ORDER BY timestamp), 0) AS length
            FROM AccessLog 
            WHERE toolId = ? 
            ORDER BY timestamp
            ) 
            SELECT ROUND(SUM(length) * 100.0 / (strftime('%s','now') - MIN(timestamp)), 2) AS util 
            FROM lengths
        `);
        
        stmtGetAllToolsUtil = db.prepare(`
            WITH lengths AS (
                SELECT *,
                        IIF(op = 'out' AND (LAG(op) OVER (PARTITION BY userId ORDER BY timestamp)) = 'in' AND userId = (LAG(userId) OVER (PARTITION BY userId ORDER BY timestamp)), 
                        timestamp - LAG(timestamp, 1, 0) OVER (PARTITION BY userId ORDER BY timestamp), 0) AS length
                FROM AccessLog
                ORDER BY timestamp
            )
            SELECT toolId, name, 
                ROUND((SUM(length) * (7*24.0)) / (strftime('%s','now') - MIN(timestamp)), 1) AS HoursPerWeek
            FROM lengths
            JOIN tools ON toolId = id
            GROUP BY toolId;
        `);
        
        stmtGetTopToolUsers = db.prepare(`
            WITH lengths AS (            
            SELECT *, 
                    IIF(op = 'out' AND (LAG(op) OVER (PARTITION BY userId ORDER BY timestamp)) = 'in' AND userId = (LAG(userId) OVER (PARTITION BY userId ORDER BY timestamp)), 
                    timestamp - LAG(timestamp, 1, 0) OVER (PARTITION BY userId ORDER BY timestamp), 0) AS length
                FROM AccessLog
                WHERE toolId = ? AND userId IS NOT NULL
                ORDER BY timestamp
            )
            SELECT userId, SUM(spindleTime) as spindleTime, SUM(length) as userTotal 
            FROM lengths 
            WHERE op = 'out' 
            GROUP BY userId 
            ORDER BY spindleTime DESC, userTotal DESC
        `);

        stmtDoorCardQuery = db.prepare("SELECT id, fullName, card FROM Users WHERE doorCard = ?");
        stmtRegisterToolCard = db.prepare("UPDATE Users SET card = ? WHERE doorCard = ? AND card IS NULL");
        stmtIsToolCardRegistered = db.prepare("SELECT fullName FROM Users WHERE card = ?");
        stmtGetGroupId = db.prepare("SELECT id FROM Users WHERE fullName = ?");
        stmtSetToolLockout = db.prepare("UPDATE tools SET lockedout = ? WHERE id = ?");
    } catch(e) {
        console.log('Error in initData: ' + e);
    }
}

export function getTools() {
    try {
        const result = stmtGetTools.all() as ToolData[];
        return result.map(x => {
            const newTool = new Tool(x.id, x.name, x.mac, x.lockedout, x.spindleTime);
            newTool.users = stmtGetToolUsers.all(x.id).map((u: ToolUserData) => u.userId);
            const logEntries = stmtGetToolLog.all(x.id) as LogEntryData[];
            newTool.log = logEntries.map(l => new LogEntry(l.userId, l.timestamp, l.op, l.card, l.spindleTime));
            newTool.currentUserId = newTool.log.length > 0 && newTool.log[0].op === "in" ? newTool.log[0].userId : 0;
            const utilResult = stmtGetToolUtil.get(x.id) as UtilizationData;
            newTool.utilization = utilResult.util;
            return newTool;
        });
    } catch(e) {
        console.log('Error in getTools: ' + e);
        return [];
    }
}

export function getToolsUtilStats() {
    try {
        const result = stmtGetAllToolsUtil.all();
        return result;
    } catch(e) {
        console.log('Error in getToolsUtilStats: ' + e);
        return [];
    }
}

export function getToolTopUsers(toolId: number) {
    try {
        const result = stmtGetTopToolUsers.all(toolId);
        return result;
    } catch(e) {
        console.log('Error in getToolTopUsers: ' + e);
        return [];
    }
}

export function getUsers(): User[] {
    try {
        const result = stmtGetUsers.all() as UserData[];
        const map = result.map(x => new this.User(x.id, x.fullName, x.email, x.card, x.doorCard, x.isGroup, x.isGroup ? stmtGetGroupUsers.all(x.id).map((y:GroupIdData) => y.id) : []));
        return map;
    } catch(e) {
        console.log('Error in getUsers: ' + e);
        return [];
    }
}

export function addTool(toolMac: string) {
    try {
        const result = stmtAddTool.run(toolMac);
        return true;
    } catch(e) {
        console.log('Error in addTool: ' + e);
        return false;
    }
}

export function deleteTool(toolId: number) {
    try {
        const result = stmtDeleteTool.run(toolId);
        return true;
    } catch(e) {
        console.log('Error in deleteTool: ' + e);
        return false;
    }
}

export function setToolLockout(toolId: number, isLocked: boolean) {
    try {
        const result = stmtSetToolLockout.run(isLocked ? 1 : 0, toolId);
        return true;
    } catch(e) {
        console.log('Error in setToolLockout: ' + e);
        return false;
    }
}

export function editTool(toolId: number, toolName: string) {
    try {
        const result = stmtEditTool.run(toolName, toolId);
        return true;
    } catch(e) {
        console.log('Error in addTool: ' + e);
        return false;
    }
}

export function setToolUsers(toolId: number, userIds: number[]) {
    try {
        const result = db.transaction(() => {
            stmtDeleteAllPermissions.run(toolId);
            for (const userId of userIds) {
                stmtAddPermission.run(toolId, userId);
            }
        });
        result();
        return true;
    } catch(e) {
        console.log('Error in setToolUsers: ' + e);
        return false;
    }
}

export function addUser(userName: string, userEmail: string, userCard: string, doorCard: string, isGroup: boolean, groupMembers: number[]) {
    try {
        const addUserTrans = db.transaction (() => {
            const result = stmtAddUser.run(nullIfEmpty(userName), nullIfEmpty(userEmail), nullIfEmpty(userCard), nullIfEmpty(doorCard), isGroup ? 1 : 0);
            if (isGroup) {
                for (const memberId of groupMembers) {
                    stmtAddGroupMapEntry.run(result.lastInsertRowid, memberId);
                }
            }
        });
        
        addUserTrans();

        return true;
    } catch(e) {
        console.log('Error in addUser: ' + e);
        return false;
    }
}

export function editUser(userId: number, userName: string, userEmail: string, userCard: string, doorCard: string, isGroup: boolean, groupMembers: number[]) {
    try {
        const editUserTrans = db.transaction (() => {
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
    } catch(e) {
        console.log('Error in editUser: ' + e);
        return false;
    }
}

export function deleteUser(userId: number) {
    try {
        const result = stmtDeleteUser.run(userId);
        return true;
    } catch(e) {
        console.log('Error in deleteUser: ' + e);
        return false;
    }
}


export function addLogEntry(toolId: number, userId: number, time:number, op: string, card: string, spindleTime: number) {
    try {
        const result = stmtAddLogEntry.run(toolId, userId, time, op, card, spindleTime);
        return true;
    } catch(e) {
        console.log('Error in addUser: ' + e);
        return false;
    }
}

export function getAdminPass() {
    try {
        const result = stmtGetSetting.get('AdminPass') as SettingData;
        if (result) {
            return result.Value;
        } else {
            return null;
        }
    } catch(e) {
        console.log('Error in getAdminPass: ' + e);
        return null;
    }
}

export function setAdminPass(newPass: string) {
    try {
        const result = stmtPutSetting.run('AdminPass', newPass);
        return true;
    } catch(e) {
        console.log('Error in setAdminPass: ' + e);
        return false;
    }
}

export function findDoorCardName(doorCard: string) {
    try {
        const result = stmtDoorCardQuery.get(doorCard) as DoorCardData;
        if (result) {
            if (result.card) {
                return {error: "Toolcard already assigned"};
            } else {
                return {value: result.fullName};
            }
        } else {
            if (addUser("","","",doorCard,false,null)) {
                const newUser = stmtDoorCardQuery.get(doorCard) as DoorCardData;
                if (newUser) {
                    const group = stmtGetGroupId.get("Everyone") as GroupIdData;
                    if (group) {
                        stmtAddGroupMapEntry.run(group.id, newUser.id);
                    } else {
                        return {error: "Error adding user to the group"};
                    }
                    
                    return {value: newUser.fullName};
                } else {
                    return {error: "Error adding user"};
                }
            } else {
                return {error: "Error adding user"};
            }
        }
    } catch(e) {
        console.log('Error in findDoorCardName: ' + e);
        return {error: "Internal error"};
    }
}

export function isToolCardRegistered(toolCard: string) {
    try {
        const result = stmtIsToolCardRegistered.get(toolCard) as ToolCardRegisteredData;
        if (result && result.fullName) {
            return true;
        } else {
            return false;
        }
    } catch(e) {
        console.log('Error in isToolCardRegistered: ' + e);
        return false;
    }
}

export function registerToolCard(doorCard: string, toolCard: string) {
    try {
        const result = stmtRegisterToolCard.run(toolCard, doorCard);
        if (result && result.changes == 1) {
            return true;
        } else {
            return false;
        }
    } catch(e) {
        console.log('Error in registerToolCard: ' + e);
        return false;
    }
}
