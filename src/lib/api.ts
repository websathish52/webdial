import { store } from '@/lib/mock-store';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const API_BASE = rawApiUrl || 'http://localhost:5000';
let activeRequests = 0;
let loadingTimer: number | null = null;
let loadingHideTimer: number | null = null;
let loadingStartedAt = 0;

function emitApiLoading(loading: boolean, progress = loading ? 1 : 100) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ifox-api-loading', { detail: { loading, progress } }));
  }
}

function setApiLoading(delta: 1 | -1) {
  activeRequests = Math.max(0, activeRequests + delta);
  if (delta === 1 && activeRequests === 1) {
    if (loadingHideTimer && typeof window !== 'undefined') window.clearTimeout(loadingHideTimer);
    loadingHideTimer = null;
    loadingStartedAt = Date.now();
    emitApiLoading(true, 1);
    if (typeof window !== 'undefined') {
      loadingTimer = window.setInterval(() => {
        const elapsed = Date.now() - loadingStartedAt;
        emitApiLoading(true, Math.min(95, Math.max(1, Math.round(1 + elapsed / 120))));
      }, 100);
    }
  } else if (delta === -1 && activeRequests === 0) {
    if (loadingTimer && typeof window !== 'undefined') window.clearInterval(loadingTimer);
    loadingTimer = null;
    emitApiLoading(true, 100);
    if (typeof window !== 'undefined') {
      loadingHideTimer = window.setTimeout(() => {
        loadingHideTimer = null;
        emitApiLoading(false, 100);
      }, 180);
    }
  }
}

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const prefixedPath = normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;

  if (!rawApiUrl) {
    return `http://localhost:5000${prefixedPath}`;
  }

  if (rawApiUrl.endsWith('/api')) {
    return `${rawApiUrl}${prefixedPath.replace(/^\/api/, '')}`;
  }

  return `${rawApiUrl}${prefixedPath}`;
}

// Turns a backend-relative file URL (e.g. "/uploads/companies/123/logo.png")
// into an absolute URL the browser can actually load, regardless of which
// port/origin the frontend dev server is running on. Safe to call with
// already-absolute URLs (http/https) -- they're returned unchanged.
export function resolveFileUrl(url?: string | null): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;

  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  const baseForFiles = rawApiUrl ? rawApiUrl.replace(/\/api\/?$/, '') : API_BASE;

  return `${baseForFiles}${normalizedUrl}`;
}

function clearAuthStorage() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ifox_token');
  localStorage.removeItem('ifox_user');
  localStorage.removeItem('ifox_selected_company');
  sessionStorage.removeItem('ifox_token');
  sessionStorage.removeItem('ifox_user');
  sessionStorage.removeItem('ifox_selected_company');
  document.cookie = 'ifox_token=; Max-Age=0; path=/';
  document.cookie = 'ifox_user=; Max-Age=0; path=/';
}

function getStoredToken() {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|; )ifox_token=([^;]+)/);
  const cookieToken = match ? decodeURIComponent(match[1]) : '';
  return localStorage.getItem('ifox_token') || sessionStorage.getItem('ifox_token') || cookieToken || '';
}

export function getSelectedCompanyId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ifox_selected_company') || sessionStorage.getItem('ifox_selected_company') || null;
}

export function setSelectedCompanyId(companyId: string | null) {
  if (typeof window === 'undefined') return;
  if (companyId) {
    localStorage.setItem('ifox_selected_company', companyId);
    sessionStorage.setItem('ifox_selected_company', companyId);
  } else {
    localStorage.removeItem('ifox_selected_company');
    sessionStorage.removeItem('ifox_selected_company');
  }
  window.dispatchEvent(new CustomEvent('ifox-company-changed'));
}

async function request(path: string, opts: RequestInit = {}) {
  const showLoader = String(opts.method || 'GET').toUpperCase() !== 'GET';
  if (showLoader) setApiLoading(1);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const token = getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const companyId = getSelectedCompanyId();
  if (companyId) headers['X-Company-Id'] = companyId;
  try {
    const res = await fetch(buildApiUrl(path), { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearAuthStorage();
      }
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = { message: text }; }
      if (res.status === 507 || json.storageFull) {
        window.dispatchEvent(new CustomEvent('ifox-storage-full', { detail: { message: json.message } }));
      }
      const err = new Error(json.message || res.statusText);
      throw err;
    }
    return res.json().catch(() => null);
  } finally {
    if (showLoader) setApiLoading(-1);
  }
}

// ============ AUTH ============
export function notifyCrmUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ifox-crm-updated'));
  }
}

