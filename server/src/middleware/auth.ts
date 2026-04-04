import { Request, Response, NextFunction } from 'express';
import { Response as ApiResponse } from '../data';
import * as data from '../data';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.loggedIn) {
    res.status(401).json(ApiResponse.mkErr("Not logged in"));
    return;
  }
  next();
}

export function audit(req: Request, action: string): void {
  data.addAuditEntry(req.session.userId, action);
}
