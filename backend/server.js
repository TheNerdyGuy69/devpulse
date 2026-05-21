import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { env } from './src/config/env.js';

const start = async () => {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
