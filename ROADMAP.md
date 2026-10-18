# Primal Ruin — Percorso della fase successiva

Questo è il percorso da seguire adesso. Le due roadmap in `.trae/documents/` sono state ripristinate e restano il registro delle decisioni già prese: fasi P0–P4, divergenze DV, condizioni per dire «pubblicabile». I numeri scritti lì (94 test, niente Git, `Set.txt`, `game.js` da circa 3000 righe) sono lo stato del giorno in cui quei file sono stati scritti.

Fonti, in quest’ordine: `Regolamento Ufficiale Avanzato Primal Ruin.txt`, i file in `sets/`, la carta interessata in `src/data/cards.json`, `DialogoAi.md`, poi il modulo che quella regola già implementa. Non si inventano carte, valori o regole.

Verifica di partenza, ripetuta il 18 ottobre 2026 dopo `npm ci`:

| Comando | Risultato |
|---|---|
| `npm test` | 210 test, 209 pass, 0 fail, 1 todo |
| `npm run lint` | ok |
| `npm run build` | ok (bundle circa 312 kB, 60 kB gzip) |
| `npm run test:e2e` | 5 passati, solo Chromium |
| `npm run cards:coverage` | Unità: 6 base, 47 keyword, 89 implementate, 90 parziali. Tattiche: 60 implementate, 26 non eseguibili. Equipaggiamenti: 32 implementati, 8 parziali. Siti: 54 implementati, 33 parziali. Campi: 24 implementati, 8 parziali. Comandanti: 3 non eseguibili |

## Dove siamo

La fase P0 della roadmap di produzione è chiusa.

- Il progetto è sotto Git. Ci sono ESLint, Prettier e Playwright.
- Il motore è in `src/engine/`. `game.js` riesporta solo `GameController` e `GameState`.
- I test importano l’engine. Il Mulligan parziale, il mazzo demo da 22/12/4/1/1, il Dominio esausto al primo turno e la sconfitta simultanea hanno già un test verde.
- Il catalogo ha i quattro set, 480 carte. La fonte è `sets/`, non un `Set.txt`.

La fase successiva è P1: una partita 1 contro 1 che non mente sulle regole già aperte dai test.

## Cosa conta come successo

P1 è riuscita quando tutte queste cose sono vere, e si possono rifare con un comando:

1. I 13 `test.todo` elencati sotto sono diventati test normali e verdi. Il quattordicesimo, la Guerra a Squadre, resta `todo`.
2. `npm test` ha 0 fail. I 190 test che già passano restano verdi.
3. `npm run lint`, `npm run build` e `npm run test:e2e` restano verdi.
4. Nessuna carta nuova è stata inventata. `src/data/cards.json` cambia solo se cambia un file in `sets/` e si rilancia `npm run cards:import`.
5. Una partita demo si gioca dall’inizio alla fine senza un errore in console.

Non fa parte di questo successo: pubblicare, il 2 contro 2, un account, il multiplayer online, la campagna, le illustrazioni definitive.

## P1 — la partita fedele

Si chiude un buco alla volta. Il test che lo descrive esiste già: prima lo si fa fallire togliendo `todo`, poi si corregge il minimo di codice che lo fa passare.

### A. Regole di nucleo

Sono i `todo` di `tests/core-rules.test.js` e `tests/game-engine-flow.test.js`.

1. Cap dei Supporti a +3 anche quando il calcolo della Forza non riceve il tetto dal chiamante. Fatto: il default di `calculateUnitCombatStrength` è 3.
2. Dominio Totale della Mappa solo all’inizio del proprio turno, non in Fase Principale. Fatto: scatta in Fase di Rifornimento.
3. Fronte Scoperto solo quando manca la Linea del difensore. Fatto: senza Linea attaccante lo scontro su quel Fronte non infligge danni.
4. L’Equipaggiamento di un’Unità distrutta va negli scarti come carta a sé. Fatto: viene staccato quando l’Unità lascia il campo, anche se l’Unità viene esiliata.
5. Ritirata e Rimpiazzo: azione vera, non solo un nome. Fatto: in Fase Principale, 1 Dominio attivo scarta un tuo Supporto e libera lo slot.
6. Purga dei Parassiti pagata con 2 Domini. Fatto: in Fase Principale, 2 Domini attivi tolgono 1 Parassita dal tuo Comandante. La rimozione automatica a inizio turno resta un’altra regola.
7. Finestra di reazione: le Tattiche Istantanee durante lo Scontro, un Fronte alla volta. Fatto: «Reazione» è la finestra, non un tipo di carta. L’Istantanea cambia il Fronte e si gioca in Fase Principale o nella finestra. La Standard si gioca solo in Fase Principale.
8. Un salvataggio di versione precedente viene migrato, non buttato (`DV-7bis`). Fatto: una busta valida più vecchia della versione 3 viene riletta e riscritta come versione 3.

### B. Effetti già nominati

Sono i `todo` di `tests/effect-families.test.js` e `tests/effect-groups.test.js`. Un id alla volta, con il testo della carta in `sets/` davanti.

