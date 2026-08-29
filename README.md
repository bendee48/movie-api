# Movie Match API

An Express API for discovering films based on mood and filters, with a lil bit of AI-assistance. Built to explore API design, OpenAI integration, and lightweight server-side validation.

## Overview

The API supports:

- random film recommendations
- filtered film searches by genre, decade, runtime, rating, and language
- avoiding titles the user has already been reccomended
- basic API security and rate limiting

## Tech stack

- Node.js
- Express
- OpenAI API
- CORS
- Helmet
- Express Rate Limit
- Vitest
- Supertest

## Project goals

- building a REST API with Express
- working with environment variables and secure configuration
- integrating an external AI service
- validating request payloads and query parameters
- writing backend tests

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Add environment variables

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key
FRONTEND_URL=http://localhost:3000
PORT=3002
```

### 3. Start the server

```bash
npm run dev
```

The API runs on:

```text
http://localhost:3002
```

### 4. Run tests

```bash
npm test
```

## API endpoints

### Health check

```http
GET /
```

Returns a simple confirmation that the API is running.

### Random film recommendation

```http
POST /api/film/lucky
```

Example request body:

```json
{
  "previousFilms": ["The Lives of Others"]
}
```

Returns a single recommendation that avoids films already suggested.

### Filtered film search

```http
POST /api/film?genre=Drama&decade=1990s&runtime=120&rating=8&language=French
```

Example request body:

```json
{
  "previousFilms": ["Josie and The Pussycats"]
}
```

Returns a film matching the supplied criteria, if one is available.

## Example response

```json
{
  "result": {
    "title": "A Separation",
    "year": 2011,
    "director": "Asghar Farhadi",
    "actors": "Payman Maadi, Leila Hatami, Sareh Bayat",
    "summary": "A married couple faces a tense legal and emotional crisis during a difficult family situation.",
  }
}
```

