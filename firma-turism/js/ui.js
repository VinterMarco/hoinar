// =====================================================================
//  Componente de interfață: iconițe, formatări, tabel, ferestre, notificări
// =====================================================================

// ---------- Iconițe (SVG, stil "line") ----------
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  bed: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  ticket: '<path d="M2 9a3 3 0 0 0 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 0 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2M13 17v2M13 11v2"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16v-9"/>',
  terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  map: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  bus: '<path d="M8 6v6M16 6v6M2 12h20M7 18h10M4 18V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  train: '<rect x="4" y="3" width="16" height="13" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3M9 16h.01M15 16h.01"/>',
  car: '<path d="M19 17h2v-4l-2-5H5L3 13v4h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/>',
  play: '<path d="m6 3 14 9-14 9z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
};
export const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${P[name] ?? ""}</svg>`;
export function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => { if (!el.firstChild) el.innerHTML = icon(el.dataset.icon); });
}

// ---------- Formatări ----------
const nf = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const nf2 = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const lei = (v) => (v == null ? "–" : nf.format(v) + " lei");
export const lei2 = (v) => (v == null ? "–" : nf2.format(v) + " lei");
export const num = (v) => (v == null ? "–" : nf.format(v));
export const LUNI = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];
export const LUNI_LUNG = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
export function dataRo(iso) {
  if (!iso) return "–";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}
export function dataScurta(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${+d} ${LUNI[+m - 1]} ${y}`;
}
export const azi = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD local
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const AV_COLORS = ["#0f766e", "#f0714f", "#3b82c4", "#7c5cc4", "#e0a526", "#14b8a6", "#c2557a", "#5b8c3a"];
export function avatar(name, id = 0) {
  const ini = String(name).split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return `<div class="avatar" style="background:${AV_COLORS[id % AV_COLORS.length]}">${esc(ini)}</div>`;
}
export const STATUS_PLATA = {
  achitata: ["Achitată", "b-green"],
  partial: ["Parțial", "b-gold"],
  neachitata: ["Neachitată", "b-blue"],
  restanta: ["Restantă", "b-red"],
  anulata: ["Anulată", "b-gray"],
};
export const badgePlata = (s) => `<span class="badge ${STATUS_PLATA[s]?.[1] ?? "b-gray"}">${STATUS_PLATA[s]?.[0] ?? s}</span>`;
export const METODA = { card: ["Card", "b-violet"], transfer: ["Transfer", "b-blue"], numerar: ["Numerar", "b-coral"] };
export const badgeMetoda = (m) => `<span class="badge plain ${METODA[m]?.[1]}">${METODA[m]?.[0] ?? m}</span>`;
export const TRANSPORT = { avion: ["Avion", "plane"], autocar: ["Autocar", "bus"], tren: ["Tren", "train"], individual: ["Individual", "car"] };
export const transportCell = (t) => `<span style="display:inline-flex;gap:6px;align-items:center">${icon(TRANSPORT[t]?.[1] ?? "map")} ${TRANSPORT[t]?.[0] ?? t}</span>`;
export const stele = (n) => `<span class="stars">${"★".repeat(n || 0)}<span style="opacity:.25">${"★".repeat(5 - (n || 0))}</span></span>`;
export function occBar(ocupate, total) {
  const p = total ? Math.round((100 * ocupate) / total) : 0;
  const cls = p >= 100 ? "full" : p >= 75 ? "mid" : "";
  return `<div class="occ"><div class="occ-bar"><span class="${cls}" style="width:${Math.min(p, 100)}%"></span></div>
    <div class="occ-text"><span>${ocupate}/${total} locuri</span><b>${p}%</b></div></div>`;
}

