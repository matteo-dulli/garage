# TRACCIATO FUNZIONI — App Garage ANPR

**Versione:** 2.0 | **Data:** Aprile 2026

---

## Struttura File

```
/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js              ← Configurazione globale e logica core
│   ├── connection.js       ← Barra stato connessione
│   ├── ui.js               ← Toast, Stats, renderPlatesList
│   ├── details.js          ← Rendering dettagli (UNICO FILE)
│   ├── plate-management.js ← Caricamento, filtro, creazione targhe
│   └── plates.js           ← Ricerca targhe e ticket code
├── api/
│   ├── get_plates.php
│   ├── get_plate.php        ← NUOVO
│   ├── get_passage.php
│   ├── get_tickets.php
│   ├── emit_ticket.php
│   ├── reprint_ticket.php
│   ├── create_manual_plate.php
│   ├── create_manual_ticket.php
│   ├── update_ticket.php
│   ├── update_passage.php
│   ├── update_plate.php
│   ├── delete_plate.php
│   ├── delete_passage.php
│   ├── search_plate.php
│   ├── check_db.php
│   └── scan_folder.php
├── config/
│   ├── config.php          ← Costanti e helper JSON
│   └── database.php        ← Singleton PDO
├── database/
│   └── _DATABASEsruttura_.sql
└── docs/
    ├── TRACCIATO_FUNZIONI.md  ← Questo file
    └── SCHEMA_APP.md
```

---

## js/app.js — Configurazione Globale

| Simbolo | Tipo | Descrizione |
|---------|------|-------------|
| `APP_CONFIG` | `const Object` | Configurazione globale (apiBase, intervalli, formato date) |
| `AppState` | `const Object` | Stato runtime (plates, passages, filterStatus, selectedPlate, …) |
| `formatDate(dateStr)` | `function` | Formatta data/ora in italiano |
| `formatAmount(amount)` | `function` | Formatta importo in euro |
| `escapeHtml(str)` | `function` | Escape HTML per prevenire XSS |
| `debounce(fn, delay)` | `function` | Wrapper debounce per eventi frequenti |
| `apiCall(endpoint, options)` | `async function` | Chiamata REST con fetch, restituisce JSON |
| `selectPassage(passage)` | `function` | Seleziona un passaggio e ne mostra i dettagli |
| `saveFinalTicket(passageId, ticketData)` | `async function` | Emette un ticket per un passaggio |
| `DOMContentLoaded` listener | event | Wiring pulsanti, avvio auto-refresh, caricamento iniziale |

---

## js/details.js — Rendering Dettagli (FILE UNICO)

### Ordine Sezioni Accordion
1. 🚪 **Uscita** (PRIMA)
2. 🚪 **Ingresso** (SECONDA)
3. 💳 Ticket
4. 🚙 Veicolo
5. 🎫 Abbonamento
6. 💳 Tessera a Scalare
7. 🚗 Veicolo Autorizzato
8. 📝 Note

| Simbolo | Tipo | Descrizione |
|---------|------|-------------|
| `toggleAccordion(sectionId)` | `function` | Apre/chiude sezione accordion |
| `renderDetails(plate)` | `function` | Renderizza pannello dettagli per una targa |
| `renderPassageDetails(passage)` | `function` | Renderizza pannello dettagli per un passaggio |
| `updateFormWithTicketData(data)` | `function` | Aggiorna campi form con dati ticket (con fallback plate.ticket_code) |
| `_renderExitSection(passage)` | `private` | HTML sezione Uscita |
| `_renderEntrySection(passage)` | `private` | HTML sezione Ingresso |
| `_renderTicketSection(plate, passage)` | `private` | HTML sezione Ticket per targa |
| `_renderPassageTicketSection(passage)` | `private` | HTML sezione Ticket per passaggio standalone |
| `_renderVehicleSection(plate)` | `private` | HTML sezione Veicolo |
| `_renderSubscriptionSection(plate)` | `private` | HTML sezione Abbonamento |
| `_renderPrepaidSection(plate)` | `private` | HTML sezione Tessera a Scalare |
| `_renderAuthorizedSection(plate)` | `private` | HTML sezione Veicolo Autorizzato |
| `_renderNotesSection(plate)` | `private` | HTML sezione Note |
| `_renderPassagesHistory(plate)` | `private` | Tabella storico passaggi |
| `_plateTypeLabel(type)` | `private` | Etichetta leggibile tipo targa |
| `emitTicket(plateId, passageId)` | `async function` | Emette ticket chiamando API |
| `reprintTicket(ticketCode)` | `async function` | Ristampa ticket |
| `registerEntry(passageId)` | `async function` | Registra manualmente ingresso |
| `registerExit(passageId)` | `async function` | Registra manualmente uscita |
| `deletePlate(plateId)` | `async function` | Elimina targa con conferma |
| `deletePassage(passageId)` | `async function` | Elimina passaggio con conferma |
| `savePlateNotes(plateId)` | `async function` | Salva note targa |
| `savePassageNotes(passageId)` | `async function` | Salva note passaggio |

