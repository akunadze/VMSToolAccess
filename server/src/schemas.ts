import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { Response as ApiResponse } from './data';

const DOOR_CARD_REGEX = /^([0-9a-fA-F:]{3,20})?$/;
const TOOL_CARD_REGEX = /^([0-9a-fA-F]{8})?$/;
const MAC_REGEX = /^[0-9a-fA-F:.-]{1,30}$/;

const doorCardField = z.string().regex(DOOR_CARD_REGEX, 'Invalid door card format').nullish().transform(v => v || null);
const toolCardField = z.string().regex(TOOL_CARD_REGEX, 'Invalid tool card format').nullish().transform(v => v || null);

// Auth
export const LoginSchema = z.object({
  user: z.string().optional(),
  password: z.string().optional(),
});

export const ChangePasswordSchema = z.object({
  oldPass: z.string().min(1, 'oldPass is required'),
  newPass: z.string().min(1, 'newPass is required'),
});

// Users
export const UserTopToolsSchema = z.object({
  userId: z.number({ error: 'userId is required' }).int(),
});

export const AddUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().optional().nullable(),
  card: toolCardField,
  doorCard: doorCardField,
  members: z.array(z.number().int()).optional(),
});

export const EditUserSchema = z.object({
  id: z.number({ error: 'id is required' }).int().positive(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().optional().nullable(),
  card: toolCardField,
  doorCard: doorCardField,
  members: z.array(z.number().int()).optional(),
});

// Shared
export const DeleteSchema = z.object({
  id: z.number({ error: 'id is required' }).int().positive(),
});

// Tools
const LogEntrySchema = z.object({
  card: z.string(),
  op: z.string(),
  time: z.number().int(),
  spindleTime: z.number().int().default(0),
});

export const HelloSchema = z.object({
  mac: z.string().regex(MAC_REGEX, 'Invalid MAC format'),
  version: z.string().optional(),
  logs: z.array(LogEntrySchema).default([]),
});

export const ToolTopUsersSchema = z.object({
  toolId: z.number({ error: 'toolId is required' }).int(),
});

export const SetLockoutSchema = z.object({
  id: z.number({ error: 'id is required' }).int().positive(),
  islocked: z.boolean({ error: 'islocked is required' }),
});

export const EditToolSchema = z.object({
  toolId: z.number({ error: 'toolId is required' }).int(),
  toolName: z.string().optional(),
  toolUsers: z.array(z.number().int()).optional(),
});

export const SetCheckoutUsersSchema = z.object({
  userIds: z.array(z.number().int()),
});

// Portal Users
export const AddPortalUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(1, 'Password is required'),
});

export const EditPortalUserSchema = z.object({
  id: z.number({ error: 'id is required' }).int().positive(),
  name: z.string().min(1, 'Name is required'),
  password: z.string().optional(),
});

// Enroll
export const EnrollQuerySchema = z.object({
  doorCard: z.string().min(1, 'doorCard is required'),
});

export const EnrollRegisterSchema = z.object({
  doorCard: z.string().regex(DOOR_CARD_REGEX, 'Invalid door card format'),
  toolCard: z.string().regex(TOOL_CARD_REGEX, 'Invalid tool card format'),
});

// Middleware helper
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(ApiResponse.mkErr(result.error.issues[0].message));
      return;
    }
    req.body = result.data;
    next();
  };
}
