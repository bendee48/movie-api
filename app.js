import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import OpenAI from 'openai';


function createApp({ openaiClient } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '20kb' }));
  // greenlights which origins can request from the api, and allows cookies to be sent cross-origin
  // the movie app sits on the FRONTEND_URL, so we need to allow that origin to make requests to the API
  app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  }));

  if (!openaiClient && process.env.NODE_ENV === 'production' && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required in production');
  }

  const client = openaiClient || (
    process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null
  );

  function getCountry(req) {
    const country = req.headers['cf-ipcountry'];
    return typeof country === 'string' && /^[A-Z]{2}$/i.test(country)
      ? country.toUpperCase()
      : 'UK';
  }

  const MAX_PREVIOUS_FILMS = 200;
  const MAX_FILM_TITLE_LENGTH = 200;

  function validatePreviousFilms(previousFilms) {
    return previousFilms.length <= MAX_PREVIOUS_FILMS
      && previousFilms.every(
        (film) =>
          typeof film === 'string' &&
          film.trim().length > 0 &&
          film.length <= MAX_FILM_TITLE_LENGTH
      );
  }

  function getFilter(value, fallback) {
    return typeof value === 'string' && value.length <= 100 ? value : fallback;
  }

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: 'Too many requests for now, please try again later.'
  });
  app.use(limiter);

  // Endpoints //

  app.get('/', (req, res) => {
    res.send('API is running');
  });

  app.post('/api/film/lucky', async (req, res) => {
    const { previousFilms = [] } = req.body || {};
    if (!Array.isArray(previousFilms) || !validatePreviousFilms(previousFilms)) {
      return res.status(400).json({ error: 'previousFilms must be an array of up to 200 short strings' });
    }
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
    const { previousFilms = [] } = req.body || {};
    if (!Array.isArray(previousFilms) || !validatePreviousFilms(previousFilms)) {
      return res.status(400).json({ error: 'previousFilms must be an array of up to 200 short strings' });
    }
    const country = getCountry(req);

    const filters = {
      genre: getFilter(genre, 'any genre'),
      decade: getFilter(decade, 'any decade'),
      runtime: getFilter(runtime, 'any runtime'),
      rating: getFilter(rating, 'any rating'),
      language: getFilter(language, 'any language')
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
