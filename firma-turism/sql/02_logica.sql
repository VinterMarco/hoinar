-- =====================================================================
--  Fișier 02: logica din baza de date (PL/pgSQL)
--  funcții, triggere, proceduri stocate și view-uri
-- =====================================================================

-- ---------------------------------------------------------------------
-- F1. locuri_libere(id_excursie): câte locuri mai sunt disponibile
--     (rezervările anulate nu ocupă locuri)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION locuri_libere(p_id_excursie INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_total   INTEGER;
    v_ocupate INTEGER;
BEGIN
    SELECT locuri_totale INTO v_total FROM excursii WHERE id_excursie = p_id_excursie;
    IF v_total IS NULL THEN
        RAISE EXCEPTION 'Excursia cu id % nu există.', p_id_excursie;
    END IF;
    SELECT COALESCE(SUM(nr_persoane), 0) INTO v_ocupate
      FROM rezervari
     WHERE id_excursie = p_id_excursie AND status = 'activa';
    RETURN v_total - v_ocupate;
END;
$$;

-- ---------------------------------------------------------------------
-- F2. total_achitat(id_rezervare) și F3. rest_de_plata(id_rezervare)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION total_achitat(p_id_rezervare INTEGER)
RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
    SELECT COALESCE(SUM(suma), 0) FROM incasari WHERE id_rezervare = p_id_rezervare;
$$;

CREATE OR REPLACE FUNCTION rest_de_plata(p_id_rezervare INTEGER)
RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
    SELECT r.valoare_totala - total_achitat(r.id_rezervare)
      FROM rezervari r WHERE r.id_rezervare = p_id_rezervare;
$$;

-- ---------------------------------------------------------------------
-- T1. Trigger pe REZERVARI (BEFORE INSERT OR UPDATE)
--   - calculează automat valoarea: nr_persoane x pret_persoana
--   - nu permite overbooking (mai multe persoane decât locurile libere)
--   - nu permite rezervări după data plecării
--   - nu permite anularea unei rezervări care are plăți înregistrate
--   - nu permite micșorarea valorii sub suma deja achitată
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_verifica_rezervare()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_pret     NUMERIC;
    v_plecare  DATE;
    v_libere   INTEGER;
    v_achitat  NUMERIC;
BEGIN
    SELECT pret_persoana, data_plecare INTO v_pret, v_plecare
      FROM excursii WHERE id_excursie = NEW.id_excursie;

    IF TG_OP = 'INSERT' THEN
        IF NEW.data_rezervare > v_plecare THEN
            RAISE EXCEPTION 'Excursia a plecat pe %; nu se mai pot face rezervări.',
                to_char(v_plecare, 'DD.MM.YYYY');
        END IF;
        NEW.valoare_totala := NEW.nr_persoane * v_pret;
    ELSIF NEW.nr_persoane <> OLD.nr_persoane OR NEW.id_excursie <> OLD.id_excursie THEN
        -- la modificare se recalculează valoarea cu prețul curent al excursiei
        NEW.valoare_totala := NEW.nr_persoane * v_pret;
    END IF;

    -- verificarea locurilor (doar pentru rezervările active)
    IF NEW.status = 'activa' THEN
        v_libere := locuri_libere(NEW.id_excursie);
        IF TG_OP = 'UPDATE' AND OLD.status = 'activa' AND OLD.id_excursie = NEW.id_excursie THEN
            v_libere := v_libere + OLD.nr_persoane;   -- locurile ocupate chiar de această rezervare
        END IF;
        IF NEW.nr_persoane > v_libere THEN
            RAISE EXCEPTION 'Nu sunt suficiente locuri: %, s-au cerut %.',
                CASE GREATEST(v_libere, 0)
                    WHEN 0 THEN 'excursia este complet ocupată'
                    WHEN 1 THEN 'mai este 1 loc liber'
                    ELSE 'mai sunt ' || v_libere || ' locuri libere'
                END, NEW.nr_persoane;
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        v_achitat := total_achitat(NEW.id_rezervare);
        IF NEW.status = 'anulata' AND OLD.status = 'activa' AND v_achitat > 0 THEN
            RAISE EXCEPTION 'Rezervarea are plăți înregistrate (% lei) și nu poate fi anulată.', v_achitat;
        END IF;
        IF NEW.valoare_totala < v_achitat THEN
            RAISE EXCEPTION 'Valoarea nouă (% lei) ar fi mai mică decât suma deja achitată (% lei).',
                NEW.valoare_totala, v_achitat;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verifica_rezervare ON rezervari;
CREATE TRIGGER trg_verifica_rezervare
    BEFORE INSERT OR UPDATE ON rezervari
    FOR EACH ROW EXECUTE FUNCTION fn_verifica_rezervare();

-- ---------------------------------------------------------------------
-- T2. Trigger pe INCASARI (BEFORE INSERT OR UPDATE)
--   - se încasează doar pentru rezervări active
--   - suma nu poate depăși restul de plată
--   - data încasării nu poate fi înaintea datei rezervării
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_verifica_incasare()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_status   VARCHAR;
    v_data_rez DATE;
    v_rest     NUMERIC;
BEGIN
    SELECT status, data_rezervare INTO v_status, v_data_rez
      FROM rezervari WHERE id_rezervare = NEW.id_rezervare;

    IF v_status = 'anulata' THEN
        RAISE EXCEPTION 'Rezervarea #% este anulată; nu se pot înregistra încasări.', NEW.id_rezervare;
    END IF;
    IF NEW.data_incasare < v_data_rez THEN
        RAISE EXCEPTION 'Data încasării (%) este înaintea datei rezervării (%).',
            to_char(NEW.data_incasare, 'DD.MM.YYYY'), to_char(v_data_rez, 'DD.MM.YYYY');
    END IF;

    v_rest := rest_de_plata(NEW.id_rezervare);
    IF TG_OP = 'UPDATE' AND OLD.id_rezervare = NEW.id_rezervare THEN
        v_rest := v_rest + OLD.suma;
    END IF;
    IF NEW.suma > v_rest THEN
        RAISE EXCEPTION 'Suma de % lei depășește restul de plată (% lei).', NEW.suma, v_rest;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verifica_incasare ON incasari;
CREATE TRIGGER trg_verifica_incasare
    BEFORE INSERT OR UPDATE ON incasari
    FOR EACH ROW EXECUTE FUNCTION fn_verifica_incasare();

-- ---------------------------------------------------------------------
-- T3. Trigger pe EXCURSII: nu se pot micșora locurile sub cele deja rezervate
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_verifica_locuri_excursie()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_ocupate INTEGER;
BEGIN
    SELECT COALESCE(SUM(nr_persoane), 0) INTO v_ocupate
      FROM rezervari WHERE id_excursie = NEW.id_excursie AND status = 'activa';
    IF NEW.locuri_totale < v_ocupate THEN
        RAISE EXCEPTION 'Excursia are deja % locuri rezervate; nu poate avea doar % locuri.',
            v_ocupate, NEW.locuri_totale;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verifica_locuri_excursie ON excursii;
CREATE TRIGGER trg_verifica_locuri_excursie
    BEFORE UPDATE OF locuri_totale ON excursii
    FOR EACH ROW EXECUTE FUNCTION fn_verifica_locuri_excursie();

-- ---------------------------------------------------------------------
-- P1. creeaza_rezervare(...): rezervare + avans opțional, într-o singură
--     operație (dacă una dintre ele eșuează, nu se salvează nimic)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION creeaza_rezervare(
    p_id_client   INTEGER,
    p_id_excursie INTEGER,
    p_nr_persoane INTEGER,
    p_avans       NUMERIC DEFAULT 0,
    p_metoda      VARCHAR DEFAULT 'card',
    p_observatii  VARCHAR DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v_id INTEGER;
BEGIN
    INSERT INTO rezervari (id_client, id_excursie, nr_persoane, observatii)
    VALUES (p_id_client, p_id_excursie, p_nr_persoane, p_observatii)
    RETURNING id_rezervare INTO v_id;

    IF COALESCE(p_avans, 0) > 0 THEN
        INSERT INTO incasari (id_rezervare, suma, metoda)
        VALUES (v_id, p_avans, p_metoda);
    END IF;

    RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------
-- P2. anuleaza_rezervare(id): procedură stocată (se apelează cu CALL)
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE anuleaza_rezervare(p_id_rezervare INTEGER, p_motiv VARCHAR DEFAULT NULL)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE rezervari
       SET status = 'anulata',
           observatii = COALESCE(p_motiv, observatii)
     WHERE id_rezervare = p_id_rezervare AND status = 'activa';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rezervarea #% nu există sau este deja anulată.', p_id_rezervare;
    END IF;
END;
$$;

-- =====================================================================
--  VIEW-URI
-- =====================================================================

-- V1. Situația completă a fiecărei rezervări (client, excursie, plăți)
CREATE OR REPLACE VIEW v_rezervari AS
SELECT r.id_rezervare,
       r.data_rezervare,
       c.id_client,
       c.nume || ' ' || c.prenume              AS client,
       e.id_excursie,
       e.denumire                              AS excursie,
       d.oras || ', ' || d.tara                AS destinatie,
       e.data_plecare,
       e.data_intoarcere,
       r.nr_persoane,
       r.valoare_totala,
       COALESCE(p.achitat, 0)                  AS achitat,
       r.valoare_totala - COALESCE(p.achitat, 0) AS rest,
       r.status,
       CASE
           WHEN r.status = 'anulata'                            THEN 'anulata'
           WHEN COALESCE(p.achitat, 0) >= r.valoare_totala      THEN 'achitata'
           WHEN e.data_plecare <= CURRENT_DATE                  THEN 'restanta'
           WHEN COALESCE(p.achitat, 0) > 0                      THEN 'partial'
           ELSE 'neachitata'
       END                                     AS status_plata,
       r.observatii
  FROM rezervari r
  JOIN clienti    c ON c.id_client    = r.id_client
  JOIN excursii   e ON e.id_excursie  = r.id_excursie
  JOIN cazari     z ON z.id_cazare    = e.id_cazare
  JOIN destinatii d ON d.id_destinatie = z.id_destinatie
  LEFT JOIN (SELECT id_rezervare, SUM(suma) AS achitat
               FROM incasari GROUP BY id_rezervare) p
         ON p.id_rezervare = r.id_rezervare;

-- V2. Gradul de ocupare al fiecărei excursii
CREATE OR REPLACE VIEW v_ocupare_excursii AS
SELECT e.id_excursie,
       e.denumire,
       d.oras || ', ' || d.tara AS destinatie,
       z.denumire               AS cazare,
       e.data_plecare,
       e.data_intoarcere,
       e.transport,
       e.pret_persoana,
       e.locuri_totale,
       COALESCE(o.ocupate, 0)                   AS locuri_ocupate,
       e.locuri_totale - COALESCE(o.ocupate, 0) AS locuri_libere,
       ROUND(100.0 * COALESCE(o.ocupate, 0) / e.locuri_totale, 1) AS grad_ocupare
  FROM excursii e
  JOIN cazari     z ON z.id_cazare     = e.id_cazare
  JOIN destinatii d ON d.id_destinatie = z.id_destinatie
  LEFT JOIN (SELECT id_excursie, SUM(nr_persoane) AS ocupate
               FROM rezervari WHERE status = 'activa'
              GROUP BY id_excursie) o
         ON o.id_excursie = e.id_excursie;

-- V3. Încasările pe luni
CREATE OR REPLACE VIEW v_incasari_lunare AS
SELECT to_char(date_trunc('month', data_incasare), 'YYYY-MM') AS luna,
       COUNT(*)  AS nr_incasari,
       SUM(suma) AS total
  FROM incasari
 GROUP BY date_trunc('month', data_incasare)
 ORDER BY 1;
