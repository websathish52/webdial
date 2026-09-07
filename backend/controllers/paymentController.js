const Payment = require('../models/Payment');
const CompanySettings = require('../models/CompanySettings');
const Subscription = require('../models/Subscription');
const Company = require('../models/Company');
const User = require('../models/User');
const Trial = require('../models/Trial');
const { sendSubscriptionEmail } = require('../utils/subscriptionMailer');
const notificationController = require('./notificationController');
const { requireCompanyId, isMaster } = require('../middleware/tenant');

const cycleMonths = { monthly: 1, halfyearly: 6, yearly: 12, annual: 12 };
const discountRates = { monthly: 0, halfyearly: 0.1, yearly: 0.15, annual: 0.15 };
const planPrices = { Starter: 199, Pro: 499 };
const addMonthsFromDate = (date, cycle) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + (cycleMonths[cycle] || 1));
  return next;
};
const emptyPaymentProfile = {
  company: '', firstName: '', lastName: '', email: '', phone: '', address: '',
  state: '', city: '', pincode: '', country: 'India', gstin: '',
};

exports.getProfile = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const settings = await CompanySettings.findOne({ companyId }).select('paymentProfile').lean();
    const [company, user] = await Promise.all([
      Company.findById(companyId).select('companyName').lean(),
      User.findOne({ companyId }).select('name email phone').sort({ createdAt: 1 }).lean(),
    ]);
    const nameParts = String(user?.name || '').trim().split(/\s+/).filter(Boolean);
    const savedProfile = settings?.paymentProfile || {};
    res.json({
      ...emptyPaymentProfile,
      company: company?.companyName || '',
      firstName: nameParts.shift() || '',
      lastName: nameParts.join(' '),
      email: user?.email || '',
      phone: user?.phone || '',
      ...Object.fromEntries(Object.entries(savedProfile).filter(([, value]) => String(value || '').trim())),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getSubscription = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const subscription = await Subscription.findOne({ companyId }).sort({ createdAt: -1 }).lean();
    res.json(subscription || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateProfile = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const profile = { ...emptyPaymentProfile };
    for (const key of Object.keys(profile)) profile[key] = String(req.body?.[key] ?? profile[key]).trim();
    const settings = await CompanySettings.findOneAndUpdate(
      { companyId },
      { $set: { paymentProfile: profile } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).select('paymentProfile').lean();
    res.json(settings.paymentProfile);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.list = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const payments = await Payment.find({ companyId }).sort({ createdAt: -1 }).limit(100).lean();
    res.json(payments);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const { plan, pricePerUser, users, cycle = 'monthly', profile = {} } = req.body;
    const numericPrice = planPrices[plan] || Number(pricePerUser);
    const selectedUsers = Number(users);
    if (!planPrices[plan] || !Number.isFinite(selectedUsers) || !Number.isInteger(selectedUsers) || selectedUsers < 1) {
      return res.status(400).json({ message: 'Plan, price per user, and user count are required' });
    }

    const currentSubscription = await Subscription.findOne({ companyId }).sort({ createdAt: -1 }).lean();
    const isTrialActive = currentSubscription && String(currentSubscription.type || '').toUpperCase() === 'FREE_TRIAL' && currentSubscription.status === 'ACTIVE' && currentSubscription.expiryDate && new Date(currentSubscription.expiryDate) > new Date();
    const currentPaidSeatCount = currentSubscription && String(currentSubscription.type || '').toUpperCase() === 'PAID'
      ? Number(currentSubscription.numberOfUsers || 0)
      : 0;
    const chargeableUsers = isTrialActive ? Math.max(0, selectedUsers) : Math.max(0, selectedUsers - currentPaidSeatCount);
    if (chargeableUsers <= 0) {
      return res.status(400).json({ message: 'No additional seats are due for this company. The current paid users already cover the selected users.' });
    }

    const amount = numericPrice * chargeableUsers * (cycleMonths[cycle] || 1);
    const paymentStartedAt = new Date();
    const expiry = addMonthsFromDate(paymentStartedAt, cycle);
    const discount = amount * (discountRates[cycle] || 0);
    const finalAmount = amount - discount;
    const payment = await Payment.create({ companyId, plan, pricePerUser: numericPrice, users: chargeableUsers, cycle, amount, discount, finalAmount, profile, status: 'Processing', expiry });
    res.status(201).json(payment);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.markProcessing = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const payment = await Payment.findOneAndUpdate({ _id: req.params.id, companyId, status: { $in: ['Pending', 'Processing'] } }, { status: 'Processing', paidAt: new Date() }, { new: true });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const [company, currentSubscription, account] = await Promise.all([
      Company.findById(companyId).select('companyName').lean(),
      Subscription.findOne({ companyId }).sort({ createdAt: -1 }).lean(),
      User.findOne({ companyId, role: { $in: ['admin', 'superadmin'] } }).select('name email').lean(),
    ]);

    const emailDetails = {
      Customer: account?.name || 'Customer',
      Company: company?.companyName || 'N/A',
      Plan: payment.plan,
      'Existing Paid Users': Number(currentSubscription?.numberOfUsers || 0),
      'New Users': Number(payment.users || 0),
      Amount: `₹${Number(payment.finalAmount ?? payment.amount ?? 0).toLocaleString('en-IN')}`,
      'Payment Status': 'Processing',
      'Payment date': new Date(payment.paidAt || payment.createdAt || Date.now()).toLocaleString('en-IN'),
    };

    const masterUser = await User.findOne({ role: 'master' }).select('_id email name').lean();
    if (masterUser) {
      await notificationController.createPaymentNotification({
        companyId,
        recipientId: masterUser._id,
        actorId: account?._id || null,
        payment,
        customerName: account?.name || company?.companyName || 'Customer',
        companyName: company?.companyName || 'Company',
        status: 'pending',
      });
    }

    await Promise.allSettled([
      sendSubscriptionEmail({
        to: 'sathish@webcodexus.com',
        subject: 'WebDial Payment Submitted for Approval',
        title: 'New payment is awaiting master approval',
        details: emailDetails,
      }),
      sendSubscriptionEmail({
        to: process.env.ADMIN_EMAIL || 'sathish@webcodexus.com',
        subject: 'WebDial Payment Submitted for Approval',
        title: 'New payment is awaiting master approval',
        details: emailDetails,
      }),
    ]);

    res.json(payment);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.markPaid = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const companyId = payment.companyId;
    if (!isMaster(req)) {
      const requesterCompanyId = requireCompanyId(req);
      if (String(requesterCompanyId) !== String(companyId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const updatedPayment = await Payment.findOneAndUpdate({ _id: req.params.id, status: { $in: ['Processing', 'Pending'] } }, { status: 'Paid', paidAt: new Date() }, { new: true });
    if (!updatedPayment) return res.status(404).json({ message: 'Payment not found or not awaiting approval' });

    const currentSubscription = await Subscription.findOne({ companyId }).sort({ createdAt: -1 }).lean();
    const existingSeatCount = currentSubscription && String(currentSubscription.type || '').toUpperCase() === 'PAID'
      ? Number(currentSubscription.numberOfUsers || 0)
      : 0;
    const updatedSeatCount = existingSeatCount + Number(payment.users || 0);
    const paidPlan = payment.plan === 'Starter' ? 'STARTED' : 'PRO';
    const paidActivationAt = new Date();
    const nextExpiry = addMonthsFromDate(paidActivationAt, payment.cycle || 'monthly');

    if (currentSubscription) {
      await Subscription.findByIdAndUpdate(currentSubscription._id, {
        plan: paidPlan,
        type: 'PAID',
        numberOfUsers: Math.max(1, updatedSeatCount),
        status: 'ACTIVE',
        billingPeriod: payment.cycle === 'yearly' ? 'annual' : payment.cycle,
        startDate: paidActivationAt,
        expiryDate: nextExpiry,
        amount: Number(currentSubscription.amount || 0) + Number(payment.amount || 0),
        finalAmount: Number(currentSubscription.finalAmount || 0) + Number(payment.finalAmount || 0),
        paymentStatus: 'SUCCESS',
        transactionId: `UPI-${payment._id}`,
      });
    } else {
      const newSubscription = await Subscription.create({
        companyId,
        plan: paidPlan,
        type: 'PAID',
        status: 'ACTIVE',
        numberOfUsers: Math.max(1, updatedSeatCount),
        billingPeriod: payment.cycle === 'yearly' ? 'annual' : payment.cycle,
        startDate: paidActivationAt,
        expiryDate: nextExpiry,
        amount: payment.amount,
        discount: payment.discount,
        finalAmount: payment.finalAmount || payment.amount,
        paymentStatus: 'SUCCESS',
        transactionId: `UPI-${payment._id}`,
      });
      await Company.findByIdAndUpdate(companyId, { subscriptionId: newSubscription._id, accountStatus: 'ACTIVE', status: 'active' });
    }

    await Company.findByIdAndUpdate(companyId, { accountStatus: 'ACTIVE', status: 'active' });
    await Trial.updateMany(
      { companyId, $or: [{ convertedToPaid: false }, { status: { $ne: 'CONVERTED' } }] },
      { $set: { convertedToPaid: true, status: 'CONVERTED', expiryDate: paidActivationAt, endDate: paidActivationAt } },
      { multi: true }
    );
    const account = await require('../models/User').findOne({ companyId, role: { $in: ['admin', 'superadmin'] } }).select('email name').lean();
    const company = await Company.findById(companyId).select('companyName').lean();
    const masterUsers = await User.find({ role: 'master' }).select('_id').lean();
    await Promise.allSettled([
      sendSubscriptionEmail({ to: account?.email, subject: `WebDial Subscription Updated - ${payment.plan}`, title: 'Payment approved', details: { Plan: payment.plan, 'Additional users': payment.users, 'Total users': updatedSeatCount, Amount: payment.finalAmount || payment.amount, 'Subscription expiry': nextExpiry.toISOString(), Reference: `UPI-${payment._id}` } }),
      sendSubscriptionEmail({ to: process.env.ADMIN_EMAIL || 'sathish@webcodexus.com', subject: 'WebDial Payment Approved', title: 'Payment approved by master', details: { Customer: account?.name || companyId, Plan: payment.plan, 'Approved users': payment.users, Amount: payment.finalAmount || payment.amount, 'Payment status': 'Approved', Reference: `UPI-${payment._id}` } }),
      ...masterUsers.map((masterUser) => notificationController.createPaymentNotification({
        companyId,
        recipientId: masterUser._id,
        actorId: account?._id || null,
        payment,
        customerName: account?.name || company?.companyName || 'Customer',
        companyName: company?.companyName || 'Company',
        status: 'approved',
      })),
    ]);
    res.json(updatedPayment);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.rejectPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const companyId = payment.companyId;
    if (!isMaster(req)) {
      const requesterCompanyId = requireCompanyId(req);
      if (String(requesterCompanyId) !== String(companyId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const updatedPayment = await Payment.findOneAndUpdate({ _id: req.params.id, status: { $in: ['Processing', 'Pending', 'Rejected', 'Failed'] } }, { status: 'Failed' }, { new: true });
    if (!updatedPayment) return res.status(404).json({ message: 'Payment not found or not awaiting approval' });

    const company = await Company.findById(companyId).select('companyName').lean();
    const account = await User.findOne({ companyId, role: { $in: ['admin', 'superadmin'] } }).select('email name').lean();
    const masterUsers = await User.find({ role: 'master' }).select('_id').lean();
    await Promise.allSettled([
      sendSubscriptionEmail({
        to: account?.email, subject: 'WebDial Payment Failed', title: 'Payment rejected / failed', details: { Customer: account?.name || company?.companyName || 'Customer', Company: company?.companyName || 'Company', Plan: updatedPayment.plan, Amount: updatedPayment.finalAmount || updatedPayment.amount, Status: 'Failed or rejected', Reference: `UPI-${updatedPayment._id}` },
      }),
      sendSubscriptionEmail({
        to: process.env.ADMIN_EMAIL || 'sathish@webcodexus.com', subject: 'WebDial Payment Failed', title: 'Payment failed or rejected', details: { Customer: account?.name || company?.companyName || 'Customer', Company: company?.companyName || 'Company', Plan: updatedPayment.plan, Amount: updatedPayment.finalAmount || updatedPayment.amount, Status: 'Failed or rejected', Reference: `UPI-${updatedPayment._id}` },
      }),
      ...masterUsers.map((masterUser) => notificationController.createPaymentNotification({
        companyId,
        recipientId: masterUser._id,
        actorId: account?._id || null,
        payment: updatedPayment,
        customerName: account?.name || company?.companyName || 'Customer',
        companyName: company?.companyName || 'Company',
        status: 'rejected',
      })),
    ]);
    res.json(updatedPayment);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
