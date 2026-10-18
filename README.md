# Primal Ruin

Prototipo incrementale di gioco di carte browser con interfaccia pixel-art, realizzato con HTML, CSS e JavaScript. **Non è ancora una versione completa del regolamento Core 1.0 né un prodotto di qualità AAA.**

## Avvio in sviluppo

Richiede Node.js 20.19+ (oppure 22.12+) e npm.

```powershell
npm install
npm run dev
```

Vite apre il gioco in locale. Per creare e provare la build di produzione:

```powershell
npm run build
npm run preview
```

Test automatici e controlli del catalogo:

```powershell
npm test
npm run cards:import
npm run cards:coverage
npm audit --audit-level=moderate
```

## Catalogo e mazzi demo

`src/data/cards.json` è il catalogo strutturato delle 480 carte contenute nei quattro file di `sets/`. Conserva costo, forza, tipo, categoria, rarità quando indicata, testo originale, decadimento, salute del Comandante ed eventuale costo di equipaggiamento. Gli ID sono univoci per set, ad esempio `set-1-001`; i valori non specificati nella fonte restano `null`.

Per rigenerare il catalogo dopo aver modificato un file in `sets/`:

```powershell
npm run cards:import
```

L’importazione verifica i 120 numeri e i conteggi di categoria previsti per ogni set e segnala metadati obbligatori mancanti. L’archivio carte nella pagina permette di filtrare per set e categoria e cercare nel nome, nel tipo e nel testo delle regole.

È disponibile un deck builder che salva mazzi da 40 carte nel browser; non viene imposto un limite copie perché il regolamento non ne specifica uno. In assenza di un mazzo personalizzato, la partita demo pesca 40 carte del set scelto secondo la composizione del prototipo. Le carte dei quattro set sono nel catalogo. Il motore esegue ancora gli effetti registrati sui vecchi numeri di carta: se una carta nuova occupa quel numero, l’archivio la segna come parziale o non eseguibile. I Comandanti stampati sono nel catalogo, ma le loro abilità nuove vengono solo annunciate, salvo la pesca di Aurelius. La casualità di setup è basata su un PRNG con stato incluso nel salvataggio, così una partita salvata riprende la stessa sequenza casuale.

Impostazioni audio/velocità animazioni, scorciatoie da tastiera e salvataggio automatico locale della partita sono disponibili. Il salvataggio è specifico del browser/dispositivo e non è un backup esportabile.

## Strumenti

- Vite fornisce server locale, hot reload e build.
- Il gioco attuale usa HTML/CSS per l'interfaccia e JavaScript per la logica; Phaser non è richiesto per eseguire questo prototipo.
- Copilot Chat è incluso in questa installazione di VS Code; per usare le funzioni AI occorre accedere. Prettier è installato e le estensioni consigliate sono elencate in `.vscode/extensions.json`.
- Gli strumenti per creare pixel art, come Aseprite o LibreSprite, sono applicazioni separate. L'anteprima Aseprite trovata su GitHub non è distribuita nel VS Code Marketplace, quindi non è stato possibile installarla come estensione.

## Stato delle regole e limiti noti

- Implementati nel prototipo: preparazione, mano da 5, Mulligan, due Domini iniziali, fasi, pesca, limiti di mano, schieramento di Unità, tre Fronti, parte del combattimento, sacrificio umano, alcune keyword e avversario automatico essenziale.
- Tutte le 68 Tattiche, i 28 Equipaggiamenti, i 70 Siti e i 26 Campi sono registrati come implementati. Le abilità facoltative dei permanenti possono usare una scelta automatica deterministica invece di un prompt interattivo; le assunzioni operative sono documentate e non sostituiscono i dati canonici.
- 88 effetti di Unità sono registrati; l’audit marca ancora 44 Unità con abilità non completamente risolte come parziali.
- Il testo libero delle carte non viene tradotto in effetti eseguibili. Gli effetti non riconosciuti sono esplicitamente marcati come non eseguibili o parzialmente supportati.
- Tormento presenta al giocatore la scelta tra Follia e danno al Comandante; l'avversario automatico sceglie deterministicamente l'esito con il maggiore progresso relativo verso la vittoria. Il testo libero delle altre abilità di Unità resta non eseguibile o parziale.
- Il prototipo non ha ancora test di tutte le regole di combattimento, un AI strategico completo, animazioni di combattimento complete o illustrazioni finali. Le immagini carta attuali sono placeholder pixel art procedurali, non asset artistici definitivi.
- Considerare il progetto incompleto rispetto al Core 1.0; consultare `DialogoAi.md` prima di implementare altre regole.

## File principali

- `index.html` - struttura del tavolo e controlli.
- `styles.css` - stile e animazioni.
- `game.js` - logica del prototipo.
- `src/main.js` - punto d'ingresso Vite e collegamento degli eventi UI.
- `src/card-library.js` - ricerca e filtri dell'archivio carte.
- `src/deck-builder.js` - costruzione, validazione e salvataggio locale di mazzi da 40 carte.
- `src/deck-validation.js` - validazione indipendente dei mazzi.
- `src/game-rules.js` - calcolo puro della Forza e confronto tra Fronti.
- `src/random.js` - PRNG deterministico con stato ripristinabile.
- `src/pixel-art.js` - illustrazioni placeholder pixel art generate in Canvas.
- `src/settings.js` - preferenze audio e velocità animazioni.
- `src/save-store.js` - serializzazione e controllo di validità dei salvataggi locali.
- `src/card-effects.js` - classificazione esplicita del supporto effetti corrente.
- `src/tactics.js` - bersagli ed effetti risolti per le Tattiche implementate.
- `sets/` - fonte testuale dei quattro set.
- `src/data/cards.json` - catalogo generato dai quattro set.
- `scripts/import-cards.mjs` - importazione e validazione dei file in `sets/`.
- `scripts/card-effect-coverage.mjs` - riepilogo degli effetti supportati e non supportati.
- `tests/` - test Node per deck building, catalogo e salvataggi.