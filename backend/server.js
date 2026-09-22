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
const Subscription = require('./models/Subscription');
const Company = require('./models/Company');
const User = require('./models/User');
const Trial = require('./models/Trial');
const { sendSubscriptionEmail } = require('./utils/subscriptionMailer');
const notificationController = require('./controllers/notificationController');

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
  'https://www.webdial.in',
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

async function checkSubscriptionExpiryReminders() {
  try {
    const now = new Date();
    const soonWindow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const subscriptions = await Subscription.find({
      status: 'ACTIVE',
      expiryDate: { $ne: null },
    }).lean();

    for (const subscription of subscriptions) {
      const company = await Company.findById(subscription.companyId).select('companyName').lean();
      const admin = await User.findOne({ companyId: subscription.companyId, role: { $in: ['admin', 'superadmin'] } }).select('email name').lean();
      const masterUsers = await User.find({ role: 'master' }).select('_id').lean();
      const expiryDate = subscription.expiryDate ? new Date(subscription.expiryDate) : null;
      const isExpired = expiryDate && expiryDate <= now;
      const isExpiringSoon = expiryDate && expiryDate <= soonWindow && expiryDate > now;
      const lastReminderSentAt = subscription.lastReminderSentAt ? new Date(subscription.lastReminderSentAt) : null;
      const shouldSendReminder = !lastReminderSentAt || lastReminderSentAt.getTime() < (now.getTime() - 7 * 24 * 60 * 60 * 1000);

      if (isExpired) {
        await Subscription.findByIdAndUpdate(subscription._id, { status: 'EXPIRED', lastReminderSentAt: now });
        const mailDetails = {
          Customer: admin?.name || company?.companyName || 'Customer',
          Company: company?.companyName || 'Company',
          Plan: subscription.plan,
          'Expiry date': expiryDate.toISOString(),
          'Status': 'Expired',
          'Next step': 'Please renew or buy a new plan to continue using WebDial.',
        };
        await Promise.allSettled([
          sendSubscriptionEmail({
            to: admin?.email,
            subject: 'WebDial Subscription Expired',
            title: 'Your WebDial subscription has expired',
            details: mailDetails,
          }),
          ...masterUsers.map((masterUser) => notificationController.createNotification({
            companyId: subscription.companyId,
            recipientId: masterUser._id,
            actorId: null,
            type: 'subscription_expired',
            title: 'Subscription expired',
            message: `${company?.companyName || 'Customer'} subscription has expired.`,
            metadata: { companyName: company?.companyName || 'Company', plan: subscription.plan, expiryDate: expiryDate.toISOString() },
          })),
        ]);
      } else if (isExpiringSoon && shouldSendReminder) {
        const mailDetails = {
          Customer: admin?.name || company?.companyName || 'Customer',
          Company: company?.companyName || 'Company',
          Plan: subscription.plan,
          'Expiry date': expiryDate.toISOString(),
          'Status': 'Expiring soon',
        };
        await Promise.allSettled([
          sendSubscriptionEmail({
            to: admin?.email,
            subject: 'WebDial Subscription Expiring Soon',
            title: 'Your WebDial subscription is expiring soon',
            details: mailDetails,
          }),
          Subscription.findByIdAndUpdate(subscription._id, { lastReminderSentAt: now }),
          ...masterUsers.map((masterUser) => notificationController.createNotification({
            companyId: subscription.companyId,
            recipientId: masterUser._id,
            actorId: null,
            type: 'subscription_expiring',
            title: 'Subscription expiring soon',
            message: `${company?.companyName || 'Customer'} plan expires soon.`,
            metadata: { companyName: company?.companyName || 'Company', plan: subscription.plan, expiryDate: expiryDate.toISOString() },
          })),
        ]);
      }
    }

    const trials = await Trial.find({
      status: { $ne: 'CONVERTED' },
      expiryDate: { $ne: null },
    }).lean();

    for (const trial of trials) {
      const company = await Company.findById(trial.companyId).select('companyName').lean();
      const user = await User.findOne({ companyId: trial.companyId, role: { $in: ['admin', 'superadmin'] } }).select('email name').lean();
      const expiryDate = new Date(trial.expiryDate);
      const isExpired = expiryDate <= now;
      const isExpiringSoon = expiryDate <= soonWindow && expiryDate > now;
      const lastReminderSentAt = trial.lastReminderSentAt ? new Date(trial.lastReminderSentAt) : null;
      const shouldSendReminder = !lastReminderSentAt || lastReminderSentAt.getTime() < (now.getTime() - 7 * 24 * 60 * 60 * 1000);

      if (isExpired) {
        await Trial.findByIdAndUpdate(trial._id, { status: 'EXPIRED', expiryDate, endDate: now, lastReminderSentAt: now });
        await Promise.allSettled([
          sendSubscriptionEmail({
            to: user?.email,
            subject: 'WebDial Free Trial Expired',
            title: 'Your WebDial free trial has expired',
            details: { Customer: user?.name || company?.companyName || 'Customer', Company: company?.companyName || 'Company', Plan: trial.plan || 'STARTED', 'Expiry date': expiryDate.toISOString(), 'Status': 'Expired' },
          }),
        ]);
      } else if (isExpiringSoon && shouldSendReminder) {
        await Promise.allSettled([
          sendSubscriptionEmail({
            to: user?.email,
            subject: 'WebDial Free Trial Expiring Soon',
            title: 'Your WebDial free trial is ending soon',
            details: { Customer: user?.name || company?.companyName || 'Customer', Company: company?.companyName || 'Company', Plan: trial.plan || 'STARTED', 'Expiry date': expiryDate.toISOString(), 'Status': 'Expiring soon' },
          }),
          Trial.findByIdAndUpdate(trial._id, { lastReminderSentAt: now }),
        ]);
      }
    }
  } catch (error) {
    console.error('Subscription expiry reminder check failed:', error);
  }
}

