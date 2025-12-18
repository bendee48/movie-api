import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import OpenAI from 'openai';

// initiate express app
const app = express();

// Security Middleware courtesy of Helmet makes things bare secure
app.use(helmet())

// Allow which sites can request from the API
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

// Open AI SDK
const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

//* Endpoints *//

// Root
app.get("/", (req, res) => {
  res.send("API is running");
});

// GET single film suggestion
app.get("/api/film/lucky", async (req, res) => {
  try {
    const response = await client.responses.create({
      model: 'gpt-5-nano-2025-08-07',
      instructions: 'Always return just a film name. Return a different film than one you\'ve returned before.',
      input: 'Suggest a good film to watch.'
    })
    res.status(200).json({result: response.output_text});
  } catch(e) {
    console.log(e.message)
    res.status(500).send(e.message)
  }
})

// GET return film from queries
app.get("/api/film", async (req, res) => {
  console.log(req.query)
  res.status(200).json(req.query)
})

// Connect express app
const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})