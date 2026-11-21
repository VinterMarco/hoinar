// =====================================================================
//  Conexiunea la baza de date
//  PostgreSQL rulează direct în browser prin PGlite (PostgreSQL compilat
//  în WebAssembly). Baza se creează din aceleași scripturi SQL din
//  folderul /sql și se păstrează în IndexedDB-ul browserului.
// =====================================================================
import { PGlite } from "https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.5.14/dist/index.js";

const DB_NAME = "idb://hoinar-turism-v1";
const SCRIPTS = [
  ["sql/01_schema.sql", "Creare tabele și constrângeri"],
  ["sql/02_logica.sql", "Funcții, triggere și view-uri"],
  ["sql/03_date_test.sql", "Încărcare date de test"],
];

// tipurile PostgreSQL convertite în JavaScript
const parsers = {
  1082: (v) => v,          // DATE   -> text 'YYYY-MM-DD' (fără probleme de fus orar)
  1700: (v) => Number(v),  // NUMERIC -> număr
  20: (v) => Number(v),    // BIGINT (COUNT) -> număr
};

let db = null;

export async function initDB(onStep) {
  try {
    db = new PGlite(DB_NAME, { parsers });
    await db.waitReady;
  } catch (e) {
    // de ex. fereastră privată fără IndexedDB: baza rămâne doar în memorie
    console.warn("IndexedDB indisponibil, folosesc memoria:", e);
    db = new PGlite({ parsers });
    await db.waitReady;
  }
  const r = await db.query("SELECT to_regclass('public.incasari') IS NOT NULL AS exista");
  if (!r.rows[0].exista) await loadScripts(onStep);
}

async function loadScripts(onStep) {
  for (let i = 0; i < SCRIPTS.length; i++) {
    const [file, label] = SCRIPTS[i];
    onStep?.(label, (i + 1) / (SCRIPTS.length + 1));
    const res = await fetch(file, { cache: "no-store" });
    if (!res.ok) throw new Error(`Nu pot citi ${file} (${res.status})`);
    await db.exec(await res.text());
  }
  onStep?.("Gata", 1);
}

export async function resetDB(onStep) {
  await db.exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await loadScripts(onStep);
}

/** Interogare parametrizată ($1, $2, ...) -> lista de rânduri */
export async function q(sql, params = []) {
  const r = await db.query(sql, params);
  return r.rows;
}

/** Primul rând (sau null) */
export async function one(sql, params = []) {
  const rows = await q(sql, params);
  return rows[0] ?? null;
}

/** Pentru consola SQL: rulează unul sau mai multe statement-uri, întoarce ultimul rezultat */
export async function runConsole(sql) {
  const t0 = performance.now();
  const results = await db.exec(sql);
  const ms = performance.now() - t0;
  const last = [...results].reverse().find((r) => r.fields?.length) ?? results[results.length - 1];
  return { rows: last?.rows ?? [], fields: (last?.fields ?? []).map((f) => f.name), affected: last?.affectedRows, ms };
}

/** Transformă o eroare PostgreSQL într-un mesaj ușor de înțeles */
export function friendlyError(e) {
  const map = {
    fk_rezervari_client: "Clientul are rezervări și nu poate fi șters.",
    fk_rezervari_excursie: "Excursia are rezervări și nu poate fi ștearsă.",
    fk_excursii_cazare: "Cazarea este folosită într-o excursie și nu poate fi ștearsă.",
    fk_cazari_destinatie: "Destinația are cazări asociate și nu poate fi ștearsă.",
    fk_incasari_rezervare: "Rezervarea are încasări și nu poate fi ștearsă.",
    uq_clienti_email: "Există deja un client cu acest e-mail.",
    uq_destinatii_loc: "Destinația există deja.",
    uq_cazari_denumire: "Există deja o cazare cu această denumire în destinația aleasă.",
    ck_clienti_email: "Adresa de e-mail nu este validă.",
    ck_clienti_telefon: "Telefonul trebuie să conțină 9–14 cifre (opțional cu + la început).",
    ck_excursii_date: "Data întoarcerii trebuie să fie după data plecării.",
    ck_excursii_pret: "Prețul trebuie să fie mai mare decât 0.",
    ck_excursii_locuri: "Numărul de locuri trebuie să fie între 1 și 500.",
    ck_cazari_stele: "Numărul de stele trebuie să fie între 1 și 5.",
    ck_cazari_pret: "Prețul pe noapte trebuie să fie mai mare decât 0.",
    ck_rezervari_persoane: "O rezervare poate avea între 1 și 10 persoane.",
    ck_incasari_suma: "Suma trebuie să fie mai mare decât 0.",
  };
  if (e?.constraint && map[e.constraint]) return map[e.constraint];
  if (e?.code === "P0001") return e.message;                 // mesajele din triggere (deja în română)
  if (e?.code === "23502") return `Câmpul „${e.column ?? ""}” este obligatoriu.`;
  if (e?.code === "23503" || e?.code === "23001") return "Înregistrarea este folosită în alt tabel și nu poate fi ștearsă.";
  if (e?.code === "23505") return "Valoarea există deja (trebuie să fie unică).";
  if (e?.code === "23514") return "Datele nu respectă o regulă a bazei de date: " + (e.constraint ?? "");
  if (e?.code === "22007" || e?.code === "22008") return "Data nu este validă.";
  if (e?.code === "22P02") return "Una dintre valori nu are formatul corect.";
  return e?.message ?? String(e);
}
