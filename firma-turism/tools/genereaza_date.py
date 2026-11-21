"""
Generează datele de test pentru baza de date a firmei de turism
(fișierul sql/03_date_test.sql).

Datele sunt generate determinist (seed fix), deci la fiecare rulare
rezultă exact același fișier. Generatorul respectă aceleași reguli ca
triggerele din baza de date: fără overbooking, plăți <= valoarea
rezervării, plăți doar după data rezervării, rezervările anulate nu au plăți.

Rulare:  python3 tools/genereaza_date.py
"""
import random
import unicodedata
from datetime import date, timedelta
from pathlib import Path

random.seed(2026)
AZI = date(2026, 11, 21)          # data de referință a datelor de test
OUT = Path(__file__).resolve().parent.parent / "sql" / "03_date_test.sql"


def q(s):
    """Escapare pentru șiruri SQL."""
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"


def fara_diacritice(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


# --------------------------------------------------------------------------
# DESTINATII  (oras, tara, descriere, tip zona, transport preferat, cost transport/pers)
# --------------------------------------------------------------------------
DESTINATII = [
    ("Brașov", "România", "Centrul istoric, Poiana Brașov și Castelul Bran", "munte", "autocar", 150),
    ("Sinaia", "România", "Castelul Peleș și pârtiile din Bucegi", "munte", "autocar", 160),
    ("Mamaia", "România", "Stațiunea principală de pe litoralul românesc", "mare", "autocar", 220),
    ("Sibiu", "România", "Capitală culturală, Transfăgărășan și Mărginimea Sibiului", "oras", "autocar", 170),
    ("Cluj-Napoca", "România", "City break în inima Transilvaniei", "oras", "tren", 180),
    ("Sighișoara", "România", "Cetate medievală locuită, patrimoniu UNESCO", "oras", "autocar", 160),
    ("Băile Herculane", "România", "Stațiune balneară în Valea Cernei", "munte", "autocar", 90),
    ("Sulina", "România", "Delta Dunării: croaziere și pescuit", "natura", "autocar", 260),
    ("Vatra Dornei", "România", "Bucovina: mănăstiri pictate și trasee montane", "munte", "tren", 240),
    ("Sighetu Marmației", "România", "Maramureș: Cimitirul Vesel și bisericile de lemn", "natura", "autocar", 230),
    ("Paris", "Franța", "Turnul Eiffel, Luvru și Montmartre", "oras", "avion", 900),
    ("Roma", "Italia", "Colosseumul, Vaticanul și Fontana di Trevi", "oras", "avion", 750),
    ("Barcelona", "Spania", "Sagrada Família, Park Güell și plajele orașului", "oras", "avion", 850),
    ("Atena", "Grecia", "Acropole și insulele din Golful Saronic", "oras", "avion", 700),
    ("Santorini", "Grecia", "Apusuri în Oia și plaje vulcanice", "mare", "avion", 950),
    ("Istanbul", "Turcia", "Hagia Sofia, Bosforul și Marele Bazar", "oras", "avion", 650),
    ("Antalya", "Turcia", "Vacanțe all inclusive pe Riviera Turcească", "mare", "avion", 800),
    ("Viena", "Austria", "Palatul Schönbrunn și târgurile de Crăciun", "oras", "avion", 600),
    ("Praga", "Cehia", "Podul Carol și Orașul Vechi", "oras", "avion", 700),
    ("Budapesta", "Ungaria", "Parlamentul, băile termale și croaziere pe Dunăre", "oras", "autocar", 300),
    ("Veneția", "Italia", "Canale, gondole și Piazza San Marco", "oras", "avion", 800),
    ("Lisabona", "Portugalia", "Tramvaiul 28, Belém și Sintra", "oras", "avion", 1100),
    ("Amsterdam", "Țările de Jos", "Canale, muzee și câmpuri de lalele", "oras", "avion", 950),
    ("Dubai", "Emiratele Arabe Unite", "Burj Khalifa, deșert și plaje", "mare", "avion", 1800),
    ("Hurghada", "Egipt", "Marea Roșie, snorkeling și excursii la Luxor", "mare", "avion", 1500),
]

# --------------------------------------------------------------------------
# CAZARI: 40 (cel puțin una pe destinație)
# --------------------------------------------------------------------------
NUME_HOTEL = ["Aurora", "Central Park", "Belvedere", "Grand Plaza", "Panoramic", "Royal", "Riviera",
              "Imperial", "Continental", "Bella Vista", "Mirage", "Sunrise", "Old Town", "Boutique 17",
              "Emerald", "Golden Tulip", "Coral Bay", "Lighthouse", "Majestic", "Promenade"]
NUME_PENSIUNE = ["Bradul", "Casa cu Flori", "Dor de Munte", "La Fântână", "Valea Lină", "Poiana Verde",
                 "Casa Bunicii", "Stejarul", "Pescărușul", "Cerbul"]

cazari = []        # (denumire, tip, stele, adresa, pret, id_dest)
folosite = set()
for i_dest in range(len(DESTINATII)):
    nr = 2 if i_dest < 15 else 1
    for _ in range(nr):
        oras, tara, _, zona, _, _ = DESTINATII[i_dest]
        romania = tara == "România"
        if romania and random.random() < 0.45:
            tip, stele = "pensiune", random.choice([2, 3, 3, 4])
            den = "Pensiunea " + random.choice(NUME_PENSIUNE)
        elif zona == "mare" and not romania and random.random() < 0.6:
            tip, stele = "resort", random.choice([4, 5, 5])
            den = random.choice(NUME_HOTEL) + " Resort"
        elif zona == "oras" and random.random() < 0.2:
            tip, stele = "apartament", random.choice([3, 4])
            den = "Apartamente " + random.choice(NUME_HOTEL)
        elif zona in ("munte", "natura") and random.random() < 0.2:
            tip, stele = "vila", random.choice([3, 4])
            den = "Vila " + random.choice(NUME_PENSIUNE)
        else:
            tip, stele = "hotel", random.choice([3, 3, 4, 4, 5])
            den = "Hotel " + random.choice(NUME_HOTEL)
        while (den, i_dest) in folosite:
            den += " II"
        folosite.add((den, i_dest))
        baza = {"România": 180}.get(tara, 350)
        pret = round(baza * (0.55 + 0.25 * stele) * random.uniform(0.85, 1.2) / 5) * 5
        strada = random.choice(["Str. Principală", "Bd. Mării", "Str. Libertății", "Calea Victoriei",
                                "Via Roma", "Avenue Centrale", "Str. Florilor", "Str. Gării"])
        cazari.append((den, tip, stele, f"{strada} nr. {random.randint(1, 120)}", float(pret), i_dest + 1))

# --------------------------------------------------------------------------
# EXCURSII: 70, între noiembrie 2025 și martie 2027
# --------------------------------------------------------------------------
PREFIX = {"munte": ["Weekend la munte:", "Vacanță la", "Escapadă în"],
          "mare": ["Vacanță la mare:", "Sejur", "Soare și plajă:"],
          "oras": ["City break", "Descoperă", "Circuit"],
          "natura": ["Aventură în", "Explorare:", "Tradiții în"]}
excursii = []      # dict-uri
start = date(2025, 11, 1)
sfarsit = date(2027, 3, 31)
zile_total = (sfarsit - start).days
for i in range(70):
    id_caz = random.randint(1, len(cazari))
    den_caz, tip, stele, _, pret_noapte, id_dest = cazari[id_caz - 1]
    oras, tara, _, zona, transport, cost_tr = DESTINATII[id_dest - 1]
    plecare = start + timedelta(days=int(zile_total * i / 70) + random.randint(0, 5))
    nopti = random.choice([2, 3, 3, 4, 5, 6, 7]) if zona != "mare" else random.choice([5, 6, 7, 7, 10])
    pret = round((pret_noapte * nopti * 0.75 + cost_tr + 120) / 10) * 10
    excursii.append({
        "denumire": f"{random.choice(PREFIX[zona])} {oras}",
        "plecare": plecare, "intoarcere": plecare + timedelta(days=nopti),
        "transport": transport, "pret": float(pret),
        "locuri": random.choice([40, 45, 50, 60, 60, 70, 80, 90]),
        "descriere": f"{nopti} nopți la {den_caz} ({stele}*), transport cu {transport}, mic dejun inclus.",
        "id_cazare": id_caz,
    })
# denumiri unice și ușor de recunoscut (luna și anul plecării)
LUNI = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"]
for e in excursii:
    e["denumire"] += f" ({LUNI[e['plecare'].month - 1]} {e['plecare'].year})"

# --------------------------------------------------------------------------
# CLIENTI: 300
# --------------------------------------------------------------------------
NUME = ["Popescu", "Ionescu", "Popa", "Pop", "Radu", "Dumitru", "Stan", "Stoica", "Gheorghe", "Matei",
        "Ciobanu", "Constantin", "Rusu", "Mihai", "Marin", "Lazăr", "Florea", "Munteanu", "Ilie", "Dinu",
        "Tudor", "Moldovan", "Nistor", "Barbu", "Dobre", "Neagu", "Sava", "Vasile", "Cristea", "Toma",
        "Avram", "Bălan", "Crăciun", "Enache", "Oprea", "Pavel", "Ungureanu", "Zamfir", "Voicu", "Sandu"]
PRENUME = ["Andrei", "Alexandru", "Mihai", "Ion", "Ștefan", "Cristian", "Gabriel", "Bogdan", "Florin",
           "Răzvan", "Marius", "Vlad", "Adrian", "Daniel", "Lucian", "Sorin", "Tudor", "Radu",
           "Maria", "Elena", "Ioana", "Andreea", "Ana", "Mihaela", "Alexandra", "Cristina", "Diana",
           "Raluca", "Bianca", "Simona", "Laura", "Oana", "Roxana", "Irina", "Gabriela", "Larisa"]
ORASE = ["Timișoara"] * 6 + ["Arad"] * 2 + ["Lugoj", "Reșița", "Deva", "Oradea", "Cluj-Napoca",
                                            "București", "Caransebeș", "Hunedoara", "Jimbolia"]
DOMENII = ["gmail.com", "yahoo.com", "outlook.com", "yahoo.ro", "icloud.com"]
clienti = []
emailuri = set()
for i in range(300):
    nume, prenume = random.choice(NUME), random.choice(PRENUME)
    baza = fara_diacritice(f"{prenume}.{nume}").lower()
    email = f"{baza}@{random.choice(DOMENII)}"
    k = 1
    while email in emailuri:
        k += 1
        email = f"{baza}{k}@{random.choice(DOMENII)}"
    emailuri.add(email)
    telefon = "07" + str(random.choice([2, 3, 4, 5, 6, 7, 8, 9])) + "".join(random.choices("0123456789", k=7))
    inreg = date(2024, 1, 1) + timedelta(days=random.randint(0, (date(2025, 10, 1) - date(2024, 1, 1)).days))
    clienti.append((nume, prenume, email, telefon, random.choice(ORASE), inreg))

# --------------------------------------------------------------------------
# REZERVARI (~1500) și INCASARI
# --------------------------------------------------------------------------
ocupate = [0] * len(excursii)
rezervari = []     # (id_client, id_excursie, data, nr, status, observatii, valoare)
# excursiile apropiate de prezent sunt mai solicitate
ponderi = []
for e in excursii:
    dist = abs((e["plecare"] - AZI).days)
    ponderi.append(1.0 if e["plecare"] <= AZI else max(0.15, 1 - dist / 140))
incercari = 0
while len(rezervari) < 1500 and incercari < 20000:
    incercari += 1
    ie = random.choices(range(len(excursii)), weights=ponderi)[0]
    e = excursii[ie]
    nr = random.choices([1, 2, 3, 4, 5], weights=[22, 45, 15, 13, 5])[0]
    cel_mai_devreme = e["plecare"] - timedelta(days=120)
    cel_mai_tarziu = min(e["plecare"] - timedelta(days=2), AZI)
    if cel_mai_tarziu < cel_mai_devreme:
        continue
    data = cel_mai_devreme + timedelta(days=random.randint(0, (cel_mai_tarziu - cel_mai_devreme).days))
    anulata = random.random() < 0.06
    if not anulata and ocupate[ie] + nr > e["locuri"]:
        continue
    if not anulata:
        ocupate[ie] += nr
    obs = None
    if anulata:
        obs = random.choice(["Anulată la cererea clientului", "Motive medicale", "Schimbare de planuri"])
    elif random.random() < 0.06:
        obs = random.choice(["Cameră cu vedere la mare", "Pat suplimentar pentru copil",
                             "Meniu vegetarian", "Loc în față în autocar", "Aniversare nuntă"])
    rezervari.append([random.randint(1, len(clienti)), ie + 1, data, nr,
                      "anulata" if anulata else "activa", obs, nr * e["pret"]])

# în ordine cronologică (ca într-o aplicație reală)
rezervari.sort(key=lambda r: r[2])

# un client nu poate avea o rezervare înainte de a fi înregistrat
for r in rezervari:
    c = clienti[r[0] - 1]
    if r[2] < c[5]:
        clienti[r[0] - 1] = c[:5] + (r[2],)

incasari = []      # (id_rezervare, data, suma, metoda)
for idr, r in enumerate(rezervari, start=1):
    if r[4] == "anulata":
        continue
    e = excursii[r[1] - 1]
    valoare_bani = int(round(r[6] * 100))
    plecata = e["plecare"] <= AZI
    data_max = min(e["plecare"], AZI)
    zile = (data_max - r[2]).days
    x = random.random()
    if plecata:
        scenariu = "integral" if x < 0.93 else ("partial" if x < 0.98 else "nimic")
    else:
        scenariu = "integral" if x < 0.35 else ("partial" if x < 0.85 else "nimic")
    if scenariu == "nimic":
        continue
    if scenariu == "integral":
        nr_rate = random.choices([1, 2, 3], weights=[30, 40, 30])[0]
        sume, rest = [], valoare_bani
        for k in range(nr_rate - 1):
            s = int(rest * random.uniform(0.3, 0.5) / 100) * 100
            sume.append(s)
            rest -= s
        sume.append(rest)
    else:
        sume = [int(valoare_bani * random.uniform(0.2, 0.5) / 100) * 100]
        if random.random() < 0.3:
            sume.append(int(valoare_bani * 0.2 / 100) * 100)
    metoda_pref = random.choices(["card", "transfer", "numerar"], weights=[50, 30, 20])[0]
    zile_plati = sorted(random.randint(0, max(zile, 0)) for _ in sume)
    for s, z in zip(sume, zile_plati):
        if s <= 0:
            continue
        metoda = metoda_pref if random.random() < 0.8 else random.choice(["card", "transfer", "numerar"])
        incasari.append((idr, r[2] + timedelta(days=z), s / 100, metoda))
incasari.sort(key=lambda i: (i[1], i[0]))

# --------------------------------------------------------------------------
# SCRIERE SQL
# --------------------------------------------------------------------------
def bloc(tabel, coloane, randuri, pe_bloc=250):
    out = []
    for i in range(0, len(randuri), pe_bloc):
        valori = ",\n".join("  (" + ", ".join(r) + ")" for r in randuri[i:i + pe_bloc])
        out.append(f"INSERT INTO {tabel} ({', '.join(coloane)}) VALUES\n{valori};\n")
    return "\n".join(out)


sql = [
    "-- =====================================================================",
    "--  Fișier 03: date de test (generat automat de tools/genereaza_date.py)",
    f"--  {len(DESTINATII)} destinații, {len(cazari)} cazări, {len(excursii)} excursii, "
    f"{len(clienti)} clienți, {len(rezervari)} rezervări, {len(incasari)} încasări",
    f"--  Data de referință: {AZI.isoformat()}",
    "--  Valoarea rezervărilor NU este inserată: o calculează triggerul.",
    "-- =====================================================================\n",
    bloc("destinatii", ["oras", "tara", "descriere"],
         [[q(d[0]), q(d[1]), q(d[2])] for d in DESTINATII]),
    bloc("cazari", ["denumire", "tip", "stele", "adresa", "pret_noapte", "id_destinatie"],
         [[q(c[0]), q(c[1]), str(c[2]), q(c[3]), f"{c[4]:.2f}", str(c[5])] for c in cazari]),
    bloc("excursii", ["denumire", "data_plecare", "data_intoarcere", "transport", "pret_persoana",
                      "locuri_totale", "descriere", "id_cazare"],
         [[q(e["denumire"]), q(e["plecare"]), q(e["intoarcere"]), q(e["transport"]),
           f"{e['pret']:.2f}", str(e["locuri"]), q(e["descriere"]), str(e["id_cazare"])] for e in excursii]),
    bloc("clienti", ["nume", "prenume", "email", "telefon", "oras", "data_inregistrare"],
         [[q(c[0]), q(c[1]), q(c[2]), q(c[3]), q(c[4]), q(c[5])] for c in clienti]),
    bloc("rezervari", ["id_client", "id_excursie", "data_rezervare", "nr_persoane", "status", "observatii"],
         [[str(r[0]), str(r[1]), q(r[2]), str(r[3]), q(r[4]), q(r[5])] for r in rezervari]),
    bloc("incasari", ["id_rezervare", "data_incasare", "suma", "metoda"],
         [[str(i[0]), q(i[1]), f"{i[2]:.2f}", q(i[3])] for i in incasari]),
]
OUT.write_text("\n".join(sql), encoding="utf-8")
print(f"Scris {OUT}: {len(rezervari)} rezervări, {len(incasari)} încasări, "
      f"{sum(1 for r in rezervari if r[4] == 'anulata')} anulate")
