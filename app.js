import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import OpenAI from 'openai';

function createApp({ openaiClient } = {}) {
  const app = express();

  app.use(helmet());
  app.use(express.json());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    message: 'Request limit hit, I\'m not made of money, try again later.'
  });
  app.use(limiter);

  const client = openaiClient || new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  function getCountry(req) {
    return req.headers['cf-ipcountry'] || 'UK';
  }

  app.get('/', (req, res) => {
    res.send('API is running');
  });

  app.post('/api/film/lucky', async (req, res) => {
    const { previousFilms = [] } = req.body;
    const country = getCountry(req);

    try {
      const response = await client.responses.create({
        model: 'gpt-5-nano-2025-08-07',
        instructions: `You are an experienced film critic and MUST respond ONLY with valid JSON, nothing else.
          Return a highly-regarded film that is lesser-known by general audiences.
          Include: title, year, director, main actors (comma-separated), spoiler-free summary, and current streaming availability for ${country}.

          REQUIRED JSON FORMAT (no variations):
          {
            "title": "",
            "year": "",
            "director": "",
            "actors": "",
            "summary": "",
            "streaming": [
              { "service": "", "url": "" }
            ]
          }

          RULES:
          - Return ONLY the JSON object, no other text
          - Do not suggest: ${previousFilms.join(', ') || 'none'}
          - Prioritize critically-acclaimed films over mainstream choices`,
        input: 'Suggest one good film for me to watch.'
      });

      res.status(200).json({ result: response.output_text });
    } catch (e) {
      console.log(e.message);
      res.status(500).send(e.message);
    }
  });

  app.post('/api/film', async (req, res) => {
    const { genre, decade, runtime, rating, language } = req.query;
    const { previousFilms = [] } = req.body;
    const country = getCountry(req);

    const filters = {
      genre: genre || 'any genre',
      decade: decade || 'any decade',
      runtime: runtime || 'any runtime',
      rating: rating || 'any rating',
      language: language || 'any language'
    };

    try {
      const response = await client.responses.create({
        model: 'gpt-5-nano-2025-08-07',
        instructions: `You are an experienced film critic and MUST respond ONLY with valid JSON, nothing else.

          REQUIRED JSON FORMAT:
          If a film matches the criteria:
          {
            "title": "",
            "year": "",
            "director": "",
            "actors": "",
            "summary": "",
            "streaming": [
              { "service": "", "url": "" }
            ]
          }

          If NO film matches the criteria:
          {
            "notFound": true,
            "reason": "brief explanation"
          }

          RULES:
          - Return ONLY valid JSON, no markdown, no extra text
          - Do not suggest: ${previousFilms.join(', ') || 'none'}
          - Streaming info is for ${country}`,
        input: `Find a film matching these filters:
          - Genre: ${filters.genre}
          - Release decade: ${filters.decade}
          - Runtime: ${filters.runtime}
          - IMDb rating: ${filters.rating}
          - Language: ${filters.language}`
      });

      res.status(200).json({ result: response.output_text });
    } catch (e) {
      console.log(e.message);
      res.status(500).send(e.message);
    }
  });

  return app;
}

const app = createApp();

export { createApp };
export default app;
