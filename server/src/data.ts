import BetterSqlite3 from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, desc, and, isNull, sql } from 'drizzle-orm';
import * as schema from './db/schema';
import {
  tools as toolsTable,
  users as usersTable,
  userGroupMap as userGroupMapTable,
  permissions as permissionsTable,
  accessLog as accessLogTable,
  settings as settingsTable,
  portalUsers as portalUsersTable,
  auditLog as auditLogTable,
} from './db/schema';

let db: BetterSQLite3Database<typeof schema>;

function nullIfEmpty(x: string): string | null {
  return x ? x : null;
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

export class PortalUser {
  id: number;
  name: string;
  password: string;

  constructor(id: number, name: string, password: string) {
    this.id = id;
    this.name = name;
    this.password = password;
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
  lastEntry?: LogEntry;
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
    obj.error = undefined;
    return obj;
  }

  static mkData(data: any) {
    let obj = new Response();
    obj.data = data;
    obj.error = undefined;
    return obj;
  }

  static mkErr(message: string | undefined) {
    let obj = new Response();
    obj.data = undefined;
    obj.error = message;
    return obj;
  }
}

export function initData() {
  try {
    const sqlite = new BetterSqlite3(__dirname + '/../data/toolaccess.db');

    sqlite.exec(`
      CREATE TRIGGER IF NOT EXISTS DefaultName
               AFTER INSERT ON Tools
          FOR EACH ROW WHEN NEW.name IS NULL
      BEGIN
          UPDATE Tools SET name = '<New Tool ' || NEW.id || '>' WHERE rowid = NEW.rowid;
      END;

      PRAGMA foreign_keys = on;
    `);

    db = drizzle(sqlite, { schema });
  } catch(e) {
    console.log('Error in initData: ' + e);
  }
}

export function getTools(): Tool[] {
  try {
    const rows = db.select({
      id: toolsTable.id,
      name: toolsTable.name,
      mac: toolsTable.mac,
      lockedout: toolsTable.lockedout,
      spindleTime: sql<number>`coalesce(sum(${accessLogTable.spindleTime}), 0)`.as('spindleTime'),
    })
    .from(toolsTable)
    .leftJoin(accessLogTable, and(
      eq(accessLogTable.toolId, toolsTable.id),
      eq(accessLogTable.op, 'out')
    ))
    .groupBy(toolsTable.id)
    .all();

    return rows.map(row => {
      const tool = new Tool(row.id, row.name ?? '', row.mac ?? '', row.lockedout ?? 0, row.spindleTime);

      tool.users = db.select({ userId: permissionsTable.userId })
        .from(permissionsTable)
        .where(eq(permissionsTable.toolId, row.id))
        .all()
        .map(r => r.userId ?? 0);

      const lastRow = db.select()
        .from(accessLogTable)
        .where(eq(accessLogTable.toolId, row.id))
        .orderBy(desc(accessLogTable.timestamp))
        .limit(1)
        .all()[0];

      tool.lastEntry = lastRow
        ? new LogEntry(lastRow.userId ?? 0, lastRow.timestamp ?? 0, lastRow.op, lastRow.card ?? '', lastRow.spindleTime ?? 0)
        : undefined;

      tool.currentUserId = tool.lastEntry?.op === 'in' ? tool.lastEntry.userId : 0;

      const utilRow = db.get<{ util: number | null }>(sql`
        WITH lengths AS (
          SELECT *,
            IIF(op = 'out' AND (LAG(op) OVER (PARTITION BY userId ORDER BY timestamp)) = 'in'
              AND userId = (LAG(userId) OVER (PARTITION BY userId ORDER BY timestamp)),
              timestamp - LAG(timestamp, 1, 0) OVER (PARTITION BY userId ORDER BY timestamp), 0) AS length
          FROM AccessLog
          WHERE toolId = ${row.id}
          ORDER BY timestamp
        )
        SELECT ROUND(SUM(length) * 100.0 / (strftime('%s','now') - MIN(timestamp)), 2) AS util
        FROM lengths
      `);
      tool.utilization = utilRow?.util ?? 0;

      return tool;
    });
  } catch(e) {
    console.log('Error in getTools: ' + e);
    return [];
  }
}

export function getToolsUtilStats() {
  try {
    return db.all(sql`
      WITH lengths AS (
        SELECT *,
          IIF(op = 'out' AND (LAG(op) OVER (PARTITION BY userId ORDER BY timestamp)) = 'in'
            AND userId = (LAG(userId) OVER (PARTITION BY userId ORDER BY timestamp)),
            timestamp - LAG(timestamp, 1, 0) OVER (PARTITION BY userId ORDER BY timestamp), 0) AS length
        FROM AccessLog
        ORDER BY timestamp
      )
      SELECT toolId, name,
        ROUND((SUM(length) * (7*24.0)) / (strftime('%s','now') - MIN(timestamp)), 1) AS HoursPerWeek
      FROM lengths
      JOIN tools ON toolId = id
      GROUP BY toolId
    `);
  } catch(e) {
    console.log('Error in getToolsUtilStats: ' + e);
    return [];
  }
}

export function getToolLog(toolId: number): LogEntry[] {
  try {
    const rows = db.select()
      .from(accessLogTable)
      .where(eq(accessLogTable.toolId, toolId))
      .orderBy(desc(accessLogTable.timestamp))
      .all();

    return rows.map(r => new LogEntry(r.userId ?? 0, r.timestamp ?? 0, r.op, r.card ?? '', r.spindleTime ?? 0));
  } catch(e) {
    console.log('Error in getToolLog: ' + e);
    return [];
  }
}

export function getToolTopUsers(toolId: number) {
  try {
    return db.all(sql`
      WITH lengths AS (
        SELECT *,
          IIF(op = 'out' AND (LAG(op) OVER (PARTITION BY userId ORDER BY timestamp)) = 'in'
            AND userId = (LAG(userId) OVER (PARTITION BY userId ORDER BY timestamp)),
            timestamp - LAG(timestamp, 1, 0) OVER (PARTITION BY userId ORDER BY timestamp), 0) AS length
        FROM AccessLog
        WHERE toolId = ${toolId} AND userId IS NOT NULL
        ORDER BY timestamp
      )
      SELECT userId, SUM(spindleTime) as spindleTime, SUM(length) as userTotal
      FROM lengths
      WHERE op = 'out'
      GROUP BY userId
      ORDER BY spindleTime DESC, userTotal DESC
      LIMIT 10
    `);
  } catch(e) {
    console.log('Error in getToolTopUsers: ' + e);
    return [];
  }
}

export function getUserTopTools(userId: number) {
  try {
    return db.all(sql`
      WITH lengths AS (
        SELECT *,
          IIF(op = 'out' AND (LAG(op) OVER (PARTITION BY toolId ORDER BY timestamp)) = 'in'
            AND toolId = (LAG(toolId) OVER (PARTITION BY toolId ORDER BY timestamp)),
            timestamp - LAG(timestamp, 1, 0) OVER (PARTITION BY userId ORDER BY timestamp), 0) AS length
        FROM AccessLog
        WHERE userId = ${userId}
        ORDER BY timestamp
      )
      SELECT toolId, SUM(length) AS totalTime, SUM(spindleTime) as totalSpindleTime
      FROM lengths
      GROUP BY toolId
      ORDER BY totalSpindleTime DESC, totalTime DESC
    `);
  } catch(e) {
    console.log('Error in getUserTopTools: ' + e);
    return [];
  }
}

export function getUsers(): User[] {
  try {
    const rows = db.select()
      .from(usersTable)
      .orderBy(desc(usersTable.isGroup), sql`${usersTable.fullName} COLLATE NOCASE`)
      .all();

    return rows.map(row => {
      const members = row.isGroup
        ? db.select({ id: usersTable.id })
            .from(usersTable)
            .innerJoin(userGroupMapTable, eq(usersTable.id, userGroupMapTable.userId))
            .where(eq(userGroupMapTable.groupId, row.id))
            .all()
            .map(r => r.id!)
        : [];

      return new User(row.id, row.fullName, row.email ?? '', row.card ?? '', row.doorCard ?? '', row.isGroup ?? false, members);
    });
  } catch(e) {
    console.log('Error in getUsers: ' + e);
    return [];
  }
}

export function getPortalUsers(): PortalUser[] {
  try {
    return db.select()
      .from(portalUsersTable)
      .all()
      .map(r => new PortalUser(r.id, r.name ?? '', r.password ?? ''));
  } catch(e) {
    console.log('Error in getPortalUsers: ' + e);
    return [];
  }
}

export function addTool(toolMac: string): boolean {
  try {
    db.insert(toolsTable).values({ mac: toolMac }).run();
    return true;
  } catch(e) {
    console.log('Error in addTool: ' + e);
    return false;
  }
}

export function deleteTool(toolId: number): boolean {
  try {
    db.delete(toolsTable).where(eq(toolsTable.id, toolId)).run();
    return true;
  } catch(e) {
    console.log('Error in deleteTool: ' + e);
    return false;
  }
}

export function editTool(toolId: number, toolName: string): boolean {
  try {
    db.update(toolsTable).set({ name: toolName }).where(eq(toolsTable.id, toolId)).run();
    return true;
  } catch(e) {
    console.log('Error in editTool: ' + e);
    return false;
  }
}

export function setToolLockout(toolId: number, isLocked: boolean): boolean {
  try {
    db.update(toolsTable).set({ lockedout: isLocked ? 1 : 0 }).where(eq(toolsTable.id, toolId)).run();
    return true;
  } catch(e) {
    console.log('Error in setToolLockout: ' + e);
    return false;
  }
}

export function setToolUsers(toolId: number, userIds: number[]): boolean {
  try {
    db.transaction(tx => {
      tx.delete(permissionsTable).where(eq(permissionsTable.toolId, toolId)).run();
      for (const userId of userIds) {
        tx.insert(permissionsTable).values({ toolId, userId }).run();
      }
    });
    return true;
  } catch(e) {
    console.log('Error in setToolUsers: ' + e);
    return false;
  }
}

export function addUser(userName: string, userEmail: string, userCard: string, doorCard: string, isGroup: boolean, groupMembers: number[] | null): boolean {
  try {
    db.transaction(tx => {
      let fullName: string;
      const providedName = nullIfEmpty(userName);
      if (providedName) {
        fullName = providedName;
      } else {
        const row = tx.get<{ nextId: number }>(sql`SELECT coalesce(max(id), 0) + 1 AS nextId FROM Users`);
        fullName = `New User ${row?.nextId ?? 1}`;
      }

      const result = tx.insert(usersTable).values({
        fullName,
        email: nullIfEmpty(userEmail),
        card: nullIfEmpty(userCard),
        doorCard: nullIfEmpty(doorCard),
        isGroup,
      }).run();

      if (isGroup && groupMembers) {
        for (const memberId of groupMembers) {
          tx.insert(userGroupMapTable).values({ groupId: Number(result.lastInsertRowid), userId: memberId }).run();
        }
      }
    });
    return true;
  } catch(e) {
    console.log('Error in addUser: ' + e);
    return false;
  }
}

export function editUser(userId: number, userName: string, userEmail: string, userCard: string, doorCard: string, isGroup: boolean, groupMembers: number[]): boolean {
  try {
    db.transaction(tx => {
      console.log('User edit: name=' + userName + ', email=' + userEmail + ', card=' + userCard + ', doorCard=' + nullIfEmpty(doorCard));
      tx.update(usersTable).set({
        fullName: userName,
        email: nullIfEmpty(userEmail),
        card: nullIfEmpty(userCard),
        doorCard: nullIfEmpty(doorCard),
      }).where(eq(usersTable.id, userId)).run();

      tx.delete(userGroupMapTable).where(eq(userGroupMapTable.groupId, userId)).run();

      if (isGroup && groupMembers) {
        for (const memberId of groupMembers) {
          tx.insert(userGroupMapTable).values({ groupId: userId, userId: memberId }).run();
        }
      }
    });
    return true;
  } catch(e) {
    console.log('Error in editUser: ' + e);
    return false;
  }
}

export function deleteUser(userId: number): boolean {
  try {
    db.delete(usersTable).where(eq(usersTable.id, userId)).run();
    return true;
  } catch(e) {
    console.log('Error in deleteUser: ' + e);
    return false;
  }
}

export function addPortalUser(name: string, password: string): boolean {
  try {
    db.insert(portalUsersTable).values({ name: nullIfEmpty(name), password: nullIfEmpty(password) }).run();
    return true;
  } catch(e) {
    console.log('Error in addPortalUser: ' + e);
    return false;
  }
}

export function editPortalUser(userId: number, name: string, password: string): boolean {
  try {
    db.update(portalUsersTable).set({ name: nullIfEmpty(name), password: nullIfEmpty(password) })
      .where(eq(portalUsersTable.id, userId)).run();
    return true;
  } catch(e) {
    console.log('Error in editPortalUser: ' + e);
    return false;
  }
}

export function deletePortalUser(userId: number): boolean {
  try {
    db.delete(portalUsersTable).where(eq(portalUsersTable.id, userId)).run();
    return true;
  } catch(e) {
    console.log('Error in deletePortalUser: ' + e);
    return false;
  }
}

export function addLogEntry(toolId: number, userId: number, time: number, op: string, card: string, spindleTime: number): boolean {
  try {
    db.insert(accessLogTable).values({ toolId, userId, timestamp: time, op, card, spindleTime }).run();
    return true;
  } catch(e) {
    console.log('Error in addLogEntry: ' + e);
    return false;
  }
}



export function findDoorCardName(doorCard: string): { value?: string; error?: string } {
  try {
    const row = db.select({ id: usersTable.id, fullName: usersTable.fullName, card: usersTable.card })
      .from(usersTable)
      .where(eq(usersTable.doorCard, doorCard))
      .all()[0];

    if (row) {
      if (row.card) {
        return { error: 'Toolcard already assigned' };
      } else {
        return { value: row.fullName };
      }
    } else {
      if (addUser('', '', '', doorCard, false, null)) {
        const newRow = db.select({ id: usersTable.id, fullName: usersTable.fullName })
          .from(usersTable)
          .where(eq(usersTable.doorCard, doorCard))
          .all()[0];

        if (newRow) {
          const group = db.select({ id: usersTable.id })
            .from(usersTable)
            .where(eq(usersTable.fullName, 'Everyone'))
            .all()[0];

          if (group) {
            db.insert(userGroupMapTable).values({ groupId: group.id, userId: newRow.id }).run();
          } else {
            return { error: 'Error adding user to the group' };
          }

          return { value: newRow.fullName };
        } else {
          return { error: 'Error adding user' };
        }
      } else {
        return { error: 'Error adding user' };
      }
    }
  } catch(e) {
    console.log('Error in findDoorCardName: ' + e);
    return { error: 'Internal error' };
  }
}

export function isToolCardRegistered(toolCard: string): boolean {
  try {
    const row = db.select({ fullName: usersTable.fullName })
      .from(usersTable)
      .where(eq(usersTable.card, toolCard))
      .all()[0];
    return !!(row && row.fullName);
  } catch(e) {
    console.log('Error in isToolCardRegistered: ' + e);
    return false;
  }
}

export function registerToolCard(doorCard: string, toolCard: string): boolean {
  try {
    const result = db.update(usersTable)
      .set({ card: toolCard })
      .where(and(eq(usersTable.doorCard, doorCard), isNull(usersTable.card)))
      .run();
    return result.changes === 1;
  } catch(e) {
    console.log('Error in registerToolCard: ' + e);
    return false;
  }
}

export function addAuditEntry(userId: number, action: string): boolean {
  try {
    const result = db.insert(auditLogTable).values({ userId, action }).run();
    return result.changes === 1;
  } catch(e) {
    console.log('Error in addAuditEntry: ' + e);
    return false;
  }
}
