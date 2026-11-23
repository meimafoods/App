/**
 * Shared client for every Meima page (purchase, production, sales, reports...).
 * The Apps Script URL is hardcoded here before upload; it is never shown in the UI.
 */
const MEIMA_API_URL = 'https://script.google.com/macros/s/AKfycbywRk5-H4XN5FM0CEOOKMEdbbKqXoknoCM17gqr97SRwc9bVI7C5IdafF_h6nFWAcGm/exec';

const Meima = {
  // Brand assets (same folder layout on every page)
  LOGO: 'assets/logo.png',              // full logo with tagline (login, invoices)
  LOGO_BADGE: 'assets/logo-badge.png',  // oval only (page headers)

  /** Standard header for every Meima page. Put the result in a <div> at the top of <body>. */
  header(title, rightHtml = '') {
    return `<header style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 16px;background:#fff;border-bottom:3px solid #7a2e1a">
      <div style="display:flex;align-items:center;gap:12px">
        <img src="${this.LOGO_BADGE}" alt="MeiMa" style="height:42px;display:block">
        <span style="font:600 18px system-ui,sans-serif;color:#7a2e1a">${title}</span>
      </div>
      <div>${rightHtml}</div>
    </header>`;
  },

  token() { return sessionStorage.getItem('meima_token'); },
  isLoggedIn() { return !!this.token(); },
  logout() { sessionStorage.removeItem('meima_token'); },

  // text/plain avoids the CORS preflight that Apps Script cannot answer
  async call(action, payload = {}) {
    const res = await fetch(MEIMA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: this.token(), payload })
    });
    const json = await res.json();
    if (!json.ok) {
      if (json.code === 'AUTH') this.logout();
      throw new Error(json.error || 'Request failed');
    }
    return json.data;
  },

  async login(pin) {
    const data = await this.call('auth.login', { pin });
    sessionStorage.setItem('meima_token', data.token);
    return data;
  },

  // Master data shortcuts
  list(tab, includeInactive = false) { return this.call('crud.list', { tab, includeInactive }); },
  create(tab, data) { return this.call('crud.create', { tab, data }); },
  update(tab, id, data) { return this.call('crud.update', { tab, id, data }); },
  remove(tab, id) { return this.call('crud.remove', { tab, id }); },
  settings() { return this.call('settings.get'); },

  // Formatting
  money(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  kg(n) { return Number(n || 0).toFixed(3) + ' kg'; }
};
