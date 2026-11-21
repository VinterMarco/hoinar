-- =====================================================================
--  Proiect Sincretic II A (BD + PBD) - Tema 10
--  Baza de date pentru o firmă de turism
--  Fișier 01: structura bazei de date (tabele, chei, constrângeri, indecși)
--  SGBD: PostgreSQL (testat pe PostgreSQL 16 și PGlite / PostgreSQL 18)
-- =====================================================================

DROP TABLE IF EXISTS incasari  CASCADE;
DROP TABLE IF EXISTS rezervari CASCADE;
DROP TABLE IF EXISTS excursii  CASCADE;
DROP TABLE IF EXISTS clienti   CASCADE;
DROP TABLE IF EXISTS cazari    CASCADE;
DROP TABLE IF EXISTS destinatii CASCADE;

-- ---------------------------------------------------------------------
-- DESTINATII: orașele / regiunile în care firma organizează excursii
-- ---------------------------------------------------------------------
CREATE TABLE destinatii (
    id_destinatie  INTEGER GENERATED ALWAYS AS IDENTITY,
    oras           VARCHAR(60)  NOT NULL,
    tara           VARCHAR(60)  NOT NULL,
    descriere      VARCHAR(255),
    CONSTRAINT pk_destinatii      PRIMARY KEY (id_destinatie),
    CONSTRAINT uq_destinatii_loc  UNIQUE (oras, tara)
);

-- ---------------------------------------------------------------------
-- CAZARI: locurile de cazare (hoteluri, pensiuni etc.) dintr-o destinație
-- ---------------------------------------------------------------------
CREATE TABLE cazari (
    id_cazare      INTEGER GENERATED ALWAYS AS IDENTITY,
    denumire       VARCHAR(100) NOT NULL,
    tip            VARCHAR(20)  NOT NULL,
    stele          SMALLINT,
    adresa         VARCHAR(150),
    pret_noapte    NUMERIC(8,2) NOT NULL,
    id_destinatie  INTEGER      NOT NULL,
    CONSTRAINT pk_cazari             PRIMARY KEY (id_cazare),
    CONSTRAINT fk_cazari_destinatie  FOREIGN KEY (id_destinatie)
        REFERENCES destinatii (id_destinatie) ON DELETE RESTRICT,
    CONSTRAINT uq_cazari_denumire    UNIQUE (denumire, id_destinatie),
    CONSTRAINT ck_cazari_tip         CHECK (tip IN ('hotel','pensiune','vila','apartament','resort')),
    CONSTRAINT ck_cazari_stele       CHECK (stele BETWEEN 1 AND 5),
    CONSTRAINT ck_cazari_pret        CHECK (pret_noapte > 0)
);

-- ---------------------------------------------------------------------
-- EXCURSII: pachetele turistice oferite (destinația rezultă din cazare)
-- ---------------------------------------------------------------------
CREATE TABLE excursii (
    id_excursie     INTEGER GENERATED ALWAYS AS IDENTITY,
    denumire        VARCHAR(120)  NOT NULL,
    data_plecare    DATE          NOT NULL,
    data_intoarcere DATE          NOT NULL,
    transport       VARCHAR(20)   NOT NULL,
    pret_persoana   NUMERIC(10,2) NOT NULL,
    locuri_totale   SMALLINT      NOT NULL,
    descriere       VARCHAR(500),
    id_cazare       INTEGER       NOT NULL,
    CONSTRAINT pk_excursii          PRIMARY KEY (id_excursie),
    CONSTRAINT fk_excursii_cazare   FOREIGN KEY (id_cazare)
        REFERENCES cazari (id_cazare) ON DELETE RESTRICT,
    CONSTRAINT ck_excursii_date     CHECK (data_intoarcere > data_plecare),
    CONSTRAINT ck_excursii_transport CHECK (transport IN ('avion','autocar','tren','individual')),
    CONSTRAINT ck_excursii_pret     CHECK (pret_persoana > 0),
    CONSTRAINT ck_excursii_locuri   CHECK (locuri_totale BETWEEN 1 AND 500)
);

