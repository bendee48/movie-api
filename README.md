# Movie API

Express API for film recommendations using OpenAI.

## Development

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.
2. Install dependencies:

```bash
npm ci
```

3. Start the development server:

```bash
npm run dev
```

The local API listens on `http://localhost:3002` unless `PORT` is set. Run tests with `npm test`.

## Production on Railway

Set these Railway variables:

- `OPENAI_API_KEY`: production secret
- `FRONTEND_URL`: exact frontend origin, for example `https://app.example.com`

Do not set `PORT`; Railway provides it automatically. Configure the service to install with `npm ci` and start with:

```bash
npm start
```

The frontend must call the deployed Railway API URL, not `localhost:3002`. Keep the OpenAI key only in Railway environment variables and never expose it in frontend code.