// ---------- Notificări ----------
export function toast(msg, type = "ok") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === "ok" ? "check" : "alert")}<span>${esc(msg)}</span>`;
  document.getElementById("toast-root").appendChild(el);
  setTimeout(() => { el.style.transition = "opacity .3s"; el.style.opacity = "0"; setTimeout(() => el.remove(), 300); }, 3800);
}

// ---------- Fereastră modală ----------
export function modal({ title, body, foot = "", wide = false, onOpen }) {
  const root = document.getElementById("modal-root");
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true">
      <div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-close aria-label="Închide">${icon("x")}</button></div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ""}
    </div>`;
  const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  back.addEventListener("mousedown", (e) => { if (e.target === back) close(); });
  back.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
  document.addEventListener("keydown", onKey);
  root.appendChild(back);
  const m = { el: back.querySelector(".modal"), close };
  onOpen?.(m);
  back.querySelector("input:not([type=hidden]), select, textarea")?.focus();
  return m;
}

export function confirmDialog(title, text, { ok = "Confirmă", danger = true } = {}) {
  return new Promise((resolve) => {
    const m = modal({
      title,
      body: `<p style="margin:0;line-height:1.6">${text}</p>`,
      foot: `<button class="btn btn-outline" data-close>Renunță</button>
             <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-ok>${ok}</button>`,
    });
    m.el.querySelector("[data-ok]").addEventListener("click", () => { m.close(); resolve(true); });
    m.el.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => resolve(false)));
  });
}

/**
 * Formular generic într-o fereastră modală.
 * fields: [{name, label, type: text|number|date|select|textarea|email|combo, options, required, full, hint, step, min, max}]
 * onSubmit(values) -> aruncă eroare pentru a afișa mesajul în formular
 */
