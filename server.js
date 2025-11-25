import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

const app = express();

// Security Middleware courtesy of Helmet makes things bare secure
app.use(helmet())

// Set up what JS can request from other sites
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}))

// Rate limiter to stop naughty people making bare requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  message: "Request limit hit, I'm not made of money, try again later."
})
app.use(limiter)