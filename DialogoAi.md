# PRIMAL RUIN — Guida per le AI

Questo documento fornisce il contesto necessario a un assistente AI per comprendere, modificare e far evolvere il progetto. Leggilo prima di intervenire sul codice e verifica sempre lo stato attuale dei file: il codice e i dati del progetto sono la fonte di verità per l'implementazione.

## Visione del progetto

Primal Ruin è un gioco di carte strategico per due giocatori, con ambientazione fantasy/preistorica e un'interfaccia ispirata alla pixel art. Il progetto contiene un prototipo web giocabile, realizzato con HTML, CSS e JavaScript e servito/buildato con Vite.

Obiettivi di sviluppo:

- trasformare il prototipo in una versione fedele e coerente con il regolamento Core 1.0;
- usare i tre set esistenti come fonte del catalogo e delle future carte giocabili;
- mantenere i dati delle carte separati dalla logica di gioco;
- implementare le funzionalità in modo incrementale e verificabile;
- non dichiarare completa una regola finché non è implementata e testata.

## Regolamento Core 1.0

### Vittoria

Un giocatore perde se il suo Comandante raggiunge 0 Punti Comando (PC) oppure se raggiunge 10 segnalini Follia. Follia non può scendere sotto 0 e ha un massimo di 10.

### Componenti

Ogni giocatore ha un Comandante, un mazzo Esercito da 40 carte, un mazzo Domini separato da 20 carte e i segnalini previsti dal gioco.

### Campo e Fronti

- Ogni giocatore può controllare un Campo (che conta come Sito) e fino a 3 Siti in totale.
- I tre Fronti sono Sinistra, Centro e Destra.
- Ogni Fronte ha una posizione Linea e due posizioni Supporto; massimo 3 Unità per Fronte.
- Solo la Forza della Linea è conteggiata direttamente. Ogni Supporto fornisce normalmente +1 Forza alla Linea, fino a +2 complessivi, salvo modifiche specifiche delle carte.

### Preparazione e turni

- Ogni giocatore pesca 5 carte Esercito e può effettuare un solo Mulligan.
- Ogni giocatore inizia con 2 Domini attivi.
- Nel proprio Rifornimento, il giocatore risolve le abilità di Rifornimento, può Canalizzare, riattiva i Domini, pesca 1 Dominio e pesca 1 carta Esercito, salvo il primo turno del primo giocatore.
- La Fase Principale consente di giocare carte e attivare abilità.
- Lo Scontro risolve i Fronti da Sinistra a Destra.
- Nella Fase Finale si scarta fino a 7 carte; Echo e gli effetti temporanei scadono.

### Scontro

- Se una Forza è superiore, la differenza determina i danni al Comandante avversario.
- In parità, entrambe le Linee subiscono 1 danno.
- Se perdi, la tua Linea subisce danno pari alla differenza. Se viene distrutta, un Supporto diventa la nuova Linea e il danno in eccesso continua su di essa.
- Se non hai una Linea, il Fronte è scoperto e l'avversario infligge danno pieno al tuo Comandante.
- Dopo aver calcolato il danno al Comandante, il difensore può sacrificare Unità nello stesso Fronte: ogni Forza sacrificata previene 1 danno.

### Follia ed Echo

Durante il Rifornimento, il giocatore può convertire qualsiasi quantità di Follia in Echo, in rapporto 1:1. Echo è temporaneo e viene rimosso alla fine del turno; serve per pagare Ascensione.

### Keyword ufficiali

