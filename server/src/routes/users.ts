import { Router } from 'express';
import { User, Response as ApiResponse } from '../data';
import * as data from '../data';
import { requireAuth } from '../middleware/auth';
import { validateBody, UserTopToolsSchema, AddUserSchema, EditUserSchema, DeleteSchema } from '../schemas';

export function createUsersRouter(sendUpdate: () => void): Router {
  const router = Router();

  router.post('/users/toptools', requireAuth, validateBody(UserTopToolsSchema), (req, res) => {
    const { userId } = req.body;

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

  router.post('/user/add', requireAuth, validateBody(AddUserSchema), (req, res) => {
    console.log('api/user/add called.');
    const { name: userName, email: userEmail, card: userCard, doorCard, members: groupMembers } = req.body;
    const isGroup = Array.isArray(groupMembers);

    if (data.addUser(userName, userEmail, userCard, doorCard, isGroup, groupMembers)) {
      res.json(ApiResponse.mkOk());
    } else {
      res.json(ApiResponse.mkErr("Internal error"));
    }

    sendUpdate();
  });

  router.post('/user/edit', requireAuth, validateBody(EditUserSchema), (req, res) => {
    console.log('api/user/edit called.');
    const users: User[] = data.getUsers();
    const { id: userId, name: userName, email: userEmail, card: userCard, doorCard, members: groupMembers } = req.body;
    const isGroup = Array.isArray(groupMembers);

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

  router.post('/user/delete', requireAuth, validateBody(DeleteSchema), (req, res) => {
    console.log('api/user/delete called.');
    const users: User[] = data.getUsers();
    const { id: userId } = req.body;

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
