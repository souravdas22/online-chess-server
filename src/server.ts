import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { setupSocketHandlers } from './socket';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME || '0.0.0.0';

// Get allowed CORS origins
const getCorsOrigins = (): string[] | boolean => {
  const envOrigin = process.env.FRONTEND_URL;
  if (envOrigin) {
    return [envOrigin];
  }
  // Allow all origins in development
  return process.env.NODE_ENV === 'production' ? [] : true;
};

// Start server
const start = async () => {
  const fastify = Fastify({
    logger: true,
  });

  // Enable CORS
  await fastify.register(fastifyCors, {
    origin: getCorsOrigins(),
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
      origin: getCorsOrigins(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Setup Socket.IO handlers
  setupSocketHandlers(io);

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Chess server running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
