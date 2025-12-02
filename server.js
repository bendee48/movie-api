import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import OpenAI from 'openai';

const app = express();
const client = new OpenAI(); // connect to openai sdk

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

// Endpoints

// Default
app.get("/", (req, res) => {
  res.send("API is running");
});


app.get("/api/suggest-film", async (req, res) => {
  try {
    console.log('hello')
    res.json({result: "hello"})
  } catch(e) {
    console.log(e.message)
  }
})

// Connect express app
const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})