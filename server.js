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

// Helper Functions

function getCountry(req) {
  return (
    req.headers["cf-ipcountry"] ||
    "UK"
  );
}

//* Endpoints *//

// Root
app.get("/", (req, res) => {
  res.send("API is running");
});

// POST single random film suggestion
app.post("/api/film/lucky", async (req, res) => {
  const { previousFilms = [] } = req.body;
  const country = getCountry(req);

  try {
    const response = await client.responses.create({
      model: 'gpt-5-nano-2025-08-07',
      instructions: 
        `You are an experienced film critic. Return a film name, the year of it\'s release, the director, a few of the main actors involved,
         a short summary of the film (with no spoilers) and a list of streaming services that are currently showing said film. 
         The film can be from any genre, year, country etc but ensure it is generally regarded as being "good", predominantly by
         film critics, then secondly by audiences. As a film critic aim to reccomend something good that might be lesser seen
         by audiences.
         The streaming information will be for the region ${country}. Show what the service is and provide a link to the film.
         Do not return any of these films ${previousFilms.join(', ')}.
         Return JSON in this format:
          {
            "title": "",
            "year": "",
            "director": "",
            "stars": "",
            "summary": "",
            "streaming": [
              { "service": "", "url": "" }
            ]
          }
        `,
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
  const country = getCountry(req);
  
  try {
    const response = await client.responses.create({
      model: 'gpt-5-nano-2025-08-07',
      instructions: 
        `You are an experienced film critic. Return a film name, the year of it\'s release, the director, a few of the main actors involved,
         a short summary of the film (with no spoilers) and a list of streaming services that are currently showing said film.
         The streaming information will be for the region ${country}. Show what the service is and provide a link to the film.
         Do not return any of these films ${previousFilms.join(', ')}.
         Return JSON in this format:
          {
            "title": "",
            "year": "",
            "director": "",
            "stars": "",
            "summary": "",
            "streaming": [
              { "service": "", "url": "" }
            ]
          }
         Or if you're unable to find a suitable film within those parameters return JSON in this format:
          {
            "notFound": "true"
          }
        `,
      input: 
        `Suggest a film to watch that is of the genre '${genre},' was released in ${decade},
         has a runtime of ${runtime}, is in ${language} and has an imdb rating of ${rating}.
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