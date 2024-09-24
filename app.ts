import express, { Request, Response, NextFunction } from 'express';
import 'express-async-errors';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { setupSwagger } from './swagger.config';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

//#region App Setup
const app = express();

dotenv.config({ path: './.env' });
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));
setupSwagger(app, BASE_URL);

//#endregion App Setup

//#region Code here

app.get('/generate', (req: Request, res: Response) => {
  const secret = speakeasy.generateSecret({
    name: 'Mykan Google Authenticator Demo',
  });

  console.log('Generated secret:', secret); // Log for debugging

  // Check if `otpauth_url` exists
  if (!secret.otpauth_url) {
    return res.status(500).json({ message: 'Error generating OTPAuth URL' });
  }

  // Generate a QR code to scan
  qrcode.toDataURL(secret.otpauth_url, (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Error generating QR code' });
    }
    res.json({
      secret: secret.base32, // Save this secret to the user's profile
      qrCode: data, // Provide this QR code to the user
    });
  });
});

app.post('/verify', (req: Request, res: Response) => {
  const { token, secret } = req.body;

  const verified = speakeasy.totp.verify({
    secret: secret, // The user's saved secret (should be retrieved securely from DB)
    encoding: 'base32',
    token: token, // The token the user provides
  });

  if (verified) {
    return res.json({ verified: true });
  } else {
    return res.json({ verified: false });
  }
});


//#endregion Code here

//#region Server Setup

/**
 * @swagger
 * /api:
 *   get:
 *     summary: Call a demo external API (httpbin.org)
 *     description: Returns an object containing demo content
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.get('/api', async (req: Request, res: Response) => {
  try {
    const result = await axios.get('https://httpbin.org');
    return res.send({
      message: 'Demo API called (httpbin.org)',
      data: result.status,
    });
  } catch (error: any) {
    console.error('Error calling external API:', error.message);
    return res.status(500).send({ error: 'Failed to call external API' });
  }
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Health check
 *     description: Returns an object containing demo content
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.get('/', (req: Request, res: Response) => {
  return res.send({ message: 'API is Live!' });
});

/**
 * @swagger
 * /obviously/this/route/cant/exist:
 *   get:
 *     summary: API 404 Response
 *     description: Returns a non-crashing result when you try to run a route that doesn't exist
 *     tags: [Default]
 *     responses:
 *       '404':
 *         description: Route not found
 */
app.use((req: Request, res: Response) => {
  return res
    .status(404)
    .json({ success: false, message: 'API route does not exist' });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // throw Error('This is a sample error');
  console.log(`${'\x1b[31m'}`); // start color red
  console.log(`${err.message}`);
  console.log(`${'\x1b][0m]'}`); //stop color
  
  return res
    .status(500)
    .send({ success: false, status: 500, message: err.message });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});

// (for render services) Keep the API awake by pinging it periodically
// setInterval(pingSelf(BASE_URL), 600000);

//#endregion