---

## js/ui.js — Componenti UI

| Simbolo | Tipo | Descrizione |
|---------|------|-------------|
| `showToast(message, type, duration)` | `function` | Mostra notifica Bootstrap Toast |
| `updateStats(stats)` | `function` | Aggiorna contatori nella header bar |
| `updatePlatesList(plates)` | `function` | Renderizza lista targhe nel pannello sinistro |
| `_renderPlateCard(plate)` | `private` | HTML card singola targa |

---

## js/connection.js — Stato Connessione

| Simbolo | Tipo | Descrizione |
|---------|------|-------------|
| `ConnectionStatus` | `const Object` | Gestione barra stato connessione |
| `ConnectionStatus.set(connected)` | `method` | Imposta stato connessione e aggiorna UI |
| `ConnectionStatus.markUpdated()` | `method` | Segna ultimo aggiornamento riuscito |

---

## js/plate-management.js — Gestione Targhe

| Simbolo | Tipo | Descrizione |
|---------|------|-------------|
| `loadPlates(silent)` | `async function` | Carica targhe dall'API e aggiorna AppState |
| `filterAndRenderPlates()` | `function` | Filtra per status/query e renderizza lista |
| `selectPlate(plateId)` | `async function` | Seleziona targa, mostra dettagli, fetch fresh data |
| `createManualPlate()` | `async function` | Crea targa manualmente dal modal |
| `createManualTicket()` | `async function` | Crea ticket manuale dal modal |
| `_lastPassage(plate)` | `private` | Restituisce ultimo passaggio della targa |

---

## js/plates.js — Ricerca

| Simbolo | Tipo | Descrizione |
|---------|------|-------------|
| `searchTicketCode(code)` | `async function` | Cerca passaggio/targa per codice ticket |
| `searchPlate(query)` | `async function` | Cerca targhe per numero parziale |

---

## API PHP

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `get_plates.php` | GET | Lista completa targhe + passaggi + ticket |
| `get_plate.php?id=N` | GET | Singola targa con tutti i dati correlati |
| `get_passage.php?id=N` | GET | Singolo passaggio con ticket |
| `get_tickets.php` | GET | Lista tutti i ticket |
| `search_plate.php?q=X` | GET | Ricerca targhe per numero |
| `search_plate.php?ticket_code=X` | GET | Ricerca per codice ticket |
| `emit_ticket.php` | POST | Emette nuovo ticket |
| `reprint_ticket.php` | POST | Ristampa ticket esistente |
| `create_manual_plate.php` | POST | Crea targa manuale |
| `create_manual_ticket.php` | POST | Crea ticket manuale |
| `update_ticket.php` | POST | Aggiorna ticket (importo, pagamento, note) |
| `update_passage.php` | POST | Aggiorna passaggio (date, note, info) |
| `update_plate.php` | POST | Aggiorna targa (note, tipo) |
| `delete_plate.php` | POST | Elimina targa e dati correlati |
| `delete_passage.php` | POST | Elimina passaggio e ticket |
| `check_db.php` | GET | Health check database |
| `scan_folder.php` | POST | Scansiona cartella ANPR per nuove immagini |

---

## File Eliminati (duplicati)

| File | Motivo rimozione |
|------|-----------------|
| `js/details_ui.js` | Duplicato — logica integrata in `details.js` |
| `js/ticket.js` | Duplicato — funzioni integrate in `app.js` e `details.js` |
