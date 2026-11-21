// =====================================================================
//  Aplicația Hoinar: paginile, navigarea și operațiile pe baza de date
// =====================================================================
import { initDB, resetDB, q, one, runConsole, friendlyError } from "./db.js";
import {
  icon, hydrateIcons, lei, lei2, num, dataRo, dataScurta, azi, esc, avatar, badgePlata, badgeMetoda, STATUS_PLATA,
  transportCell, TRANSPORT, stele, occBar, toast, modal, confirmDialog, formModal, DataTable, actionBtns, downloadCSV, LUNI, LUNI_LUNG,
} from "./ui.js";

const $ = (s, r = document) => r.querySelector(s);
const view = $("#view");
let charts = [];

/** rulează o operație pe baza de date și atașează mesajul prietenos la eroare */
async function db(fn) {
  try { return await fn(); }
  catch (e) { e.friendly = friendlyError(e); throw e; }
}

// ---------------------------------------------------------------------
// Navigare
// ---------------------------------------------------------------------
const PAGES = {
  panou: { title: "Panou", sub: "Situația agenției pe scurt", icon: "home", render: pagePanou },
  excursii: { title: "Excursii", sub: "Pachetele turistice și gradul de ocupare", icon: "plane", render: pageExcursii },
  cazari: { title: "Cazări și destinații", sub: "Locurile de cazare și orașele în care lucrăm", icon: "bed", render: pageCazari },
  clienti: { title: "Clienți", sub: "Persoanele care au cumpărat de la noi", icon: "users", render: pageClienti },
  rezervari: { title: "Rezervări", sub: "Toate rezervările, cu situația plăților", icon: "ticket", render: pageRezervari },
  incasari: { title: "Încasări", sub: "Plățile primite de la clienți", icon: "wallet", render: pageIncasari },
  rapoarte: { title: "Rapoarte", sub: "Situații centralizate, exportabile în CSV", icon: "chart", render: pageRapoarte, sep: "Analiză" },
  consola: { title: "Consolă SQL", sub: "Rulează orice interogare direct pe baza de date", icon: "terminal", render: pageConsola },
};

function buildNav() {
  $("#nav").innerHTML = Object.entries(PAGES).map(([k, p]) =>
    `${p.sep ? `<div class="nav-sep">${p.sep}</div>` : ""}<a href="#${k}" data-page="${k}">${icon(p.icon)}<span>${p.title}</span></a>`).join("");
}

async function route() {
  const key = (location.hash.slice(1) || "panou").split("?")[0];
  const page = PAGES[key] ?? PAGES.panou;
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.page === key));
  $("#page-title").textContent = page.title;
  $("#page-sub").textContent = page.sub;
  $("#page-actions").innerHTML = "";
  $("#sidebar").classList.remove("open");
  charts.forEach((c) => c.destroy()); charts = [];
  view.style.animation = "none"; view.offsetHeight; view.style.animation = "";
  try { await page.render(); }
  catch (e) { console.error(e); view.innerHTML = `<div class="sql-error">${esc(friendlyError(e))}</div>`; }
}
const refresh = () => route();

function setActions(html, handlers) {
  const box = $("#page-actions");
  box.innerHTML = html;
  Object.entries(handlers).forEach(([sel, fn]) => box.querySelector(sel)?.addEventListener("click", fn));
}

// ---------------------------------------------------------------------
// Grafice (Chart.js)
// ---------------------------------------------------------------------
const C = { primary: "#0f766e", teal: "#14b8a6", accent: "#f0714f", gold: "#e0a526", blue: "#3b82c4", violet: "#7c5cc4", grid: "#efe9df", muted: "#6b7478" };
function chart(canvas, cfg) {
  if (!window.Chart) return;
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.color = C.muted;
  const c = new Chart(canvas, cfg);
  charts.push(c);
  return c;
}
const kLei = (v) => (Math.abs(v) >= 1000 ? num(Math.round(v / 1000)) + "k" : num(v));

