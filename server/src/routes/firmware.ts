import { Router } from 'express';
import { latestVersion } from '../appState';

export function createFirmwareRouter(): Router {
  const router = Router();

  router.post('/update', (req, res) => {
    const ver = req.body.version;

    console.log('Update called. Version = ' + ver);

    const response: { updateAvailable?: number } = {};

    if (ver < latestVersion) {
      console.log('Update available.');
      response.updateAvailable = latestVersion;
    }

    res.status(200).json(response);
  });

  return router;
}
