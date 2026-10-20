import 'dotenv/config';
import { app } from './app.js';
import { migrate } from './db.js';
import { recover } from './lib/queue.js';

for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

await migrate();
const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`api on :${port}`));

const resumed = await recover();
if (resumed) console.log(`resumed ${resumed} pending screenings`);
