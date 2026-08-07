import { describe, it, expect } from 'vitest';
import request from 'supertest';

import { createApp } from '../app.js';

describe('movie API', () => {
  it('GET / returns the health message', async () => {
    const app = createApp();

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toBe('API is running');
  });

  it('POST /api/film/lucky returns the OpenAI result', async () => {
    const fakeClient = {
      responses: {
        create: async () => ({
          output_text: JSON.stringify({
            title: 'The Lives of Others',
            year: '2006'
          })
        })
      }
    };

    const app = createApp({ openaiClient: fakeClient });

    const response = await request(app)
      .post('/api/film/lucky')
      .send({ previousFilms: [] });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(JSON.stringify({ title: 'The Lives of Others', year: '2006' }));
  });
});
