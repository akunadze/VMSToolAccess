import { Router } from 'express';
import { User, Response as ApiResponse } from '../data';
import * as data from '../data';
import { requireAuth } from '../middleware/auth';

const CARD_REGEX = /^[0-9a-fA-F]{1,20}$/;

export function createUsersRouter(sendUpdate: () => void): Router {
  const router = Router();

  router.post('/users/toptools', requireAuth, (req, res) => {
    const userId = req.body.userId;

    if (!userId) {
      res.status(400).json(ApiResponse.mkErr("Malformed request"));
      return;
    }

    const users: User[] = data.getUsers();
    if (!users.find(x => x.id === userId)) {
      res.status(400).json(ApiResponse.mkErr("User not found"));
      return;
    }

    console.log('api/users/toptools called.');
    const result = data.getUserTopTools(userId);
    res.json(ApiResponse.mkData(result));
  });

  router.get('/users', requireAuth, (req, res) => {
    console.log('api/users called');
    const users: User[] = data.getUsers();
    res.json(ApiResponse.mkData(users));
  });

  router.post('/user/add', requireAuth, (req, res) => {
    console.log('api/user/add called.');
    const userName = req.body.name;
    const userEmail = req.body.email;
    const userCard = req.body.card;
    const doorCard = req.body.doorCard;
    const groupMembers = req.body.members;
    const isGroup = Array.isArray(groupMembers);

    if (!userName || (isGroup && groupMembers.length > 0 && isNaN(groupMembers[0]))) {
      res.status(400).json(ApiResponse.mkErr("Malformed request"));
      return;
    }

    if (userCard && !CARD_REGEX.test(userCard)) {
      res.status(400).json(ApiResponse.mkErr("Invalid card format"));
      return;
    }

    if (doorCard && !CARD_REGEX.test(doorCard)) {
      res.status(400).json(ApiResponse.mkErr("Invalid door card format"));
      return;
    }

    if (data.addUser(userName, userEmail, userCard, doorCard, isGroup, groupMembers)) {
      res.json(ApiResponse.mkOk());
    } else {
      res.json(ApiResponse.mkErr("Internal error"));
    }

    sendUpdate();
  });

  router.post('/user/edit', requireAuth, (req, res) => {
    console.log('api/user/edit called.');
    const users: User[] = data.getUsers();
    const userId = req.body.id;
    const userName = req.body.name;
    const userEmail = req.body.email;
    const userCard = req.body.card;
    const doorCard = req.body.doorCard;
    const groupMembers = req.body.members;
    const isGroup = Array.isArray(groupMembers);

    if (!userId || !userName || (isGroup && groupMembers.length > 0 && isNaN(groupMembers[0]))) {
      res.status(400).json(ApiResponse.mkErr("Malformed request"));
      return;
    }

    if (userCard && !CARD_REGEX.test(userCard)) {
      res.status(400).json(ApiResponse.mkErr("Invalid card format"));
      return;
    }

    if (doorCard && !CARD_REGEX.test(doorCard)) {
      res.status(400).json(ApiResponse.mkErr("Invalid door card format"));
      return;
    }

    const user = users.find(x => x.id === userId);
    if (!user) {
      console.log('User not found');
      res.status(404).json(ApiResponse.mkErr("User not found"));
      return;
    }

    if (data.editUser(userId, userName, userEmail, userCard, doorCard, isGroup, groupMembers)) {
      res.json(ApiResponse.mkOk());
    } else {
      res.json(ApiResponse.mkErr("Internal error"));
    }

    sendUpdate();
  });

  router.post('/user/delete', requireAuth, (req, res) => {
    console.log('api/user/delete called.');
    const users: User[] = data.getUsers();
    const userId = req.body.id;

    const user = users.find(x => x.id === userId);
    if (!user) {
      console.log('User not found');
      res.status(404).json(ApiResponse.mkErr("User not found"));
      return;
    }

    if (data.deleteUser(userId)) {
      res.json(ApiResponse.mkOk());
    } else {
      res.json(ApiResponse.mkErr("Internal error"));
    }

    sendUpdate();
  });

  return router;
}
