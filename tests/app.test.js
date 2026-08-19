import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

import { createApp } from '../app.js';

function createFakeClient(outputText = '{}') {
  return {
    responses: {
      create: vi.fn().mockResolvedValue({ output_text: outputText })
    }
  };
}

describe('movie API', () => {
  it('GET / returns the health message', async () => {
    const app = createApp({ openaiClient: createFakeClient() });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toBe('API is running');
  });

  it('POST /api/film/lucky returns the OpenAI result', async () => {
    const result = JSON.stringify({
      title: 'The Lives of Others',
      year: '2006'
    });
    const fakeClient = createFakeClient(result);

    const app = createApp({ openaiClient: fakeClient });

    const response = await request(app)
      .post('/api/film/lucky')
      .send({ previousFilms: [] });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(result);
  });

  it('POST /api/film/lucky includes previous films and country in the request', async () => {
    const fakeClient = createFakeClient();
    const app = createApp({ openaiClient: fakeClient });

    await request(app)
      .post('/api/film/lucky')
      .set('cf-ipcountry', 'US')
      .send({ previousFilms: ['The Lives of Others'] });

    const requestOptions = fakeClient.responses.create.mock.calls[0][0];
    expect(requestOptions.model).toBe('gpt-5-nano-2025-08-07');
    expect(requestOptions.input).toBe('Suggest one good film for me to watch.');
    expect(requestOptions.instructions).toContain('Do not suggest: The Lives of Others');
    expect(requestOptions.instructions).toContain('availability for US');
  });

  it('POST /api/film applies default filters', async () => {
    const fakeClient = createFakeClient();
    const app = createApp({ openaiClient: fakeClient });

    const response = await request(app)
      .post('/api/film')
      .send({ previousFilms: [] });

    expect(response.status).toBe(200);
    expect(fakeClient.responses.create.mock.calls[0][0].input).toBe(`Find a film matching these filters:
          - Genre: any genre
          - Release decade: any decade
          - Runtime: any runtime
          - IMDb rating: any rating
          - Language: any language`);
    expect(fakeClient.responses.create.mock.calls[0][0].instructions).toContain('Streaming info is for UK');
    expect(fakeClient.responses.create).toHaveBeenCalledTimes(1);
  });

  it('POST /api/film forwards filters, previous films, and country', async () => {
    const fakeClient = createFakeClient();
    const app = createApp({ openaiClient: fakeClient });

    const response = await request(app)
      .post('/api/film?genre=Drama&decade=1990s&runtime=120&rating=8&language=French')
      .set('cf-ipcountry', 'FR')
      .send({ previousFilms: ['The Lives of Others'] });

    expect(response.status).toBe(200);
    const requestOptions = fakeClient.responses.create.mock.calls[0][0];
    expect(requestOptions.input).toContain('- Genre: Drama');
    expect(requestOptions.input).toContain('- Release decade: 1990s');
    expect(requestOptions.input).toContain('- Runtime: 120');
    expect(requestOptions.input).toContain('- IMDb rating: 8');
    expect(requestOptions.input).toContain('- Language: French');
    expect(requestOptions.instructions).toContain('Do not suggest: The Lives of Others');
    expect(requestOptions.instructions).toContain('Streaming info is for FR');
    expect(fakeClient.responses.create).toHaveBeenCalledTimes(1);
  });

  it('POST /api/film returns a not-found result unchanged', async () => {
    const result = JSON.stringify({ notFound: true, reason: 'No matching film' });
    const fakeClient = createFakeClient(result);
    const app = createApp({ openaiClient: fakeClient });

    const response = await request(app)
      .post('/api/film')
      .send({ previousFilms: [] });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(result);
  });

  it('POST /api/film/lucky returns 500 when OpenAI fails', async () => {
    const fakeClient = {
      responses: {
        create: vi.fn().mockRejectedValue(new Error('OpenAI unavailable'))
      }
    };
    const app = createApp({ openaiClient: fakeClient });

    const response = await request(app)
      .post('/api/film/lucky')
      .send({ previousFilms: [] });

    expect(response.status).toBe(500);
    expect(response.text).toBe('OpenAI unavailable');
  });

  it('POST /api/film returns 500 when OpenAI fails', async () => {
    const fakeClient = {
      responses: {
        create: vi.fn().mockRejectedValue(new Error('OpenAI unavailable'))
      }
    };
    const app = createApp({ openaiClient: fakeClient });

    const response = await request(app)
      .post('/api/film')
      .send({ previousFilms: [] });

    expect(response.status).toBe(500);
    expect(response.text).toBe('OpenAI unavailable');
  });

  it('rejects a non-array previousFilms value', async () => {
    const fakeClient = createFakeClient();
    const app = createApp({ openaiClient: fakeClient });

    const response = await request(app)
      .post('/api/film/lucky')
      .send({ previousFilms: 'not-an-array' });

    expect(response.status).toBe(400);
    expect(fakeClient.responses.create).not.toHaveBeenCalled();
  });

  it('allows the configured frontend origin and credentials', async () => {
    const app = createApp({ openaiClient: createFakeClient() });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const response = await request(app)
      .get('/')
      .set('Origin', frontendUrl);

    expect(response.headers['access-control-allow-origin']).toBe(frontendUrl);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rate limits requests after the configured limit', async () => {
    const app = createApp({ openaiClient: createFakeClient() });

    const responses = await Promise.all(
      Array.from({ length: 51 }, () => request(app).get('/'))
    );

    expect(responses.filter(({ status }) => status === 429)).toHaveLength(1);
    expect(responses.at(-1).text).toBe('Request limit hit, I\'m not made of money, try again later.');
  });
});
