# GUIDA — Impostare Git, spiegata facile

> Questa guida è scritta per chi **non ha mai usato un terminale**.
> Segui un passo alla volta. Se qualcosa non torna, fermati e incolla l'errore nella chat: ci penso io.

---

## Prima di tutto: tre paroline semplici

| Parola | Cos'è, in parole povere |
|---|---|
| **Git** | I "punti di salvataggio" del tuo lavoro, come in un videogioco. Serve per non perdere niente e poter tornare indietro. |
| **Terminale** (o PowerShell) | Una finestra dove si scrivono comandi con la tastiera. Sembra da esperti, ma tu dovrai solo **copiare e incollare**. |
| **Comando** | Una riga di testo che scrivi nel terminale e poi confermi premendo **Invio**. |

### Come si copia e si incolla
- **Copiare**: seleziona il testo con il mouse, poi premi **Ctrl** e **C** insieme.
- **Incollare**: premi **Ctrl** e **V** insieme. (Nel terminale funziona anche il **clic con il tasto destro** del mouse.)
- **Confermare**: premi **Invio** (il tasto grande a destra sulla tastiera).

> Regola d'oro: dopo ogni comando si preme **Invio**. Niente succede finché non premi Invio.

---

## FASE 1 — Aprire il terminale nella cartella giusta

Dobbiamo aprire il terminale **dentro** la cartella del progetto. Uso il metodo più semplice.

### Metodo A (consigliato)

1. Vai sul **Desktop** (la schermata con le icone).
2. Fai **doppio clic** sulla cartella **Primal Ruin**. Si apre e vedi dentro i file.
3. In alto c'è una **barra lunga** con scritto qualcosa tipo `Questo PC > Desktop > Primal Ruin`.
   Cliccaci **una volta** sopra con il mouse.
4. Scrivi con la tastiera questa parola sola:

   ```
   powershell
   ```

5. Premi **Invio**.

Si apre una finestra **blu o nera** con del testo. **Quella è il terminale.** Non chiuderla.

### Metodo B (se il metodo A non riesce)

1. Premi il tasto **Windows** sulla tastiera (il logo con le 4 finestrelle).
2. Scrivi: `powershell`
3. Clicca sulla voce **Windows PowerShell** che compare.
4. Nella finestra che si apre, **copia e incolla** questa riga:

   ```
   cd "C:\Users\alessio\Desktop\Primal Ruin"
   ```

5. Premi **Invio**.

### Controllo: ha funzionato?

Incolla questo e premi Invio:

```
git --version
```

Deve comparire qualcosa tipo `git version 2.56.0`. Se vedi un numero di versione, **perfetto**: sei nel posto giusto.
Se invece leggi *"is not recognized"* o *"non riconosciuto"*, fermati e scrivimi: vuol dire che Git non è installato o che sei nella cartella sbagliata.

---

## FASE 2 — Dire a Git chi sei

Git vuole "firmare" i salvataggi con il tuo nome e la tua email. Si fa **una volta sola** e vale per sempre.

> ⚠️ **Sostituisci i miei esempi con i tuoi dati veri**, dentro le virgolette.
> Puoi usare una email qualsiasi, anche inventata per uso personale (es. `mario@casa.it`).

### Comando 1 — il nome

Copia, incolla il testo, **sostituisci il nome** e premi Invio:

```
git config --global user.name "Mario Rossi"
```

### Comando 2 — l'email

Copia, incolla, **sostituisci l'email** e premi Invio:

```
git config --global user.email "mario@casa.it"
```

### Controllo: ha funzionato?

Incolla questi due comandi (uno alla volta, o insieme) e premi Invio:

```
git config --global user.name
git config --global user.email
```

Deve apparire **il tuo nome** e **la tua email**. Se li vedi, la Fase 2 è finita. ✅

> Nota: questi comandi **non** danno il tuo nome a nessun altro e **non** ti iscrivono a nulla. Restano solo sul tuo computer.

---

## FASE 3 — (Facoltativa, per dopo) Mettere il progetto online

Serve solo se vuoi il progetto su **GitHub** (un sito dove si conservano i progetti online). Richiede di creare un account su github.com.

Saltala per ora. Te la spiegherò quando servirà davvero.

---

## FASE 4 — (Facoltativa) Salvare il lavoro da solo

Questo è il ciclo che si ripete ogni volta che vuoi "salvare". **Per ora non serve**: i salvataggi li faccio io. Leggila solo se ti interessa capire.

1. Guarda cosa è cambiato:

   ```
   git status
   ```

2. Preparare i file al salvataggio:

   ```
   git add .
   ```

3. Creare il salvataggio (il messaggio tra virgolette è una descrizione a piacere):

   ```
   git commit -m "descrizione di quello che ho fatto"
   ```

---

## Regole d'oro

1. **Un comando alla volta.** Scrivi, premi Invio, guarda cosa succede, poi passa al prossimo.
2. **Non chiudere la finestra del terminale** finché non hai finito.
3. **Se compare una scritta rossa o un errore**, non toccare altro: selezionala, copiala e incollala nella chat. Ci penso io.
4. Se non sai dove sei, incolla questo e premi Invio: ti dice in che cartella ti trovi.

   ```
   pwd
   ```

---

## Scorciatoia: lascia fare a me

Se questa guida ti sembra comunque troppa roba, c'è una strada più semplice:

- Nella chat scrivimi **solo** il tuo nome e l'email che vuoi usare (Fase 2).
- Al resto penso io: preparo i salvataggi, i messaggi e i controlli.

Mi serve il tuo "sì" solo per usare il tuo nome sui salvataggi. **Non modificherò la configurazione di sistema** da solo: la Fase 2 la devi fare tu (oppure mi autorizzi e la imposto io per te).

---

### Dove siamo adesso (promemoria)

- ✅ Cartella del progetto aperta (`Primal Ruin`)
- ✅ Git installato (versione 2.56.0)
- ⬜ **Da fare: Fase 2 (nome ed email)** ← sei qui
- ⬜ Salvataggio del lavoro di oggi (lo faccio io dopo la Fase 2)
