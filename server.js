import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});