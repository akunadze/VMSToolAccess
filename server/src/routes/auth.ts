import { Router } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { Response as ApiResponse } from '../data';
import * as data from '../data';
import { requireAuth, audit } from '../middleware/auth';

const saltRounds = 10;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: ApiResponse.mkErr('Too many login attempts, please try again later'),
});

export function createAuthRouter(): Router {
  const router = Router();

  router.post('/login', loginLimiter, (req, res) => {
    const user = req.body.user;
    const pass = req.body.password;

    if (!user && !pass && req.session.loggedIn) {
      res.json(ApiResponse.mkData({ id: req.session.userId }));
      return;
    }

    if (!user || !pass) {
      res.status(401).json(ApiResponse.mkErr("Failed authentication"));
      return;
    }

    const portalUsers = data.getPortalUsers();
    const portalUser = portalUsers.find(x => x.name === user);
    if (portalUser && portalUser.password && bcrypt.compareSync(pass, portalUser.password)) {
      console.log('User ' + user + ' logged in');
      req.session.loggedIn = true;
      req.session.userId = portalUser.id;
      req.session.save((err) => {});
      res.json(ApiResponse.mkData({ id: portalUser.id }));
    } else {
      res.status(401).json(ApiResponse.mkErr("Failed authentication"));
    }
  });

  router.post('/changePassword', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const oldPass = req.body.oldPass;
    const newPass = req.body.newPass;

    if (!oldPass || !newPass) {
      res.status(400).json(ApiResponse.mkErr("Malformed request"));
      return;
    }

    const portalUsers = data.getPortalUsers();
    const portalUser = portalUsers.find(x => x.id === userId);
    if (!portalUser) {
      res.status(401).json(ApiResponse.mkErr("Failed authentication"));
      return;
    }

    if (!bcrypt.compareSync(oldPass, portalUser.password)) {
      res.status(401).json(ApiResponse.mkErr("Failed authentication"));
      return;
    }

    const newPassHash = bcrypt.hashSync(newPass, saltRounds);
    if (data.editPortalUser(userId, portalUser.name, newPassHash)) {
      audit(req, "Changed password");
      res.status(200).json(ApiResponse.mkOk());
    } else {
      res.status(500).json(ApiResponse.mkErr("Internal error"));
    }
  });

  router.get('/logout', (req, res) => {
    console.log('Logout called');
    req.session.destroy((err) => {});
    res.status(200).json(ApiResponse.mkOk());
  });

  return router;
}