export async function login(emailOrUser: string, password: string) {
  return await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: emailOrUser, password }) });
}

export async function me() {
  return await request('/api/auth/me');
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return await request('/api/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function registerUser(name: string, email: string, password: string, role: string, username?: string, phone?: string, companyId?: string) {
  return await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role, username, phone, companyId }),
  });
}

// ============ LEADS & CRM ============
export async function getCompanies() {
  return await request('/api/company');
}

export async function createCompany(companyName: string, companyCode: string, status = 'active') {
  return await request('/api/company', { method: 'POST', body: JSON.stringify({ companyName, companyCode, status }) });
}
export async function getCompanyAccount(companyId: string) { return await request(`/api/company/${companyId}/account`); }
export async function changeCompanyAccountPassword(companyId: string, currentPassword: string, password: string) {
  return await request(`/api/company/${companyId}/account-password`, { method: 'PUT', body: JSON.stringify({ currentPassword, password }) });
}

export async function deleteCompany(id: string) {
  return await request(`/api/company/${id}`, { method: 'DELETE' });
}

export async function getLeads(filters?: { list?: string; disposition?: string; limit?: number; skip?: number }) {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.list) params.append('list', filters.list);
    if (filters.disposition) params.append('disposition', filters.disposition);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.skip) params.append('skip', filters.skip.toString());
  }
  const qs = params.toString();
  return await request(`/api/crm/leads${qs ? '?' + qs : ''}`);
}

export async function createLead(lead: { name: string; phone: string; list: string; email?: string; company?: string; address?: string }) {
  const result = await request('/api/crm/leads', { method: 'POST', body: JSON.stringify(lead) });
  notifyCrmUpdate();
  return result;
}

export async function importLeads(leads: Array<{ name: string; phone: string; [key: string]: any }>, list: string) {
  const result = await request('/api/crm/leads/import', { method: 'POST', body: JSON.stringify({ leads, list }) });
  notifyCrmUpdate();
  return result;
}

export async function updateLead(id: string, patch: any) {
  const result = await request(`/api/crm/leads/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
  notifyCrmUpdate();
  return result;
}

export async function deleteLead(id: string) {
  const result = await request(`/api/crm/leads/${id}`, { method: 'DELETE' });
  notifyCrmUpdate();
  return result;
}

export async function getLists(companyId?: string | null) {
  return await request('/api/crm/lists', companyId ? { headers: { 'X-Company-Id': companyId } } : undefined);
}

export async function createList(name: string, description?: string) {
  const result = await request('/api/crm/lists', { method: 'POST', body: JSON.stringify({ name, description }) });
  notifyCrmUpdate();
  return result;
}

export async function updateList(id: string, patch: { name?: string; description?: string; assignedTo?: string[] }) {
  const result = await request(`/api/crm/lists/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
  notifyCrmUpdate();
  return result;
}

export async function deleteList(id: string) {
  const result = await request(`/api/crm/lists/${id}`, { method: 'DELETE' });
  notifyCrmUpdate();
  return result;
}

export async function rechurnList(id: string) {
  const result = await request(`/api/crm/lists/${id}/rechurn`, { method: 'POST' });
  notifyCrmUpdate();
  return result;
}

// ============ DIALER & CALLS ============
export async function logCall(call: { leadId: string; phone: string; name: string; duration: number; disposition: string; notes?: string; recordingUrl?: string; agent?: string }) {
  const result = await request('/api/dialer/call-logs', { method: 'POST', body: JSON.stringify(call) });
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ifox-call-logged'));
  return result;
}

export async function getCallLogs(filters?: { agent?: string; limit?: number; skip?: number; scope?: string }) {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.agent) params.append('agent', filters.agent);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.skip) params.append('skip', filters.skip.toString());
    if (filters.scope) params.append('scope', filters.scope);
  }
  const qs = params.toString();
  return await request(`/api/dialer/call-logs${qs ? '?' + qs : ''}`);
}

export async function getDashboardStats() {
  return await request('/api/dialer/stats');
}

export async function getRecordings(filters?: { limit?: number; skip?: number }) {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.skip) params.append('skip', filters.skip.toString());
  }
  const qs = params.toString();
  return await request(`/api/dialer/recordings${qs ? '?' + qs : ''}`);
}

// ============ MEMBERS & TEAM ============
export async function getMembers() {
  return await request('/api/members');
}

export async function getMember(id: string) {
  return await request(`/api/members/${id}`);
}

