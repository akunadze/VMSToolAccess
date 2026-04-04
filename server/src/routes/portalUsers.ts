import { Router } from 'express';
import { PortalUser, Response as ApiResponse } from '../data';
import * as data from '../data';
import { requireAuth, audit } from '../middleware/auth';

export function createPortalUsersRouter(sendUpdate: () => void): Router {
  const router = Router();

  router.get('/portalusers', requireAuth, (req, res) => {
    console.log('api/portalusers called');
    const portalUsers: PortalUser[] = data.getPortalUsers();
    // Map to a new array without the password field (#9: avoid mutating cached objects)
    const safe = portalUsers.map(u => ({ id: u.id, name: u.name }));
    res.json(ApiResponse.mkData(safe));
  });

  router.post('/portaluser/add', requireAuth, (req, res) => {
    console.log('api/portaluser/add called.');
    const userName = req.body.name;
    const userPassword = req.body.password;

    if (!userName || !userPassword) {
      res.status(400).json(ApiResponse.mkErr("Malformed request"));
      return;
    }

    if (data.addPortalUser(userName, userPassword)) {
      audit(req, `Added portal user ${userName}`);
      res.json(ApiResponse.mkOk());
    } else {
      res.json(ApiResponse.mkErr("Internal error"));
    }

    sendUpdate();
  });

  router.post('/portaluser/edit', requireAuth, (req, res) => {
    console.log('api/portaluser/edit called.');
    const userId = req.body.id;
    const userName = req.body.name;
    const newPassword = req.body.password;

    if (!userId || !userName) {
      res.status(400).json(ApiResponse.mkErr("Malformed request"));
      return;
    }

    const portalUsers: PortalUser[] = data.getPortalUsers();
    const user = portalUsers.find(x => x.id === userId);

    if (!user) {
      res.status(404).json(ApiResponse.mkErr("User not found"));
      return;
    }

    const passHash = newPassword ? newPassword : user.password;

    if (data.editPortalUser(userId, userName, passHash)) {
      audit(req, `Edited portal user ${userName}(${userId})`);
      res.json(ApiResponse.mkOk());
    } else {
      res.json(ApiResponse.mkErr("Internal error"));
    }

    sendUpdate();
  });

  router.post('/portaluser/delete', requireAuth, (req, res) => {
    console.log('api/portaluser/delete called.');
    const userId = req.body.id;
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
