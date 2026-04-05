import { sqliteTable, integer, text, unique } from 'drizzle-orm/sqlite-core';

export const tools = sqliteTable('Tools', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  mac: text('mac').unique(),
  lockedout: integer('lockedout').default(0),
});

export const users = sqliteTable('Users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fullName: text('fullName').notNull(),
  email: text('email'),
  card: text('card').unique(),
  doorCard: text('doorCard').unique(),
  isGroup: integer('isGroup', { mode: 'boolean' }).default(false),
});

export const portalUsers = sqliteTable('PortalUsers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  password: text('password'),
});

export const userGroupMap = sqliteTable('UserGroupMap', {
  groupId: integer('groupId').references(() => users.id, { onDelete: 'cascade' }),
  userId: integer('userId').references(() => users.id, { onDelete: 'cascade' }),
});

export const permissions = sqliteTable('Permissions', {
  toolId: integer('toolId').references(() => tools.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  userId: integer('userId').references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
}, t => [unique().on(t.toolId, t.userId)]);

export const accessLog = sqliteTable('AccessLog', {
  toolId: integer('toolId').references(() => tools.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  userId: integer('userId').references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  op: text('op').notNull(),
  timestamp: integer('timestamp'),
  card: text('card'),
  spindleTime: integer('spindleTime').default(0),
});

export const settings = sqliteTable('Settings', {
  key: text('Key').primaryKey(),
  value: text('Value').notNull(),
});

export const auditLog = sqliteTable('AuditLog', {
  userId: integer('userId').references(() => portalUsers.id),
  action: text('action'),
  timestamp: integer('timestamp'),
});
