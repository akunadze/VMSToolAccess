import { Router } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { Response as ApiResponse, PortalUser } from '../data';
import * as data from '../data';
import { requireAuth, audit } from '../middleware/auth';
import { validateBody, LoginSchema, ChangePasswordSchema, 
         AddPortalUserSchema, EditPortalUserSchema, DeleteSchema } from '../schemas';

const saltRounds = 10;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: ApiResponse.mkErr('Too many login attempts, please try again later'),
});

export function createAuthRouter(sendUpdate: () => void): Router {
  const router = Router();

  router.post('/login', loginLimiter, validateBody(LoginSchema), (req, res) => {
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

  router.post('/changePassword', requireAuth, validateBody(ChangePasswordSchema), (req, res) => {
    const userId = req.session.userId;
    const { oldPass, newPass } = req.body;

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

  router.get('/portalusers', requireAuth, (req, res) => {
    console.log('api/portalusers called');
    const portalUsers: PortalUser[] = data.getPortalUsers();
    // Map to a new array without the password field (#9: avoid mutating cached objects)
    const safe = portalUsers.map(u => ({ id: u.id, name: u.name }));
    res.json(ApiResponse.mkData(safe));
  });

  router.post('/portaluser/add', requireAuth, validateBody(AddPortalUserSchema), (req, res) => {
    console.log('api/portaluser/add called.');
    const { name: userName, password: userPassword } = req.body;

    if (data.addPortalUser(userName, userPassword)) {
      audit(req, `Added portal user ${userName}`);
      res.json(ApiResponse.mkOk());
    } else {
      res.json(ApiResponse.mkErr("Internal error"));
    }

    sendUpdate();
  });

  router.post('/portaluser/edit', requireAuth, validateBody(EditPortalUserSchema), (req, res) => {
    console.log('api/portaluser/edit called.');
    const { id: userId, name: userName, password: newPassword } = req.body;

    const portalUsers: PortalUser[] = data.getPortalUsers();
    const user = portalUsers.find(x => x.id === userId);

    if (!user) {
      res.status(404).json(ApiResponse.mkErr("User not found"));
      return;
    }

    const passHash = newPassword ? bcrypt.hashSync(newPassword, saltRounds) : user.password;

    if (data.editPortalUser(userId, userName, passHash)) {
      audit(req, `Edited portal user ${userName}(${userId})`);
      res.json(ApiResponse.mkOk());
    } else {
      res.json(ApiResponse.mkErr("Internal error"));
    }

    sendUpdate();
  });

  router.post('/portaluser/delete', requireAuth, validateBody(DeleteSchema), (req, res) => {
    console.log('api/portaluser/delete called.');
    const { id: userId } = req.body;
    const portalUsers: PortalUser[] = data.getPortalUsers();
    const user = portalUsers.find(x => x.id === userId);

    if (!user) {
      res.status(404).json(ApiResponse.mkErr("User not found"));
      return;
    }

    if (data.deletePortalUser(userId)) {
      audit(req, `Deleted portal user ${user.name}(${userId})`);
      res.json(ApiResponse.mkOk());
    } else {
      res.json(ApiResponse.mkErr("Internal error"));
    }

    sendUpdate();
  });
  
  return router;
}

