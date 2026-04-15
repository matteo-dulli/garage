# SCHEMA ARCHITETTURA — App Garage ANPR

**Versione:** 2.0 | **Data:** Aprile 2026

---

## Panoramica

Il sistema **Garage ANPR** è un'applicazione web per la gestione automatica degli accessi veicoli tramite riconoscimento automatico targa (ANPR - Automatic Number Plate Recognition).

```
┌─────────────────────────────────────────────────┐
│                   BROWSER                       │
│                                                 │
│  index.html                                     │
│  ┌─────────────┐  ┌──────────────────────────┐ │
│  │  Lista      │  │  Pannello Dettagli       │ │
│  │  Targhe     │  │  ┌────────────────────┐  │ │
│  │             │  │  │ 🚪 Uscita  (1°)    │  │ │
│  │  [AB123CD]  │  │  │ 🚪 Ingresso (2°)   │  │ │
│  │  [XY456EF]  │  │  │ 💳 Ticket          │  │ │
│  │  ...        │  │  │ 🚙 Veicolo         │  │ │
│  └─────────────┘  │  │ 🎫 Abbonamento     │  │ │
│                   │  │ 💳 Tessera         │  │ │
│                   │  │ 🚗 Autorizzato     │  │ │
│                   │  │ 📝 Note            │  │ │
│                   │  └────────────────────┘  │ │
│                   └──────────────────────────┘ │
└─────────────────────────────────────────────────┘
              ↕ fetch/JSON
┌─────────────────────────────────────────────────┐
│                   SERVER PHP                     │
│                                                 │
│  api/get_plates.php   api/emit_ticket.php        │
│  api/get_plate.php    api/scan_folder.php        │
│  api/search_plate.php ...                       │
│                                                 │
│  config/config.php  config/database.php          │
└─────────────────────────────────────────────────┘
              ↕ PDO/SQL
┌─────────────────────────────────────────────────┐
│                  MySQL/MariaDB                   │
│                                                 │
│  plates → passages → tickets                    │
│  subscriptions, prepaid_cards                   │
│  plate_authorizations, audit_log                │
│                                                 │
│  VISTE: v_expired_subscriptions                 │
│         v_plates_with_tickets                   │
│         v_vehicles_parked                       │
└─────────────────────────────────────────────────┘
              ↕ file system
┌─────────────────────────────────────────────────┐
│              CARTELLA ANPR                       │
│                                                 │
│  anpr_images/  ← immagini in arrivo dal sistema │
│  anpr_images/processed/ ← archivio elaborati   │
│  tickets/       ← file ticket stampati          │
└─────────────────────────────────────────────────┘
```

---

## Flusso Principale

### 1. Riconoscimento ANPR automatico

```
Sistema ANPR → salva immagine in anpr_images/
     ↓
scan_folder.php (POST) → analizza immagini
     ↓
Crea/aggiorna plates + passages nel DB
     ↓
Browser auto-refresh (ogni 10s) → loadPlates()
     ↓
UI aggiornata
```

### 2. Emissione Ticket

```
Operatore clicca "Emetti Ticket"
     ↓
emitTicket(plateId, passageId)
     ↓
POST api/emit_ticket.php
     ↓
Genera ticket_code univoco (TK + 8 char hex)
Crea record in tickets
Crea file .txt in tickets/
     ↓
Pannello aggiornato con codice ticket
```

### 3. Ricerca Targa/Ticket

```
Operatore digita nella barra di ricerca
     ↓ (debounce 400ms)
filterAndRenderPlates() → filtra AppState.plates localmente
     ↑
Oppure: searchTicketCode(code) → GET api/search_plate.php?ticket_code=X
```

---

## Schema Relazionale Semplificato

```
plates (1) ──────────────── (N) passages
   │                              │
   │ (1)                        (1)
   │                              │
   ├── subscriptions (N)       tickets (1)
   ├── prepaid_cards (N)
   └── plate_authorizations (N)

passages ──── audit_log (TRIGGER)
plates   ──── audit_log (TRIGGER)
```

---

## Moduli JavaScript

```
app.js          → Configurazione, utility, stato globale
   │
   ├── connection.js  → Barra connessione (wrappa apiCall)
   ├── ui.js          → Toast, stats, lista targhe
   ├── details.js     → Accordion dettagli (FILE UNICO)
   ├── plate-management.js → Caricamento dati, filtri, CRUD
   └── plates.js      → Ricerca avanzata
```

### Dipendenze tra moduli (ordine di caricamento in index.html)

```
1. app.js             (definisce APP_CONFIG, AppState, apiCall, escapeHtml, formatDate...)
2. connection.js      (wrappa apiCall → deve caricare dopo app.js)
3. ui.js              (usa escapeHtml, AppState, formatDate)
4. details.js         (usa apiCall, escapeHtml, formatDate, AppState, showToast)
5. plate-management.js(usa apiCall, AppState, renderDetails, updatePlatesList, showToast)
6. plates.js          (usa apiCall, selectPassage, renderDetails, showToast, updatePlatesList)
```

---

## Configurazione Ambiente

| Variabile ENV | Default | Descrizione |
|---------------|---------|-------------|
| `APP_ENV` | `production` | Ambiente (development/production) |
| `DB_HOST` | `localhost` | Host database |
| `DB_PORT` | `3306` | Porta MySQL |
| `DB_NAME` | `garage_anpr` | Nome database |
| `DB_USER` | `garage_user` | Utente database |
| `DB_PASS` | *(vuoto)* | Password database |

---

## Sicurezza

- **XSS**: tutte le stringhe user-provided vengono passate tramite `escapeHtml()` in JS e `htmlspecialchars()` equivalente in PHP
- **SQL Injection**: tutte le query usano **prepared statements PDO** con parametri `?`
- **CORS**: configurabile tramite costante `API_CORS_ORIGIN` in `config.php`
- **Validazione input**: lato PHP ogni endpoint valida e sanifica i parametri in ingresso
- **Transazioni**: operazioni multi-tabella usano `beginTransaction / commit / rollBack`
