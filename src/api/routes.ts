import steamController from './controllers/steam.controller';
import { Express, RequestHandler, Router } from 'express';
import path from 'path';
import fs from 'fs';

// Utility to handle missing fields in the request
const handleMissingFields = (fields: string[]) => (req, res, next) => {
  for (const field of fields) {
    if (!req.body[field]) {
      return res.status(400).json({ error: `Missing field: ${field}` });
    }
  }
  next();
};

const validateGetReliableUserInfo: RequestHandler = handleMissingFields(['steamId']);
const validateCheckAppOwnership: RequestHandler = handleMissingFields(['steamId', 'appId']);
const validateFinalizePurchase: RequestHandler = handleMissingFields(['appId', 'orderId']);
const validateCheckPurchaseStatus: RequestHandler = handleMissingFields([
  'appId',
  'orderId',
  'transId',
]);

const validateInitPurchase: RequestHandler = handleMissingFields([
  'appId',
  'category',
  'itemDescription',
  'itemId',
  'orderId',
  'steamId',
]);

export default (app: Express): void => {
  const router = Router();

  // Health Check API Route
  router.get('/', (_req, res) => {
    res.status(200).json({ status: true });
  });

  // Get Reliable User Info Route
  router.post(
    '/GetReliableUserInfo',
    validateGetReliableUserInfo,
    steamController.getReliableUserInfo
  );

  // Check App Ownership Route
  router.post('/CheckAppOwnership', validateCheckAppOwnership, steamController.checkAppOwnership);

  // Init Purchase Route
  router.post('/InitPurchase', validateInitPurchase, steamController.initPurchase);

  // Finalize Purchase Route
  router.post('/FinalizePurchase', validateFinalizePurchase, steamController.finalizePurchase);

  // Check Purchase Status Route
  router.post(
    '/checkPurchaseStatus',
    validateCheckPurchaseStatus,
    steamController.checkPurchaseStatus
  );

  // Add router to the application
  app.use('/', router);

  // Error handling middleware
  app.use((err: any, _req, res, _next) => {
    res.status(500).json({
      error: 500,
      message: err.message || 'Something went wrong',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  });

  // 404 handling for unknown routes
  app.use((_req, res) => {
    res.status(404).send('');
  });

  // Get Item Prices Route
  router.get('/GetItemPrices', (_req, res) => {
    const pricesFilePath = path.join(__dirname, '../products.json');
    fs.readFile(pricesFilePath, 'utf-8', (err, data) => {
      if (err) {
        console.error("Error reading products.json:", err);
        return res.status(500).json({ success: false, message: 'Error retrieving prices.' });
      }
      const products = JSON.parse(data);
      res.status(200).json({ success: true, products });
    });
  });

  // Get Asset Prices Route
  router.get('/GetAssetPrices', async (req, res) => {
    const currency = req.query.currency; // Get the currency parameter from the client
    const appId = '1432860'; // Your Steam App ID
    const steamApiKey = constants.webkey; // Get the API key from constants.ts

    if (!currency) {
      return res.status(400).json({ success: false, message: 'Currency is required.' });
    }

    try {
      // Call Steam's GetAssetPrices API
      const steamResponse = await axios.get(
        'https://partner.steam-api.com/ISteamEconomy/GetAssetPrices/v1/',
        {
          params: {
            key: steamApiKey,
            appid: appId,
            currency: currency,
          },
        }
      );
      res.status(200).json({
        success: true,
        data: steamResponse.data,
      });
    } catch (error) {
      console.error('Error fetching asset prices from Steam:', error);
      res.status(500).json({ success: false, message: 'Error fetching asset prices.' });
    }
  });
};