-- ---------------------------------------------------------------------
-- CLIENTI: persoanele care fac rezervări
-- ---------------------------------------------------------------------
CREATE TABLE clienti (
    id_client          INTEGER GENERATED ALWAYS AS IDENTITY,
    nume               VARCHAR(50)  NOT NULL,
    prenume            VARCHAR(50)  NOT NULL,
    email              VARCHAR(100) NOT NULL,
    telefon            VARCHAR(15)  NOT NULL,
    oras               VARCHAR(60),
    data_inregistrare  DATE         NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT pk_clienti         PRIMARY KEY (id_client),
    CONSTRAINT uq_clienti_email   UNIQUE (email),
    CONSTRAINT ck_clienti_email   CHECK (email LIKE '_%@_%._%'),
    CONSTRAINT ck_clienti_telefon CHECK (telefon ~ '^\+?[0-9]{9,14}$')
);

-- ---------------------------------------------------------------------
-- REZERVARI: un client rezervă locuri la o excursie
--   valoare_totala = nr_persoane x prețul excursiei din momentul rezervării
--   (se calculează automat prin trigger; vezi 02_logica.sql)
-- ---------------------------------------------------------------------
CREATE TABLE rezervari (
    id_rezervare    INTEGER GENERATED ALWAYS AS IDENTITY,
    id_client       INTEGER       NOT NULL,
    id_excursie     INTEGER       NOT NULL,
    data_rezervare  DATE          NOT NULL DEFAULT CURRENT_DATE,
    nr_persoane     SMALLINT      NOT NULL,
    valoare_totala  NUMERIC(10,2) NOT NULL DEFAULT 0,
    status          VARCHAR(10)   NOT NULL DEFAULT 'activa',
    observatii      VARCHAR(255),
    CONSTRAINT pk_rezervari           PRIMARY KEY (id_rezervare),
    CONSTRAINT fk_rezervari_client    FOREIGN KEY (id_client)
        REFERENCES clienti (id_client) ON DELETE RESTRICT,
    CONSTRAINT fk_rezervari_excursie  FOREIGN KEY (id_excursie)
        REFERENCES excursii (id_excursie) ON DELETE RESTRICT,
    CONSTRAINT ck_rezervari_persoane  CHECK (nr_persoane BETWEEN 1 AND 10),
    CONSTRAINT ck_rezervari_valoare   CHECK (valoare_totala >= 0),
    CONSTRAINT ck_rezervari_status    CHECK (status IN ('activa','anulata'))
);

-- ---------------------------------------------------------------------
-- INCASARI: plățile (avans / rate / integral) făcute pentru o rezervare
-- ---------------------------------------------------------------------
CREATE TABLE incasari (
    id_incasare    INTEGER GENERATED ALWAYS AS IDENTITY,
    id_rezervare   INTEGER       NOT NULL,
    data_incasare  DATE          NOT NULL DEFAULT CURRENT_DATE,
    suma           NUMERIC(10,2) NOT NULL,
    metoda         VARCHAR(10)   NOT NULL,
    CONSTRAINT pk_incasari            PRIMARY KEY (id_incasare),
    CONSTRAINT fk_incasari_rezervare  FOREIGN KEY (id_rezervare)
        REFERENCES rezervari (id_rezervare) ON DELETE RESTRICT,
    CONSTRAINT ck_incasari_suma       CHECK (suma > 0),
    CONSTRAINT ck_incasari_metoda     CHECK (metoda IN ('numerar','card','transfer'))
);

-- ---------------------------------------------------------------------
-- INDECȘI pe cheile străine și pe coloanele folosite des în căutări
-- (cheile primare și UNIQUE au deja index creat automat)
-- ---------------------------------------------------------------------
CREATE INDEX idx_cazari_destinatie   ON cazari (id_destinatie);
CREATE INDEX idx_excursii_cazare     ON excursii (id_cazare);
CREATE INDEX idx_excursii_plecare    ON excursii (data_plecare);
CREATE INDEX idx_rezervari_client    ON rezervari (id_client);
CREATE INDEX idx_rezervari_excursie  ON rezervari (id_excursie);
CREATE INDEX idx_incasari_rezervare  ON incasari (id_rezervare);
CREATE INDEX idx_incasari_data       ON incasari (data_incasare);
CREATE INDEX idx_clienti_nume        ON clienti (nume, prenume);
