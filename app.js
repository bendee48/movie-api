import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import OpenAI from 'openai';

/**
 * Movie recommendation API.
 *
 * This Express application exposes endpoints for checking service health and suggesting
 * films based on either a lucky-pick endpoint or a filtered recommendation request.
 * Requests can include a previousFilms list to exclude previously suggested titles, and each route
 * forwards the prompt to the OpenAI Responses API. The response is returned as JSON
 * with either a recommendation payload or an error message.
 */

/**
 * @typedef {string[]} PreviousFilms
 * @description A list of previously suggested film titles that should not be suggested again.
 */

/**
 * @typedef {Object} FilmFilters
 * @property {string} [genre='any genre'] Preferred film genre.
 * @property {string} [decade='any decade'] Preferred release decade.
 * @property {string} [runtime='any runtime'] Preferred runtime text.
 * @property {string} [rating='any rating'] Preferred IMDb rating text.
 * @property {string} [language='any language'] Preferred spoken language.
 */

/**
 * @typedef {Object} FilmSuggestion
 * @property {string} title Film title.
 * @property {string} year Release year.
 * @property {string} director Director name.
 * @property {string} actors Comma-separated lead actors.
 * @property {string} summary Spoiler-free summary.
 */

/**
 * @typedef {Object} FilmNotFoundResult
 * @property {boolean} notFound Always true when no film matches the request.
 * @property {string} reason Brief explanation for the no-match result.
 */

/**
 * Creates and configures the Express app for the movie recommendation API.
 *
 * This function sets up security middleware, request parsing, cross-origin access,
 * rate limiting, and the film recommendation endpoints backed by the OpenAI client.
 *
 * @param {Object} [options={}] Optional app configuration.
 * @param {import('openai') | { responses: { create: Function } }} [options.openaiClient] Alternative OpenAI client injected for tests or custom setups.
 * @returns {import('express').Express} The configured Express application instance.
 * @throws {Error} Throws when the application is started in production without an `OPENAI_API_KEY`.
 */
function createApp({ openaiClient } = {}) {
  const app = express();

  /**
   * Trust the first proxy hop so Express correctly reads the client IP and other forwarded headers.
   * This is important behind common hosting setups such as reverse proxies and load balancers.
   */
  app.set('trust proxy', 1);

  /**
   * Add standard security headers like X-Frame-Options and Content-Security-Policy.
   * This reduces the risk of common web vulnerabilities before requests reach the routes.
   */
  app.use(helmet());

  /**
   * Parse incoming JSON request bodies, limiting the payload size to keep malicious or oversized requests out.
   * The API only expects small filter payloads and a short previousFilms array.
   */
  app.use(express.json({ limit: '20kb' }));

  /**
   * Allow requests from the configured frontend origin and permit credentials on cross-site requests.
   * This is needed because the browser app runs on FRONTEND_URL and needs to hit the API securely.
   */
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

  const MAX_PREVIOUS_FILMS = 200;
  const MAX_FILM_TITLE_LENGTH = 200;

  /**
   * Checks whether a previous film list is valid before it is sent to the OpenAI prompt.
   *
   * @param {PreviousFilms} previousFilms List of film titles the user has already been suggested.
   * @returns {boolean} True when the array is within the allowed size and each title is valid.
   */
  function validatePreviousFilms(previousFilms) {
    return previousFilms.length <= MAX_PREVIOUS_FILMS
      && previousFilms.every(
        (film) =>
          typeof film === 'string' &&
          film.trim().length > 0 &&
          film.length <= MAX_FILM_TITLE_LENGTH
      );
  }

  /**
   * Sanitizes a query-string filter and falls back to a default value when the input is invalid.
   *
   * @param {unknown} value Incoming query value.
   * @param {string} fallback Default value used when the supplied value is not a valid short string.
   * @returns {string} The sanitized filter text or the fallback value.
   */
  function getFilter(value, fallback) {
    return typeof value === 'string' && value.length <= 100 ? value : fallback;
  }

  /**
   * Limit repeated requests to prevent abuse and reduce the risk of OpenAI quota exhaustion.
   * The app allows 10 requests per 15-minute window before returning a 429 response.
   */
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: 'Too many requests for now, please try again later.'
  });
  app.use(limiter);


  // Endpoints //

  /**
   * Health check endpoint for the API.
   *
   * @route GET /
   * @returns {void} Sends a plain-text readiness message.
   */
  app.get('/', (req, res) => {
    res.send('API is running');
  });

  /**
   * Suggests a single film the user has not not been suggested.
   *
   * @route POST /api/film/lucky
   * @param {Object} req.body Request body.
   * @param {PreviousFilms} [req.body.previousFilms=[]] Films that must not be suggested again.
   * @returns {void} Returns a JSON object with a `{ result }` string on success.
   * @throws {Error} Propagates OpenAI request failures to the HTTP 500 response.
   */
  app.post('/api/film/lucky', async (req, res) => {
    const { previousFilms = [] } = req.body || {};
    if (!Array.isArray(previousFilms) || !validatePreviousFilms(previousFilms)) {
      return res.status(400).json({ error: 'previousFilms must be an array of up to 200 short strings' });
    }

    try {
      const response = await client.responses.create({
        model: 'gpt-5-nano-2025-08-07',
        instructions: `You are an experienced film critic and MUST respond ONLY with valid JSON, nothing else.
          Return a highly-regarded film that is lesser-known by general audiences.
          Include: title, year, director, main actors (comma-separated) and a spoiler-free summary.

          REQUIRED JSON FORMAT (no variations):
          {
            "title": "",
            "year": "",
            "director": "",
            "actors": "",
            "summary": "",
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

  /**
   * Suggests a film that matches a set of user-provided filters while excluding previously suggested titles.
   *
   * @route POST /api/film
   * @param {Object} req.query Query parameters used as recommendation filters.
   * @param {string} [req.query.genre] Movie genre.
   * @param {string} [req.query.decade] Release decade.
   * @param {string} [req.query.runtime] Runtime requirement.
   * @param {string} [req.query.rating] Desired IMDb rating.
   * @param {string} [req.query.language] Preferred language.
   * @param {Object} req.body Request body.
   * @param {PreviousFilms} [req.body.previousFilms=[]] Films that must not be suggested again.
   * @returns {void} Returns JSON with either a `{ result }` value or a no-match payload.
   * @throws {Error} Propagates OpenAI request failures to the HTTP 500 response.
   */
  app.post('/api/film', async (req, res) => {
    const { genre, decade, runtime, rating, language } = req.query;
    const { previousFilms = [] } = req.body || {};
    
    if (!Array.isArray(previousFilms) || !validatePreviousFilms(previousFilms)) {
      return res.status(400).json({ error: 'previousFilms must be an array of up to 200 short strings' });
    }

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
          Include: title, year, director, main actors (comma-separated) and a spoiler-free summary.
          
          REQUIRED JSON FORMAT:
          If a film matches the criteria:
          {
            "title": "",
            "year": "",
            "director": "",
            "actors": "",
            "summary": "",
          }

          If NO film matches the criteria:
          {
            "notFound": true,
            "reason": "brief explanation"
          }

          RULES:
          - Return ONLY valid JSON, no markdown, no extra text
          - Do not suggest: ${previousFilms.join(', ') || 'none'}`,
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