// =====================================================================
// PANOU
// =====================================================================
async function pagePanou() {
  setActions(`<button class="btn btn-accent" id="a-rez">${icon("plus")} Rezervare nouă</button>`, { "#a-rez": () => formRezervare() });
  const [k1, k2, k3, k4, lunar, dest, metode, plecari, ultimele] = await Promise.all([
    one(`SELECT COALESCE(SUM(suma) FILTER (WHERE date_trunc('month', data_incasare) = date_trunc('month', CURRENT_DATE)), 0) AS luna,
                COALESCE(SUM(suma) FILTER (WHERE date_trunc('month', data_incasare) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')), 0) AS anterior
           FROM incasari`),
    one(`SELECT COUNT(*) AS n, COALESCE(SUM(r.nr_persoane), 0) AS pers
           FROM rezervari r JOIN excursii e ON e.id_excursie = r.id_excursie
          WHERE r.status = 'activa' AND e.data_plecare > CURRENT_DATE`),
    one(`SELECT COALESCE(SUM(rest), 0) AS total, COUNT(*) AS n,
                COALESCE(SUM(rest) FILTER (WHERE status_plata = 'restanta'), 0) AS restant
           FROM v_rezervari WHERE status = 'activa' AND rest > 0`),
    one(`SELECT ROUND(AVG(grad_ocupare)) AS g, COUNT(*) AS n FROM v_ocupare_excursii WHERE data_plecare > CURRENT_DATE`),
    q(`SELECT to_char(m, 'YYYY-MM') AS luna, COALESCE(SUM(i.suma), 0) AS total
         FROM generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '11 month', date_trunc('month', CURRENT_DATE), INTERVAL '1 month') m
         LEFT JOIN incasari i ON date_trunc('month', i.data_incasare) = m
        GROUP BY m ORDER BY m`),
    q(`SELECT d.oras, SUM(i.suma) AS total
         FROM incasari i JOIN rezervari r ON r.id_rezervare = i.id_rezervare
         JOIN excursii e ON e.id_excursie = r.id_excursie JOIN cazari z ON z.id_cazare = e.id_cazare
         JOIN destinatii d ON d.id_destinatie = z.id_destinatie
        GROUP BY d.oras ORDER BY total DESC LIMIT 7`),
    q(`SELECT metoda, SUM(suma) AS total FROM incasari GROUP BY metoda ORDER BY total DESC`),
    q(`SELECT * FROM v_ocupare_excursii WHERE data_plecare >= CURRENT_DATE ORDER BY data_plecare LIMIT 6`),
    q(`SELECT i.id_incasare, i.data_incasare, i.suma, i.metoda, c.id_client, c.nume || ' ' || c.prenume AS client, r.id_rezervare
         FROM incasari i JOIN rezervari r ON r.id_rezervare = i.id_rezervare JOIN clienti c ON c.id_client = r.id_client
        ORDER BY i.data_incasare DESC, i.id_incasare DESC LIMIT 6`),
  ]);
  const dif = k1.anterior ? Math.round((100 * (k1.luna - k1.anterior)) / k1.anterior) : null;
  const kpi = (ic, tint, ink, label, value, foot) =>
    `<div class="card kpi" style="--tint:${tint};--ink:${ink}"><div class="kpi-icon">${icon(ic)}</div>
      <div><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></div></div>`;
  const now = new Date();
  view.innerHTML = `
    <div class="grid kpis">
      ${kpi("coins", "var(--primary-50)", "var(--primary)", `Încasări în ${LUNI_LUNG[now.getMonth()]}`, lei(k1.luna),
        dif == null ? "&nbsp;" : `<span class="${dif >= 0 ? "up" : "down"}">${dif >= 0 ? "▲" : "▼"} ${Math.abs(dif)}%</span> față de luna trecută`)}
      ${kpi("ticket", "var(--accent-50)", "var(--accent)", "Rezervări viitoare", num(k2.n), `${num(k2.pers)} turiști urmează să plece`)}
      ${kpi("wallet", "var(--gold-50)", "#a77412", "De încasat", lei(k3.total), `${num(k3.n)} rezervări · <span class="down">${lei(k3.restant)} restanțe</span>`)}
      ${kpi("percent", "var(--blue-50)", "var(--blue)", "Ocupare excursii viitoare", (k4.g ?? 0) + "%", `media pe ${num(k4.n)} excursii programate`)}
    </div>
    <div class="grid g-2-1" style="margin-top:18px">
      <div class="card"><div class="card-head"><h3>Încasări pe luni</h3><span class="muted">ultimele 12 luni</span></div>
        <div class="chart-box"><canvas id="ch-lunar"></canvas></div></div>
      <div class="card"><div class="card-head"><h3>Metode de plată</h3><span class="muted">total încasat</span></div>
        <div class="chart-box"><canvas id="ch-metode"></canvas></div></div>
    </div>
    <div class="grid g-1-1" style="margin-top:18px">
      <div class="card"><div class="card-head"><h3>Următoarele plecări</h3><a href="#excursii" class="muted">toate excursiile →</a></div>
        <ul class="list">${plecari.map((e) => {
          const [, m, d] = e.data_plecare.split("-");
          return `<li><div class="date-chip"><b>${+d}</b><small>${LUNI[+m - 1]}</small></div>
            <div class="grow"><div class="title">${esc(e.denumire)}</div><div class="sub">${esc(e.destinatie)} · ${TRANSPORT[e.transport]?.[0]} · ${lei(e.pret_persoana)}/pers.</div></div>
            ${occBar(e.locuri_ocupate, e.locuri_totale)}</li>`;
        }).join("") || `<li class="muted">Nu sunt excursii programate.</li>`}</ul></div>
      <div class="card"><div class="card-head"><h3>Top destinații</h3><span class="muted">după încasări</span></div>
        <div class="chart-box"><canvas id="ch-dest"></canvas></div></div>
    </div>
    <div class="card" style="margin-top:18px"><div class="card-head"><h3>Ultimele încasări</h3><a href="#incasari" class="muted">toate încasările →</a></div>
      <ul class="list">${ultimele.map((i) => `<li>${avatar(i.client, i.id_client)}
        <div class="grow"><div class="title">${esc(i.client)}</div><div class="sub">Rezervarea #${i.id_rezervare} · ${dataRo(i.data_incasare)}</div></div>
        ${badgeMetoda(i.metoda)}<b class="money" style="min-width:110px;text-align:right">${lei2(i.suma)}</b></li>`).join("")}</ul></div>`;

  chart($("#ch-lunar"), {
    type: "bar",
    data: { labels: lunar.map((r) => { const [y, m] = r.luna.split("-"); return `${LUNI[+m - 1]} ${y.slice(2)}`; }),
      datasets: [{ data: lunar.map((r) => r.total), backgroundColor: lunar.map((_, i) => (i === lunar.length - 1 ? C.accent : C.primary)), borderRadius: 8, maxBarThickness: 34 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => lei(c.raw) } } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: C.grid }, border: { display: false }, ticks: { callback: kLei } } } },
  });
  chart($("#ch-metode"), {
    type: "doughnut",
    data: { labels: metode.map((m) => m.metoda[0].toUpperCase() + m.metoda.slice(1)), datasets: [{ data: metode.map((m) => m.total), backgroundColor: [C.violet, C.blue, C.accent], borderWidth: 0, hoverOffset: 6 }] },
    options: { maintainAspectRatio: false, cutout: "68%", plugins: { legend: { position: "bottom", labels: { usePointStyle: true, padding: 16 } }, tooltip: { callbacks: { label: (c) => `${c.label}: ${lei(c.raw)}` } } } },
  });
  chart($("#ch-dest"), {
    type: "bar",
    data: { labels: dest.map((d) => d.oras), datasets: [{ data: dest.map((d) => d.total), backgroundColor: C.teal, borderRadius: 7, maxBarThickness: 22 }] },
    options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => lei(c.raw) } } },
      scales: { x: { grid: { color: C.grid }, border: { display: false }, ticks: { callback: kLei } }, y: { grid: { display: false } } } },
  });
}

// =====================================================================
// EXCURSII
// =====================================================================
let filtruExcursii = "viitoare";
async function pageExcursii() {
  setActions(`<button class="btn btn-primary" id="a-new">${icon("plus")} Excursie nouă</button>`, { "#a-new": () => formExcursie() });
  const all = await q(`SELECT o.*, e.id_cazare, e.descriere,
                              (SELECT COUNT(*) FROM rezervari r WHERE r.id_excursie = o.id_excursie) AS nr_rezervari
                         FROM v_ocupare_excursii o JOIN excursii e ON e.id_excursie = o.id_excursie
                        ORDER BY o.data_plecare`);
  const today = azi();
  const filt = () => all.filter((e) => filtruExcursii === "toate" || (filtruExcursii === "viitoare" ? e.data_plecare > today : e.data_plecare <= today));
  view.innerHTML = `<div class="card" id="tbl"></div>`;
  const nopti = (e) => Math.round((new Date(e.data_intoarcere) - new Date(e.data_plecare)) / 864e5);
  const t = new DataTable($("#tbl"), {
    rows: filt(),
    searchKeys: ["denumire", "destinatie", "cazare", "transport"],
    tools: `<div class="seg" id="seg">${["viitoare", "trecute", "toate"].map((s) => `<button data-s="${s}" class="${s === filtruExcursii ? "active" : ""}">${s[0].toUpperCase() + s.slice(1)}</button>`).join("")}</div>`,
    onRowClick: (e) => detaliiExcursie(e.id_excursie),
    columns: [
      { key: "denumire", label: "Excursie", render: (e) => `<div class="strong">${esc(e.denumire)}</div><div class="cell-sub">${esc(e.cazare)}</div>` },
      { key: "destinatie", label: "Destinație", render: (e) => esc(e.destinatie) },
      { key: "data_plecare", label: "Perioadă", cls: "nowrap", render: (e) => `${dataRo(e.data_plecare)}<div class="cell-sub">${nopti(e)} nopți · până pe ${dataRo(e.data_intoarcere)}</div>` },
      { key: "transport", label: "Transport", render: (e) => transportCell(e.transport) },
      { key: "pret_persoana", label: "Preț / pers.", cls: "r money", render: (e) => lei(e.pret_persoana) },
      { key: "grad_ocupare", label: "Ocupare", render: (e) => occBar(e.locuri_ocupate, e.locuri_totale) },
      { key: "x", label: "", sort: false, cls: "actions", render: (e) => actionBtns([
          ...(e.data_plecare > today && e.locuri_libere > 0 ? [["rez", "ticket", "Rezervă"]] : []),
          ["edit", "edit", "Modifică"], ["del", "trash", "Șterge", "danger"]]) },
    ],
  });
  t.actions = {
    rez: (e) => formRezervare({ id_excursie: e.id_excursie }),
    edit: (e) => formExcursie(e),
    del: async (e) => {
      if (!(await confirmDialog("Ștergi excursia?", `<b>${esc(e.denumire)}</b> va fi ștearsă definitiv.`, { ok: "Șterge" }))) return;
      try { await db(() => q("DELETE FROM excursii WHERE id_excursie = $1", [e.id_excursie])); toast("Excursia a fost ștearsă."); refresh(); }
      catch (err) { toast(err.friendly, "err"); }
    },
  };
  $("#seg").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-s]"); if (!b) return;
    filtruExcursii = b.dataset.s;
    $("#seg").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
    t.setRows(filt());
  });
}

