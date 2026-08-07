import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const app = createApp();

// "::" rather than 0.0.0.0 or localhost. Inside a container the process must
// accept connections from outside it, and Railway's private network resolves
// service hostnames to IPv6 addresses. Binding to "::" covers IPv6 and, through
// dual-stack mapping, IPv4 as well. Binding to 0.0.0.0 listens on IPv4 only,
// which makes the service unreachable over the private network.
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
