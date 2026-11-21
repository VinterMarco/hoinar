-- =====================================================================
--  Fișier 05: utilizatori și drepturi (doar pentru un server PostgreSQL
--  real; nu se rulează în varianta din browser)
-- =====================================================================

-- Agentul de turism: lucrează cu clienți și rezervări, vede excursiile
DROP ROLE IF EXISTS agent_turism;
CREATE ROLE agent_turism LOGIN PASSWORD 'agent2026';
GRANT SELECT ON destinatii, cazari, excursii TO agent_turism;
GRANT SELECT, INSERT, UPDATE ON clienti, rezervari TO agent_turism;
GRANT SELECT ON v_rezervari, v_ocupare_excursii TO agent_turism;
GRANT EXECUTE ON FUNCTION creeaza_rezervare(INTEGER, INTEGER, INTEGER, NUMERIC, VARCHAR, VARCHAR) TO agent_turism;
GRANT EXECUTE ON PROCEDURE anuleaza_rezervare(INTEGER, VARCHAR) TO agent_turism;

-- Contabilul: înregistrează încasări și vede rapoartele financiare
DROP ROLE IF EXISTS contabil;
CREATE ROLE contabil LOGIN PASSWORD 'contabil2026';
GRANT SELECT ON clienti, excursii, rezervari, v_rezervari, v_incasari_lunare TO contabil;
GRANT SELECT, INSERT ON incasari TO contabil;

-- Managerul: drepturi complete asupra tuturor tabelelor
DROP ROLE IF EXISTS manager_agentie;
CREATE ROLE manager_agentie LOGIN PASSWORD 'manager2026';
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO manager_agentie;