async function formExcursie(e = null) {
  const cazari = await q(`SELECT z.id_cazare, z.denumire, d.oras, d.tara FROM cazari z JOIN destinatii d ON d.id_destinatie = z.id_destinatie ORDER BY d.oras, z.denumire`);
  formModal({
    title: e ? "Modifică excursia" : "Excursie nouă",
    values: e ?? { transport: "avion", locuri_totale: 50 },
    fields: [
      { name: "denumire", label: "Denumire", required: true, full: true, placeholder: "ex. City break Roma (mai 2027)" },
      { name: "id_cazare", label: "Cazare (stabilește destinația)", type: "select", required: true, full: true, placeholder: "Alege cazarea…",
        options: cazari.map((z) => ({ value: z.id_cazare, label: `${z.oras}, ${z.tara} — ${z.denumire}` })) },
      { name: "data_plecare", label: "Data plecării", type: "date", required: true },
      { name: "data_intoarcere", label: "Data întoarcerii", type: "date", required: true },
      { name: "transport", label: "Transport", type: "select", required: true, options: Object.entries(TRANSPORT).map(([k, v]) => ({ value: k, label: v[0] })) },
      { name: "pret_persoana", label: "Preț / persoană (lei)", type: "number", required: true, min: 1, step: "0.01" },
      { name: "locuri_totale", label: "Număr de locuri", type: "number", required: true, min: 1, max: 500 },
      { name: "descriere", label: "Descriere", type: "textarea", full: true },
    ],
    onSubmit: (v) => db(async () => {
      const p = [v.denumire.trim(), v.data_plecare, v.data_intoarcere, v.transport, v.pret_persoana, v.locuri_totale, v.descriere || null, v.id_cazare];
      if (e) await q(`UPDATE excursii SET denumire=$1, data_plecare=$2, data_intoarcere=$3, transport=$4, pret_persoana=$5, locuri_totale=$6, descriere=$7, id_cazare=$8 WHERE id_excursie=$9`, [...p, e.id_excursie]);
      else await q(`INSERT INTO excursii (denumire, data_plecare, data_intoarcere, transport, pret_persoana, locuri_totale, descriere, id_cazare) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, p);
      toast(e ? "Excursia a fost actualizată." : "Excursia a fost adăugată.");
      refresh();
    }),
  });
}

async function detaliiExcursie(id) {
  const [e, rez] = await Promise.all([
    one(`SELECT o.*, x.descriere FROM v_ocupare_excursii o JOIN excursii x ON x.id_excursie = o.id_excursie WHERE o.id_excursie = $1`, [id]),
    q(`SELECT * FROM v_rezervari WHERE id_excursie = $1 ORDER BY data_rezervare DESC`, [id]),
  ]);
  const incasat = rez.reduce((s, r) => s + r.achitat, 0);
  const m = modal({
    title: esc(e.denumire), wide: true,
    body: `<div class="details">
        <div><small>Destinație</small>${esc(e.destinatie)}</div>
        <div><small>Cazare</small>${esc(e.cazare)}</div>
        <div><small>Transport</small>${transportCell(e.transport)}</div>
        <div><small>Perioadă</small>${dataRo(e.data_plecare)} – ${dataRo(e.data_intoarcere)}</div>
        <div><small>Preț / persoană</small><b>${lei(e.pret_persoana)}</b></div>
        <div><small>Încasat până acum</small><b>${lei(incasat)}</b></div>
      </div>
      ${occBar(e.locuri_ocupate, e.locuri_totale)}
      ${e.descriere ? `<p class="muted" style="margin:14px 0 0">${esc(e.descriere)}</p>` : ""}
      <div class="section-title">${icon("ticket")} Rezervări (${rez.length})</div>
      <div class="card" id="m-rez"></div>`,
  });
  const t = new DataTable($("#m-rez", m.el), {
    rows: rez, pageSize: 6, searchKeys: ["client"],
    onRowClick: (r) => { m.close(); detaliiRezervare(r.id_rezervare); },
    columns: [
      { key: "id_rezervare", label: "#", render: (r) => `<span class="mono">#${r.id_rezervare}</span>` },
      { key: "client", label: "Client", render: (r) => esc(r.client) },
      { key: "nr_persoane", label: "Pers.", cls: "c" },
      { key: "valoare_totala", label: "Valoare", cls: "r money", render: (r) => lei(r.valoare_totala) },
      { key: "status_plata", label: "Status", render: (r) => badgePlata(r.status_plata) },
    ],
  });
  return t;
}

// =====================================================================
// CAZARI și DESTINATII
// =====================================================================
let tabCazari = "cazari";
async function pageCazari() {
  const isC = tabCazari === "cazari";
  setActions(`<div class="seg" id="tabs"><button data-t="cazari" class="${isC ? "active" : ""}">Cazări</button><button data-t="destinatii" class="${!isC ? "active" : ""}">Destinații</button></div>
    <button class="btn btn-primary" id="a-new">${icon("plus")} ${isC ? "Cazare nouă" : "Destinație nouă"}</button>`,
    { "#a-new": () => (isC ? formCazare() : formDestinatie()) });
  $("#tabs").addEventListener("click", (ev) => { const b = ev.target.closest("[data-t]"); if (b && b.dataset.t !== tabCazari) { tabCazari = b.dataset.t; refresh(); } });
  view.innerHTML = `<div class="card" id="tbl"></div>`;

  if (isC) {
    const rows = await q(`SELECT z.*, d.oras, d.tara, (SELECT COUNT(*) FROM excursii e WHERE e.id_cazare = z.id_cazare) AS nr_excursii
                            FROM cazari z JOIN destinatii d ON d.id_destinatie = z.id_destinatie ORDER BY d.oras, z.denumire`);
    const TIP = { hotel: "b-green", pensiune: "b-gold", vila: "b-coral", apartament: "b-blue", resort: "b-violet" };
    const t = new DataTable($("#tbl"), {
      rows, searchKeys: ["denumire", "oras", "tara", "tip"],
      columns: [
        { key: "denumire", label: "Cazare", render: (z) => `<div class="strong">${esc(z.denumire)}</div><div class="cell-sub">${esc(z.adresa ?? "")}</div>` },
        { key: "tip", label: "Tip", render: (z) => `<span class="badge plain ${TIP[z.tip]}">${z.tip}</span>` },
        { key: "stele", label: "Stele", render: (z) => stele(z.stele) },
        { key: "oras", label: "Destinație", render: (z) => `${esc(z.oras)}<div class="cell-sub">${esc(z.tara)}</div>` },
        { key: "pret_noapte", label: "Preț / noapte", cls: "r money", render: (z) => lei(z.pret_noapte) },
        { key: "nr_excursii", label: "Excursii", cls: "c" },
        { key: "x", label: "", sort: false, cls: "actions", render: () => actionBtns([["edit", "edit", "Modifică"], ["del", "trash", "Șterge", "danger"]]) },
      ],
    });
    t.actions = {
      edit: (z) => formCazare(z),
      del: (z) => sterge("cazarea", z.denumire, "DELETE FROM cazari WHERE id_cazare = $1", z.id_cazare),
    };
  } else {
    const rows = await q(`SELECT d.*, (SELECT COUNT(*) FROM cazari z WHERE z.id_destinatie = d.id_destinatie) AS nr_cazari,
                                 (SELECT COUNT(*) FROM excursii e JOIN cazari z ON z.id_cazare = e.id_cazare WHERE z.id_destinatie = d.id_destinatie) AS nr_excursii
                            FROM destinatii d ORDER BY d.tara, d.oras`);
    const t = new DataTable($("#tbl"), {
      rows, searchKeys: ["oras", "tara", "descriere"],
      columns: [
        { key: "oras", label: "Oraș", render: (d) => `<span style="display:inline-flex;gap:8px;align-items:center" class="strong">${icon("map")} ${esc(d.oras)}</span>` },
        { key: "tara", label: "Țară" },
        { key: "descriere", label: "Descriere", render: (d) => `<span class="muted">${esc(d.descriere ?? "")}</span>` },
        { key: "nr_cazari", label: "Cazări", cls: "c" },
        { key: "nr_excursii", label: "Excursii", cls: "c" },
        { key: "x", label: "", sort: false, cls: "actions", render: () => actionBtns([["edit", "edit", "Modifică"], ["del", "trash", "Șterge", "danger"]]) },
      ],
    });
    t.actions = {
      edit: (d) => formDestinatie(d),
      del: (d) => sterge("destinația", d.oras, "DELETE FROM destinatii WHERE id_destinatie = $1", d.id_destinatie),
    };
  }
}

async function sterge(ce, nume, sql, id) {
  if (!(await confirmDialog(`Ștergi ${ce}?`, `<b>${esc(nume)}</b> va fi ștearsă definitiv.`, { ok: "Șterge" }))) return;
  try { await db(() => q(sql, [id])); toast("Înregistrarea a fost ștearsă."); refresh(); }
  catch (e) { toast(e.friendly, "err"); }
}

async function formCazare(z = null) {
  const dest = await q("SELECT id_destinatie, oras, tara FROM destinatii ORDER BY oras");
  formModal({
    title: z ? "Modifică cazarea" : "Cazare nouă",
    values: z ?? { tip: "hotel", stele: 3 },
    fields: [
      { name: "denumire", label: "Denumire", required: true, full: true },
      { name: "id_destinatie", label: "Destinație", type: "select", required: true, placeholder: "Alege…", options: dest.map((d) => ({ value: d.id_destinatie, label: `${d.oras}, ${d.tara}` })) },
      { name: "tip", label: "Tip", type: "select", required: true, options: ["hotel", "pensiune", "vila", "apartament", "resort"].map((t) => ({ value: t, label: t })) },
      { name: "stele", label: "Stele", type: "number", min: 1, max: 5 },
      { name: "pret_noapte", label: "Preț / noapte (lei)", type: "number", required: true, min: 1, step: "0.01" },
      { name: "adresa", label: "Adresă", full: true },
    ],
    onSubmit: (v) => db(async () => {
      const p = [v.denumire.trim(), v.tip, v.stele || null, v.adresa || null, v.pret_noapte, v.id_destinatie];
      if (z) await q("UPDATE cazari SET denumire=$1, tip=$2, stele=$3, adresa=$4, pret_noapte=$5, id_destinatie=$6 WHERE id_cazare=$7", [...p, z.id_cazare]);
      else await q("INSERT INTO cazari (denumire, tip, stele, adresa, pret_noapte, id_destinatie) VALUES ($1,$2,$3,$4,$5,$6)", p);
      toast(z ? "Cazarea a fost actualizată." : "Cazarea a fost adăugată."); refresh();
    }),
  });
}

function formDestinatie(d = null) {
  formModal({
    title: d ? "Modifică destinația" : "Destinație nouă",
    values: d ?? {},
    fields: [
      { name: "oras", label: "Oraș / zonă", required: true },
      { name: "tara", label: "Țară", required: true },
      { name: "descriere", label: "Descriere", type: "textarea", full: true },
    ],
    onSubmit: (v) => db(async () => {
      const p = [v.oras.trim(), v.tara.trim(), v.descriere || null];
      if (d) await q("UPDATE destinatii SET oras=$1, tara=$2, descriere=$3 WHERE id_destinatie=$4", [...p, d.id_destinatie]);
      else await q("INSERT INTO destinatii (oras, tara, descriere) VALUES ($1,$2,$3)", p);
      toast(d ? "Destinația a fost actualizată." : "Destinația a fost adăugată."); refresh();
    }),
  });
}

// =====================================================================
// CLIENTI
// =====================================================================
async function pageClienti() {
  setActions(`<button class="btn btn-primary" id="a-new">${icon("plus")} Client nou</button>`, { "#a-new": () => formClient() });
  const rows = await q(`SELECT c.*, c.nume || ' ' || c.prenume AS nume_complet,
                               COALESCE(r.nr, 0) AS nr_rezervari, COALESCE(p.platit, 0) AS platit
                          FROM clienti c
                          LEFT JOIN (SELECT id_client, COUNT(*) AS nr FROM rezervari GROUP BY id_client) r ON r.id_client = c.id_client
                          LEFT JOIN (SELECT r.id_client, SUM(i.suma) AS platit FROM incasari i JOIN rezervari r ON r.id_rezervare = i.id_rezervare GROUP BY r.id_client) p ON p.id_client = c.id_client
                         ORDER BY c.nume, c.prenume`);
  view.innerHTML = `<div class="card" id="tbl"></div>`;
  const t = new DataTable($("#tbl"), {
    rows, searchKeys: ["nume_complet", "email", "telefon", "oras"],
    onRowClick: (c) => detaliiClient(c.id_client),
    columns: [
      { key: "nume_complet", label: "Client", render: (c) => `<div style="display:flex;gap:10px;align-items:center">${avatar(c.nume_complet, c.id_client)}<div><div class="strong">${esc(c.nume_complet)}</div><div class="cell-sub">din ${dataRo(c.data_inregistrare)}</div></div></div>` },
      { key: "email", label: "Contact", render: (c) => `${esc(c.email)}<div class="cell-sub">${esc(c.telefon)}</div>` },
      { key: "oras", label: "Oraș" },
      { key: "nr_rezervari", label: "Rezervări", cls: "c" },
      { key: "platit", label: "Total plătit", cls: "r money", render: (c) => lei(c.platit) },
      { key: "x", label: "", sort: false, cls: "actions", render: () => actionBtns([["rez", "ticket", "Rezervare nouă"], ["edit", "edit", "Modifică"], ["del", "trash", "Șterge", "danger"]]) },
    ],
  });
  t.actions = {
    rez: (c) => formRezervare({ id_client: c.id_client }),
    edit: (c) => formClient(c),
    del: async (c) => {
      if (!(await confirmDialog("Ștergi clientul?", `<b>${esc(c.nume_complet)}</b> va fi șters definitiv.`, { ok: "Șterge" }))) return;
      try { await db(() => q("DELETE FROM clienti WHERE id_client = $1", [c.id_client])); toast("Clientul a fost șters."); refresh(); }
      catch (e) { toast(e.friendly, "err"); }
    },
  };
}

function formClient(c = null) {
  formModal({
    title: c ? "Modifică clientul" : "Client nou",
    values: c ?? {},
    fields: [
      { name: "nume", label: "Nume", required: true },
      { name: "prenume", label: "Prenume", required: true },
      { name: "email", label: "E-mail", type: "email", required: true },
      { name: "telefon", label: "Telefon", required: true, placeholder: "07xxxxxxxx" },
      { name: "oras", label: "Oraș", full: true },
    ],
    onSubmit: (v) => db(async () => {
      const p = [v.nume.trim(), v.prenume.trim(), v.email.trim().toLowerCase(), v.telefon.replace(/[\s.-]/g, ""), v.oras || null];
      if (c) await q("UPDATE clienti SET nume=$1, prenume=$2, email=$3, telefon=$4, oras=$5 WHERE id_client=$6", [...p, c.id_client]);
      else await q("INSERT INTO clienti (nume, prenume, email, telefon, oras) VALUES ($1,$2,$3,$4,$5)", p);
      toast(c ? "Clientul a fost actualizat." : "Clientul a fost adăugat."); refresh();
    }),
  });
}

async function detaliiClient(id) {
  const [c, rez] = await Promise.all([
    one("SELECT * FROM clienti WHERE id_client = $1", [id]),
    q("SELECT * FROM v_rezervari WHERE id_client = $1 ORDER BY data_plecare DESC", [id]),
  ]);
  const platit = rez.reduce((s, r) => s + r.achitat, 0);
  const rest = rez.filter((r) => r.status === "activa").reduce((s, r) => s + r.rest, 0);
  const m = modal({
    title: `<span style="display:inline-flex;gap:12px;align-items:center">${avatar(c.nume + " " + c.prenume, c.id_client)} ${esc(c.nume)} ${esc(c.prenume)}</span>`, wide: true,
    body: `<div class="details">
        <div><small>E-mail</small>${esc(c.email)}</div><div><small>Telefon</small>${esc(c.telefon)}</div><div><small>Oraș</small>${esc(c.oras ?? "–")}</div>
        <div><small>Client din</small>${dataRo(c.data_inregistrare)}</div><div><small>Total plătit</small><b>${lei(platit)}</b></div><div><small>Rest de plată</small><b class="${rest > 0 ? "down" : ""}">${lei(rest)}</b></div>
      </div>
      <div class="section-title">${icon("ticket")} Rezervări (${rez.length})</div><div class="card" id="m-rez"></div>`,
    foot: `<button class="btn btn-outline" data-close>Închide</button><button class="btn btn-accent" id="m-new">${icon("plus")} Rezervare nouă</button>`,
  });
  $("#m-new", m.el).addEventListener("click", () => { m.close(); formRezervare({ id_client: id }); });
  new DataTable($("#m-rez", m.el), {
    rows: rez, pageSize: 6, searchKeys: ["excursie", "destinatie"],
    onRowClick: (r) => { m.close(); detaliiRezervare(r.id_rezervare); },
    columns: [
      { key: "id_rezervare", label: "#", render: (r) => `<span class="mono">#${r.id_rezervare}</span>` },
      { key: "excursie", label: "Excursie", render: (r) => `<div class="strong">${esc(r.excursie)}</div><div class="cell-sub">${esc(r.destinatie)}</div>` },
      { key: "data_plecare", label: "Plecare", cls: "nowrap", render: (r) => dataRo(r.data_plecare) },
      { key: "valoare_totala", label: "Valoare", cls: "r money", render: (r) => lei(r.valoare_totala) },
      { key: "status_plata", label: "Status", render: (r) => badgePlata(r.status_plata) },
    ],
  });
}

// =====================================================================
// REZERVARI
// =====================================================================
let filtruRez = "toate";
async function pageRezervari() {
  setActions(`<button class="btn btn-accent" id="a-new">${icon("plus")} Rezervare nouă</button>`, { "#a-new": () => formRezervare() });
  const all = await q("SELECT * FROM v_rezervari ORDER BY id_rezervare DESC");
  const counts = all.reduce((a, r) => ((a[r.status_plata] = (a[r.status_plata] ?? 0) + 1), a), {});
  const filt = () => (filtruRez === "toate" ? all : all.filter((r) => r.status_plata === filtruRez));
  const chips = [["toate", "Toate", all.length], ...Object.entries(STATUS_PLATA).map(([k, [l]]) => [k, l, counts[k] ?? 0])];
  view.innerHTML = `<div class="card" id="tbl"></div>`;
  const t = new DataTable($("#tbl"), {
    rows: filt(), searchKeys: ["client", "excursie", "destinatie", "id_rezervare"],
    tools: `<div class="chips" id="chips">${chips.map(([k, l, n]) => `<button class="chip ${k === filtruRez ? "active" : ""}" data-f="${k}">${l}<span class="n">${num(n)}</span></button>`).join("")}</div>`,
    onRowClick: (r) => detaliiRezervare(r.id_rezervare),
    footExtra: (rows) => `rest de plată: <b>${lei(rows.filter((r) => r.status === "activa").reduce((s, r) => s + r.rest, 0))}</b>`,
    columns: [
      { key: "id_rezervare", label: "#", render: (r) => `<span class="mono">#${r.id_rezervare}</span><div class="cell-sub">${dataRo(r.data_rezervare)}</div>` },
      { key: "client", label: "Client", render: (r) => `<div style="display:flex;gap:10px;align-items:center">${avatar(r.client, r.id_client)}<span class="strong">${esc(r.client)}</span></div>` },
      { key: "excursie", label: "Excursie", render: (r) => `${esc(r.excursie)}<div class="cell-sub">${esc(r.destinatie)}</div>` },
      { key: "data_plecare", label: "Plecare", cls: "nowrap", render: (r) => dataRo(r.data_plecare) },
      { key: "nr_persoane", label: "Pers.", cls: "c" },
      { key: "valoare_totala", label: "Valoare", cls: "r money", render: (r) => lei(r.valoare_totala) },
      { key: "achitat", label: "Plătit", sortValue: (r) => (r.valoare_totala ? r.achitat / r.valoare_totala : 0),
        render: (r) => `<div class="pay-mini">${occBarPay(r)}</div>` },
      { key: "status_plata", label: "Status", render: (r) => badgePlata(r.status_plata) },
    ],
  });
  $("#chips").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-f]"); if (!b) return;
    filtruRez = b.dataset.f;
    $("#chips").querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === b));
    t.setRows(filt());
  });
}
function occBarPay(r) {
  const p = r.valoare_totala ? Math.round((100 * r.achitat) / r.valoare_totala) : 0;
  return `<div class="occ-bar"><span class="${p >= 100 ? "" : r.status_plata === "restanta" ? "full" : "mid"}" style="width:${p}%"></span></div><div class="occ-text"><span>${p}%</span></div>`;
}

