# Primal Ruin — Piano di rifinitura verso una versione pubblicabile

> **Ruolo assunto:** senior game developer / technical lead / game designer (giochi di carte strategici browser, HTML5 + JS + Vite).
> **Fonti canoniche:** [regolamento_ufficiale_primal_ruin_avanzato.txt](file:///c:/Users/alessio/Desktop/Primal%20Ruin/regolamento_ufficiale_primal_ruin_avanzato.txt) (nuova fonte ufficiale "Edizione Integrata e Aggiornata", sostituisce i precedenti `Regolamento.txt` e `regolamento_ufficiale_primal_ruin.txt`, ora rimossi), [Set.txt](file:///c:/Users/alessio/Desktop/Primal%20Ruin/Set.txt), [cards.json](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/data/cards.json).
> **Vincoli inviolabili:** non modificare `Set.txt`; non inventare né alterare `cards.json`. Ogni effetto non implementato o testo ambiguo va **segnalato**. Le interpretazioni sono marcate `[DECISIONE]`.

**Revisione 4.** Riscritta sulla **nuova fonte avanzata** `regolamento_ufficiale_primal_ruin_avanzato.txt` (199 righe, letta integralmente). Rispetto alla REV3 il regolamento introduce **migliorie logiche** che generano nuove divergenze verificate: (a) **terza condizione di vittoria "Dominio Totale della Mappa"** (§1); (b) **Cap Assoluto dei Supporti +3** (§3); (c) **primo turno bilanciato: il Dominio pescato entra esausto** (§5); (d) **nuove azioni di Fase Principale**: *Ritirata e Rimpiazzo* e *Purga dei Parassiti* (§6); (e) **Finestra di Reazione con Tattiche Istantanee** durante lo Scontro (§6.3); (f) **modalità multiplayer 2 vs 2** (§8). Sono confermate le 5 divergenze della REV3 (composizione Mazzo Esercito, mulligan parziale, sconfitta contemporanea, equipaggiamento allo scarto, FIFO).

---

## 1. Sintesi dello stato verificato

### 1.1 Comandi eseguiti, risultati reali

| Comando | Risultato effettivo |
|---|---|
| `npm test` (`node --test`) | **94 test, 94 pass, 0 fail**, ~1.12 s |
| `npm run cards:coverage` | `unit: Unità base 5, Keyword implementata 31, Implementata 88, **Parziale 44**` · `tactic: Implementata 68` · `equipment: Implementata 28` · `site: Implementata 70` · `field: Implementata 26` |
| `git status` | **fatal: not a git repository** |
| `dist/` | presente (`index.html`, `assets/index-*.js`, `assets/index-*.css`) |

I conteggi dichiarati in [DialogoAi.md](file:///c:/Users/alessio/Desktop/Primal%20Ruin/DialogoAi.md) **coincidono** con l'audit reale. Resta il caveat: `getCardExecutionStatus` assegna l'etichetta per **appartenenza a un set di ID** ([card-effects.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/card-effects.js)), non per esecuzione verificata. "Implementata" significa **registrata**, non **provata**.

### 1.2 Anagrafica

| Area | Valore verificato |
|---|---|
| Carte | 360 (168 Unità, 68 Tattiche, 28 Equipaggiamenti, 70 Siti, 26 Campi) — **nessuna carta Dominio** |
| `src/` | 15 moduli |
| Engine | [game.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js) — **~2893 righe, monolite** (`GameState`, `Logger`, `FX`, `UIRenderer`, `CombatResolver`, `GameController`) |
| Test | 9 file, 94 test |
| Config | solo `vite.config.js` — **nessun** ESLint/Prettier, **nessuna CI** |
| Persistenza | `localStorage`, `SAVE_VERSION = 3`, chiavi `primal-ruin.game-save.v1`, `primal-ruin.custom-deck.v1`, `primal-ruin.settings.v1` |
| Sicurezza | **nessun uso di `innerHTML`/`eval`** nel codice applicativo |

### 1.3 Conformità a `regolamento_ufficiale_primal_ruin_avanzato.txt` — riverificata sul codice

Ogni riga è verificata contro il **nuovo** testo ufficiale. `✅` conforme · `⚠️` divergenza/parziale · `[DECISIONE]` interpretazione non esplicitata dal regolamento.

| Regola (nuovo §) | Stato | Evidenza / divergenza |
|---|---|---|
| §1 Vittoria: PC a 0 **oppure** 10 Follia | ✅ | `checkVictory` ([game.js:542-555](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L542-L555)); `save-store.js` valida `pc 0..20`, `follia 0..10` |
| §1.3 **Dominio Totale della Mappa** (Linea attiva in 3 Fronti **e** avversario senza Unità) → vittoria a inizio turno | ⚠️ **non implementata** | Nessun riferimento nel codice (grep `Dominio Totale`/`tutti e 3` → 0). Terza condizione di vittoria **assente** |
| §2 **Mazzo Esercito = Unità + Tattiche + Equipaggiamenti** (40) | ⚠️ **divergenza** | Il mazzo di default è composto da **40 Unità**, non da un mix delle 3 categorie: [game.js:141-145](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L141-L145) (`filter(category === 'unit')`). Il mazzo personalizzato usa gli ID forniti, ma `deck-validation.js` **non impone** la composizione per categoria |
| §2 Mazzo Domini 20 carte (separato) | ⚠️ **placeholder** | [game.js:148-155](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L148-L155): 20 segnalini sintetici identici (8 nomi di elemento riciclati). **Nessuna categoria `domain` in `cards.json`** |
| §2 Segnalini: Danno, Follia, Echo, Rovina, Decadenza | ✅ | Danno/Follia/Echo ✅; **Rovina ✅** ([game.js:460-461](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L460-L461)); **Decadenza ✅** ([game.js:840-847](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L840-L847)) |
| §2 **Parassita** tra i segnalini della Riserva | ✅ | `player.parasites` ([game.js:613-618](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L613-L618)) |
| §3 Max 3 Unità per Fronte (1 Linea + 2 Supporto) | ✅ | `checkDeployment` ([game-rules.js:55-83](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/game-rules.js#L55-L83)) |
| §3 Assegnazione standard in Supporto (salvo Assalto/Posizione Difensiva) | ✅ | `checkDeployment` |
| §3 **Cap Assoluto di Fronte: bonus Supporti mai > +3** anche con carte/Siti/Campi | ✅ | `getSupportBonus` → `Math.min(3, total)` ([permanent-effects.js:194-218](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/permanent-effects.js#L194-L218)) + `supportBonusCap: 3` ([game.js:1303](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1303)) |
| §3 Max 3 Siti; Campo conta come Sito; 4° Sito → ne distruggi uno; nuovo Campo → il precedente è distrutto | ✅ | [game.js:2164-2201](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2164-L2201) |
| §4 Setup: 5 carte, **Mulligan parziale** (qualsiasi numero, peschi altrettante), 2 Domini attivi, primo giocatore casuale | ⚠️ **mulligan divergente** | [game.js:1970-1980](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1970-L1980): implementa il **mulligan totale** (tutte e 5 le carte) con un unico pulsante `#btn-mulligan`. Manca la scelta parziale carta per carta |
| §5 Primo turno: niente pesca Esercito, pesca 1 Dominio | ✅ parziale | [game.js:2036-2047](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2036-L2047) |
| §5 **Primo turno bilanciato: il Dominio pescato entra ESAUSTO** (o tenuto in mano) | ⚠️ **non implementata** | Il Dominio pescato è inserito **attivo**: `player.domainDeck.pop()` → `domains.push()` senza `tapped` ([game.js:2036-2039](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2036-L2039)); il reset a inizio turno lo riattiva ([game.js:2005](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2005)) |
| §4 Esaurimento Mazzo Domini: si continua senza pescare | ✅ | `if (domain)` guard ([game.js:2036-2039](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2036-L2039)) |
| §5 Rifornimento: abilità Comandante, Canalizzare, riattiva Domini, pesca Dominio, pesca Esercito | ✅ | [game.js:1988-2054](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1988-L2054); Canalizzare anche per l'umano (`#btn-canala`) |
| §5 Abilità Comandante max 1/turno | ✅ | `commanderAbilityUsed` |
| §6.2 **Ritirata e Rimpiazzo** (paga 1 Dominio attivo per scartare un'Unità in Supporto) | ⚠️ **non implementata** | Nessun riferimento nel codice (grep `ritirata`/`rimpiazzo` → 0). Non esiste l'azione |
| §6.2 **Purga dei Parassiti** (paga 2 Domini attivi per rimuovere 1 Parassita) | ⚠️ **parziale** | Solo la rimozione **automatica** a 3+ Parassiti ([game.js:2022-2025](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2022-L2025)). L'azione manuale a pagamento **manca** |
| §5 Scontro Fronte per Fronte Sinistra→Destra | ✅ | `resolveFront` iterato su `FRONT_NAMES` |
| §6.3 **Finestra di Reazione** (Tattiche Istantanee giocabili da entrambi durante lo Scontro, dal giocatore di turno) | ⚠️ **non implementata** | Tutte le giocate sono vincolate a `phase === 'principale'` ([game.js:2096](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2096), [2116](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2116)). Le "Tattiche Istantanee" esistono come elenco ([card-effects.js:8-15](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/card-effects.js#L8-L15)) ma **non** come finestra reattiva in combattimento |
| §5 Parità → 1 danno a entrambe le Linee | ✅ | [game.js:1411-1415](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1411-L1415) |
| §5 Danno al Comandante = differenza | ✅ | [game.js:1420-1423](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1420-L1423) |
| §5 Linea distrutta → **scegli** un Supporto come nuova Linea; eccesso sulla nuova Linea | ✅ | `promptPromotionSlot` / `defaultPromotionSlot`; `damageLine` `async` |
| §5 **Fronte Scoperto**: l'attaccante infligge **l'intera Forza della sua Linea** | ✅ | [game.js:1394-1406](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1394-L1406) (`strength(attacker, frontName, …)` = Forza totale Linea) |
| §5 Fronte scoperto — **caso inverso** (attaccante senza Linea, difensore sì) | `[DECISIONE]` | [game.js:1377-1390](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1377-L1390): il codice fa infliggere il danno **al difensore** verso l'attaccante. Il regolamento descrive il Fronte Scoperto solo dal punto di vista dell'attaccante: da approvare |
| §5 **Sacrificio Difensivo**: 1 Forza = 1 danno prevenuto | ✅ | [game.js:1480-1519](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1480-L1519) (umano interattivo + euristica IA) |
| §5 Finale: scarta fino a 7, rimuovi Echo, effetti temporanei terminano | ✅ | [game.js:2869-2870](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2869-L2870), [2875-2911](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2875-L2911) |
| §6 Ferocia (+1 se controlli meno Unità) | ✅ | `getFerocityBonus` |
| §6 Assalto | ✅ | `checkDeployment` |
| §6 Sorvolo (sposta in Fronte **adiacente**, entra in Supporto) | ✅ | `getSorvoloOptions` ([game.js:1206-1245](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1206-L1245)); adiacenza via `index ± 1` |
| §6 Mente Collettiva (+1 per **altra** Unità MC, max +3) | ✅ | `collectiveCount - 1` cap 3 ([game-rules.js:16-18](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/game-rules.js#L16-L18)) |
| §6 Posizione Difensiva (in Linea se libero) | ✅ | `checkDeployment` |
| §6 Logorare (X) | ✅ | `permanent-effects` |
| §6 Eco Spettrale (dallo scarto a costo +1; esilia se lascia il gioco) | ✅ | `onUnitRemoved` ([game.js:1546-1548](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1546-L1548)) |
| §6 Tormento (X): converti il danno in X Follia | ✅ | `chooseTorment` / `shouldUseTorment` |
| §6 Ascensione (X): costo Domini + X Echo nello stesso turno | ✅ | [game.js:2628-2640](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2628-L2640) |
| §6 Divinità: immune a Tattiche e a distruzione da effetti; **Sigillata** a 0 Forza | ✅ | [game.js:1565](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1565), [1543-1545](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1543-L1545) |
| §6 Infiltrazione (X) + Parassita (3+ → ne rimuove uno, perde 1 PC) | ✅ | [game.js:2018-2028](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2018-L2028) |
| §6 **Decadenza (X)**: -1 all'inizio del turno del proprietario; all'ultimo → il Sito è distrutto | ✅ | [game.js:840-847](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L840-L847) |
| §6 **Profanare**: +1 Rovina su un Sito; a 2 Rovina il Sito è distrutto | ✅ | [game.js:460-469](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L460-L469) (implementato su `set-2-088`) |
| §7 **Forza minima effettiva 0** | ✅ | [game-rules.js:20-23](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/game-rules.js#L20-L23) (`Math.max(0, …)`) |
| §7 **Sconfitta contemporanea per PC → vince il giocatore di turno** | ⚠️ **divergenza** | [game.js:542-555](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L542-L555): scorre `players` in ordine e assegna la vittoria a chi *non* ha perso → con entrambi a 0 PC vince sempre `players[1]`, non necessariamente chi è di turno |
| §7 **Mazzo esaurito → non si perde** | ✅ | Pesca protetta: [game.js:2268-2276](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2268-L2276) (`while … armyDeck.length`), [2036-2043](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2036-L2043) |
| §7 **Limite 1 Equipaggiamento/Unità; nuovo → il precedente è scartato** | ✅ | [game.js:2494-2495](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2494-L2495) (`if (unit.equipment) player.discard.push(unit.equipment)`) |
| §7 **Unità distrutta/esiliata → l'Equipaggiamento va allo scarto** | ⚠️ **divergenza** | [game.js:1543-1552](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1543-L1552): va allo scarto/exilio **l'oggetto Unità** con l'equipaggiamento **annidato dentro** (`unit.equipment`), non l'Equipaggiamento come carta separata. Se l'Unità è esiliata (Eco Spettrale) l'equipaggiamento segue in esilio, contro il §7 |
| §7 **Inneschi contemporanei**: FIFO o priorità al giocatore di turno | ⚠️ non verificabile | Nessuna coda FIFO esplicita nel codice; l'ordine dipende dall'ordine di chiamata. Da definire e testare |
| §7/§10 Ordine di risoluzione | ⚠️ non testato | Nessun test dedicato |
| §8 **Multiplayer "Guerra a Squadre" 2 vs 2** (fronti condivisi, turni per squadra) | ⚠️ **non implementata** | Il motore è **1 vs 1** (`players[0]` umano, `players[1]` IA). Nessuna nozione di squadra, fronte condiviso o PC condivisi |

**Conclusione onesta:** il motore copre la quasi totalità del **nucleo 1 vs 1**. Con il regolamento avanzato le divergenze confermate salgono a **9**: le 5 della REV3 (composizione Mazzo Esercito, mulligan parziale, sconfitta contemporanea, equipaggiamento allo scarto, FIFO) più **4 novità logiche non implementate**: (6) **Dominio Totale della Mappa**, (7) **Dominio esausto al primo turno**, (8) **azioni Ritirata/Rimpiazzo e Purga dei Parassiti**, (9) **Finestra di Reazione**. La **modalità 2 vs 2** (§8) è una feature a sé, assente per scelta di ambito. Resta invariato il difetto strutturale: **copertura automatica dell'engine assente** (§1.5).

### 1.4 Pseudo-lacune ritirate (riverificate contro il nuovo regolamento)

Riporto esplicitamente ciò che **non** è un problema, per non gonfiare l'inventario:

- ~~Canalizzare non disponibile al giocatore umano~~ → **falso**: `#btn-canala` esiste in [index.html:170](file:///c:/Users/alessio/Desktop/Primal%20Ruin/index.html#L170).
- ~~Limite di 3 Siti / Campo non applicato~~ → **falso**: [game.js:2164-2184](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2164-L2184).
- ~~Parassita senza la clausola "3 o più → ne rimuove uno"~~ → **falso**: [game.js:2018-2028](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2018-L2028).
- ~~Audio non implementato~~ → **falso**: oggetto `FX` con Web Audio API.
- ~~**Rovina** non è un sistema di segnalini (ex-`G3`)~~ → **falso con il nuovo regolamento**: il nuovo §6 definisce **Profanare** come meccanica *site-scoped* (2 Rovina ⇒ Sito distrutto), ed è **esattamente** ciò che fa [game.js:460-469](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L460-L469). **G3 ritirata.**
- ~~**Decadenza** applicata solo ai Siti (ex-`G5`)~~ → **falso come lacuna**: il nuovo §6 vincola la Decadenza **al Sito** ("il Sito viene distrutto"). Applicarla solo ai Siti è **corretto**. **G5 ritirata.**
- ~~**Forza minima 0** mancante~~ → **falso**: implementata in [game-rules.js:20-23](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/game-rules.js#L20-L23).

Nota di metodo: la "Hard Constraint" in memoria di progetto ("Max 3 Siti totali; il Campo conta come 1 Sito") è **rispettata dal codice** — quindi non è una lacuna.

### 1.5 Il difetto strutturale reale

> **L'engine `game.js` ha copertura automatica ZERO e non è nemmeno importabile dai test.**

Evidenze:
1. Nessun file in `tests/` importa `game.js` (grep `from '../game.js'` → 0 risultati).
2. [game.js:1](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1) usa `import cardCatalog from './src/data/cards.json'` **senza** `with { type: 'json' }`. Node 20.19+/22.12+ lo rifiuta: **il file non è caricabile da `node --test`**. Identico in [deck-builder.js:1](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/deck-builder.js#L1) e [card-library.js:1](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/card-library.js#L1).
3. Conseguenza: **tutti i 94 test verdi riguardano solo moduli `src/` puri**. Turni, fasi, combattimento, promozione, trigger, vittoria, Rifornimento, Fase Finale, Siti/Campi: **zero copertura automatica**.

Quindi: le 30+ righe ✅ di §1.3 sono verificate **per lettura di codice**, non da un test che fallirebbe se si rompessero. È esattamente la differenza tra "implementato" e "testato".

### 1.6 Distinzione di stato

| Stato | Situazione |
|---|---|
| **Presente** | Engine, UI, deck builder, archivio, salvataggio, audio |
| **Implementato** | Quasi tutto il regolamento avanzato (§1.3), con **9 divergenze circoscritte** |
| **Testato automaticamente** | Solo moduli `src/` puri (94 test). **Engine: 0** |
| **Verificato nel gioco** | **Nessuna voce.** Non ho eseguito partite in browser: la QA manuale è formalizzata come gate in §4 |

---

## 2. Tabella delle lacune e dei rischi

`R` rischio · `G` gap funzionale · `D` debito tecnico · `N` documentazione. Priorità: P0 bloccante.

| ID | Tipo | Lacuna / rischio | Evidenza verificata | Impatto | P |
|---|---|---|---|---|---|
| **R1** | rischio | **Nessun controllo di versione** | `git status` → *not a git repository* | Nessun rollback su refactor rischiosi | **P0** |
| **R2** | rischio | **Engine non testabile** → correttezza non dimostrabile | `game.js:1` import JSON senza attributo; 0 test sull'engine | Ogni modifica futura è non verificabile | **P0** |
| **R3** | rischio | **Nessuna migrazione dei salvataggi**: versione diversa ⇒ scarto | [save-store.js:43-69](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/save-store.js#L43-L69) | Ogni bump di schema invalida le partite | **P0** |
| **R4** | rischio | **Persistenza saltata durante i prompt e tutto lo Scontro** → reload = rollback | [game.js:1200-1201](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1200-L1201) | Perdita di progresso fino a un turno (nessuna corruzione) | **P0** |
| **R5** | rischio | **Stato dei prompt azzerato al restore** | [game.js:522-526](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L522-L526) | Coerenza garantita solo grazie a R4 | **P0** |
| **G1** | gap | **44 Unità "Parziale"** non eseguibili | `cards:coverage`; es. `set-1-032` (scambio posizione a inizio Scontro), `set-2-050` (distruggi Unità Forza ≤3), `set-2-051` (esilia da scarto), `set-3-004` (sposta Supporto nemico), `set-3-056` (sposta tutte le Unità nemiche di un Fronte) | Contenuto non giocabile, bilanciamento falsato | **P1** |
| **G2** | gap | **Mazzo Domini = 20 segnalini sintetici identici**, non le carte canoniche | [game.js:148-155](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L148-L155); **nessuna categoria `domain` in `cards.json`** | L'economia di risorsa (Dominio) e quindi Ascensione/Eco Spettrale poggiano su un placeholder | **P1** |
| **G3** | — | ~~Rovina non è un sistema di segnalini~~ | **RITIRATA (REV3)**: il nuovo §6 (Profanare) è *site-scoped* ed è implementato in [game.js:460-469](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L460-L469) | — | — |
| **G4** | gap | **Comandanti provvisori** (`provisional: true`) | [commanders.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/commanders.js) | Contenuto non definitivo | **P1** |
| **G5** | — | ~~Decadenza applicata solo ai Siti~~ | **RITIRATA (REV3)**: il nuovo §6 vincola la Decadenza al Sito; l'implementazione è corretta | — | — |
| **G9** | gap | **Mazzo Esercito = solo 40 Unità**, non "Unità + Tattiche + Equipaggiamenti" (nuovo §2) | [game.js:141-145](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L141-L145); `deck-validation.js` non impone la composizione per categoria | Tattiche/Equipaggiamenti non entrano nel mazzo di default ⇒ metà del contenuto resta inutilizzata nelle partite normali | **P1** |
| **G10** | gap | **Mulligan totale invece che parziale** (nuovo §4) | [game.js:1970-1980](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1970-L1980); un solo pulsante, 5 carte rimescolate | Divergenza diretta dal regolamento ufficiale | **P1** |
| **G11** | gap | **Sconfitta contemporanea: manca il tie-break "vince il giocatore di turno"** (nuovo §7) | [game.js:542-555](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L542-L555) | Esito errato in un caso di confine | **P1** |
| **G12** | gap | **Equipaggiamento annidato nell'Unità** invece di andare separatamente allo scarto (nuovo §7) | [game.js:1543-1552](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1543-L1552) vs [2494](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2494) | Con Eco Spettrale l'equipaggiamento segue in esilio: divergenza dal §7 | **P1** |
| **G13** | gap | **Nessuna coda FIFO esplicita per inneschi contemporanei** (nuovo §7) | assenza di un ordinatore nel codice | Ordine di risoluzione non deterministico in casi simultanei | **P2** |
| **G14** | gap | **Dominio Totale della Mappa assente** (nuovo §1.3): Linea in 3 Fronti + avversario senza Unità ⇒ vittoria a inizio turno | grep → 0; `checkVictory` non la contempla | Terza condizione di vittoria mancante: partite potenzialmente senza chiusura | **P1** |
| **G15** | gap | **Dominio del primo turno non esausto** (nuovo §5): il bilanciamento previsto non è applicato | [game.js:2036-2039](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2036-L2039) | Vantaggio di risorse al Turno 1 non mitigato | **P1** |
| **G16** | gap | **Azioni "Ritirata e Rimpiazzo" e "Purga dei Parassiti" assenti** (nuovo §6.2) | grep `ritirata`/`purga` → 0; solo auto-rimozione a 3+ ([game.js:2022-2025](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2022-L2025)) | Il giocatore non ha strumenti di gestione previsti dal regolamento | **P1** |
| **G17** | gap | **Finestra di Reazione con Tattiche Istantanee assente** (nuovo §6.3) | giocate gated a `phase === 'principale'` ([game.js:2096](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L2096)) | Il combattimento non è interattivo: le Istantanee non si possono giocare in risposta | **P2** |
| **G18** | gap | **Modalità Multiplayer 2 vs 2 assente** (nuovo §8) | engine 1 vs 1 | Feature di ampio respiro, fuori dall'ambito "prototipo" attuale | **P4** |
| **G6** | gap | **IA basilare**, nessun test deterministico della policy | nessun test su `GameController`/IA | Partite poco significative | **P2** |
| **G7** | gap | **Onboarding assente** | nessun flusso dedicato | Curva d'ingresso ripida | **P2** |
| **G8** | gap | **Salvataggio non esportabile** (solo `localStorage`) | [save-store.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/save-store.js) | Nessun trasferimento tra dispositivi | **P2** |
| **D1** | debito | **Monolite `game.js` ~2893 righe** | lettura file | Costo di modifica e rischio regressione | **P1** |
| **D2** | debito | **Un solo breakpoint responsive** + larghezze fisse | `@media (max-width: 760px)` ([styles.css:365](file:///c:/Users/alessio/Desktop/Primal%20Ruin/styles.css#L365)); `.fronte { width: 220px }` ([styles.css:158](file:///c:/Users/alessio/Desktop/Primal%20Ruin/styles.css#L158)) → board ~660 px minimi | Tablet stretto / scroll orizzontale | **P3** |
| **D3** | debito | **Ricerca non debounced**: re-render di 360 nodi per tasto | [card-library.js:19-71](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/card-library.js#L19-L71), [deck-builder.js:71-135](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/deck-builder.js#L71-L135) | Jank su dispositivi lenti | **P3** |
| **D4** | debito | **Nessun lint/format/CI** | solo `vite.config.js` | Regressioni non intercettate | **P2** |
| **D5** | debito | **Incoerenza import JSON** tra moduli | `with { type: 'json' }` presente nei test, assente in `game.js`/`deck-builder.js`/`card-library.js` | Blocca testabilità | **P0** |
| **N1** | doc | "Implementata" = **registrata**, non provata | `card-effect-coverage.mjs` legge etichette | Falsa sensazione di copertura | **P1** |
| **N2** | doc | `DialogoAi.md` dichiara copertura prompt "da verificare" senza esito | [DialogoAi.md](file:///c:/Users/alessio/Desktop/Primal%20Ruin/DialogoAi.md) | Incertezza sullo stato reale | **P0** |

---

## 3. Roadmap per fasi

---

### **P0 — Correttezza misurabile del nucleo** `[M]`

**Obiettivo e valore per il giocatore.** Il gioco non si blocca, non si desincronizza, non perde progresso — e questo è **dimostrabile**, non solo affermato.

**Ambito.** Toolchain di test, importabilità, harness headless, copertura engine, robustezza interazioni, versionamento salvataggi. File: [game.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js), [deck-builder.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/deck-builder.js), [card-library.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/card-library.js), [save-store.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/save-store.js), nuovi `tests/game-engine.test.js`, `tests/save-migration.test.js`, `tests/helpers/`.

**Dipendenze.** Nessuna.

**Attività.**
1. **R1** — inizializzare Git + `.gitignore` (`node_modules/`, `dist/`) e committare lo stato attuale come punto di ripristino.
2. **D5** — aggiungere `with { type: 'json' }` ai 3 import JSON incoerenti; verificare `npm test` ancora 94/94.
3. **R2** — harness headless con stub di `document`, `localStorage`, Canvas 2D, `AudioContext`. In `game.js` non esiste accesso DOM a livello di modulo (verificato: 0 occorrenze `^document.`/`^window.`), quindi l'import è praticabile una volta sistemato il punto 2.
4. **R2** — esporre una **factory deterministica** (`createGame({ seed, decks, commanders })`) riusando `seedRandom`/`getRandomState` di [random.js](file:///c:/Users/alessio/Desktop/Primal%20Ruin/src/random.js), senza riscrivere le regole.
5. **R2** — test di regressione engine: sequenza fasi; Rifornimento (incluso **primo turno senza pesca Esercito**, §5); riattivazione Domini; costo carte; Scontro multi-fronte; parità; danno differenza; **Fronte Scoperto** (entrambi i versi); **Sacrificio Difensivo**; promozione + danno in eccesso; **Fase Finale** (scarto a 7, azzeramento Echo); vittoria per PC 0 e per Follia 10; **Forza minima 0** (§9); **mazzo esaurito → nessuna sconfitta** (§9); **sconfitta contemporanea → vince il giocatore di turno** (§9, G11); **equipaggiamento allo scarto** (§9, G12); **mulligan parziale** (§5, G10); **Cap Assoluto Supporti +3** (§3); **Dominio Totale della Mappa** (§1.3, G14); **Dominio esausto al primo turno** (§5, G15); **Ritirata/Rimpiazzo e Purga dei Parassiti** (§6.2, G16); determinismo a parità di seed.
6. **R2** — robustezza: bersaglio illegale, carta rimossa durante la risoluzione, limiti per turno, effetti simultanei, pareggi, condizioni limite, salvataggi invalidi.
7. **R3** — catena di migrazione in `save-store.js` (`MIGRATIONS[v] → v+1`) con test su snapshot v1/v2 → v3 e rifiuto esplicito di versioni future.
8. **R5/D4 (R4)** — documentare o modificare il comportamento dei prompt pendenti al restore.
9. **N1/E9** — script di invarianti: ogni ID registrato in `card-effects.js`/`tactics.js`/`unit-triggers.js` esiste in `cards.json`; ogni effetto registrato ha un test. **Solo lettura** del catalogo.

**Criteri di accettazione misurabili.**
- almeno **1 file di test importa `game.js`** e passa;
- **≥ 40 nuovi test** sull'engine; 0 `skip`/`todo` sui percorsi P0;
- determinismo: stesso seed + stesso mazzo ⇒ snapshot finale `deepEqual`;
- migrazione: v1 e v2 caricano; versione futura rifiutata con messaggio esplicito;
- **94 test storici ancora verdi**;
- `npm run build` senza errori;
- hash di `Set.txt` e `cards.json` **invariati**.

**Test / verifiche manuali / regressioni.** Automatici: `npm test`, `npm run cards:coverage`, nuovi file di test. Manuali: 3 partite complete (vittoria umano, vittoria IA, gameover per Follia) con **reload forzato** a metà partita per confermare R4.

**Rischi, decisioni, completamento.**
- *Rischio:* lo stub DOM/Canvas può rivelarsi invasivo per l'accoppiamento UI↔engine. *Mitigazione:* introdurre **solo** un adapter iniettabile; **nessun** refactor del monolite (rimandato a P1).
- *Rischio:* importare `game.js` può innescare side-effect. *Mitigazione:* spostare l'avvio in `src/main.js` se necessario.
- *Decisioni:* D7 (Git), D4 (prompt pendenti), D5 (migrazioni).
- **Completato quando** esistono test che falliscono se si rompono turni/fasi/combattimento/vittoria, e i salvataggi sopravvivono a un bump di versione.

---

### **P1 — Completezza di regole e contenuti** `[L]` (rischio `XL`)

**Obiettivo e valore per il giocatore.** Ogni carta fa **esattamente** ciò che è stampato; nessun effetto "muto".

**Ambito.** Le 44 Unità parziali, mazzo Domini, Rovina, Decadenza, Comandanti, estrazione moduli. File: `src/card-effects.js`, `src/tactics.js`, `src/unit-triggers.js`, `src/permanent-effects.js`, `src/commanders.js`, `game.js`, nuovi test per-carta.

**Dipendenze.** **P0 obbligatoria**: senza harness non si possono scrivere test degli effetti.

**Attività.**
1. **G1** — audit tabellare delle 44 Unità: `ID · nome · testo canonico · effetto richiesto · stato · motivazione verificabile · ambiguità`. Output documentale: **non altera il catalogo**.
2. **G1** — implementare gli effetti secondo il perimetro approvato (D1), **1 test per effetto**.
3. **G9** — **composizione del Mazzo Esercito** (nuovo §2): il mazzo di default deve contenere Unità **e** Tattiche **e** Equipaggiamenti. Estendere `makeDeck` e `deck-validation.js` per riflettere la composizione; mazzo demo bilanciato.
4. **G10** — **Mulligan parziale** (nuovo §4): UI carta-per-carta (selezione multipla) + rimescolo in fondo e pesca di pari numero. Test deterministico.
5. **G11** — **tie-break sconfitta contemporanea** (nuovo §7): in `checkVictory`, se entrambi i Comandanti sono a 0 PC nello stesso istante, vince `GameState.current`.
6. **G12** — **Equipaggiamento allo scarto** (nuovo §7): in `removeUnit` estrarre `unit.equipment` e spingerlo nello scarto del proprietario come carta separata, prima di scartare/esiliare l'Unità.
7. **G13** — **ordine FIFO** (nuovo §7): definire e implementare l'ordine di risoluzione degli inneschi simultanei (FIFO o priorità al giocatore di turno) + test.
8. **G14** — **Dominio Totale della Mappa** (nuovo §1.3): in `beginTurn`, se il giocatore di turno ha una Linea attiva in tutti e 3 i Fronti e l'avversario non ha Unità su alcun Fronte, vittoria immediata. + test.
9. **G15** — **Dominio esausto al primo turno** (nuovo §5): il Dominio pescato dal primo giocatore al Turno 1 entra `tapped: true` (o resta in mano). + test.
10. **G16** — **Ritirata e Rimpiazzo** + **Purga dei Parassiti** (nuovo §6.2): due nuove azioni di Fase Principale con costo in Domini attivi e UI dedicata. + test.
11. **G2** — **mazzo Domini**: le 20 carte canoniche non sono in `Set.txt`/`cards.json`. Se non esistono, **non inventarle**: documentare il placeholder e marcare le carte Dominio come "non disponibili nella fonte" (D3).
12. **G4** — Comandanti: provvisorio marcato oppure roster canonico (D5).
13. **D1** — estrazione incrementale di `GameState`/`CombatResolver` in moduli (solo spostamento + re-export) se approvata (D6).
14. **N1** — sostituire l'etichetta dichiarativa con verifica eseguibile (estendere `card-effect-coverage.mjs`).

**Criteri di accettazione misurabili.**
- audit **44/44** chiuso con motivazione; 0 voci "da verificare";
- `npm run cards:coverage` riporta **0 "Parziale"** (o un numero approvato con elenco motivato);
- **ogni effetto implementato ha ≥ 1 test**;
- **G9–G16 verdi**: 1 test ciascuno che fallisce se la regola si rompe;
- nessuna modifica a `Set.txt`/`cards.json` (hash invariati);
- se lo schema di salvataggio cambia: `SAVE_VERSION` incrementata **con** migrazione testata.

**Test / verifiche manuali / regressioni.** Automatici: test per-carta, invarianti, suite P0. Manuali: per ogni carta implementata, partita guidata con riscontro della tabella di audit.

**Rischi, decisioni, completamento.**
- *Rischio:* il costo reale è **decisionale** (testi ambigui), non di codice. *Mitigazione:* criterio di interpretazione approvato (D2) + registro delle decisioni.
- *Rischio:* implementare effetti dipendenti da Domini (G2) o dalla composizione del mazzo (G9) prima di averli definiti genera rework. *Mitigazione:* sequenziare G2/G9 **prima** degli effetti che li usano.
- **Completato quando** l'audit è chiuso e la copertura dichiarata coincide con quella testata.

---

### **P2 — Esperienza di gioco, avversario, deck building** `[L]`

**Obiettivo e valore per il giocatore.** Un avversario credibile e riproducibile, un deck builder che guida, un ingresso comprensibile.

**Ambito.** IA, deck builder, validazione, onboarding, mazzi demo. File: `game.js` (IA/`GameController`), `src/deck-builder.js`, `src/deck-validation.js`, `index.html`, `src/main.js`.

**Dipendenze.** P0 (determinismo) e P1 (l'IA non può usare effetti non implementati).

**Attività.**
1. **G6** — policy IA **esplicita e deterministica**: ordine di priorità, tie-break sul seed; test che a parità di seed ripetono la partita identica.
2. **G6** — test di non-degenerazione: nessun loop, nessuna mossa illegale, nessun turno perso con risorse disponibili.
3. **G7** — deck builder: ricerca **debounced**, avviso esplicito su carte non giocabili, feedback su carte rimosse dal catalogo. Limite copie solo se specificato (D8).
4. **G8** — onboarding contestuale a fasi e 11 keyword, da tastiera, richiudibile.
5. **G8** — export/import del salvataggio se approvato (D9).
6. Bilanciamento dei mazzi demo (oggi 40 Unità casuali non bilanciate).
7. **G17** — **Finestra di Reazione** (nuovo §6.3): pannello di reazione durante lo Scontro in cui entrambi i giocatori, a partire dal giocatore di turno, possono giocare Tattiche Istantanee; l'IA deve poter reagire deterministicamente. Dipende da P0 (combattimento testabile) e da G16.

**Criteri di accettazione misurabili.** ≥ 8 test deterministici IA; 0 mosse illegali su 100 partite automatiche; 0 partite oltre un tetto di turni; onboarding completabile **solo da tastiera**; **finestra di Reazione** presente e testata (umano + IA).

**Rischi, decisioni.** *Rischio:* un'IA "intelligente" è un progetto aperto → obiettivo **credibile e riproducibile**, non ottimale. *Rischio:* la Finestra di Reazione rende il combattimento asincrono e interattivo → progettare con lo stesso pattern a Promise dei prompt esistenti. *Decisioni:* D8, D9, D10 (politica IA), D18 (ambito Reazione).

---

### **P3 — UX, accessibilità e presentazione** `[M]`

**Obiettivo e valore per il giocatore.** Leggibile, guidato e usabile su desktop e tablet, anche da tastiera.

**Ambito.** `styles.css`, `index.html`, `src/main.js`, `src/settings.js`, feedback in `game.js`.

**Dipendenze.** P0 (nucleo testato); P1 per il feedback delle keyword realmente eseguibili.

**Attività.**
1. **D2** — breakpoint tablet (761–1100 px) e sostituzione di `.fronte { width: 220px }` con layout fluido (`grid` + `min()`/`clamp()`); eliminazione dello scroll orizzontale.
2. **Accessibilità** — focus trap nei pannelli (`#tactic-panel`, `#promotion-panel`, `#torment-panel`, `#sacrifice-panel`), ordine di tabulazione, scorciatoie documentate in pagina. Già presenti `:focus-visible`, `aria-live`, `role`, `aria-labelledby`, `prefers-reduced-motion`: **estendere, non introdurre**.
3. **Feedback di stato** — evidenziazione bersagli legali, anteprima Forze prima della conferma, `aria-live` sul log di combattimento, errori non bloccanti.
4. **Presentazione audio/visiva** — opzioni audio complete (volume, mute persistito) su `FX`; coerenza pixel-art; fallback `prefers-reduced-motion`.
5. **N2** — correggere le affermazioni non verificate nella documentazione.

**Criteri di accettazione misurabili.** 0 scroll orizzontale a 768×1024, 1024×768, 1280×800, 1920×1080; contrasto ≥ AA (4.5:1); ogni azione raggiungibile da tastiera con focus visibile; 0 animazioni non essenziali con `prefers-reduced-motion`; 0 errori in console su un flusso completo.

**Rischi, decisioni.** *Rischio:* modificare `styles.css` degrada il desktop → approccio additivo + verifica a 4 risoluzioni. *Decisioni:* D11 (risoluzioni/browser), D12 (ambito audio).

---

### **P4 — Prestazioni, compatibilità, release** `[S/M]`

**Obiettivo e valore per il giocatore.** Avvio rapido, nessuna rottura tra browser, pubblicazione ripetibile.

**Ambito.** Prestazioni, compatibilità, build, QA, documentazione. File: `src/card-library.js`, `src/deck-builder.js`, `vite.config.js`, `README.md`, `CODE_WIKI.md`.

**Dipendenze.** P0–P3 complete.

**Attività.** **D3** debounce e rendering incrementale; budget bundle misurato; matrice browser + feature detection; `localStorage` indisponibile/quota piena; build riproducibile da installazione pulita; checklist QA archiviata; documentazione allineata ai risultati **verificati**. **G18** (nuovo §8) — **Multiplayer 2 vs 2**: valutazione di fattibilità (fronti condivisi, turni per squadra, PC/Follia condivisi) come **epica separata**, da affrontare solo dopo il consolidamento dell'1 vs 1; nessun impegno in questa roadmap se non esplicitamente approvato (D19).

**Criteri di accettazione misurabili.** ricerca senza re-render completo per tasto (strumentata); `npm test` + `npm run build` verdi da `node_modules` reinstallato; checklist QA con **0 difetti bloccanti**; documentazione senza affermazioni non verificate.

---

## 4. Processo di lavoro, strategia di test e gate

### 4.1 Flusso iterativo (per ogni iterazione)
1. **Delimita** l'ambito a un insieme coerente (una funzionalità o un lotto di carte), mai a "tutta la fase".
2. **Leggi prima l'esistente** e riusa i pattern presenti (tabelle dichiarative di `unit-triggers.js`, set di ID di `card-effects.js`, prompt basati su Promise).
3. **Nessuna riscrittura non necessaria.** Divieto assoluto di toccare `Set.txt` e i dati canonici di `cards.json`.
4. **Test di regressione insieme al codice**: ogni modifica arriva con il test che la fissa.
5. **Esegui** `npm test`, `npm run cards:coverage`, `npm run build` (quando si tocca codice di produzione), script di invarianti.
6. **Aggiorna la documentazione collegata solo dopo aver verificato i risultati.**
7. **Riporta**: file modificati, verifiche eseguite con esito, criteri toccati, problemi rimasti.
8. **Non dichiarare completata una funzione se i criteri di accettazione non sono soddisfatti.** "Sembra funzionare" non è un criterio.

### 4.2 Piramide di test

| Livello | Stato attuale |
|---|---|
| Moduli puri `src/` — 94 test | ✅ presente, da estendere a ogni nuovo effetto |
| **Engine** (turni/fasi/combattimento/vittoria) | ❌ **assente** → obiettivo P0 |
| Integrazione UI/engine (pannelli, prompt, restore) | ❌ assente → P0/P3 |
| Invarianti di catalogo | ⚠️ solo conteggio, non verifica |
| QA manuale in browser | ❌ da formalizzare → P4 |

### 4.3 Gate di rilascio (bloccanti)
- **Gate P0:** `game.js` importato da un test; ≥ 40 test engine; determinismo; migrazione salvataggi testata; 94 test storici verdi; hash catalogo invariati.
- **Gate P1:** audit 44/44; copertura dichiarata == testata; 0 "Parziale" non approvati; mazzo Domini chiarito senza inventare dati; **G9–G16 verdi** (Mazzo Esercito, Mulligan, sconfitta contemporanea, equipaggiamento allo scarto, FIFO, Dominio Totale, Dominio esausto, nuove azioni).
- **Gate P2:** IA deterministica (≥ 8 test, 100 partite senza mosse illegali); onboarding da tastiera; **Finestra di Reazione** (G17) presente e testata.
- **Gate P3:** 4 risoluzioni senza scroll orizzontale; contrasto ≥ AA; percorso da tastiera; 0 errori console.
- **Gate P4:** build da installazione pulita; checklist QA senza difetti bloccanti; documentazione verificata; **(G18) multiplayer 2 vs 2 esplicitamente fuori ambito o pianificato come epica separata**.

### 4.4 Definizione oggettiva di "pubblicabile"
1. Esiste un test che fallisce se si rompe ciascun percorso di nucleo.
2. Il determinismo è riproducibile da seed in test automatici.
3. Nessun effetto "muto": ogni carta è implementata **oppure** marcata come non eseguibile con motivazione e avviso all'utente.
4. I salvataggi sopravvivono a un aggiornamento dello schema.
5. Desktop **e** tablet usabili senza scroll orizzontale; percorso completo da tastiera; contrasto ≥ AA.
6. Build riproducibile + QA manuale senza difetti bloccanti.
7. Documentazione allineata ai risultati verificati.

> **"Tripla A" non è un criterio di questa roadmap e non viene rivendicato.** I sette punti sopra sono l'unica definizione di qualità usata.

---

## 5. Decisioni che richiedono approvazione

Assunzioni che applicherò **senza attendere**, perché conservative ed esplicitamente reversibili:

| ID | Assunzione di default | Reversibilità |
|---|---|---|
| **A1** | Inizializzo Git con commit dello stato attuale (R1) | `rimuovere .git` ripristina lo stato |
| **A2** | Aggiungo `with { type: 'json' }` ai 3 import incoerenti | una riga per file |
| **A3** | Mantengo il comportamento attuale di R4/R5 e lo **documento** all'utente | nessuna modifica di codice |
| **A4** | Non eseguo `npm run cards:import` (rigenererebbe `cards.json`) | nessuna |
| **A5** | Deck builder senza limite copie (il regolamento non ne specifica) | flag |

Decisioni che invece **richiedono la tua scelta** perché cambiano ambito, costo o fedeltà al regolamento:

| ID | Decisione | Opzioni | Default se non rispondi |
|---|---|---|---|
| **D1** | Perimetro delle **44 Unità "Parziale"** | (a) tutte; (b) lotto prioritario + resto marcato; (c) congelare | **(b)**: lotto prioritario definito dall'audit, resto marcato "Parziale · non eseguibile" e avvisato nel deck builder |
| **D2** | **Ambiguità dei testi carta** | (a) criterio di interpretazione scritto e applicato da me; (b) decisione caso per caso; (c) interpretazione libera marcata | **(a)**, con ogni caso registrato come `[DECISIONE]` |
| **D3** | **Mazzo Domini**: le 20 carte canoniche non sono in `Set.txt`/`cards.json` | (a) resta placeholder documentato; (b) fornisci tu il materiale canonico | **(a)**: nessun dato inventato, nota esplicita di divergenza |
| **D4** | ~~**Rovina**~~ | **Chiusa (REV3)**: il nuovo §6 la definisce *site-scoped* ed è già implementata | — |
| **D13** | **Composizione Mazzo Esercito** (§2: Unità + Tattiche + Equipaggiamenti) | (a) mazzo demo bilanciato con le 3 categorie; (b) solo se fornisci una lista canonica | **(a)**: mazzo demo con mix equilibrato, composizione **non** vincolata nel validatore (nessun limite di copie nella fonte) |
| **D14** | **Mulligan parziale**: la UI assume 5 carte | (a) selezione multipla e rimescolo delle sole carte scelte, pescando pari numero; (b) resta totale | **(a)** |
| **D15** | **Sconfitta contemporanea** (§7) | (a) vince il giocatore di turno; (b) caso mai raggiungibile, lasciare com'è | **(a)** |
| **D16** | **Equipaggiamento allo scarto** (§7) | (a) estrazione della carta Equipaggiamento nello scarto del proprietario; (b) resta annidato | **(a)** |
| **D17** | **Inneschi contemporanei** (§7) | (a) coda FIFO sull'ordine di gioca; (b) priorità al giocatore di turno | **(a) FIFO**, con fallback al giocatore di turno a parità |
| **D18** | **Finestra di Reazione** (§6.3) | (a) pannello reattivo in Scontro con pattern a Promise, IA deterministica; (b) rimandare | **(a)**, solo dopo G16 e con P0 |
| **D19** | **Multiplayer 2 vs 2** (§8) | (a) epica separata post-rilascio; (b) in ambito ora | **(a)**: fuori roadmap finché l'1 vs 1 non è consolidato |
| **D5** | **Comandanti** | (a) provvisorio marcato; (b) roster canonico | **(a)** |
| **D6** | **Refactor del monolite** | (a) estrazione incrementale in moduli; (b) solo adapter test, nessuna estrazione | **(b)**, perché "evita riscritture non necessarie" |
| **D7** | **Git** | (a) procedo; (b) no | **(a)** |
| **D8** | Limite di copie nel mazzo | (a) nessuno; (b) da fonte canonica | **(a)** |
| **D9** | Export/import del salvataggio | (a) sì; (b) no | **(b)** |
| **D10** | Politica IA | (a) deterministica e riproducibile; (b) euristica "forte" | **(a)** |
| **D11** | Matrice browser/risoluzioni | (a) Chromium+Firefox+WebKit, min 768×1024; (b) solo Chromium desktop | **(a)** |
| **D12** | Ambito audio | (a) volume + mute persistito + fallback; (b) solo mute | **(a)** |

---

## 6. Prima fase consigliata e motivazione

### **P0 — Correttezza misurabile del nucleo**

1. **Blocco strutturale dimostrato.** `game.js` non è importabile da `node --test` (import JSON senza attributo, [riga 1](file:///c:/Users/alessio/Desktop/Primal%20Ruin/game.js#L1)) e nessun test tocca l'engine. Le ~30 regole risultate conformi in §1.3 sono verificate **solo per lettura di codice**: nessuna è protetta da un test.
2. **Costo basso, ritorno alto.** L'abilitatore è minimo (3 attributi di import + harness con stub + factory sul seed già disponibile in `random.js`), il ritorno è la copertura dell'intero nucleo.
3. **Irreversibilità.** Non esiste controllo di versione. Prima di toccare il monolite o le regole serve un punto di ripristino: è un `XS` con impatto `XL` sul rischio.
4. **Dipendenze a valle.** La composizione del Mazzo Esercito (G9), il mazzo Domini (G2) e l'export salvataggi (G8) toccano lo schema di persistenza: la catena di migrazione va costruita **prima**, altrimenti ogni estensione invalida le partite salvate (R3).
5. **Gate binario.** "Esiste un test che importa l'engine e fallisce se il combattimento si rompe" è misurabile e non soggettivo.

**Prima iterazione concreta (ambito minimo, reversibile):**
1. Git init + `.gitignore` + commit dello stato attuale.
2. `with { type: 'json' }` sui 3 import; verificare `npm test` a 94/94.
3. Creare l'harness headless e **un solo** test che importa `game.js`, crea una partita da seed noto e ne verifica lo stato iniziale.
4. Eseguire `npm test` e `npm run build` e riportare i risultati reali.

Solo dopo: estensione della copertura engine e catena di migrazione.

---

### Appendice — Comandi di verifica

```powershell
npm test                  # 94 pass / 0 fail (verificato)
npm run cards:coverage    # unit: … Parziale 44 ; tactic 68 ; equipment 28 ; site 70 ; field 26 (verificato)
npm run build             # verifica build di produzione
```

> `npm run cards:import` **non va eseguito**: rigenera `src/data/cards.json` da `Set.txt`. Il catalogo è dato canonico immutabile.
