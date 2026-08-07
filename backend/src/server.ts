import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const app = createApp();

// 0.0.0.0 rather than localhost: inside a container the process must accept
// connections from outside it, not only from the container's own loopback.
const server = app.listen(env.port, '::', () => {
  // eslint-disable-next-line no-console
  console.log(`Project FORGE API listening on port ${env.port}`);
});

async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received — shutting down gracefully...`);
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
