import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Initialize environment variables mapping
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow requests from frontend
app.use(express.json()); // Parse incoming JSON payloads

// -----------------------------------------------------------------------------
// ROUTES (We will expand these as we build the backend)
// -----------------------------------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Welcome to Wasla Telecom API',
    databaseConnection: 'Pending Connection Check...'
  });
});

// A quick route to test if Prisma can talk to PostgreSQL successfully
app.get('/api/health', async (req, res) => {
  try {
    // Attempt a lightweight query
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'success', message: 'Database connected perfectly!' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed', error: error.message });
  }
});

// -----------------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 Wasla Telecom Backend is running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`========================================`);
});