export function formModal({ title, fields, values = {}, submitLabel = "Salvează", onSubmit, extra = "", onChange, wide }) {
  const fieldHtml = (f) => {
    const v = values[f.name] ?? f.default ?? "";
    const req = f.required ? "required" : "";
    let input;
    if (f.type === "select") {
      input = `<select name="${f.name}" ${req}>${f.placeholder ? `<option value="">${f.placeholder}</option>` : ""}
        ${f.options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(v) ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select>`;
    } else if (f.type === "textarea") {
      input = `<textarea name="${f.name}" ${req}>${esc(v)}</textarea>`;
    } else if (f.type === "combo") {
      const sel = f.options.find((o) => String(o.value) === String(v));
      input = `<div class="combo"><input type="text" autocomplete="off" data-combo="${f.name}" placeholder="${esc(f.placeholder ?? "Caută…")}" value="${esc(sel?.label ?? "")}" ${req}>
        <input type="hidden" name="${f.name}" value="${esc(v)}"><div class="combo-list" hidden></div></div>`;
    } else {
      input = `<input type="${f.type ?? "text"}" name="${f.name}" value="${esc(v)}" ${req}
        ${f.step ? `step="${f.step}"` : ""} ${f.min != null ? `min="${f.min}"` : ""} ${f.max != null ? `max="${f.max}"` : ""} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""}>`;
    }
    return `<div class="field ${f.full ? "full" : ""}"><label>${f.label}${f.required ? " *" : ""}</label>${input}${f.hint ? `<span class="hint">${f.hint}</span>` : ""}</div>`;
  };
  const m = modal({
    title, wide,
    body: `<form id="mf" novalidate><div class="form-error" hidden></div><div class="form-grid">${fields.map(fieldHtml).join("")}</div>${extra}</form>`,
    foot: `<button class="btn btn-outline" data-close>Renunță</button><button class="btn btn-primary" data-submit>${icon("check")} ${submitLabel}</button>`,
  });
  const form = m.el.querySelector("#mf");
  const errBox = form.querySelector(".form-error");
  const read = () => Object.fromEntries(new FormData(form).entries());

  // combobox cu căutare (pentru liste lungi: clienți, rezervări)
  fields.filter((f) => f.type === "combo").forEach((f) => {
    const inp = form.querySelector(`[data-combo="${f.name}"]`);
    const hidden = form.querySelector(`input[name="${f.name}"]`);
    const list = inp.parentElement.querySelector(".combo-list");
    let hi = 0, shown = [];
    const render = () => {
      const t = norm(inp.value);
      shown = f.options.filter((o) => norm(o.label + " " + (o.sub ?? "")).includes(t)).slice(0, 60);
      hi = 0;
      list.innerHTML = shown.length ? shown.map((o, i) => `<div data-i="${i}" class="${i === 0 ? "hi" : ""}">${esc(o.label)}${o.sub ? `<br><small>${esc(o.sub)}</small>` : ""}</div>`).join("")
        : `<div style="cursor:default"><small>Niciun rezultat</small></div>`;
      list.hidden = false;
    };
    const pick = (o) => { inp.value = o.label; hidden.value = o.value; list.hidden = true; onChange?.(read(), form); };
    inp.addEventListener("focus", () => { inp.select(); render(); });
    inp.addEventListener("input", () => { hidden.value = ""; render(); });
    inp.addEventListener("keydown", (e) => {
      if (list.hidden) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); hi = Math.max(0, Math.min(shown.length - 1, hi + (e.key === "ArrowDown" ? 1 : -1)));
        list.querySelectorAll("[data-i]").forEach((d, i) => d.classList.toggle("hi", i === hi));
        list.querySelector(".hi")?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") { e.preventDefault(); if (shown[hi]) pick(shown[hi]); }
    });
    list.addEventListener("mousedown", (e) => { const d = e.target.closest("[data-i]"); if (d) { e.preventDefault(); pick(shown[+d.dataset.i]); } });
    inp.addEventListener("blur", () => setTimeout(() => { list.hidden = true; }, 120));
  });

  form.addEventListener("input", () => onChange?.(read(), form));
  form.addEventListener("change", () => onChange?.(read(), form));
  const submit = async () => {
    errBox.hidden = true;
    const vals = read();
    const missing = fields.find((f) => f.required && !String(vals[f.name] ?? "").trim());
    if (missing) { errBox.innerHTML = `${icon("alert")}<span>Completează câmpul „${missing.label}”.</span>`; errBox.hidden = false; return; }
    const btn = m.el.querySelector("[data-submit]");
    btn.disabled = true;
    try { await onSubmit(vals, form); m.close(); }
    catch (e) { errBox.innerHTML = `${icon("alert")}<span>${esc(e.friendly ?? e.message)}</span>`; errBox.hidden = false; errBox.scrollIntoView({ block: "nearest" }); }
    finally { btn.disabled = false; }
  };
  m.el.querySelector("[data-submit]").addEventListener("click", submit);
  form.addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  onChange?.(read(), form);
  return m;
}

// ---------- Tabel cu căutare, sortare și paginare ----------
/**
 * columns: [{key, label, render(row), sort: true|fn, cls, sortValue(row)}]
 */
