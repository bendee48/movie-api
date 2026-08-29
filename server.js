import { createApp } from './app.js';

/**
 * Starts the movie recommendation API on the configured port.
 *
 * The application is created through the exported factory in app.js, which applies
 * middleware, validation, and OpenAI-backed route handlers before the HTTP server
 * begins listening for requests.
 *
 * @returns {void}
 */
const app = createApp();
const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});