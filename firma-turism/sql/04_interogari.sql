-- =====================================================================
--  Fișier 04: interogări de utilizare a bazei de date
--  Fiecare interogare începe cu un comentariu "-- Qnn: titlu"
--  (aplicația le citește de aici și le afișează în Consola SQL).
-- =====================================================================

-- Q01: Excursiile viitoare, cu locurile libere (ordonate după data plecării)
SELECT denumire, destinatie, data_plecare, data_intoarcere,
       pret_persoana, locuri_totale, locuri_libere
  FROM v_ocupare_excursii
 WHERE data_plecare > CURRENT_DATE
 ORDER BY data_plecare;

-- Q02: Cazările din România, cu destinația (JOIN), ordonate după preț
SELECT z.denumire, z.tip, z.stele, d.oras, z.pret_noapte
  FROM cazari z
  JOIN destinatii d ON d.id_destinatie = z.id_destinatie
 WHERE d.tara = 'România'
 ORDER BY z.pret_noapte DESC;

-- Q03: Numărul de excursii și prețul mediu pe țară (GROUP BY)
SELECT d.tara,
       COUNT(e.id_excursie)            AS nr_excursii,
       ROUND(AVG(e.pret_persoana), 2)  AS pret_mediu,
       MIN(e.pret_persoana)            AS pret_minim,
       MAX(e.pret_persoana)            AS pret_maxim
  FROM excursii e
  JOIN cazari z     ON z.id_cazare = e.id_cazare
  JOIN destinatii d ON d.id_destinatie = z.id_destinatie
 GROUP BY d.tara
 ORDER BY nr_excursii DESC;

-- Q04: Încasările totale pe fiecare lună (view)
SELECT * FROM v_incasari_lunare;

-- Q05: Top 10 clienți după suma plătită
SELECT c.nume, c.prenume, c.oras,
       COUNT(DISTINCT r.id_rezervare) AS nr_rezervari,
       SUM(i.suma)                    AS total_platit
  FROM clienti c
  JOIN rezervari r ON r.id_client = c.id_client
  JOIN incasari  i ON i.id_rezervare = r.id_rezervare
 GROUP BY c.id_client, c.nume, c.prenume, c.oras
 ORDER BY total_platit DESC
 LIMIT 10;

-- Q06: Top destinații după încasări
SELECT d.oras, d.tara, SUM(i.suma) AS incasari, COUNT(DISTINCT r.id_rezervare) AS rezervari
  FROM incasari i
  JOIN rezervari r  ON r.id_rezervare = i.id_rezervare
  JOIN excursii e   ON e.id_excursie = r.id_excursie
  JOIN cazari z     ON z.id_cazare = e.id_cazare
  JOIN destinatii d ON d.id_destinatie = z.id_destinatie
 GROUP BY d.id_destinatie, d.oras, d.tara
 ORDER BY incasari DESC;

-- Q07: Rezervările cu plata restantă (excursia a plecat, dar nu s-a plătit tot)
SELECT id_rezervare, client, excursie, data_plecare, valoare_totala, achitat, rest
  FROM v_rezervari
 WHERE status_plata = 'restanta'
 ORDER BY rest DESC;

-- Q08: Excursiile complet ocupate (sold out)
SELECT denumire, destinatie, data_plecare, locuri_totale
  FROM v_ocupare_excursii
 WHERE locuri_libere = 0
 ORDER BY data_plecare;

-- Q09: Clienții care nu au făcut nicio rezervare (NOT EXISTS)
SELECT c.nume, c.prenume, c.email, c.data_inregistrare
  FROM clienti c
 WHERE NOT EXISTS (SELECT 1 FROM rezervari r WHERE r.id_client = c.id_client)
 ORDER BY c.nume;

-- Q10: Excursiile cu preț peste media tuturor excursiilor (subinterogare)
SELECT denumire, pret_persoana
  FROM excursii
 WHERE pret_persoana > (SELECT AVG(pret_persoana) FROM excursii)
 ORDER BY pret_persoana DESC;

