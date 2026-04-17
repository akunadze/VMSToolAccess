import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Response as ApiResponse } from '../data';
import * as data from '../data';
import { KIOSK_SECRET } from '../config';
import { validateBody } from '../schemas';


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
});

const ReplaceCardSchema = z.object({
  userId: z.number({ error: 'userId is required' }).int().positive(),
  newToolCard: z.string().regex(TOOL_CARD_REGEX, 'Invalid tool card format'),
  reason: z.enum(['lost', 'damaged']),
});

const ReportFoundCardSchema = z.object({
  toolCard: z.string().regex(TOOL_CARD_REGEX, 'Invalid tool card format'),
});

const CheckoutGetUserToolsSchema = z.object({
  doorCard: z.string().regex(DOOR_CARD_REGEX, 'Invalid door card format'),
});

const CheckoutLookupToolCardSchema = z.object({
  toolCard: z.string().regex(TOOL_CARD_REGEX, 'Invalid tool card format'),
});

const CheckoutAddPermissionsSchema = z.object({
  toolIds: z.array(z.number().int().positive()).min(1, 'At least one tool is required'),
  userIds: z.array(z.number().int().positive()).min(1, 'At least one user is required'),
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
    const { doorCard, toolCard, name, email, phone } = req.body;
    const result = data.createKioskAccount(name, email ?? '', phone ?? '', toolCard, doorCard);
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

  // Tool Checkout step 1: look up user by door card and return their authorized tools.
  // Returns { found: true, userId, name, tools: [{id, name}] } or { found: false }.
  router.post('/kiosk/checkout-get-user-tools', validateBody(CheckoutGetUserToolsSchema), (req, res) => {
    const { doorCard } = req.body;
    const user = data.getUserByDoorCard(doorCard);
    if (!user) {
      res.json(ApiResponse.mkData({ found: false }));
      return;
    }
    const tools = data.getUserAuthorizedTools(user.id);
    res.json(ApiResponse.mkData({ found: true, userId: user.id, name: user.fullName, tools }));
  });

  // Tool Checkout step 2: look up a user by their tool (RFID) card.
  // Returns { found: true, userId, name } or { found: false }.
  router.post('/kiosk/checkout-lookup-tool-card', validateBody(CheckoutLookupToolCardSchema), (req, res) => {
    const { toolCard } = req.body;
    const user = data.getUserByToolCard(toolCard);
    if (!user) {
      res.json(ApiResponse.mkData({ found: false }));
      return;
    }
    res.json(ApiResponse.mkData({ found: true, userId: user.id, name: user.fullName }));
  });

  // Tool Checkout step 3: grant a set of users access to a set of tools.
  router.post('/kiosk/checkout-add-permissions', validateBody(CheckoutAddPermissionsSchema), (req, res) => {
    const { toolIds, userIds } = req.body;
    const ok = data.addPermissionsBulk(toolIds, userIds);
    if (!ok) {
      res.status(500).json(ApiResponse.mkErr('Failed to update permissions'));
      return;
    }
    console.log(`[Kiosk] Checkout permissions added: tools=${toolIds}, users=${userIds}`);
    res.json(ApiResponse.mkOk());
  });

  return router;
}