async function formRezervare(pre = {}) {
  const [clienti, excursii] = await Promise.all([
    q("SELECT id_client, nume || ' ' || prenume AS n, email, oras FROM clienti ORDER BY nume, prenume"),
    q("SELECT * FROM v_ocupare_excursii WHERE data_plecare > CURRENT_DATE AND locuri_libere > 0 ORDER BY data_plecare"),
  ]);
  const exMap = Object.fromEntries(excursii.map((e) => [e.id_excursie, e]));
  formModal({
    title: "Rezervare nouă",
    submitLabel: "Creează rezervarea",
    values: { nr_persoane: 2, metoda: "card", avans: "", ...pre },
    fields: [
      { name: "id_client", label: "Client", type: "combo", required: true, full: true, placeholder: "Caută după nume, e-mail sau oraș…",
        options: clienti.map((c) => ({ value: c.id_client, label: c.n, sub: `${c.email} · ${c.oras ?? ""}` })) },
      { name: "id_excursie", label: "Excursie", type: "select", required: true, full: true, placeholder: "Alege o excursie viitoare cu locuri libere…",
        options: excursii.map((e) => ({ value: e.id_excursie, label: `${dataRo(e.data_plecare)} · ${e.denumire} · ${e.locuri_libere === 1 ? "1 loc liber" : e.locuri_libere + " locuri libere"}` })) },
      { name: "nr_persoane", label: "Număr de persoane", type: "number", required: true, min: 1, max: 10 },
      { name: "avans", label: "Avans încasat acum (lei)", type: "number", min: 0, step: "0.01", hint: "opțional" },
      { name: "metoda", label: "Metoda de plată a avansului", type: "select", options: [["card", "Card"], ["transfer", "Transfer"], ["numerar", "Numerar"]].map(([v, l]) => ({ value: v, label: l })) },
      { name: "observatii", label: "Observații", placeholder: "ex. cameră cu vedere la mare" },
    ],
    extra: `<div class="summary" id="sum" style="margin-top:16px">
        <div><small>Preț / persoană</small><b id="s-pret">–</b></div>
        <div><small>Locuri libere</small><b id="s-loc">–</b></div>
        <div><small>Total de plată</small><b id="s-total">–</b></div></div>`,
    onChange: (v, form) => {
      const e = exMap[v.id_excursie];
      const n = +v.nr_persoane || 0;
      form.querySelector("#s-pret").textContent = e ? lei(e.pret_persoana) : "–";
      form.querySelector("#s-loc").innerHTML = e ? `<span class="${n > e.locuri_libere ? "down" : ""}">${e.locuri_libere}</span>` : "–";
      form.querySelector("#s-total").textContent = e ? lei(e.pret_persoana * n) : "–";
    },
    onSubmit: (v) => db(async () => {
      const r = await one("SELECT creeaza_rezervare($1, $2, $3, $4, $5, $6) AS id",
        [v.id_client, v.id_excursie, v.nr_persoane, v.avans || 0, v.metoda, v.observatii || null]);
      toast(`Rezervarea #${r.id} a fost creată.`);
      await refresh();
      detaliiRezervare(r.id);
    }),
  });
}

