import { Router } from 'express';
import { Response as ApiResponse } from '../data';
import * as data from '../data';

const CARD_REGEX = /^[0-9a-fA-F]|\:{1,20}$/;

export function createEnrollRouter(): Router {
  const router = Router();

  router.post('/enroll/query', (req, res) => {
    const doorCard = req.body.doorCard;

    if (!doorCard || !CARD_REGEX.test(doorCard)) {
      res.status(400).json(ApiResponse.mkErr("Malformed request"));
      return;
    }

    const result = data.findDoorCardName(doorCard);

    if (result && result.value) {
      res.status(200).json(ApiResponse.mkData(result.value));
    } else {
      res.status(200).json(ApiResponse.mkErr(result.error));
    }
  });

  router.post('/enroll/register', (req, res) => {
    const doorCard = req.body.doorCard;
    const toolCard = req.body.toolCard;

    if (!doorCard || !toolCard) {
      res.status(400).json(ApiResponse.mkErr("Malformed request"));
      return;
    }

    if (!CARD_REGEX.test(doorCard) || !CARD_REGEX.test(toolCard)) {
      res.status(400).json(ApiResponse.mkErr("Invalid card format"));
      return;
    }

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
