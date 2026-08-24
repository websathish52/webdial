const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// load .env from backend folder explicitly
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const seedAdmin = require('./utils/seedAdmin');

const app = express();

// FIX: helmet's default Cross-Origin-Resource-Policy is "same-origin",
// which blocks the browser from rendering ANY resource (images, etc.)
// fetched from a different origin than the page — e.g. the frontend on
// :5173 loading a logo/KYC image served from the backend on :5000.
// That's exactly what caused:
//   net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
// on the <img src="http://localhost:5000/uploads/...">.
// "cross-origin" tells browsers these responses are safe to be embedded
// cross-origin (fine here since /uploads only serves non-sensitive,
// publicly-servable files like logos and KYC previews).
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'https://dial.webcodexus.com',
  'https://www.dial.webcodexus.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

// static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// routes
app.use('/api/auth', require('./routes/auth'));
// Note: /api/uploads contains routes for both lead imports and generic asset uploads
app.use('/api/uploads', require('./routes/upload'));
app.use('/api/crm', require('./routes/crm'));
app.use('/api/dialer', require('./routes/dialer'));
app.use('/api/members', require('./routes/members'));
app.use('/api/company', require('./routes/company'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/pipeline', require('./routes/pipeline'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/master', require('./routes/master'));
// simple health route
app.get('/', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' }));

const PORT = process.env.PORT || 5000;

async function start() {
  if (process.env.MONGO_URI) {
    try {
      await connectDB();
      await seedAdmin();
    } catch (err) {
      console.warn('MongoDB unavailable, continuing with local auth fallback:', err.message);
    }
  } else {
    console.warn('MONGO_URI not set, continuing with local auth fallback');
  }

  const server = app.listen(PORT);
  server.once('listening', () => {
    console.log(`Server running on port ${PORT}`);
  });
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the existing backend process or use another PORT.`);
      process.exitCode = 1;
      return;
    }
    console.error('Backend server failed to start:', err);
    process.exitCode = 1;
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});