async function detaliiRezervare(id) {
  const [r, plati] = await Promise.all([
    one("SELECT * FROM v_rezervari WHERE id_rezervare = $1", [id]),
    q("SELECT * FROM incasari WHERE id_rezervare = $1 ORDER BY data_incasare, id_incasare", [id]),
  ]);
  if (!r) return toast("Rezervarea nu mai există.", "err");
  const p = r.valoare_totala ? Math.min(100, Math.round((100 * r.achitat) / r.valoare_totala)) : 0;
  const activa = r.status === "activa";
  const viitoare = r.data_plecare > azi();
  const m = modal({
    title: `Rezervarea <span class="mono" style="font-size:16px">#${r.id_rezervare}</span> ${badgePlata(r.status_plata)}`, wide: true,
    body: `<div class="details">
        <div><small>Client</small><a href="#" id="m-client" class="strong">${esc(r.client)}</a></div>
        <div><small>Excursie</small>${esc(r.excursie)}</div>
        <div><small>Destinație</small>${esc(r.destinatie)}</div>
        <div><small>Perioadă</small>${dataRo(r.data_plecare)} – ${dataRo(r.data_intoarcere)}</div>
        <div><small>Persoane</small>${r.nr_persoane}</div>
        <div><small>Data rezervării</small>${dataRo(r.data_rezervare)}</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap">
        <div><span class="muted">Achitat</span> <b>${lei2(r.achitat)}</b> <span class="muted">din ${lei2(r.valoare_totala)}</span></div>
        <div>${activa && r.rest > 0 ? `<span class="muted">Rest de plată</span> <b class="${r.status_plata === "restanta" ? "down" : ""}">${lei2(r.rest)}</b>` : ""}</div>
      </div>
      <div class="progress-big"><span style="width:${p}%"></span></div>
      ${r.observatii ? `<p class="muted" style="margin:10px 0 0;display:flex;gap:8px;align-items:center">${icon("edit")} ${esc(r.observatii)}</p>` : ""}
      <div class="section-title">${icon("wallet")} Plăți (${plati.length})</div>
      ${plati.length ? `<div class="card"><table class="dt"><thead><tr><th>Data</th><th>Metodă</th><th class="r">Sumă</th></tr></thead><tbody>
        ${plati.map((i) => `<tr><td>${dataRo(i.data_incasare)}</td><td>${badgeMetoda(i.metoda)}</td><td class="r money strong">${lei2(i.suma)}</td></tr>`).join("")}</tbody></table></div>`
        : `<p class="muted">Nu s-a încasat nimic pentru această rezervare.</p>`}
      ${activa && r.rest > 0 ? `
        <div class="section-title">${icon("plus")} Înregistrează o plată</div>
        <div class="form-error" id="pay-err" hidden></div>
        <form class="inline-form" id="pay">
          <div class="field"><label>Sumă (lei)</label><input name="suma" type="number" step="0.01" min="0.01" value="${r.rest}"></div>
          <div class="field"><label>Metodă</label><select name="metoda"><option value="card">Card</option><option value="transfer">Transfer</option><option value="numerar">Numerar</option></select></div>
          <div class="field"><label>Data</label><input name="data" type="date" value="${azi()}"></div>
          <button class="btn btn-primary" type="submit">${icon("check")} Încasează</button>
        </form>` : ""}`,
    foot: `${activa ? `<button class="btn btn-danger" id="m-cancel">${icon("ban")} Anulează rezervarea</button>` : ""}
      ${activa && viitoare ? `<button class="btn btn-outline" id="m-pers">${icon("users")} Modifică nr. persoane</button>` : ""}
      <button class="btn btn-outline" data-close>Închide</button>`,
  });
  const reopen = async () => { m.close(); await refresh(); detaliiRezervare(id); };
  $("#m-client", m.el).addEventListener("click", (e) => { e.preventDefault(); m.close(); detaliiClient(r.id_client); });
  $("#pay", m.el)?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target).entries());
    try {
      await db(() => q("INSERT INTO incasari (id_rezervare, suma, metoda, data_incasare) VALUES ($1, $2, $3, $4)", [id, f.suma, f.metoda, f.data]));
      toast(`Plata de ${lei2(+f.suma)} a fost înregistrată.`); reopen();
    } catch (err) { const b = $("#pay-err", m.el); b.innerHTML = `${icon("alert")}<span>${esc(err.friendly)}</span>`; b.hidden = false; }
  });
  $("#m-cancel", m.el)?.addEventListener("click", async () => {
    if (!(await confirmDialog("Anulezi rezervarea?", "Locurile vor fi eliberate. Operația apelează procedura stocată <span class='mono'>anuleaza_rezervare</span>.", { ok: "Anulează rezervarea" }))) return;
    try { await db(() => q("CALL anuleaza_rezervare($1, $2)", [id, "Anulată din aplicație"])); toast("Rezervarea a fost anulată."); reopen(); }
    catch (err) { toast(err.friendly, "err"); }
  });
  $("#m-pers", m.el)?.addEventListener("click", () => {
    m.close();
    formModal({
      title: `Rezervarea #${id}: număr de persoane`,
      values: { nr_persoane: r.nr_persoane },
      fields: [{ name: "nr_persoane", label: "Număr de persoane", type: "number", min: 1, max: 10, required: true, full: true, hint: "Valoarea se recalculează automat (trigger)." }],
      onSubmit: (v) => db(async () => { await q("UPDATE rezervari SET nr_persoane = $1 WHERE id_rezervare = $2", [v.nr_persoane, id]); toast("Rezervarea a fost actualizată."); reopen(); }),
    });
  });
}

