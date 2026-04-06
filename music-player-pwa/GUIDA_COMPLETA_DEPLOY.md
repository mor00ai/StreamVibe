# Guida Definitiva: Pubblicare la tua PWA Musicale (Frontend + Backend)

Questa guida ti accompagna passo passo nella pubblicazione della tua PWA. Quando separiamo il motore di ricerca di YouTube (il backend) dall'interfaccia visiva (il frontend), creiamo un'app vera e professionale.

## 1. Come funziona la nostra Architettura
- **GitHub**: È la "cassaforte" del tuo codice. Sia il frontend che il backend vivono qui dentro, nella stessa cartella principale.
- **Render.com (Il Backend)**: Prende SOLO la cartella `server` da GitHub, esegue Node.js e bypassa YouTube per fornire lo streaming.
- **Netlify / GitHub Pages (Il Frontend)**: Prende i file visivi (`index.html`, `app.js`, `style.css`) da GitHub e crea il sito finale che installerai sul telefono.

*(Nota: Per funzionalità come la registrazione utenti e password, nelle tue app future il servizio migliore sarà **Firebase**, che si sostituisce al backend fornendo un database pronto all'uso. Ma per lo streaming specifico da YouTube avevamo assolutamente bisogno di un server privato come Render, perché richiedeva "forza bruta" e calcoli lato server per decriptare YouTube).*

---

## 2. GitHub: Il Caricamento Globale
L'obiettivo è portare tutto il progetto online su GitHub per renderlo accessibile dai servizi di hosting.

1. Vai su [GitHub.com](https://github.com/) e accedi.
2. Clicca su **New** per creare un nuovo Repository. Dai un nome (es: `pwa-musica-streamvibe`).
3. Clicca su **"Create repository"**.
4. Apri la pagina del repository appena creato e clicca su "uploading an existing file".
5. Dal tuo computer, tieni aperta la cartella locale dell'app.
6. **Seleziona tutti i file e cartelle in blocco** (es: `index.html`, `app.js`, la cartella `server`, la cartella `icons`, ecc.).
7. Trascina tutto il blocco selezionato al centro della pagina web di GitHub.
8. Attendi il caricamento e clicca su **Commit changes** (il bottone verde in basso).

---

## 3. Render.com: Accendere il Server (Backend)
Ora che i file sono online, diamo vita al motore Node.js.

1. Vai su [Render.com](https://render.com/) e registrati.
2. Nella Dashboard, clicca su **New +** e scegli **Web Service**.
3. Scegli "Build and deploy from a Git repository" e procedi.
4. Collega il tuo account GitHub e spunta il repository appena creato. Clicca **Connect**.
5. **Opzioni di Configurazione (CRITICO)**:
   - **Name**: `streamvibe-backend` (o un nome a piacere).
   - **Root Directory**: Scrivi esplicitamente **`server`**.
   - **Runtime**: **`Node`**.
   - **Build Command**: Scrivi **`npm install`**.
   - **Start Command**: Scrivi **`node index.js`**.
   - **Instance Type**: Seleziona il piano **Free** (gratuito).
6. Clicca **Create Web Service** in basso.
7. Attendi qualche istante. In alto a sinistra comparirà l'URL pubblico del tuo server, che sarà simile a `https://streamvibe-backend.onrender.com`.

---

## 4. Collegare il Server all'App (Aggiornamento di `app.js`)
L'app visiva ha bisogno di sapere qual è il "numero di telefono" del nuovo server su Render per chiedergli la musica.

1. Sul tuo computer, apri il file **`app.js`**.
2. Cercate la costante `BACKEND_URL` all'inizio, e sostituisci il `http://localhost:3000` con il nuovo link copiato da Render. 
   *(Assicurati di non mettere la sbarra `/` alla fine dell'URL).*
3. Torna su GitHub nel tuo repository.
4. Trascina il file `app.js` modificato sopra alla pagina GitHub, facendo un nuovo "Commit" in modo da sovrascrivere quello vecchio. In questo modo Netlify riceverà l'app aggiornata.

---

## 5. Netlify: Mettere Online l'Applicazione Visiva (Frontend)
Infine, mettiamo online la facciata dell'app, in modo da poter accedere al player musicale dal telefono.

1. Vai su [Netlify.com](https://netlify.com/) e registrati (usa il tuo account GitHub per fare prima).
2. Nella dashboard di Netlify, clicca su **Add new site** e poi su **Import an existing project**.
3. Seleziona **Deploy with GitHub**.
4. Autorizza Netlify e seleziona il tuo repository musicale.
5. Nella schermata delle configurazioni (Site Settings):
   - **Base directory**: Lascia completamente vuoto!
   - **Build command**: Lascia vuoto.
   - **Publish directory**: Lascia vuoto (oppure scrivi `/` se ti obbliga).
6. Clicca su **Deploy site**.
7. In pochi secondi Netlify genererà un link verde. Quello è il sito finale della tua PWA! Se lo apri dal tuo smartphone, potrai subito aggiungerla alla Home Screen, ed essa sfrutterà il server Render segreto per far funzionare la musica!

*(Opzionale: su Netlify puoi andare su "Site Configuration" -> "Domain management" e cambiare il nome del dominio per renderlo più leggibile, es: `lamiamusica.netlify.app`)*
