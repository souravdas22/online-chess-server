import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { setupSocketHandlers } from './socket';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001');

// Start server
const start = async () => {
  const fastify = Fastify({
    logger: true,
  });

  // Enable CORS
  await fastify.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Create HTTP server and Socket.IO
  const server = fastify.server;
  const io = new Server(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Setup Socket.IO handlers
  setupSocketHandlers(io);

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Chess server running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