export async function updateMember(id: string, patch: { name?: string; email?: string; phone?: string; role?: string; username?: string; lists?: string[]; teams?: string[]; companyId?: string }) {
  return await request(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

export async function updateMemberPassword(id: string, password: string) {
  return await request(`/api/members/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) });
}

export async function deleteMember(id: string) {
  return await request(`/api/members/${id}`, { method: 'DELETE' });
}

export async function getSettings() {
  return await request('/api/members/settings/me');
}

export async function updateSettings(settings: any) {
  return await request('/api/members/settings/me', { method: 'PUT', body: JSON.stringify(settings) });
}

// ============ FILE UPLOADS ============
export async function uploadFile(formData: FormData) {
  setApiLoading(1);
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const companyId = getSelectedCompanyId();
  if (companyId) headers['X-Company-Id'] = companyId;
  try {
    const res = await fetch(buildApiUrl('/uploads'), { method: 'POST', body: formData, headers });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) clearAuthStorage();
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = { message: text }; }
      if (res.status === 507 || json.storageFull) {
        window.dispatchEvent(new CustomEvent('ifox-storage-full', { detail: { message: json.message } }));
      }
      throw new Error(json.message || res.statusText || 'Upload failed');
    }
    return res.json();
  } finally {
    setApiLoading(-1);
  }
}

export async function getUploads() {
  return await request('/api/uploads');
}

export async function deleteUpload(id: string) {
  return await request(`/api/uploads/${id}`, { method: 'DELETE' });
}

// ============ MARKETING ============
export async function getCampaigns() {
  return await request('/api/marketing/campaigns');
}

export async function createCampaign(payload: { name: string; script: string; status?: string }) {
  return await request('/api/marketing/campaigns', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateCampaign(id: string, patch: any) {
  return await request(`/api/marketing/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

// ============ PIPELINE ============
export async function getPipeline() {
  return await request('/api/pipeline');
}

export async function createStage(payload: { name: string; color?: string; companyId?: string | null }) {
  return await request('/api/pipeline/stages', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteStage(id: string) {
  return await request(`/api/pipeline/stages/${id}`, { method: 'DELETE' });
}

export async function moveDeal(dealId: string, stageId: string) {
  return await request('/api/pipeline/deals/move', { method: 'POST', body: JSON.stringify({ dealId, stageId }) });
}

export async function addDeal(payload: any) {
  return await request('/api/pipeline/deals', { method: 'POST', body: JSON.stringify(payload) });
}

// ============ TASKS ============
export async function getTasks() {
  return await request('/api/tasks');
}

export async function createTask(payload: any) {
  return await request('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateTask(id: string, patch: any) {
  return await request(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

export async function deleteTask(id: string) {
  return await request(`/api/tasks/${id}`, { method: 'DELETE' });
}

// ============ NOTIFICATIONS ============
export async function getNotifications() {
  return await request('/api/notifications');
}

export async function markNotificationRead(id: string) {
  return await request(`/api/notifications/${id}/read`, { method: 'PUT' });
}

// ============ MASTER (SuperAdmin management) ============
export async function getSuperAdmins() {
  return await request('/api/master/superadmins');
}

export async function createSuperAdmin(payload: {
  name: string;
  email: string;
  username?: string;
  phone?: string;
  password: string;
}) {
  return await request('/api/master/superadmins', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateSuperAdmin(id: string, patch: any) {
  return await request(`/api/master/superadmins/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

export async function deleteSuperAdmin(id: string) {
  return await request(`/api/master/superadmins/${id}`, { method: 'DELETE' });
}

// ============ AUDIT ============
export async function getAudit(filters?: { actor?: string; action?: string; module?: string; startDate?: string; endDate?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.actor && filters.actor !== 'all') params.append('actor', filters.actor);
    if (filters.action) params.append('action', filters.action);
    if (filters.module) params.append('module', filters.module);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.limit) params.append('limit', filters.limit.toString());
  }
  const qs = params.toString();
  return await request(`/api/audit${qs ? '?' + qs : ''}`);
}

// ============ SETTINGS ============

// General Settings
export async function getCompanyInfo() { return await request('/api/settings/company-info'); }
export async function updateCompanyInfo(data: any) { return await request('/api/settings/company-info', { method: 'PUT', body: JSON.stringify(data) }); }
export async function uploadCompanyLogo(formData: FormData) { return await request('/api/settings/company-logo', { method: 'POST', body: formData }); }
export async function removeCompanyLogo() { return await request('/api/settings/company-logo', { method: 'DELETE' }); }
export async function getKYCDetails() { return await request('/api/settings/kyc'); }
export async function updateKYCDetails(data: any) { return await request('/api/settings/kyc', { method: 'PUT', body: JSON.stringify(data) }); }
export async function uploadKYCIdDoc(formData: FormData) { return await request('/api/settings/kyc/id-doc', { method: 'POST', body: formData }); }
export async function uploadKYCRegDoc(formData: FormData) { return await request('/api/settings/kyc/reg-doc', { method: 'POST', body: formData }); }
export async function removeKYCDocument(field: 'idDoc' | 'regDoc') { return await request(`/api/settings/kyc/${field}`, { method: 'DELETE' }); }
export async function getUniqueContactsSetting() { return await request('/api/settings/unique-contacts'); }
export async function updateUniqueContactsSetting(mode: string) { return await request('/api/settings/unique-contacts', { method: 'PUT', body: JSON.stringify({ mode }) }); }

// Default Dialer
export async function getDialerSettings() { return await request('/api/settings/dialer'); }
export async function updateDialerSettings(selectedDialer: string) { return await request('/api/settings/dialer', { method: 'PUT', body: JSON.stringify({ selectedDialer }) }); }

// Custom Status
export async function getCustomStatuses() { return await request('/api/settings/custom-statuses'); }
export async function createCustomStatus(data: any) { return await request('/api/settings/custom-statuses', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateCustomStatus(key: string, data: any) { return await request(`/api/settings/custom-statuses/${key}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function deleteCustomStatus(key: string) { return await request(`/api/settings/custom-statuses/${key}`, { method: 'DELETE' }); }

// Message Templates
export async function getMessageTemplates() { return await request('/api/settings/message-templates'); }
export async function createMessageTemplate(data: any) { return await request('/api/settings/message-templates', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateMessageTemplate(id: string, data: any) { return await request(`/api/settings/message-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function deleteMessageTemplate(id: string) { return await request(`/api/settings/message-templates/${id}`, { method: 'DELETE' }); }
export async function uploadMessageTemplateAttachment(formData: FormData) { return await request('/api/settings/message-templates/attachment', { method: 'POST', body: formData }); }

// Storage
export async function getStorageUsage() { return await request('/api/settings/storage'); }
export async function getIntegrations() { return await request('/api/integrations'); }
export async function updateIntegration(provider: string, data: any) { return await request(`/api/integrations/${provider}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function getPbxSettings() { return await request('/api/pbx'); }
export async function updatePbxSettings(data: any) { return await request('/api/pbx', { method: 'PUT', body: JSON.stringify(data) }); }
export async function getPayments() { return await request('/api/payments'); }
export async function getPaymentProfile() { return await request('/api/payments/profile'); }
export async function updatePaymentProfile(profile: any) { return await request('/api/payments/profile', { method: 'PUT', body: JSON.stringify(profile) }); }
export async function createPayment(data: any) { return await request('/api/payments', { method: 'POST', body: JSON.stringify(data) }); }
export async function markPaymentPaid(id: string) { return await request(`/api/payments/${id}/paid`, { method: 'PUT' }); }

export default {
  login, me, changePassword, registerUser,
  getLeads, createLead, importLeads, updateLead, deleteLead,
  getCompanies, createCompany, getCompanyAccount, changeCompanyAccountPassword, deleteCompany,
  getLists, createList, updateList, deleteList, rechurnList,
  logCall, getCallLogs, getDashboardStats, getRecordings,
  getMembers, getMember, updateMember, updateMemberPassword, deleteMember,
  getSettings, updateSettings, getPaymentProfile, updatePaymentProfile,
  uploadFile, getUploads, deleteUpload,
  getCampaigns, createCampaign, updateCampaign,
  getPipeline, createStage, deleteStage, moveDeal, addDeal,
  getTasks, createTask, updateTask, deleteTask,
  getNotifications, markNotificationRead,
  getSuperAdmins, createSuperAdmin, updateSuperAdmin, deleteSuperAdmin,
  getAudit,
  // Settings
  getCompanyInfo, updateCompanyInfo, uploadCompanyLogo, removeCompanyLogo,
  getKYCDetails, updateKYCDetails, uploadKYCIdDoc, uploadKYCRegDoc, removeKYCDocument,
  getUniqueContactsSetting, updateUniqueContactsSetting,
  getDialerSettings, updateDialerSettings,
  getCustomStatuses, createCustomStatus, updateCustomStatus, deleteCustomStatus,
  getMessageTemplates, createMessageTemplate, updateMessageTemplate, deleteMessageTemplate, uploadMessageTemplateAttachment,
  getStorageUsage,
  getIntegrations, updateIntegration, getPbxSettings, updatePbxSettings,
  getPayments, createPayment, markPaymentPaid,
};