// =====================================================================
// INCASARI
// =====================================================================
let filtruMetoda = "toate", filtruLuna = "";
async function pageIncasari() {
  setActions(`<button class="btn btn-primary" id="a-new">${icon("plus")} Încasare nouă</button>`, { "#a-new": () => formIncasare() });
  const all = await q(`SELECT i.*, r.id_client, c.nume || ' ' || c.prenume AS client, e.denumire AS excursie, to_char(i.data_incasare, 'YYYY-MM') AS luna
                         FROM incasari i JOIN rezervari r ON r.id_rezervare = i.id_rezervare
                         JOIN clienti c ON c.id_client = r.id_client JOIN excursii e ON e.id_excursie = r.id_excursie
                        ORDER BY i.data_incasare DESC, i.id_incasare DESC`);
  const luni = [...new Set(all.map((i) => i.luna))];
  const filt = () => all.filter((i) => (filtruMetoda === "toate" || i.metoda === filtruMetoda) && (!filtruLuna || i.luna === filtruLuna));
  view.innerHTML = `<div class="card" id="tbl"></div>`;
  const t = new DataTable($("#tbl"), {
    rows: filt(), searchKeys: ["client", "excursie", "id_rezervare"],
    tools: `<div class="chips" id="chips">${["toate", "card", "transfer", "numerar"].map((k) => `<button class="chip ${k === filtruMetoda ? "active" : ""}" data-m="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join("")}</div>
      <div class="field" style="flex-direction:row;align-items:center"><select id="luna" style="padding:8px 10px"><option value="">Toate lunile</option>
        ${luni.map((l) => { const [y, m] = l.split("-"); return `<option value="${l}" ${l === filtruLuna ? "selected" : ""}>${LUNI_LUNG[+m - 1]} ${y}</option>`; }).join("")}</select></div>`,
    onRowClick: (i) => detaliiRezervare(i.id_rezervare),
    footExtra: (rows) => `total: <b>${lei2(rows.reduce((s, i) => s + i.suma, 0))}</b>`,
    columns: [
      { key: "data_incasare", label: "Data", cls: "nowrap", render: (i) => dataRo(i.data_incasare) },
      { key: "client", label: "Client", render: (i) => `<div style="display:flex;gap:10px;align-items:center">${avatar(i.client, i.id_client)}<span class="strong">${esc(i.client)}</span></div>` },
      { key: "id_rezervare", label: "Rezervare", render: (i) => `<span class="mono">#${i.id_rezervare}</span><div class="cell-sub">${esc(i.excursie)}</div>` },
      { key: "metoda", label: "Metodă", render: (i) => badgeMetoda(i.metoda) },
      { key: "suma", label: "Sumă", cls: "r money strong", render: (i) => lei2(i.suma) },
      { key: "x", label: "", sort: false, cls: "actions", render: () => actionBtns([["del", "trash", "Șterge încasarea", "danger"]]) },
    ],
  });
  t.actions = {
    del: async (i) => {
      if (!(await confirmDialog("Ștergi încasarea?", `Plata de <b>${lei2(i.suma)}</b> din ${dataRo(i.data_incasare)} (rezervarea #${i.id_rezervare}) va fi ștearsă.`, { ok: "Șterge" }))) return;
      try { await db(() => q("DELETE FROM incasari WHERE id_incasare = $1", [i.id_incasare])); toast("Încasarea a fost ștearsă."); refresh(); }
      catch (e) { toast(e.friendly, "err"); }
    },
  };
  $("#chips").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-m]"); if (!b) return;
    filtruMetoda = b.dataset.m;
    $("#chips").querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === b));
    t.setRows(filt());
  });
  $("#luna").addEventListener("change", (e) => { filtruLuna = e.target.value; t.setRows(filt()); });
}

