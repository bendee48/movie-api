# Movie API

A small Express API for film recommendations using the OpenAI API. It was built as the backend for a film discovery app.

## Features

- Lucky (random) film recommendations
- Filtering by genre, release decade, runtime, IMDb rating, and language
- Streaming availability by country
- Excluding films that have already been suggested
- Basic security middleware, CORS, request validation, and rate limiting

## Running Locally

Install the dependencies:

```bash
npm ci
```

Create a `.env` file using `.env.example` as a guide, then add your OpenAI API key:

```env
OPENAI_API_KEY=your-openai-api-key
FRONTEND_URL=http://localhost:3000
PORT=3002
```

Start the development server:

```bash
npm run dev
```

The API runs at `http://localhost:3002` by default. Run the test suite with:

```bash
npm test
```

## Endpoints

### `GET /`

Returns the API health message.

### `POST /api/film/lucky`

Returns a random film recommendation.

Example request body:

```json
{
	"previousFilms": ["The Lives of Others"]
}
```

### `POST /api/film`

Returns a film matching the supplied filters.

Example request:

```text
POST /api/film?genre=Drama&decade=1990s&runtime=120&rating=8&language=French
```

Example request body:

```json
{
	"previousFilms": []
}
```

## Environment Variables

- `OPENAI_API_KEY` - OpenAI API key used by the server
- `FRONTEND_URL` - Frontend origin allowed to access the API
- `PORT` - Port used by the server; defaults to `3002`

## Tech Stack

- Node.js
- Express
- OpenAI API
- Vitest
- Supertest