- `set-2-108` — lo spostamento del Supporto avversario guarda il giocatore giusto. Fatto: quel testo è del Cacciatore Yautja (`set-3-004`). Il Mausoleo Reale Spettrale rimette in mano un’Unità con Eco Spettrale. Gli Equipaggiamenti `set-2-079`–`set-2-090` usano il testo stampato. La Ncrospira Oscura sacrifica un Supporto e dà +2 Forza alla Linea per questo turno.
- `set-3-099` — il Sito, non il Campo, concede la Linea da Sorvolo. Fatto: è la Città dell’Invasione (`set-3-107`). La Cattedrale della Mente Suprema dà +1 Forza alle Unità con Mente Collettiva.
- `set-3-100` — lo spostamento dell’altra Linea avversaria guarda il giocatore giusto. Fatto: è la Spira della Dominazione (`set-3-108`). Il Vortice Stellare sposta una Linea avversaria all’inizio del turno.
- `set-3-101` — il bonus di Forza vale quando la carta è in gioco come Sito. Fatto: è l’Abisso della Collettività (`set-3-109`). Il Santuario del Parassita fa perdere 1 PC a chi riceve un Parassita.
- `set-3-119` — il Campo entra nel controllo di schieramento della Posizione Difensiva. Fatto: è il Velo della Conquista (`set-3-118`). L’Era dell’Invasione Totale, se hai un’Unità in ogni Fronte, infligge 1 danno al Comandante avversario all’inizio del turno.

### C. Il resto della copertura, a fette

Dopo A e B. Stesso metodo: testo della carta, effetto esplicito, test. Niente traduzione automatica del testo libero.

1. Equipaggiamenti dell’Invasione Silente e Campi 112-117 sull’id stampato. Fatto: Artigli, Carapace, Occhio, Lama, Amplificatore, Ali, Catene e Corona sono `set-3-081`–`set-3-088`. Dominio della Collettività, Cielo dell’Invasione, Regno delle Spore, Tempesta Psionica, Campo di Distorsione e Sovraccarico Sinaptico sono `set-3-112`–`set-3-117`. La Fenditura Dimensionale è `set-3-093`. L’Era resta `set-3-119`: `set-3-120` è il Comandante e non fa quel danno. Aprendo `index`, mano e comandi sono in alto e il mazzo iniziale è questa parte. Il mazzo demo resta 22/12/4/1/1.
2. Siti ancora parziali, a cominciare da quelli il cui effetto è già nel motore su un id diverso dal testo. Non si sposta un effetto se il testo non coincide.
3. Campi rimasti, poi il set 4 (equipaggiamenti, siti, campi).
4. Unità parziali, prima quelle il cui testo è una keyword che il motore conosce già.
5. Le 26 Tattiche non eseguibili, tutte del set 4: o l’effetto è implementato e testato, o restano marcate «Non eseguibile» nell’archivio. Non si finge che funzionino.

Residui voluti, finché non c’è un testo che coincide: `set-3-093` toglie ancora PC quando arriva un Parassita, ma la carta stampata è la Fenditura Dimensionale; lo stesso spostamento di Forza da Sorvolo è ancora sul Sito `set-3-085`. `set-3-120` è il Comandante Xylar e, se messo in campo come Campo, esegue ancora il danno dell’Era. Il Sovraccarico Sinaptico (`set-3-117`) non ha ancora il proprio testo.

I Comandanti nel catalogo sono 3 e risultano non eseguibili. Il roster in `src/commanders.js` è ancora provvisorio. Si sostituisce solo quando c’è un elenco ufficiale, non prima.

I Domini di gioco sono ancora 20 segnalini. In `sets/` non ci sono carte Dominio. Restano segnalini finché non arriva una fonte. Non si inventano 20 carte.

La Guerra a Squadre (§8, 4 giocatori) ha un `todo` e resta fuori da P1. Il 1 contro 1 viene prima. È la stessa scelta già scritta nella roadmap di produzione.

## Percorso performativo

Ogni passo deve restare veloce e dimostrabile. Non si riscrive l’engine per «andare più forte».

Già misurato e già fatto:

- la pixel art generata viene riusata;
- archivio e deck builder preparano una volta il testo di ricerca e l’etichetta del motore.

Prima di un’altra ottimizzazione si annota un numero: durata di `npm test`, tempo per filtrare l’archivio, peso del bundle. Il primo candidato, se quel numero è alto, è il deck builder: a ogni filtro ricostruisce ancora l’intera lista di nodi. Si cambia solo quel punto, e si ricontrolla che i 5 test e2e passino.

Il bundle di oggi, circa 312 kB e 60 kB gzip, non è un problema da risolvere in P1.

## Dopo P1

L’ordine resta quello della roadmap di produzione.

- **P2.** Avversario più leggibile e onboarding: una pratica contro l’IA e un primo avvio che spiega il tavolo. L’IA di oggi resta quella essenziale finché P1 non è chiusa.
- **P3.** Tavolo comodo su desktop, da mouse e da tastiera. Il telefono ha già un controllo e2e; non è il bersaglio di P1.
- **P4.** Build da una installazione pulita, una partita intera provata a mano, documenti allineati ai comandi appena eseguiti.

Le sette condizioni per chiamare il gioco pubblicabile restano il §3 di `.trae/documents/primal-ruin-roadmap-produzione.md`. P1 lavora sulla prima (un test per ogni percorso di nucleo), sulla terza (niente effetto muto) e sulla quarta (salvataggi che sopravvivono a un cambio di versione).

## Come si lavora in P1

- Una modifica piccola, nel modulo che già possiede quella regola.
- Il test del buco viene scritto o promosso prima del fix.
- Si chiedono conferma prima di cambiare architettura, schema delle carte o una regola ambigua.
- Niente dipendenze nuove, niente deploy, niente riscrittura di un file intero.
