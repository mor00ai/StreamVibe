# Guida per il Deploy Gratuito e Sempre Attivo del Server StreamVibe

I piani gratuiti dei server come Render.com vanno in "standby" (si addormentano) dopo circa 15 minuti di inattività. Quando cerchi di ascoltare una canzone, il server impiega tanto tempo per "svegliarsi".

Ecco i passaggi completi per **pubblicare il tuo server gratuitamente e mantenerlo sempre sveglio 24/7**:

### Fase 1: Pubblicare il Backend (Gratis su Render.com)

1. **Crea un account su GitHub e carica il tuo codice**: 
   - Crea un repository su [GitHub.com](https://github.com/) e caricani tutti i file della cartella `server` (quindi il file `index.js`, `package.json` ecc.).
2. **Crea l'App su Render**: 
   - Vai su [Render.com](https://render.com/), crea un account gratuito e clicca su **"New +"** in alto a destra, scegliendo **"Web Service"**.
   - Seleziona **"Build and deploy from a Git repository"** e collega il tuo account GitHub, selezionando il repository appena creato.
3. **Impostazioni di Render**:
   - **Name**: Metti il nome che preferisci (es. `streamvibe-backend`).
   - **Root Directory**: Lascia vuoto se hai caricato solo i file della cartella `server` nel repository principale.
   - **Runtime**: `Node`
   - **Build Command**: Scrivi `npm install`
   - **Start Command**: Scrivi `node index.js`
   - **Instance Type**: Seleziona **Free**.
4. Clicca su **"Create Web Service"**. Attendi qualche minuto, e in alto a sinistra apparirà il tuo link pubblico definitivo (qualcosa come `https://il-tuo-server.onrender.com`).
   *Ricordati di copiare questo link e incollarlo dentro il tuo file `app.js` alla riga 3 nella variabile `BACKEND_URL`.*

---

### Fase 2: Il Segreto per Mantenerlo "Sempre Sveglio" (UptimeRobot)

Per aggirare lo spegnimento di 15 minuti sui piani gratuiti, invieremo un "ping" al tuo server ogni 14 minuti.

1. Vai sul sito [UptimeRobot.com](https://uptimerobot.com/) e registrati gratuitamente.
2. Vai sulla tua Dashboard e clicca sul pulsante **"Add New Monitor"**.
3. Compila i campi in questo modo:
   - **Monitor Type**: Seleziona **HTTP(s) / Website**.
   - **Friendly Name**: Dai un nome a piacere (es. `Mantieni attivo StreamVibe`).
   - **URL (or IP)**: Incolla l'indirizzo esatto che ti ha dato Render (es. `https://il-tuo-server.onrender.com/`).
   - **Monitoring Interval**: Sposta lo slider esattamente su **14 minuti** (il massimo per prevenire i 15 minuti limite).
   - *Opzionale*: seleziona il tuo indirizzo email (nella casella degli alert a destra) per essere avvisato se il server dovesse cedere.
4. Clicca su **"Create Monitor"** (e poi confermalo se richiesto).

Adesso UptimeRobot terrà la tua app attiva senza sosta, garantendo che lo streaming parta sempre in maniera istantanea sul tuo dispositivo!
