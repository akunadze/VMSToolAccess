import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Response as ApiResponse } from '../data';
import * as data from '../data';
import { KIOSK_SECRET } from '../config';
import { validateBody } from '../schemas';

const SALT_ROUNDS = 10;

const DOOR_CARD_REGEX = /^[0-9a-fA-F:]{3,20}$/;
const TOOL_CARD_REGEX = /^[0-9a-fA-F]{8}$/;

function requireKioskSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-kiosk-secret'];
  if (!secret || secret !== KIOSK_SECRET) {
    res.status(401).json(ApiResponse.mkErr('Unauthorized'));
    return;
  }
  next();
}

const LookupDoorCardSchema = z.object({
  doorCard: z.string().regex(DOOR_CARD_REGEX, 'Invalid door card format'),
});

const CreateAccountSchema = z.object({
  doorCard: z.string().regex(DOOR_CARD_REGEX, 'Invalid door card format'),
  toolCard: z.string().regex(TOOL_CARD_REGEX, 'Invalid tool card format'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits').optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const ReplaceCardSchema = z.object({
  userId: z.number({ error: 'userId is required' }).int().positive(),
  newToolCard: z.string().regex(TOOL_CARD_REGEX, 'Invalid tool card format'),
  reason: z.enum(['lost', 'damaged']),
});

const ReportFoundCardSchema = z.object({
  toolCard: z.string().regex(TOOL_CARD_REGEX, 'Invalid tool card format'),
});

export function createKioskRouter(): Router {
  const router = Router();

  router.use(requireKioskSecret);

  // Find a user by their door card. Returns { found: true, userId, name } or { found: false }.
  router.post('/kiosk/lookup-door-card', validateBody(LookupDoorCardSchema), (req, res) => {
    const { doorCard } = req.body;
    const user = data.getUserByDoorCard(doorCard);
    if (user) {
      res.json(ApiResponse.mkData({ found: true, userId: user.id, name: user.fullName }));
    } else {
      res.json(ApiResponse.mkData({ found: false }));
    }
  });

  // Create a new account with both door card and tool card assigned.
  router.post('/kiosk/create-account', validateBody(CreateAccountSchema), (req, res) => {
    const { doorCard, toolCard, name, email, phone, password } = req.body;
    const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
    const result = data.createKioskAccount(name, email ?? '', phone ?? '', passwordHash, toolCard, doorCard);
    if ('error' in result) {
      res.status(409).json(ApiResponse.mkErr(result.error));
      return;
    }
    console.log(`[Kiosk] Account created: userId=${result.userId}, name=${name}`);
    res.json(ApiResponse.mkData({ userId: result.userId }));
  });

  // Assign a new tool card to an existing user (replaces lost/damaged card).
  router.post('/kiosk/replace-card', validateBody(ReplaceCardSchema), (req, res) => {
    const { userId, newToolCard, reason } = req.body;
    if (data.isToolCardRegistered(newToolCard)) {
      res.status(409).json(ApiResponse.mkErr('Tool card already registered to another account'));
      return;
    }
    const ok = data.setUserToolCard(userId, newToolCard);
    if (!ok) {
      res.status(500).json(ApiResponse.mkErr('Failed to update tool card'));
      return;
    }
    console.log(`[Kiosk] Tool card replaced: userId=${userId}, reason=${reason}`);
    res.json(ApiResponse.mkOk());
  });

  // Report a found tool card. If registered, detaches it from the owner's account.
  router.post('/kiosk/report-found-card', validateBody(ReportFoundCardSchema), (req, res) => {
    const { toolCard } = req.body;
    const user = data.getUserByToolCard(toolCard);
    if (user) {
      data.setUserToolCard(user.id, null);
      console.log(`[Kiosk] Found card reported and cleared: card=${toolCard}, userId=${user.id}`);
      res.json(ApiResponse.mkData({ wasRegistered: true, userName: user.fullName }));
    } else {
      console.log(`[Kiosk] Found card reported (unregistered): card=${toolCard}`);
      res.json(ApiResponse.mkData({ wasRegistered: false }));
    }
  });

  return router;
}