- **Ferocia**: +1 Forza durante lo Scontro se controlli meno Unità dell'avversario.
- **Assalto**: permette di entrare in Linea nel turno in cui l'Unità entra in gioco.
- **Sorvolo**: quando l'Unità viene assegnata allo Scontro, può spostarsi in un Fronte adiacente; se lo fa, entra in Supporto.
- **Mente Collettiva**: +1 Forza per ogni altra Unità con la stessa keyword nel Fronte, fino a +3.
- **Posizione Difensiva**: l'Unità deve entrare in Linea se possibile.
- **Logorare (X)**: quando questa Unità è in Linea durante lo Scontro, la Linea avversaria nello stesso Fronte perde X Forza fino alla fine dello Scontro.
- **Eco Spettrale**: può essere giocata dagli scarti pagando 1 Dominio aggiuntivo; se lascia il gioco, viene esiliata.
- **Tormento (X)**: quando vinci un Fronte con questa Unità in Linea, puoi sostituire il danno al Comandante con X Follia.
- **Ascensione (X)**: per giocare la carta si pagano il costo in Domini e X Echo nello stesso turno.
- **Divinità**: non può essere bersaglio di Tattiche avversarie né distrutta da effetti; può subire danno in Scontro e viene Sigillata a 0 Forza.
- **Infiltrazione (X)**: assegna X Parassiti al Comandante avversario. All'inizio del turno del controllore dei Parassiti, il Comandante perde 1 PC; se ha almeno 3 Parassiti, ne rimuove uno.

Se una carta contraddice una regola generale, prevale il testo della carta. Gli effetti si risolvono nell'ordine in cui vengono giocati.

## Stato attuale del prototipo

Il prototipo implementa una parte del flusso di partita: preparazione, mano iniziale, Mulligan, Domini, turni, fasi, schieramento di Unità, combattimento e alcune keyword. Include un avversario automatico essenziale.

La schermata comprende l'archivio consultabile, un deck builder da 40 carte senza limite copie inventato, impostazioni per audio/velocità animazioni, scorciatoie di base e un salvataggio automatico locale. Il PRNG è ripristinabile tramite il salvataggio. I mazzi personalizzati e lo stato partita risiedono nel browser corrente.

**Non considerare il prototipo una simulazione completa del Core 1.0.** Prima di lavorare su una regola, controlla il codice e i test attuali. In particolare:

- tutte le 68 Tattiche sono giocabili (62 risolutori registrati e 6 effetti immediati), incluse le otto aggiunte: `set-1-074`, `set-2-059`, `set-2-070`, `set-2-074`, `set-2-075`, `set-2-078`, `set-3-072`, `set-3-075`. Tutti i 28 Equipaggiamenti, 70 Siti e 26 Campi sono registrati come implementati; il test dell'audit confronta gli ID registrati con il catalogo. Alcune scelte facoltative dei permanenti sono risolte automaticamente in modo deterministico anziché presentate come prompt interattivo;
- 88 effetti di Unità sono registrati, includendo passivi e trigger di ingresso/distruzione/Sorvolo verificati con test mirati. L'audit marca ancora 44 Unità con abilità testuali non completamente implementate come parziali; non dichiarare completata la categoria Unità;
- le abilità individuali scritte come testo libero non sono automaticamente eseguibili; l'archivio mostra se una carta è base, parzialmente supportata o non eseguibile;
- per il Portale Silente (`set-3-097`), il testo non specifica dove spostare il Supporto avversario: il prototipo offre uno slot Supporto libero in un Fronte adiacente, come interpretazione temporanea da confermare;
- Tormento presenta al giocatore la scelta tra Follia e danno al Comandante; l'avversario automatico sceglie deterministicamente l'esito con il maggiore progresso relativo verso la vittoria;
- il deck builder verifica 40 carte ma non applica limiti alle copie, perché non sono specificati nel Core 1.0; include carte non ancora giocabili e ne avvisa il giocatore;
- in assenza di un mazzo personalizzato la partita demo usa 40 Unità casuali, non una decklist ufficiale o bilanciata;
- il salvataggio è locale, non sincronizzato né esportabile, e la copertura di recupero va ancora verificata per tutte le finestre d'interazione;
- l'avversario automatico resta basilare e le regole di combattimento non hanno ancora copertura completa di test;
- interazioni e regole non verificate devono essere presentate come incomplete, non come già funzionanti.

## Dati dei tre set

La fonte originale dei set è `Set.txt`. Il catalogo normalizzato è `src/data/cards.json`; contiene 360 carte, con ID univoci nel formato `set-NNN` (ad esempio `set-1-001`). I tre set sono:

1. **Furia Giurassica**
2. **Risveglio Infernale**
3. **Invasione Silente**

