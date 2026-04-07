import { Router } from 'express';
import { Response as ApiResponse } from '../data';
import * as data from '../data';
import { validateBody, EnrollQuerySchema, EnrollRegisterSchema } from '../schemas';

export function createEnrollRouter(): Router {
  const router = Router();

  router.post('/enroll/query', validateBody(EnrollQuerySchema), (req, res) => {
    const { doorCard } = req.body;

    const result = data.findDoorCardName(doorCard);

    if (result && result.value) {
      res.status(200).json(ApiResponse.mkData(result.value));
    } else {
      res.status(200).json(ApiResponse.mkErr(result.error));
    }
  });

  router.post('/enroll/register', validateBody(EnrollRegisterSchema), (req, res) => {
    const { doorCard, toolCard } = req.body;

    if (data.isToolCardRegistered(toolCard)) {
      res.status(200).json(ApiResponse.mkErr("Tool card already registered"));
      return;
    }

    const result = data.registerToolCard(doorCard, toolCard);

    if (result) {
      res.status(200).json(ApiResponse.mkOk());
    } else {
      res.status(404).json(ApiResponse.mkErr("Internal error"));
    }
  });

  return router;
}