-- Q11: Distribuția încasărilor pe metode de plată
SELECT metoda, COUNT(*) AS nr_plati, SUM(suma) AS total,
       ROUND(100.0 * SUM(suma) / (SELECT SUM(suma) FROM incasari), 1) AS procent
  FROM incasari
 GROUP BY metoda
 ORDER BY total DESC;

-- Q12: Gradul mediu de ocupare pe tip de transport (HAVING)
SELECT transport, COUNT(*) AS nr_excursii, ROUND(AVG(grad_ocupare), 1) AS ocupare_medie
  FROM v_ocupare_excursii
 GROUP BY transport
HAVING COUNT(*) >= 3
 ORDER BY ocupare_medie DESC;

-- Q13: Clienții fideli: cel puțin 8 excursii diferite (HAVING)
SELECT c.nume || ' ' || c.prenume AS client, COUNT(DISTINCT r.id_excursie) AS excursii_diferite
  FROM clienti c
  JOIN rezervari r ON r.id_client = c.id_client AND r.status = 'activa'
 GROUP BY c.id_client, c.nume, c.prenume
HAVING COUNT(DISTINCT r.id_excursie) >= 8
 ORDER BY excursii_diferite DESC, client;

-- Q14: Cazările care nu sunt folosite în nicio excursie (LEFT JOIN ... IS NULL)
SELECT z.denumire, z.tip, d.oras
  FROM cazari z
  JOIN destinatii d ON d.id_destinatie = z.id_destinatie
  LEFT JOIN excursii e ON e.id_cazare = z.id_cazare
 WHERE e.id_excursie IS NULL;

-- Q15: Rata de anulare pe destinație
SELECT destinatie,
       COUNT(*)                                        AS total_rezervari,
       COUNT(*) FILTER (WHERE status = 'anulata')      AS anulate,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'anulata') / COUNT(*), 1) AS procent_anulare
  FROM v_rezervari
 GROUP BY destinatie
 ORDER BY procent_anulare DESC;

-- Q16: Clasamentul excursiilor după încasări, în cadrul fiecărei țări (funcție fereastră)
SELECT tara, denumire, incasari,
       RANK() OVER (PARTITION BY tara ORDER BY incasari DESC) AS loc_in_tara
  FROM (SELECT d.tara, e.denumire, COALESCE(SUM(i.suma), 0) AS incasari
          FROM excursii e
          JOIN cazari z     ON z.id_cazare = e.id_cazare
          JOIN destinatii d ON d.id_destinatie = z.id_destinatie
          LEFT JOIN rezervari r ON r.id_excursie = e.id_excursie
          LEFT JOIN incasari  i ON i.id_rezervare = r.id_rezervare
         GROUP BY d.tara, e.id_excursie, e.denumire) t
 ORDER BY tara, loc_in_tara;

-- Q17: Funcțiile stocate: locuri libere și rest de plată
SELECT id_excursie, denumire, locuri_libere(id_excursie) AS locuri_libere
  FROM excursii
 WHERE data_plecare > CURRENT_DATE
 ORDER BY data_plecare
 LIMIT 5;

-- Q18: Istoricul complet al unui client (rezervări + plăți)
SELECT r.id_rezervare, r.excursie, r.data_plecare, r.nr_persoane,
       r.valoare_totala, r.achitat, r.rest, r.status_plata
  FROM v_rezervari r
 WHERE r.id_client = 1
 ORDER BY r.data_rezervare;

-- Q19: Test trigger (overbooking): rezervă 10 locuri la o excursie cu mai puțin de 10 libere; trebuie să dea eroare
INSERT INTO rezervari (id_client, id_excursie, nr_persoane)
SELECT 1, id_excursie, 10 FROM v_ocupare_excursii
 WHERE data_plecare > CURRENT_DATE AND locuri_libere < 10
 LIMIT 1;

-- Q20: Test trigger (plată prea mare): încearcă să încaseze mai mult decât restul de plată
INSERT INTO incasari (id_rezervare, suma, metoda)
SELECT id_rezervare, rest + 1000, 'card'
  FROM v_rezervari
 WHERE status = 'activa' AND rest > 0
 LIMIT 1;
