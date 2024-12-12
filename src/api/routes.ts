import steamController from './controllers/steam.controller';
import constants from './constants'; // Ensure constants.ts exists
import express, { Express, RequestHandler, Router } from 'express';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

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

  router.get('/', (_req, res) => res.status(200).json({ status: true }));

  router.post(
    '/GetReliableUserInfo',
    validateGetReliableUserInfo,
    steamController.getReliableUserInfo
  );

  router.post('/CheckAppOwnership', validateCheckAppOwnership, steamController.checkAppOwnership);

  router.post('/InitPurchase', validateInitPurchase, steamController.initPurchase);

  router.post('/FinalizePurchase', validateFinalizePurchase, steamController.finalizePurchase);

  router.post(
    '/CheckPurchaseStatus',
    validateCheckPurchaseStatus,
    steamController.checkPurchaseStatus
  );

  /**
   * @api {get} /GetItemPrices Get All Item Prices
   * @apiName GetItemPrices
   */
  router.get('/GetItemPrices', (req, res) => {
    const pricesFilePath = path.join(__dirname, '../products.json');
    const { itemId } = req.query;

    fs.readFile(pricesFilePath, 'utf-8', (err, data) => {
      if (err) {
        console.error('Error reading products.json:', err);
        return res
          .status(500)
          .json({ success: false, message: 'Error retrieving prices.' });
      }

      try {
        const products = JSON.parse(data);

        // Return specific item if itemId is provided
        if (itemId) {
          const item = products.find((product) => product.id === Number(itemId));
          if (!item) {
            return res
              .status(404)
              .json({ success: false, message: 'Item not found' });
          }
          return res.status(200).json({ success: true, product: item });
        }

        res.status(200).json({ success: true, products });
      } catch (parseErr) {
        console.error('Error parsing products.json:', parseErr);
        res.status(500).json({ success: false, message: 'Error processing data.' });
      }
    });
  });

  router.get('/GetAssetPrices', async (req, res) => {
    const currency = req.query.currency;
    const appId = '1432860'; // Your Steam App ID
    const steamApiKey = constants.webkey;

    if (!currency) {
      return res.status(400).json({ success: false, message: 'Currency is required.' });
    }

    try {
      const steamResponse = await axios.get(
        `https://partner.steam-api.com/ISteamEconomy/GetAssetPrices/v1/`,
        {
          params: { key: steamApiKey, appid: appId, currency },
        }
      );

      res.status(200).json({ success: true, data: steamResponse.data });
    } catch (error) {
      console.error('Error fetching asset prices from Steam:', error);
      res.status(500).json({ success: false, message: 'Error fetching asset prices.' });
    }
  });

  app.use('/', router);

  app.use((err: any, _req, res, _next) => {
    res.status(500).json({
      error: 500,
      message: err.message || 'Something went wrong',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  });

  app.use((_req, res) => res.status(404).send(''));
};
