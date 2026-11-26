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

  /** Small popup form. fields: [{k, l, t, v, o:[[value,label]]}]; ok(values) may throw to show an error. */
  ask(title, fields, ok) {
    let d = document.getElementById('mm-dlg');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'mm-dlg';
      d.style.cssText = 'border:1px solid #e4d8c8;border-radius:10px;width:min(420px,92vw);padding:16px;font:15px system-ui,sans-serif';
      document.body.appendChild(d);
    }
    const e = x => String(x ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const st = 'width:100%;padding:8px;border:1px solid #e4d8c8;border-radius:6px;font:inherit;box-sizing:border-box';
    const btn = 'border:0;border-radius:6px;padding:8px 14px;cursor:pointer;';
    d.innerHTML = `<h3 style="margin:0">${e(title)}</h3>` + fields.map(f => `<label style="display:block;margin:10px 0 4px;font-size:13px">${e(f.l)}</label>` +
      (f.o ? `<select name="${f.k}" style="${st}">${f.o.map(o => `<option value="${e(o[0])}" ${o[0] === f.v ? 'selected' : ''}>${e(o[1])}</option>`).join('')}</select>`
           : `<input name="${f.k}" type="${f.t || 'text'}" step="any" value="${e(f.v)}" style="${st}">`)).join('') +
      `<div data-err style="color:#b00020;font-size:13px;margin-top:8px;min-height:16px"></div>
       <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button data-cx style="${btn}background:none;color:#7a2e1a">Cancel</button><button data-ok style="${btn}background:#7a2e1a;color:#fff">Save</button></div>`;
    d.querySelector('[data-cx]').onclick = () => d.close();
    d.querySelector('[data-ok]').onclick = async () => {
      const v = {}; fields.forEach(f => { v[f.k] = d.querySelector(`[name="${f.k}"]`).value; });
      try { await ok(v); d.close(); } catch (x) { d.querySelector('[data-err]').textContent = x.message; }
    };
    d.showModal();
  },

  /** Shows a PIN screen when not logged in, then calls start(). Use on every new page. */
  requireLogin(start) {
    if (this.isLoggedIn()) return start();
    const o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;background:#faf5ee;display:flex;align-items:center;justify-content:center;z-index:99';
    o.innerHTML = `<div style="background:#fff;border:1px solid #e4d8c8;border-radius:10px;padding:20px;width:min(320px,90vw);font:15px system-ui,sans-serif">
      <img src="${this.LOGO}" alt="MeiMa" style="width:100%;max-width:240px;display:block;margin:0 auto 12px">
      <label style="font-size:13px">PIN</label>
      <input type="password" style="width:100%;padding:8px;border:1px solid #e4d8c8;border-radius:6px;margin:4px 0 12px;font:inherit">
      <button style="background:#7a2e1a;color:#fff;border:0;padding:8px 14px;border-radius:6px;cursor:pointer">Log in</button>
      <div data-err style="color:#b00020;font-size:13px;margin-top:8px;min-height:18px"></div></div>`;
    document.body.appendChild(o);
    const inp = o.querySelector('input'), err = o.querySelector('[data-err]');
    const go = async () => {
      try { await this.login(inp.value); o.remove(); start(); } catch (e) { err.textContent = e.message; }
    };
    o.querySelector('button').onclick = go;
    inp.onkeydown = e => { if (e.key === 'Enter') go(); };
    inp.focus();
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
