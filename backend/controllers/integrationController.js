const Integration = require('../models/Integration');
const { requireCompanyId } = require('../middleware/tenant');

const catalog = [
  ['facebook-lead-ads', 'Facebook Lead Form Ads', 'Connect Facebook Lead Form Ads and import leads.'],
  ['indiamart', 'IndiaMart', 'Import IndiaMART leads into a CRM list.'],
  ['indiamart-v2', 'IndiaMart V2', 'Import IndiaMART V2 leads into a CRM list.'],
  ['justdial', 'Justdial', 'Connect Justdial lead delivery.'],
  ['justdial-v2', 'Justdial V2', 'Connect Justdial V2 lead delivery.'],
  ['tradeindia', 'TradeIndia', 'Import TradeIndia enquiries.'],
  ['pabbly', 'Pabbly', 'Connect Pabbly workflows.'],
  ['quikr', 'Quikr', 'Import Quikr leads.'],
  ['99acres', '99acres', 'Import 99acres leads.'],
  ['magicbricks', 'Magicbricks', 'Import Magicbricks leads.'],
  ['hubspot', 'Hubspot', 'Connect Hubspot CRM.'],
  ['housing', 'Housing', 'Import Housing leads.'],
  ['shopify', 'Shopify', 'Sync Shopify customers.'],
  ['woocommerce', 'Woocommerce', 'Sync WooCommerce customers.'],
  ['google-sheet-sync', 'Google Sheet Sync', 'Sync leads from Google Sheets.'],
  ['google-sheet-import', 'Google Sheet Import', 'Import a Google Sheet once.'],
  ['external-api', 'External API', 'Push contacts from your own sources.'],
  ['webhook', 'Webhook', 'Send CRM events to your webhook.'],
  ['integrately', 'Integrately', 'Connect workflows through Integrately.'],
  ['zoho', 'Zoho', 'Connect Zoho CRM.'],
  ['web-forms', 'Web Forms', 'Receive leads from an embedded form.'],
];

exports.list = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const saved = await Integration.find({ companyId }).lean();
    const byProvider = new Map(saved.map((item) => [item.provider, item]));
    res.json(catalog.map(([provider, name, description]) => ({ provider, name, description, connected: !!byProvider.get(provider)?.connected, config: byProvider.get(provider)?.config || {} })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.upsert = async (req, res) => {
  try {
    const companyId = requireCompanyId(req);
    const { provider, name, description, connected, config = {} } = req.body;
    if (!provider || !name) return res.status(400).json({ message: 'provider and name are required' });
    const integration = await Integration.findOneAndUpdate(
      { companyId, provider },
      { companyId, provider, name, description, connected: Boolean(connected), config, connectedAt: connected ? new Date() : undefined },
      { upsert: true, new: true, runValidators: true },
    ).lean();
    res.json(integration);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
