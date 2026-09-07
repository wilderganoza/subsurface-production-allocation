import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './db.js';
import { authMiddleware, requireAdmin } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import wellsRouter from './routes/wells.js';
import allocationRouter from './routes/allocation.js';
import adminUsersRouter from './routes/adminUsers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public routes
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/wells', authMiddleware, wellsRouter);
app.use('/api', authMiddleware, allocationRouter);
app.use('/api/admin/users', authMiddleware, requireAdmin, adminUsersRouter);

// Initialize database and start server
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
