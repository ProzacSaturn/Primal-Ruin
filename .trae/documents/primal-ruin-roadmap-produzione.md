# Primal Ruin — Roadmap di produzione verso la pubblicazione

> **Stato: documento storico, non è un'istruzione corrente.** `Set.txt` non è più nel repository: la fonte delle carte è `sets/`. L'engine è in `src/engine/` e `game.js` è solo una facciata. I commenti dei test citano ancora questa roadmap (P0, DV-x), quindi il file resta solo come riferimento.

> **Ruolo assunto:** direttore tecnico e di produzione (giochi di carte strategici browser, HTML5 + JS + Vite).
> **Sostituisce** la precedente `primal-ruin-roadmap-pubblicabile.md` (REV4), usata qui solo come **fonte dello stato attuale**.
> **Sviluppatore:** uno, senza scadenza fissata. Questa roadmap non prescrive una sequenza settimanale: ordina il lavoro per dipendenze e gate.

---

## Riepilogo (Summary)

Primal Ruin è un **prototipo avanzato**, non un prototipo vuoto: il motore copre quasi tutto il regolamento e 94 test automatici sono verdi. Il problema non è "mancano le funzionalità", è che **la correttezza non è dimostrabile**: l'engine `game.js` non è importabile dai test e ha copertura automatica **zero**. Tutto il resto (contenuti, IA, onboarding, UX, release) poggia su questo.

Percorso consigliato, in ordine di dipendenza:

1. **P0 — Correttezza misurabile del nucleo** (prima di tutto): Git, correzione degli import JSON, harness headless, test che importano l'engine e ne fissano il comportamento.
2. **P1 — Completezza di regole e contenuti**: rendere giocabili tutte le categorie, completare il mazzo predefinito e i Domini, chiudere le divergenze regolamento↔codice.
3. **P2 — Avversario, deck building, onboarding**: IA deterministica, deck builder, **tutorial + modalità pratica contro l'IA**.
4. **P3 — UX e accessibilità desktop**: usabilità e accessibilità su **PC desktop** (tablet/mobile rimandati).
5. **P4 — Prestazioni, compatibilità, QA, release**: build riproducibile, deploy statico, QA senza difetti bloccanti.

Fuori dal perimetro della prima release (fasi successive separate): **tablet + mobile**, **multiplayer online**, **sincronizzazione account**, **campagna** (da progettare, vedi §5), **2 vs 2** (fuori scope).

**Prima iterazione immediata** (P0, descritta in dettaglio in §4.1): inizializzare Git, correggere i 3 import JSON, scrivere un harness headless e **un solo test** che importa `game.js`, crea una partita da seed noto e ne verifica lo stato iniziale.

---

## 1. Analisi dello stato attuale (Chapter 1)

### 1.1 Comandi eseguiti, risultati reali

| Comando | Risultato effettivo (verificato ora) |
|---|---|
| `npm test` (`node --test`) | **94 pass, 0 fail**, ~1.28 s |
| `npm run cards:coverage` | `unit: Unità base 5, Keyword implementata 31, Implementata 88, **Parziale 44**` · `tactic 68` · `equipment 28` · `site 70` · `field 26` |
| `git status` | **fatal: not a git repository** |

> Nota di affidabilità: `CODE_WIKI.md` riporta conteggi di copertura **diversi e più vecchi** (`Parziale 68`, `Implementata 65`); il valore reale è **44**. La documentazione va riallineata (voce N2).

### 1.2 Fatti verificati sul codice