async function formIncasare() {
  const rez = await q(`SELECT id_rezervare, client, excursie, rest FROM v_rezervari WHERE status = 'activa' AND rest > 0 ORDER BY id_rezervare DESC`);
  const map = Object.fromEntries(rez.map((r) => [r.id_rezervare, r]));
  let last = null;
  formModal({
    title: "Încasare nouă",
    values: { metoda: "card", data_incasare: azi() },
    fields: [
      { name: "id_rezervare", label: "Rezervarea", type: "combo", required: true, full: true, placeholder: "Caută după client, excursie sau număr…",
        options: rez.map((r) => ({ value: r.id_rezervare, label: `#${r.id_rezervare} · ${r.client}`, sub: `${r.excursie} · rest ${lei2(r.rest)}` })) },
      { name: "suma", label: "Sumă (lei)", type: "number", required: true, min: 0.01, step: "0.01" },
      { name: "metoda", label: "Metodă", type: "select", required: true, options: [["card", "Card"], ["transfer", "Transfer"], ["numerar", "Numerar"]].map(([v, l]) => ({ value: v, label: l })) },
      { name: "data_incasare", label: "Data", type: "date", required: true, full: true },
    ],
    onChange: (v, form) => {
      if (v.id_rezervare && v.id_rezervare !== last) { last = v.id_rezervare; form.querySelector("[name=suma]").value = map[v.id_rezervare]?.rest ?? ""; }
    },
    onSubmit: (v) => db(async () => {
      await q("INSERT INTO incasari (id_rezervare, suma, metoda, data_incasare) VALUES ($1, $2, $3, $4)", [v.id_rezervare, v.suma, v.metoda, v.data_incasare]);
      toast(`Plata de ${lei2(+v.suma)} a fost înregistrată.`); refresh();
    }),
  });
}

// =====================================================================
// RAPOARTE
// =====================================================================
const RAPOARTE = [
  { id: "tari", titlu: "Încasări pe țări", desc: "Totalul încasat pentru excursiile din fiecare țară.", chart: "bar",
    sql: `SELECT d.tara, COUNT(DISTINCT r.id_rezervare) AS rezervari, SUM(i.suma) AS total_incasat
            FROM incasari i JOIN rezervari r ON r.id_rezervare = i.id_rezervare JOIN excursii e ON e.id_excursie = r.id_excursie
            JOIN cazari z ON z.id_cazare = e.id_cazare JOIN destinatii d ON d.id_destinatie = z.id_destinatie
           GROUP BY d.tara ORDER BY total_incasat DESC` },
  { id: "clienti", titlu: "Top 10 clienți", desc: "Clienții care au plătit cel mai mult.",
    sql: `SELECT c.nume || ' ' || c.prenume AS client, c.oras, COUNT(DISTINCT r.id_rezervare) AS rezervari, SUM(i.suma) AS total_platit
            FROM clienti c JOIN rezervari r ON r.id_client = c.id_client JOIN incasari i ON i.id_rezervare = r.id_rezervare
           GROUP BY c.id_client ORDER BY total_platit DESC LIMIT 10` },
  { id: "restante", titlu: "Restanțe", desc: "Excursia a plecat, dar rezervarea nu e plătită integral.",
    sql: `SELECT id_rezervare, client, excursie, data_plecare, valoare_totala, achitat, rest FROM v_rezervari WHERE status_plata = 'restanta' ORDER BY rest DESC` },
  { id: "ocupare", titlu: "Gradul de ocupare", desc: "Locuri ocupate / libere pentru fiecare excursie.",
    sql: `SELECT denumire, destinatie, data_plecare, locuri_totale, locuri_ocupate, locuri_libere, grad_ocupare AS grad_ocupare_procent FROM v_ocupare_excursii ORDER BY data_plecare DESC` },
  { id: "anulari", titlu: "Rata de anulare", desc: "Procentul rezervărilor anulate pe destinație.",
    sql: `SELECT destinatie, COUNT(*) AS rezervari, COUNT(*) FILTER (WHERE status = 'anulata') AS anulate,
                 ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'anulata') / COUNT(*), 1) AS procent_anulare
            FROM v_rezervari GROUP BY destinatie ORDER BY procent_anulare DESC` },
  { id: "lunar", titlu: "Încasări lunare", desc: "View-ul v_incasari_lunare.", chart: "line", sql: `SELECT * FROM v_incasari_lunare` },
  { id: "cazari", titlu: "Cazări folosite", desc: "Câte excursii și turiști a avut fiecare cazare.",
    sql: `SELECT z.denumire AS cazare, z.tip, z.stele, d.oras, COUNT(DISTINCT e.id_excursie) AS excursii,
                 COALESCE(SUM(r.nr_persoane) FILTER (WHERE r.status = 'activa'), 0) AS turisti
            FROM cazari z JOIN destinatii d ON d.id_destinatie = z.id_destinatie
            LEFT JOIN excursii e ON e.id_cazare = z.id_cazare LEFT JOIN rezervari r ON r.id_excursie = e.id_excursie
           GROUP BY z.id_cazare, d.oras ORDER BY turisti DESC` },
];
let raportCurent = "tari";
const BANI = /^(suma|total|total_\w+|incasari|valoare_totala|achitat|rest|pret_\w+|platit)$/;
function genericColumns(fields) {
  return fields.map((f) => ({
    key: f, label: f.replace(/_/g, " "),
    cls: BANI.test(f) ? "r money" : "",
    render: (row) => {
      const v = row[f];
      if (v == null) return `<span class="muted">NULL</span>`;
      if (typeof v === "number") return BANI.test(f) ? lei2(v) : num(v);
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return dataRo(v);
      if (v instanceof Date) return v.toLocaleString("ro-RO");
      if (typeof v === "object") return `<span class="mono">${esc(JSON.stringify(v))}</span>`;
      return esc(v);
    },
  }));
}
async function pageRapoarte() {
  const r = RAPOARTE.find((x) => x.id === raportCurent);
  const rows = await q(r.sql);
  const fields = rows.length ? Object.keys(rows[0]) : [];
  setActions(`<button class="btn btn-outline" id="a-csv">${icon("download")} Export CSV</button><button class="btn btn-outline" id="a-sql">${icon("terminal")} Vezi SQL</button>`, {
    "#a-csv": () => downloadCSV(`raport-${r.id}.csv`, fields, rows),
    "#a-sql": () => { try { sessionStorage.setItem("sql-preset", r.sql.replace(/^ {10,12}/gm, "  ")); } catch { /* fără storage */ } location.hash = "consola"; },
  });
  view.innerHTML = `<div class="chips" id="rap" style="margin-bottom:16px">${RAPOARTE.map((x) => `<button class="chip ${x.id === r.id ? "active" : ""}" data-r="${x.id}">${x.titlu}</button>`).join("")}</div>
    <div class="card"><div class="card-head"><div><h3>${r.titlu}</h3><div class="muted" style="margin-top:3px">${r.desc}</div></div></div>
      ${r.chart ? `<div class="chart-box sm"><canvas id="ch-r"></canvas></div>` : ""}<div id="tbl" style="margin-top:8px"></div></div>`;
  $("#rap").addEventListener("click", (ev) => { const b = ev.target.closest("[data-r]"); if (b) { raportCurent = b.dataset.r; refresh(); } });
  new DataTable($("#tbl"), { rows, columns: genericColumns(fields), searchKeys: fields, pageSize: 10 });
  if (r.chart) {
    const lab = fields[0], val = fields[fields.length - 1];
    chart($("#ch-r"), {
      type: r.chart,
      data: { labels: rows.map((x) => x[lab]), datasets: [{ data: rows.map((x) => x[val]), backgroundColor: r.chart === "line" ? "rgba(15,118,110,.12)" : C.primary, borderColor: C.primary, fill: true, tension: .35, borderRadius: 7, maxBarThickness: 36, pointRadius: 3 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => lei(c.raw) } } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: C.grid }, border: { display: false }, ticks: { callback: kLei } } } },
    });
  }
}