export class DataTable {
  constructor(container, { columns, rows = [], searchKeys = [], pageSize = 12, onRowClick, tools = "", emptyText = "Nicio înregistrare", footExtra }) {
    Object.assign(this, { container, columns, rows, searchKeys, pageSize, onRowClick, emptyText, footExtra });
    this.page = 0; this.term = ""; this.sortKey = null; this.sortDir = 1;
    container.innerHTML = `
      <div class="table-tools">
        <div class="search">${icon("search")}<input type="search" placeholder="Caută…" aria-label="Caută"></div>
        ${tools}
      </div>
      <div class="table-wrap"><table class="dt"><thead></thead><tbody></tbody></table></div>
      <div class="table-foot"><span class="tf-info"></span><div class="pager"></div></div>`;
    this.tbody = container.querySelector("tbody");
    container.querySelector(".search input").addEventListener("input", (e) => { this.term = norm(e.target.value); this.page = 0; this.draw(); });
    this.drawHead();
    this.draw();
  }
  setRows(rows) { this.rows = rows; this.page = 0; this.draw(); }
  drawHead() {
    const th = this.columns.map((c, i) => {
      const s = c.sort !== false;
      const sorted = this.sortKey === i;
      return `<th class="${c.cls ?? ""} ${s ? "sortable" : ""} ${sorted ? "sorted" : ""}" data-i="${i}">${c.label}${s ? `<span class="arrow">${sorted ? (this.sortDir > 0 ? "↑" : "↓") : "↕"}</span>` : ""}</th>`;
    }).join("");
    const thead = this.container.querySelector("thead");
    thead.innerHTML = `<tr>${th}</tr>`;
    thead.querySelectorAll("th.sortable").forEach((el) => el.addEventListener("click", () => {
      const i = +el.dataset.i;
      if (this.sortKey === i) this.sortDir *= -1; else { this.sortKey = i; this.sortDir = 1; }
      this.drawHead(); this.draw();
    }));
  }
  filtered() {
    let r = this.rows;
    if (this.term) r = r.filter((row) => this.searchKeys.some((k) => norm(row[k]).includes(this.term)));
    if (this.sortKey != null) {
      const c = this.columns[this.sortKey];
      const val = c.sortValue ?? ((row) => row[c.key]);
      r = [...r].sort((a, b) => {
        const x = val(a), y = val(b);
        if (x == null) return 1; if (y == null) return -1;
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ro")) * this.sortDir;
      });
    }
    return r;
  }
  draw() {
    const rows = this.filtered();
    const pages = Math.max(1, Math.ceil(rows.length / this.pageSize));
    this.page = Math.min(this.page, pages - 1);
    const slice = rows.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize);
    this.tbody.innerHTML = slice.length
      ? slice.map((row, i) => `<tr data-i="${i}" class="${this.onRowClick ? "clickable" : ""}">${this.columns.map((c) => `<td class="${c.cls ?? ""}">${c.render ? c.render(row) : esc(row[c.key])}</td>`).join("")}</tr>`).join("")
      : `<tr><td colspan="${this.columns.length}"><div class="empty">${icon("inbox")}<div>${this.emptyText}</div></div></td></tr>`;
    if (this.onRowClick) this.tbody.querySelectorAll("tr[data-i]").forEach((tr) => tr.addEventListener("click", (e) => {
      if (e.target.closest("button, a")) return;
      this.onRowClick(slice[+tr.dataset.i]);
    }));
    this.tbody.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      const row = slice[+b.closest("tr").dataset.i];
      this.actions?.[b.dataset.act]?.(row);
    }));
    const from = rows.length ? this.page * this.pageSize + 1 : 0;
    this.container.querySelector(".tf-info").innerHTML = `${from}–${Math.min(rows.length, (this.page + 1) * this.pageSize)} din ${num(rows.length)}${this.footExtra ? " · " + this.footExtra(rows) : ""}`;
    const pager = this.container.querySelector(".pager");
    pager.innerHTML = `<button class="btn btn-outline btn-sm" data-p="-1" ${this.page === 0 ? "disabled" : ""}>‹ Înapoi</button>
      <span>Pagina ${this.page + 1} / ${pages}</span>
      <button class="btn btn-outline btn-sm" data-p="1" ${this.page >= pages - 1 ? "disabled" : ""}>Înainte ›</button>`;
    pager.querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => { this.page += +b.dataset.p; this.draw(); }));
  }
}
export const actionBtns = (list) => list.map(([act, ic, title, cls = ""]) => `<button class="icon-btn ${cls}" data-act="${act}" title="${title}" aria-label="${title}">${icon(ic)}</button>`).join("");

export function downloadCSV(filename, fields, rows) {
  const cell = (v) => { const s = v == null ? "" : String(v); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = "﻿" + [fields.join(";"), ...rows.map((r) => fields.map((f) => cell(r[f])).join(";"))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