Ogni record del catalogo contiene, ove disponibile, set, numero, nome, categoria, rarità, costo, Forza, tipo, costo Equipaggiamento, Decadenza, testo originale delle regole e riga sorgente. `null` indica un dato non presente o non deducibile dalla fonte; non inventare valori mancanti. Alcune carte non hanno una rarità indicata: non assegnarne una per supposizione.

`src/data/cards.json` è generato e non dovrebbe essere modificato manualmente. Dopo aver modificato `Set.txt`, rigeneralo e convalidalo con:

```powershell
npm run cards:import
```

Non convertire automaticamente il testo delle abilità in effetti del motore con corrispondenze fragili. Prima estrai e valida la struttura; poi implementa effetti espliciti e testabili.

## Struttura del progetto

- `index.html` — struttura della schermata, selezione dei set e filtri dell'archivio.
- `styles.css` — layout, stile visivo e adattamento agli schermi più piccoli.
- `game.js` — stato della partita, logica di turno, schieramento e combattimento.
- `src/main.js` — avvio dell'interfaccia e registrazione degli eventi.
- `src/card-library.js` — ricerca, filtri e rendering dell'archivio.
- `src/card-effects.js` — classificazione del supporto effettivo delle carte.
- `src/deck-builder.js` — selezione e validazione mazzi da 40 carte.
- `src/deck-validation.js` — regole pure di validazione del deck.
- `src/game-rules.js` — funzioni deterministiche di Forza e confronto dei Fronti.
- `src/random.js` — PRNG seedabile e ripristinabile.
- `src/pixel-art.js` — illustrazioni Canvas procedurali provvisorie per le carte.
- `src/settings.js` — impostazioni locali di audio e animazioni.
- `src/save-store.js` — lettura, scrittura e validazione dei salvataggi.
- `src/data/cards.json` — catalogo generato delle carte.
- `scripts/import-cards.mjs` — importazione e validazione di `Set.txt`.
- `scripts/card-effect-coverage.mjs` — riepilogo quantitativo dello stato degli effetti carta.
- `tests/` — test automatici dei dati, dei mazzi e dei salvataggi.
- `Set.txt` — fonte testuale originale dei tre set.
- `package.json` — script e dipendenze del progetto.

## Avvio e verifica

Requisiti: Node.js compatibile con la versione di Vite del progetto e npm.

```powershell
npm install
npm run dev
```

Verifiche principali:

```powershell
npm run cards:import
npm run cards:coverage
npm test
npm run build
npm audit --audit-level=moderate
```

Esegui i controlli pertinenti dopo ogni modifica. Se un comando fallisce, correggi o descrivi chiaramente la causa; non dichiarare il lavoro verificato senza averne osservato l'esito.

## Indicazioni per gli assistenti AI

1. Prima di modificare il progetto, leggi i file coinvolti e rispetta le modifiche già presenti.
2. Fai cambiamenti mirati, coerenti con le convenzioni esistenti e con la lingua italiana dell'interfaccia.
3. Mantieni separati dati, interfaccia e regole del motore; non duplicare il catalogo in `game.js`.
4. Non cambiare il testo originale delle carte durante l'importazione e non inventare regole, rarità, costi o limiti di deckbuilding.
5. Quando una regola è ambigua o il comportamento cambia in modo sostanziale, chiedi una decisione prima di scegliere una nuova regola di gioco.
6. Aggiungi o aggiorna test per la logica modificata e verifica il risultato con build e controlli mirati.
7. Aggiorna questo documento o il README quando cambiano in modo significativo architettura, comandi o funzionalità.
8. Nel riepilogo finale distingui sempre ciò che è stato implementato, ciò che resta da fare e i controlli effettivamente eseguiti.

## Prossime aree di lavoro

Priorità aperte:

- verificare e correggere le regole già dichiarate nel prototipo, con test mirati;
- continuare a estendere e testare il sistema di effetti per Equipaggiamenti, abilità passive dei Siti e Campi fino a coprire tutti i testi canonici;
- completare le abilità delle Unità e mostrare/gestire tutti gli effetti non supportati;
- rafforzare AI, salvataggi e recupero dei prompt interattivi con test;
- definire regole aggiuntive di deckbuilding solo con una decisione ufficiale, senza inventare limiti alle copie;
- migliorare grafica, feedback, animazioni e usabilità senza compromettere la leggibilità delle carte.
