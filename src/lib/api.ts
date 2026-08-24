import { store } from '@/lib/mock-store';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Turns a backend-relative file URL (e.g. "/uploads/companies/123/logo.png")
// into an absolute URL the browser can actually load, regardless of which
// port/origin the frontend dev server is running on. Safe to call with
// already-absolute URLs (http/https) -- they're returned unchanged.
export function resolveFileUrl(url?: string | null): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
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
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const token = getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const companyId = getSelectedCompanyId();
  if (companyId) headers['X-Company-Id'] = companyId;
  const res = await fetch(API_BASE + path, { ...opts, headers });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      clearAuthStorage();
    }
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { message: text }; }
    const err = new Error(json.message || res.statusText);
    throw err;
  }
  return res.json().catch(() => null);
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

export async function getLists() {
  return await request('/api/crm/lists');
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
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const companyId = getSelectedCompanyId();
  if (companyId) headers['X-Company-Id'] = companyId;
  const res = await fetch(API_BASE + '/api/uploads', { method: 'POST', body: formData, headers });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) clearAuthStorage();
    throw new Error('Upload failed');
  }
  return res.json();
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

// Storage
export async function getStorageUsage() { return await request('/api/settings/storage'); }

export default {
  login, me, changePassword, registerUser,
  getLeads, createLead, importLeads, updateLead, deleteLead,
  getCompanies, createCompany, getCompanyAccount, changeCompanyAccountPassword, deleteCompany,
  getLists, createList, updateList, deleteList, rechurnList,
  logCall, getCallLogs, getDashboardStats, getRecordings,
  getMembers, getMember, updateMember, updateMemberPassword, deleteMember,
  getSettings, updateSettings,
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
  getMessageTemplates, createMessageTemplate, updateMessageTemplate, deleteMessageTemplate,
  getStorageUsage,
};