| Area | Valore verificato | Riferimento |
|---|---|---|
| Carte | **360** (168 Unità, 68 Tattiche, 28 Equipaggiamenti, 70 Siti, 26 Campi) — **nessuna carta Dominio** | [cards.json](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/data/cards.json) |
| Moduli `src/` | 15 | [src/](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src) |
| Engine | [game.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js) — **~3001 righe, monolite** (`GameState`, `Logger`, `FX`, `UIRenderer`, `CombatResolver`, `GameController`); esporta `{ GameController, GameState }` a [riga 3001](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L3001) |
| Test | 9 file, 94 test, **nessuno importa `game.js`** | [tests/](file:///c:/Users/alessio/Desktop/Primal%20Ruin/tests) |
| Versionamento | **assente** | `git status` |
| Config | solo `vite.config.js` — nessun ESLint/Prettier, nessuna CI | [vite.config.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/vite.config.js) |
| Persistenza | `localStorage`; `SAVE_VERSION = 3`; chiavi `primal-ruin.game-save.v1`, `…custom-deck.v1`, `…settings.v1`; **nessuna migrazione** | [save-store.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/save-store.js) |
| Responsive | **un solo breakpoint** `@media (max-width: 760px)` (+ `prefers-reduced-motion`) | [styles.css:365](file:///c:/Users/alessio/Desktop/Primal%20Ruin/styles.css#L365) |
| Accesso DOM | **nessuno a livello di modulo** in `game.js` (solo dentro i metodi) → **importabile** una volta sistemato l'import JSON | [game.js:610](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L610) (esempio) |
| Onboarding / campagna / pratica | **assenti** (0 occorrenze nel codice) | grep `tutorial\|campagna\|pratica` |

### 1.3 Il blocco strutturale (causa radice di ogni altro rischio)

> **`game.js` non è importabile da `node --test` e ha copertura automatica ZERO.**

- [game.js:1](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1): `import cardCatalog from './src/data/cards.json';` **senza** `with { type: 'json' }`. Node 20.19+/22.12+ lo rifiuta.
- Stesso difetto in [deck-builder.js:1](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/deck-builder.js#L1) e [card-library.js:1](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/card-library.js#L1).
- Conseguenza: i 94 test verdi riguardano **solo moduli `src/` puri**. Turni, fasi, combattimento, promozione, trigger, vittoria, Rifornimento, Fase Finale, Siti/Campi: **zero test**.

### 1.4 Distinzione di stato (cosa è verificato, cosa è solo dichiarato, cosa è aperto)

| Stato | Situazione |
|---|---|
| **Presente** | Engine, UI, deck builder, archivio, salvataggio locale, audio, Comandanti (provvisori) |
| **Implementato (per lettura di codice)** | Quasi tutto il regolamento, con **9 divergenze** (vedi §2.3) |
| **Testato automaticamente** | Solo moduli `src/` puri (94 test). **Engine: 0** |
| **Dichiarato ma non provato** | Le etichette "Implementata" della copertura = **registrazione**, non esecuzione verificata ([card-effects.js:236](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/card-effects.js#L236)) |
| **Verificato giocando** | **Nessuna voce**: non è stata eseguita alcuna QA manuale in browser |
| **Aperto** | Campagna; Domini canonici; perimetro delle 44 Unità parziali; hosting |

---

## 2. Requisiti, gap e divergenze

### 2.1 Requisiti di prodotto per la prima release (dal mandato)

- Tutti i **tipi di carta** giocabili: Unità, Tattiche/Azioni ed Equipaggiamenti (oltre a Siti/Campi, già registrati).
- Il **mazzo Domini non può restare placeholder**; il **mazzo predefinito** (oggi 40 Unità) va completato di conseguenza.
- **Onboarding**: tutorial al primo avvio + **modalità pratica contro l'IA**.
- **Salvataggi locali** nel browser (localStorage o IndexedDB), **senza account**.
- **Solo PC desktop** con risoluzioni standard. **Nessun** requisito tablet/mobile.
- **Deploy statico** compatibile (GitHub Pages/Netlify); la scelta dell'hosting resta aperta.

### 2.2 Fuori scope della prima release

Tablet + mobile (fase successiva, con UI dedicata; il mobile è l'obiettivo primario di quella fase); multiplayer online; account e sincronizzazione; **2 vs 2** (fuori scope salvo indicazione contraria).

### 2.3 Divergenze regolamento ↔ codice (verificate, non dedotte)

| # | Divergenza | Evidenza |
|---|---|---|
| 1 | **Mazzo Esercito = solo 40 Unità** (il regolamento vuole Unità + Tattiche + Equipaggiamenti) | [game.js:141-145](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L141-L145) |
| 2 | **Mazzo Domini = 20 segnalini sintetici identici** | [game.js:148-155](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L148-L155) |
| 3 | **Mulligan totale** invece che parziale | [game.js:1970-1980](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1970-L1980) |
| 4 | **Sconfitta contemporanea**: manca il tie-break "vince il giocatore di turno" | [game.js:542-555](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L542-L555) |
| 5 | **Equipaggiamento annidato** nell'Unità invece di andare separato allo scarto | [game.js:1543-1552](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1543-L1552) |
| 6 | **Nessuna coda FIFO** per inneschi simultanei | assenza di un ordinatore |
| 7 | **Dominio Totale della Mappa** (3ª condizione di vittoria) assente | grep → 0 |
| 8 | **Dominio esausto al primo turno** non applicato | [game.js:2036-2039](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2036-L2039) |
| 9 | **Ritirata/Rimpiazzo** e **Purga dei Parassiti** assenti; **Finestra di Reazione** assente | grep; giocate gated a `phase === 'principale'` |

Conformi e già implementate (per lettura di codice): vittoria PC/Follia, posizionamento e limiti di Fronte, Cap Assoluto Supporti +3, Max 3 Siti/Campo, Rifornimento e primo turno senza pesca Esercito, Fronte Scoperto, Sacrificio Difensivo, promozione interattiva, tutte le keyword (incl. Sorvolo adiacente, Decadenza, Profanare), Forza minima 0, mazzo esaurito senza sconfitta.

### 2.4 Gap noti (dal mandato + verifica)

- **44 Unità "Parziale"**: effetti testuali non eseguiti → contenuto non giocabile, bilanciamento falsato.
- Etichette "Implementata" == **registrazione**, non prova (voce di documentazione).
- **Comandanti provvisori** (`provisional: true`).
- **IA basilare**, senza test deterministici di policy.

---

## 3. Le sette condizioni di "pubblicabile" (definizione operativa di qualità)

Non viene rivendicata alcuna qualità "AAA". La release è accettata quando **tutte** queste sono vere e verificabili:

1. Esiste un test che fallisce se si rompe ciascun percorso di nucleo.
2. Il determinismo è riproducibile da seed in test automatici.
3. Nessun effetto "muto": ogni carta è implementata **oppure** dichiarata non disponibile con motivazione e avviso all'utente.
4. I salvataggi sopravvivono a un aggiornamento dello schema (migrazione testata).
5. Desktop usabile (due risoluzioni standard), percorso completo da tastiera, contrasto ≥ AA.
6. Build riproducibile da installazione pulita + QA manuale senza difetti bloccanti.
7. Documentazione allineata ai risultati verificati.

---

## 4. Roadmap per fasi

### 4.1 **P0 — Correttezza misurabile del nucleo** — *punto di ingresso immediato* `[M]`

**Obiettivo e valore.** Il gioco non si blocca, non si desincronizza, non perde progresso — e questo è **dimostrabile**, non affermato. È la prima fase perché **tutte** le successive ci poggiano: senza harness non si possono scrivere test per gli effetti (P1), per l'IA (P2) o per la QA (P4). È anche il prerequisito di sicurezza: non esiste controllo di versione, quindi il primo gesto è creare un punto di ripristino.

**Ambito.** Toolchain di test, importabilità, harness headless, copertura engine, robustezza interazioni, versionamento salvataggi.
**File:** [game.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js), [deck-builder.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/deck-builder.js), [card-library.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/card-library.js), [save-store.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/save-store.js), nuovi `tests/game-engine.test.js`, `tests/save-migration.test.js`, `tests/helpers/`.

**Dipendenze.** Nessuna.

**Attività (in ordine di priorità).**

1. **Controllo versione** — `git init` + `.gitignore` (`node_modules/`, `dist/`) + commit dello stato attuale come punto di ripristino.
2. **Importabilità** — aggiungere `with { type: 'json' }` ai 3 import JSON incoerenti; verificare `npm test` ancora **94/94**.
3. **Harness headless** — stub minimi di `document`, `localStorage`, Canvas 2D, `AudioContext`. Fattibile: `game.js` **non** accede al DOM a livello di modulo (verificato), quindi l'import non innesca side-effect; l'avvio resta in [main.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/main.js).
4. **Factory deterministica** — esporre `createGame({ seed, decks, commanders })` riusando `seedRandom`/`getRandomState` di [random.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/random.js), **senza riscrivere le regole**.
5. **Test di regressione engine** — sequenza fasi; Rifornimento (incluso primo turno senza pesca Esercito); riattivazione Domini; costo carte; Scontro multi-fronte; parità; danno-differenza; Fronte Scoperto (entrambi i versi); Sacrificio Difensivo; promozione + danno in eccesso; Fase Finale (scarto a 7, azzeramento Echo); vittoria PC 0 e Follia 10; Forza minima 0; mazzo esaurito senza sconfitta; determinismo a parità di seed.
6. **Robustezza** — bersaglio illegale, carta rimossa durante la risoluzione, limiti per turno, effetti simultanei, salvataggi invalidi.
7. **Migrazioni salvataggi** — catena `MIGRATIONS[v] → v+1` in `save-store.js`, con test su snapshot v1/v2 → v3 e rifiuto esplicito delle versioni future. Va **prima** di P1: Domini, composizione mazzo e export toccano lo schema.
8. **Prompt pendenti al restore** — documentare o correggere il comportamento (oggi lo stato dei prompt è azzerato al restore; la persistenza è sospesa durante i prompt).
9. **Invarianti di catalogo** — script che verifica che ogni ID registrato in `card-effects.js`/`tactics.js`/`unit-triggers.js` esista in `cards.json` (**solo lettura** del catalogo).

**Gate di uscita (verificabile).**
- almeno **1 file di test importa `game.js`** e passa;
- **≥ 40 nuovi test** sull'engine; 0 `skip`/`todo` sui percorsi P0;
- determinismo: stesso seed + stesso mazzo ⇒ snapshot finale `deepEqual`;
- migrazione: v1 e v2 caricano; versione futura rifiutata con messaggio esplicito;
- **94 test storici ancora verdi**; `npm run build` senza errori;
- hash di `Set.txt` e `cards.json` **invariati**.

**Rischi e mitigazione.**
- *Lo stub DOM/Canvas è invasivo per l'accoppiamento UI↔engine* → introdurre **solo** un adapter iniettabile, **nessun refactor** del monolite (rimandato).
- *L'import di `game.js` può avere side-effect* → spostare l'avvio in `src/main.js` se necessario.
- *La migrazione dei salvataggi sembra rinviabile* → è invece P0, perché P1 tocca lo schema.

---

### 4.2 **P1 — Completezza di regole e contenuti** `[L]` (rischio `XL`)

**Obiettivo e valore.** Ogni carta fa **esattamente** ciò che è stampato; nessun effetto "muto". Viene dopo P0 perché senza harness non si possono testare gli effetti; viene **prima** di P2 perché l'IA non può usare effetti non implementati.

**Ambito.** Le 44 Unità parziali, mazzo Domini, composizione del mazzo Esercito, Comandanti, le 9 divergenze di §2.3.
**File:** [card-effects.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/card-effects.js), [tactics.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/tactics.js), [unit-triggers.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/unit-triggers.js), [permanent-effects.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/permanent-effects.js), [commanders.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/commanders.js), [game.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js).

**Dipendenze.** P0 obbligatoria.

**Priorità dei lavori.**
1. **Audit** delle 44 Unità: tabella `ID · nome · testo canonico · effetto richiesto · stato · motivazione · ambiguità`. Output **documentale**, nessuna modifica al catalogo.
2. **Domini** e **composizione del Mazzo Esercito** (§5, decisione D-A/D-B): vanno risolti **prima** degli effetti che li usano, per evitare rework.
3. **Divergenze §2.3** (punti 3–9): mulligan parziale, tie-break sconfitta contemporanea, equipaggiamento allo scarto, FIFO, Dominio Totale, Dominio esausto, Ritirata/Rimpiazzo + Purga, Finestra di Reazione. **1 test ciascuna**.
4. **Implementazione degli effetti** delle 44 Unità secondo il perimetro approvato (**1 test per effetto**).
5. **Comandanti**: provvisorio marcato oppure roster definitivo (§5, D-E).
6. **Copertura dichiarata → verificata**: l'etichetta "Implementata" deve corrispondere a un test eseguibile, non all'appartenenza a un set di ID.

**Gate di uscita.**
- audit **44/44** chiuso con motivazione; 0 voci "da verificare";
- `npm run cards:coverage` con **0 "Parziale"**, oppure un numero approvato con elenco motivato;
- **ogni effetto implementato ha ≥ 1 test**;
- **tutte le divergenze §2.3 verdi**: 1 test ciascuna che fallisce se la regola si rompe;
- nessuna modifica a `Set.txt`/`cards.json` (hash invariati);
- se lo schema cambia: `SAVE_VERSION` incrementata **con** migrazione testata.

**Rischi e mitigazione.**
- *Il costo reale è decisionale (testi ambigui), non di codice* → usare il documento di design vincolante se disponibile (§5, D-0) e registrare ogni interpretazione come `[DECISIONE]`.
- *Effetti dipendenti da Domini/mazzo implementati troppo presto* → sequenziare i punti 1–3 prima del 4.

---

### 4.3 **P2 — Avversario, deck building e onboarding** `[L]`

**Obiettivo e valore.** Un avversario credibile e riproducibile, un deck builder che guida, e un ingresso comprensibile: **tutorial** al primo avvio + **modalità pratica contro l'IA**.

**Ambito.** IA, deck builder, validazione, onboarding, mazzi demo bilanciati, Finestra di Reazione (se approvata).
**File:** [game.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js) (`GameController`/IA), [deck-builder.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/deck-builder.js), [deck-validation.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/deck-validation.js), [index.html](file:///c:/Users/alessio/Desktop/Primal%20Ruin/index.html), [main.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/main.js).

**Dipendenze.** P0 (determinismo) e P1 (l'IA non può usare effetti non implementati).

**Priorità dei lavori.**
1. **Mazzi demo bilanciati** — oggi 40 Unità casuali non bilanciate; devono riflettere la composizione di P1 (Unità + Tattiche + Equipaggiamenti).
2. **IA deterministica** — ordine di priorità esplicito, tie-break sul seed; test che a parità di seed ripetono la partita identica; test di non-degenerazione (nessun loop, nessuna mossa illegale, nessun turno perso con risorse disponibili).
3. **Deck builder** — ricerca debounced; avviso esplicito sulle carte non giocabili; limite copie solo se la fonte lo specifica.
4. **Tutorial** — flusso guidato su fasi e keyword, richiudibile, **completabile solo da tastiera**.
5. **Modalità pratica contro l'IA** — partita libera senza tutorial, avviabile dal primo schermo.
6. **Finestra di Reazione** (se approvata, §5 D-C) — pannello reattivo durante lo Scontro, dal giocatore di turno, con IA deterministica.

**Gate di uscita.**
- ≥ 8 test deterministici IA; **0 mosse illegali su 100 partite automatiche**; 0 partite oltre un tetto di turni;
- **tutorial** e **modalità pratica** presenti e completabili **solo da tastiera**;
- deck builder: 0 carte non giocabili mostrate senza avviso;
- Finestra di Reazione presente e testata (umano + IA), se in ambito.

**Rischi e mitigazione.**
- *Un'IA "intelligente" è un progetto aperto* → obiettivo **credibile e riproducibile**, non ottimale.
- *La Finestra di Reazione rende il combattimento asincrono* → riusare il pattern a Promise dei prompt esistenti (`pendingTactic`, `pendingPromotion`, …).

---

### 4.4 **P3 — UX e accessibilità desktop** `[M]`

**Obiettivo e valore.** Leggibile, guidato e usabile su **PC desktop**, anche da tastiera. Il perimetro è **desktop**: tablet e mobile sono **rinviati** a una fase successiva (l'unico breakpoint attuale è `max-width: 760px`).

**Ambito.** [styles.css](file:///c:/Users/alessio/Desktop/Primal%20Ruin/styles.css), [index.html](file:///c:/Users/alessio/Desktop/Primal%20Ruin/index.html), [main.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/main.js), [settings.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/settings.js), feedback in [game.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js).

**Dipendenze.** P0; P1 per il feedback sulle keyword realmente eseguibili.

**Priorità dei lavori.**
1. **Leggibilità a risoluzione desktop** — eliminare overflow/scroll orizzontale alle risoluzioni standard; layout fluido al posto di larghezze fisse dove serve.
2. **Accessibilità** — focus trap nei pannelli (`#tactic-panel`, `#promotion-panel`, `#torment-panel`, `#sacrifice-panel`), ordine di tabulazione, scorciatoie documentate in pagina. Estendere ciò che già esiste (`:focus-visible`, `aria-live`, `role`, `prefers-reduced-motion`), **non** reintrodurlo.
3. **Feedback di stato** — evidenziazione dei bersagli legali, anteprima delle Forze prima della conferma, `aria-live` sul log, errori non bloccanti.
4. **Presentazione audio/visiva** — opzioni audio complete su `FX` (volume, mute persistito); coerenza pixel-art; fallback `prefers-reduced-motion`.
5. **N2** — correggere le affermazioni non verificate nella documentazione (es. conteggi copertura in `CODE_WIKI.md`).

**Gate di uscita.**
- 0 scroll orizzontale a **due risoluzioni desktop** (es. 1280×800 e 1920×1080);
- contrasto ≥ AA (4.5:1); ogni azione raggiungibile da tastiera con focus visibile;
- 0 animazioni non essenziali con `prefers-reduced-motion`; 0 errori in console su un flusso completo.

**Rischi e mitigazione.**
- *Modificare `styles.css` degrada il desktop* → approccio additivo + verifica alle due risoluzioni.

---

### 4.5 **P4 — Prestazioni, compatibilità, QA e release** `[S/M]`

**Obiettivo e valore.** Avvio rapido, nessuna rottura tra browser, pubblicazione ripetibile.

**Ambito.** Prestazioni, compatibilità, build, QA, documentazione.
**File:** [card-library.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/card-library.js), [deck-builder.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/deck-builder.js), [vite.config.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/vite.config.js), [README.md](file:///c:/Users/alessio/Desktop/Primal%20Ruin/README.md), [CODE_WIKI.md](file:///c:/Users/alessio/Desktop/Primal%20Ruin/CODE_WIKI.md).

**Dipendenze.** P0–P3 complete.

**Priorità dei lavori.**
1. **Prestazioni** — debounce e rendering incrementale nella ricerca (oggi 360 nodi re-renderizzati per tasto); budget bundle misurato.
2. **Compatibilità** — matrice browser + feature detection; gestione `localStorage` indisponibile/quota piena.
3. **Build e deploy** — build riproducibile da installazione pulita; **deploy statico** (base path corretto per GitHub Pages/Netlify).
4. **QA manuale** — checklist archiviata, **0 difetti bloccanti**.
5. **Documentazione** — allineare `README.md`, `DialogoAi.md`, `CODE_WIKI.md` ai risultati verificati.

**Gate di uscita.**
- ricerca senza re-render completo per tasto (strumentata); `npm test` + `npm run build` verdi da `node_modules` reinstallato;
- checklist QA con **0 difetti bloccanti**;
- documentazione senza affermazioni non verificate;
- **bundle servito correttamente da un host statico**.

**Rischi e mitigazione.**
- *Il deploy statico richiede un `base` corretto* → testare il build da sottocartella (GitHub Pages) **prima** della release.
- *Un marketplace a pagamento può richiedere SDK/asset/whitelist* → tenere l'app **host-agnostica** (nessuna dipendenza dall'host) così da poter cambiare piattaforma senza rifare P0–P3. Vedi §5 (D-F).

---

### 4.6 **Dopo la release (fasi separate, non vincolanti ora)**

- **Tablet + mobile** — fase successiva con **UI dedicata**; il mobile è l'obiettivo primario di quella fase. Richiede layout touch, breakpoint dedicati, controllo delle dimensioni di tocco.
- **Multiplayer online** — obiettivo dichiarato ma **separato**: richiede networking, stato autorevole, anti-cheat, gestione sessioni.
- **Sincronizzazione account** — opzione successiva per portare i salvataggi oltre il browser locale.
- **2 vs 2** — **fuori scope** salvo indicazione contraria.

---

## 5. Progettazione della campagna e decisioni aperte

### 5.1 Campagna (lavoro **da definire**, non requisito chiuso)

La campagna non esiste nel codice (0 riferimenti) e non è progettata. Va trattata come elemento da definire. **Opzioni di design da proporre** (da scegliere prima di pianificare l'implementazione):

- **Opzione A — Serie di incontri a difficoltà crescente.** Sequenza di partite contro l'IA con parametri progressivi (PC del Comandante, mazzi avversari, obiettivi speciali), sblocco del mazzo successivo. Costo contenuto, riusa il motore 1 vs 1; nessuna narrativa.
- **Opzione B — Campagna a scenari con obiettivi.** Come A, ma ogni scenario ha condizioni di vittoria/sconfitta dedicate (sopravvivi N turni, controlla un Sito specifico). Più varietà, richiede un piccolo motore di obiettivi e UI dedicata.
- **Opzione C — Run con progressione persistente (roguelite).** Scelte tra incontri, potenziamenti persistenti, mazzo che evolve tra le partite. Massimo valore di rigiocabilità, massimo costo e massimo rischio di bilanciamento.

**Decisioni necessarie prima di pianificare la campagna:** quale opzione; dove collocarla (fase dedicata **dopo** la release, oppure dentro un P2 esteso — sconsigliato, perché l'onboarding della release è tutorial + pratica); che tipo di avanzamento salvare (e quindi l'impatto sullo schema di salvataggio locale); quanti contenuti minimi.

### 5.2 Decisioni che richiedono la tua scelta

> Nota: il mandato cita un **documento di design delle regole** con il comportamento atteso dei gruppi di effetti e le decisioni già prese per i `[DECISIONE]`. **Nel repository non esiste**: l'unico file che contiene marcature `[DECISIONE]` è la roadmap precedente. Va indicato il percorso del documento, altrimenti le decisioni di P1 restano non ancorate.

| ID | Decisione | Opzioni | Default proposto |
|---|---|---|---|
| **D-0** | **Documento di design vincolante** | (a) indicami il percorso; (b) vale `DialogoAi.md`; (c) non esiste, uso la roadmap precedente §5 + `DialogoAi.md` | **(c)** con le interpretazioni marcate `[DECISIONE]` |
| **D-A** | **Mazzo Domini** (nessuna carta Dominio in `Set.txt`/`cards.json`) | (a) fornirsci le carte canoniche; (b) progettare un sistema Domini *funzionale* marcato come design (non dato canonico); (c) migliorare il placeholder attuale | **(b)**, marcato esplicitamente come scelta di design, **senza** toccare `cards.json` |
| **D-B** | **Composizione Mazzo Esercito** (Unità + Tattiche + Equipaggiamenti) | (a) mazzo demo bilanciato con le 3 categorie; (b) solo se fornisci una lista canonica | **(a)** |
| **D-C** | **Finestra di Reazione** | (a) implementarla (pannello reattivo); (b) rimandarla | **(a)**, solo dopo le divergenze di P1 |
| **D-D** | **Perimetro delle 44 Unità parziali** | (a) tutte; (b) lotto prioritario + resto dichiarato non eseguibile con avviso; (c) congelare | **(b)**: lotto definito dall'audit, resto marcato e avvisato nel deck builder |
| **D-E** | **Comandanti** | (a) provvisorio marcato; (b) roster definitivo (serve la fonte) | **(a)** |
| **D-F** | **Hosting** | (a) statico gratuito (GitHub Pages/Netlify); (b) marketplace a pagamento; (c) decidi dopo il build | **(a)** per la release, architettura host-agnostica così che (b) resti possibile senza rifare P0–P3 |
| **D-G** | **Tecnologia di salvataggio** | (a) `localStorage` (attuale); (b) IndexedDB | **(a)**, salvo che la campagna richieda volumi maggiori |
| **D-H** | **Campagna** | A/B/C di §5.1 | **(A)** come base minima, con B come estensione |
| **D-I** | **Ambito unità parziale = blocco di release?** | (a) sì, 0 "Parziale"; (b) no, purché ogni carta residua sia dichiarata non eseguibile con avviso | **(b)**, coerente con la condizione 3 di §3 |

### 5.3 Assunzioni conservative che applicherò senza attendere

| ID | Assunzione | Reversibilità |
|---|---|---|
| A1 | Inizializzo Git con commit dello stato attuale | `rimuovere .git` |
| A2 | Aggiungo `with { type: 'json' }` ai 3 import incoerenti | una riga per file |
| A3 | Non eseguo `npm run cards:import` (rigenererebbe `cards.json`) | nessuna |
| A4 | Non modifico `Set.txt` né i dati canonici di `cards.json` | nessuna |

---

## 6. Processo di lavoro (adatto a uno sviluppatore solo)

1. **Delimita**: un lotto coerente (una funzionalità o un gruppo di carte), mai "tutta la fase".
2. **Leggi prima l'esistente** e riusa i pattern presenti (tabelle dichiarative di `unit-triggers.js`, set di ID di `card-effects.js`, prompt basati su Promise).
3. **Nessuna riscrittura non necessaria**; vietato toccare `Set.txt` e i dati canonici.
4. **Ogni modifica arriva con il test che la fissa.**
5. **Esegui** `npm test`, `npm run cards:coverage`, `npm run build` (quando tocchi codice di produzione).
6. **Aggiorna la documentazione solo dopo aver verificato i risultati.**
7. **Riporta**: file modificati, verifiche eseguite con esito, criteri toccati, problemi rimasti.
8. **Non dichiarare completa una funzione se i criteri non sono soddisfatti.** "Sembra funzionare" non è un criterio.

---

## 7. Verifiche (Verification steps)

Comandi di riferimento, da eseguire dopo ogni modifica pertinente:

```powershell
npm test                  # atteso: 94 pass / 0 fail (oggi) → crescere con i test engine
npm run cards:coverage    # atteso: unit … Parziale 44 → scendere fino a 0 (o valore approvato)
npm run build             # build di produzione in dist/
npm audit --audit-level=moderate
git status                 # atteso: repository inizializzato (P0)
```

Controlli di accettazione trasversali (una voce per fase):

- **P0**: un test importa `game.js`; determinismo da seed; migrazione salvataggi; 94 test storici verdi.
- **P1**: audit 44/44; 0 "Parziale" non approvati; 1 test per effetto; divergenze §2.3 verdi.
- **P2**: 100 partite automatiche senza mosse illegali; tutorial + pratica da tastiera.
- **P3**: 0 scroll orizzontale a due risoluzioni desktop; contrasto ≥ AA; percorso da tastiera.
- **P4**: build da installazione pulita servita da host statico; QA senza difetti bloccanti.

---

## 8. Prima iterazione concreta (ambito minimo, reversibile)

Il punto di ingresso immediato, da eseguire **prima** di qualsiasi altra cosa:

1. `git init` + `.gitignore` (`node_modules/`, `dist/`) + commit dello stato attuale.
2. Aggiungere `with { type: 'json' }` a [game.js:1](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1), [deck-builder.js:1](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/deck-builder.js#L1), [card-library.js:1](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/card-library.js#L1); verificare `npm test` a **94/94**.
3. Creare l'harness headless e **un solo** test che importa `game.js`, crea una partita da seed noto e ne verifica lo stato iniziale (5 carte in mano, 2 Domini attivi, fase `setup`, primo giocatore coerente con il seed).
4. Eseguire `npm test` e `npm run build` e riportare i risultati reali.

Solo dopo: estensione della copertura engine (punto 5 di P0) e catena di migrazione (punto 7).

---

## Appendice A — Traccia delle fasi

```text
P0  Git + import JSON + harness headless + test engine + migrazioni salvataggi   →  gate: test che importa l'engine
P1  Audit 44 Unità + Domini + mazzo Esercito + 9 divergenze + Comandanti        →  gate: 44/44, 0 "Parziale", 1 test/effetto
P2  Mazzi demo + IA deterministica + deck builder + TUTORIAL + PRATICA vs IA    →  gate: 100 partite, onboarding da tastiera
P3  UX/accessibilità DESKTOP (tablet/mobile rimandati)                          →  gate: 2 risoluzioni desktop, AA, tastiera
P4  Prestazioni + compatibilità + build + deploy statico + QA + documentazione  →  gate: build pulita, 0 difetti bloccanti

Dopo la release (separate): tablet+mobile · multiplayer online · account sync · campagna · (2 vs 2 fuori scope)
```
