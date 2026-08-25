const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

dotenv.config({
  path: path.join(__dirname, '.env'),
});

const connectDB = require('./config/db');
const seedAdmin = require('./utils/seedAdmin');

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'https://dial.webcodexus.com',
].filter(Boolean);

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

let dbReadyPromise = null;

async function ensureDatabase() {
  if (!dbReadyPromise) {
    dbReadyPromise = connectDB()
      .then(async () => {
        await seedAdmin();
        console.log('Database initialized');
      })
      .catch((error) => {
        dbReadyPromise = null;
        throw error;
      });
  }

  return dbReadyPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDatabase();
    next();
  } catch (error) {
    console.error('Database initialization failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
    });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/uploads', require('./routes/upload'));
app.use('/api/crm', require('./routes/crm'));
app.use('/api/dialer', require('./routes/dialer'));
app.use('/api/members', require('./routes/members'));
app.use('/api/company', require('./routes/company'));
app.use('/api/integrations', require('./routes/integration'));
app.use('/api/pbx', require('./routes/pbx'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/pipeline', require('./routes/pipeline'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/master', require('./routes/master'));

app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'WebDial API is running',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;