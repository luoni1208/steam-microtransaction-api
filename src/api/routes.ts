import steamController from './controllers/steam.controller';
import { Express, RequestHandler, Router } from 'express';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import constants from '@src/constants';

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

  /**
   *
   * @api {get} / Initial route to check API Status
   * @apiName Health
   * @apiGroup Status
   * @apiVersion  1.0.0
   *
   * @apiSuccess (Response: 200) {Boolean} success returns true if everything is ok
   *
   * @apiSuccessExample {Object} Success-Response:
   * HTTP/1.1 200
   * {
   *     status : boolean
   * }
   */
  router.get('/', (_req, res) => {
    res.status(200).json({ status: true });
  });

  /**
   *
   * @api {post} /GetReliableUserInfo Get Reliable User Info
   * @apiName GetReliableUserInfo
   * @apiGroup Microtransaction
   * @apiVersion  1.0.0
   * @apiDescription Check if the user is reliable to start purchase. Return true if user is reliable

   * @apiHeader {String} content-type application/json *required
   *
   * @apiParam  (json) {String} steamId User Steam ID
   * @apiParam  (json) {String} appId Steam App/Game ID
   *
   * @apiSuccess (Response: 200) {Boolean} success Response Status
   *
   * @apiSuccessExample {Object} Success-Response:
   * HTTP/1.1 200
   * {
   *     success : true,
   * }
   *
   */
  router.post(
    '/GetReliableUserInfo',
    validateGetReliableUserInfo,
    steamController.getReliableUserInfo
  );

  /**
   *
   * @api {post} /CheckAppOwnership Check if the user really owns the AppId
   * @apiName CheckAppOwnership
   * @apiGroup Microtransaction
   * @apiVersion  1.0.0
   * @apiDescription Return success:true if the user owns the app. Useful to prevent purchase from non-owners

   * @apiHeader {String} content-type application/json *required
   *
   * @apiParam  (json) {String} steamId User Steam ID
   * @apiParam  (json) {String} appId Steam App/Game ID
   *
   * @apiSuccess (Response: 200) {Boolean} success Response Status
   *
   * @apiSuccessExample {Object} Success-Response:
   * HTTP/1.1 200
   * {
   *     success : true,
   * }
   *
   */
  router.post('/CheckAppOwnership', validateCheckAppOwnership, steamController.checkAppOwnership);

  /**
   *
   * @api {post} /InitPurchase Init Purchase
   * @apiName InitPurchase
   * @apiGroup Microtransaction
   * @apiVersion  1.0.0
   * @apiDescription Init the purchase process. After this call, the steam will popup a confirmation dialog in the game.

   * @apiHeader {String} content-type application/json *required
   *
   * @apiParam  (json) {String} appId string,
   * @apiParam  (json) {String} orderId number,
   * @apiParam  (json) {Integer} itemId number,
   * @apiParam  (json) {String} itemDescription string,
   * @apiParam  (json) {String} category string,
   * @apiParam  (json) {String} steamId User Steam ID
   *
   * @apiSuccess (Response: 200) {Boolean} transid Transaction Id
   *
   * @apiParamExample {json} Request-Example:
   * {
   *      appId: '480',
   *      itemId: 1001,
   *      itemDescription: 'abcd',
   *      category: 'gold',
   *      steamID: '765443152131231231',
   * }
   *
   * @apiSuccessExample {Object} Success-Response:
   * HTTP/1.1 200
   * {
   *     transid : "asdfglorenid",
   * }
   *
   */
  router.post('/InitPurchase', validateInitPurchase, steamController.initPurchase);

  /**
   *
   * @api {post} /FinalizePurchase Finalize Purchase
   * @apiName FinalizePurchase
   * @apiGroup Microtransaction
   * @apiVersion  1.0.0
   * @apiDescription Finalize the transaction. See https://partner.steamgames.com/doc/webapi/ISteamMicroTxn#FinalizeTxn

   * @apiHeader {String} content-type application/json *required
   *
   * @apiParam  (json) {String} appId Steam App Id
   * @apiParam  (json) {String} orderId Order Id saved
   *
   * @apiSuccess (Response: 200) {Boolean} success Return true if the transaction was finished successfully
   *
   * @apiSuccessExample {Object} Success-Response:
   * HTTP/1.1 200
   * {
   *     success : true,
   * }
   *
   */
  router.post('/FinalizePurchase', validateFinalizePurchase, steamController.finalizePurchase);

  /**
   *
   * @api {post} /CheckPurchaseStatus Check Purchase Status
   * @apiName CheckPurchaseStatus
   * @apiGroup Microtransaction
   * @apiVersion  1.0.0
   * @apiDescription Retrieve the current status of the purchase

   * @apiHeader {String} content-type application/json *required
   *
   * @apiParam  (json) {String} appId Steam App Id
   * @apiParam  (json) {String} orderId Order Id
   * @apiParam  (json) {String} transId Transaction Id
   *
   * @apiSuccess (Response: 200) {Boolean} success
   * @apiSuccess (Response: 200) {Json} fields Retrieve Transaction Data
   *
   * @apiSuccessExample {Object} Success-Response:
   * HTTP/1.1 200
   * {
   *     success : true,
   *     orderid : string,
   *     transid : string,
   *     steamid : string,
   *     status : string,
   *     currency: string
   *     time: string,
   *     country: string,
   *     usstate: string,
   *     items: [{
   *          itemid : string,
   *          qty : number,
   *          amount : string,
   *          vat : string,
   *          itemstatus : string,
   *     }]
   * }
   *
   */
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
  
    /**
     * @api {get} /GetItemPrices Get All Item Prices
     * @apiName GetItemPrices
     * @apiGroup Microtransaction
     * @apiVersion  1.0.0
     * @apiDescription Retrieve the prices of all items or a specific item if itemId is provided.
     *
     * @apiParam  {Number} [itemId] Optional item ID to retrieve a single item price.
     *
     * @apiSuccess (Response: 200) {Boolean} success Response Status
     * @apiSuccess (Response: 200) {Array|Object} products Array of products or a single product object.
     *
     * @apiSuccessExample {Object} Success-Response:
     * HTTP/1.1 200
     * {
     *     "success": true,
     *     "products": [
     *         { "id": 1001, "price": 199 },
     *         { "id": 1002, "price": 299 },
     *         ...
     *     ]
     * }
     *
     * @apiSuccessExample {Object} Single-Product Response:
     * HTTP/1.1 200
     * {
     *     "success": true,
     *     "product": { "id": 1001, "price": 199 }
     * }
     *
     * @apiErrorExample {Object} Error-Response:
     * HTTP/1.1 404
     * {
     *     "success": false,
     *     "message": "Item not found"
     * }
     */

      router.get('/GetItemPrices', (_req, res) => {
    const pricesFilePath = path.join(__dirname, '../products.json');

    fs.readFile(pricesFilePath, 'utf-8', (err, data) => {
        if (err) {
            console.error("Error reading products.json:", err);
            return res.status(500).json({ success: false, message: 'Error retrieving prices.' });
        }

        const products = JSON.parse(data);

        // Return all products if no itemId is provided
        res.status(200).json({ success: true, products });
    });
});

const GetAssetPrices = async (req, res) => {
  const { appid, currency } = req.query; // Retrieve the app ID from the query
  const apiKey = constants.webkey; // Set your Steam API key
  const url = `https://partner.steam-api.com/ISteamEconomy/GetAssetPrices/v1/?key=${apiKey}&appid=${appid}&currency=${currency}`;
  
  try {
    const response = await axios.get(url);
    const products = response.data; // No need to parse as axios does this automatically
     res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
   res.status(500).json({
      error: 'Failed to fetch asset prices'
    });
  }
};

router.get('/GetAssetPrices', GetAssetPrices);
};
