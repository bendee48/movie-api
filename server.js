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

// Allow json to be received to a POST endpoint
app.use(express.json())

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

// POST single random film suggestion
app.post("/api/film/lucky", async (req, res) => {
  const { previousFilms = [] } = req.body;

  try {
    const response = await client.responses.create({
      model: 'gpt-5-nano-2025-08-07',
      instructions: 
        `Return a film name, the year of it\'s release, the director and a short summary of the film
         with no spoilers. The film can be from any genre, year, country etc but generally regarded as being good.
         Return JSON in this format:
          {
            "title": "",
            "year": "",
            "director": "",
            "summary": ""
          } 
         Do not return any of these films ${previousFilms.join(', ')}.`,
      input: 'Suggest a good film to watch.'
    })
    res.status(200).json({result: response.output_text});
  } catch(e) {
    console.log(e.message)
    res.status(500).send(e.message)
  }
})

// POST return film from specified queries
app.post("/api/film", async (req, res) => {
  const { genre, decade, runtime, rating, language } = req.query;
  const { previousFilms = [] } = req.body;
  
  try {
    const response = await client.responses.create({
      model: 'gpt-5-nano-2025-08-07',
      instructions: 
        `Return a film name, the year of it\'s release, the director and a short summary of the film
         with no spoilers. The film can be from any genre, year, country etc but generally regarded as being good.
         Return JSON in this format:
          {
            "title": "",
            "year": "",
            "director": "",
            "summary": ""
          } 
         Do not return any of these films ${previousFilms.join(', ')}.`,
      input: 
        `Suggest a film to watch that is of the genre ${genre}, was released in the ${decade},
         has a runtime of ${runtime}, is in ${language} and has an imdb rating ${rating}.
        `
    })
    res.status(200).json({result: response.output_text})
  }
  catch(e) {
    console.log(e.message)
    res.status(500).send(e.message)
  } 
})

// Connect express app
const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})