app.post('/api/error-report', async (req, res) => {
  try {
    const { message, stack, source = 'portal', url, userEmail, userName } = req.body || {};
    const recipients = [userEmail, process.env.ADMIN_EMAIL || 'sathish@webcodexus.com'].filter(Boolean);
    if (!recipients.length) {
      return res.json({ success: true });
    }

    const details = {
      Source: source,
      URL: url || 'Unknown',
      Message: message || 'Unknown portal error',
      Stack: stack || 'No stack trace available',
      User: userName || userEmail || 'Portal user',
      'Reported at': new Date().toISOString(),
    };

    await Promise.allSettled(recipients.map((to) => sendSubscriptionEmail({
      to,
      subject: 'WebDial Portal Error Report',
      title: 'WebDial portal error notification',
      details,
    })));

    res.json({ success: true });
  } catch (error) {
    console.error('Error report failed:', error);
    res.status(500).json({ success: false, message: 'Failed to send error report' });
  }
});

setInterval(() => {
  void checkSubscriptionExpiryReminders();
}, 60 * 60 * 1000);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/uploads', require('./routes/upload'));
app.use('/api/crm', require('./routes/crm'));
app.use('/api/dialer', require('./routes/dialer'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/members', require('./routes/members'));
app.use('/api/company', require('./routes/company'));
app.use('/api/integrations', require('./routes/integration'));
app.use('/api/pbx', require('./routes/pbx'));
app.use('/api/payments', require('./routes/payment'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/gopages', require('./routes/goPages'));
app.use('/api/voice-broadcast', require('./routes/voiceBroadcast'));
app.use('/api/whatsapp/broadcasts', require('./routes/whatsappBroadcast'));
app.use('/api/whatsapp/reports', require('./routes/whatsappReport'));
app.use('/api/pipeline', require('./routes/pipeline'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/products', require('./routes/products'));
app.use('/api/automation', require('./routes/automation'));
app.use('/api/forms', require('./routes/form'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/support', require('./routes/support'));
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

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. The WebDial backend may already be running; do not start a second instance.`);
      process.exitCode = 1;
      return;
    }
    console.error('Backend server failed to start:', error);
    process.exitCode = 1;
  });
}

module.exports = app;