// =====================================================================
// CONSOLA SQL
// =====================================================================
let interogari = null;
async function pageConsola() {
  if (!interogari) {
    const txt = await (await fetch("sql/04_interogari.sql", { cache: "no-store" })).text();
    const parts = txt.split(/^-- (Q\d+): (.*)$/m);
    interogari = [];
    for (let i = 1; i < parts.length; i += 3) interogari.push({ id: parts[i], titlu: parts[i + 1], sql: parts[i + 2].trim() });
  }
  const schema = await q(`SELECT c.table_name, t.table_type, c.column_name, c.data_type
                            FROM information_schema.columns c JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = c.table_schema
                           WHERE c.table_schema = 'public' ORDER BY t.table_type, c.table_name, c.ordinal_position`);
  const tabele = {};
  schema.forEach((s) => { (tabele[s.table_name] ??= { view: s.table_type === "VIEW", cols: [] }).cols.push(`${s.column_name} · ${s.data_type}`); });
  let preset = null;
  try { preset = sessionStorage.getItem("sql-preset"); sessionStorage.removeItem("sql-preset"); } catch { /* fără storage */ }

  view.innerHTML = `<div class="console">
    <div class="grid" style="gap:18px">
      <div class="card"><div class="card-head"><h3>Interogări exemplu</h3><span class="muted">${interogari.length}</span></div>
        <div class="q-list" id="ql">${interogari.map((x, i) => `<div class="q-item" data-i="${i}"><b>${x.id}</b><span>${esc(x.titlu)}</span></div>`).join("")}</div></div>
      <div class="card"><div class="card-head"><h3>Structura bazei</h3></div>
        <div class="schema-t">${Object.entries(tabele).map(([t, v]) => `<details><summary>${v.view ? "👁 " : "▦ "}${t}</summary><ul>${v.cols.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></details>`).join("")}</div></div>
    </div>
    <div>
      <textarea class="editor" id="ed" spellcheck="false">${esc(preset ?? interogari[0]?.sql ?? "SELECT * FROM excursii;")}</textarea>
      <div class="editor-bar"><span id="q-title">${preset ? "Din rapoarte" : esc(interogari[0]?.id + ": " + interogari[0]?.titlu)}</span><span class="muted" style="color:#8fbdb8">⌘/Ctrl + Enter pentru rulare</span>
        <button class="btn btn-accent btn-sm" id="run">${icon("play")} Rulează</button></div>
      <div id="res" style="margin-top:16px"></div>
    </div></div>`;
  const ed = $("#ed"), res = $("#res");
  const markActive = (i) => $("#ql").querySelectorAll(".q-item").forEach((el) => el.classList.toggle("active", +el.dataset.i === i));
  if (!preset) markActive(0);
  $("#ql").addEventListener("click", (ev) => {
    const it = ev.target.closest(".q-item"); if (!it) return;
    const x = interogari[+it.dataset.i];
    ed.value = x.sql; $("#q-title").textContent = `${x.id}: ${x.titlu}`; markActive(+it.dataset.i); run();
  });
  ed.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); run(); }
    if (e.key === "Tab") { e.preventDefault(); const s = ed.selectionStart; ed.setRangeText("    ", s, ed.selectionEnd, "end"); }
  });
  $("#run").addEventListener("click", run);
  async function run() {
    res.innerHTML = `<div class="muted">Se rulează…</div>`;
    try {
      const r = await runConsole(ed.value);
      if (r.fields.length) {
        res.innerHTML = `<div class="card" id="rt"></div>`;
        const t = new DataTable($("#rt"), { rows: r.rows, columns: genericColumns(r.fields).map((c) => ({ ...c, cls: "" })), searchKeys: r.fields, pageSize: 15,
          footExtra: () => `${r.ms.toFixed(1)} ms`, tools: `<button class="btn btn-outline btn-sm" id="csv">${icon("download")} CSV</button>` });
        $("#csv").addEventListener("click", () => downloadCSV("rezultat.csv", r.fields, r.rows));
        return t;
      }
      res.innerHTML = `<div class="card card-pad" style="display:flex;gap:10px;align-items:center">${icon("check")} Comandă executată${r.affected != null ? ` · ${r.affected} rânduri afectate` : ""} · ${r.ms.toFixed(1)} ms</div>`;
    } catch (e) {
      const f = friendlyError(e);
      res.innerHTML = `<div class="sql-error"><b>${icon("alert")} ${esc(f)}</b>${f !== e.message ? `<code>${esc(e.message)}${e.detail ? "\n" + esc(e.detail) : ""}</code>` : ""}</div>`;
    }
  }
  run();
}

// =====================================================================
// PORNIRE
// =====================================================================
async function start() {
  hydrateIcons();
  const step = (label, p) => { $("#loader-step").textContent = label + "…"; $("#loader-progress").style.width = Math.round(10 + p * 90) + "%"; };
  try {
    await initDB(step);
  } catch (e) {
    console.error(e);
    $("#loader-step").outerHTML = `<div class="loader-error"><b>Baza de date nu a putut porni.</b><br>${esc(e.message)}<br><br>Încearcă un browser recent (Chrome, Edge, Firefox sau Safari) și reîncarcă pagina.</div>`;
    return;
  }
  buildNav();
  $("#loader").remove();
  $("#app").hidden = false;
  $("#menu-btn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#btn-reset").addEventListener("click", async () => {
    if (!(await confirmDialog("Resetezi datele?", "Toate modificările făcute (rezervări, plăți, clienți noi) se pierd, iar baza de date se recreează din scripturile SQL, cu datele de test inițiale.", { ok: "Resetează" }))) return;
    const m = modal({ title: "Se resetează…", body: `<p id="rs" class="muted">Se pregătește…</p>` });
    await resetDB((l) => { const el = $("#rs"); if (el) el.textContent = l + "…"; });
    m.close(); toast("Baza de date a fost recreată."); refresh();
  });
  window.addEventListener("hashchange", route);
  route();
}
start();
