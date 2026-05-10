import express from 'express';
import cors from 'cors';
import yts from 'yt-search';
import { Innertube } from 'youtubei.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Abilita CORS
app.use(cors());

// Inizializza l'istanza YouTube con le credenziali per bypassare i blocchi
let youtube;
const VISITOR_DATA = 'CgtFVjV0YW1UeWpVUSiip4HQBjIoCgJJVBIiEh4SHAsMDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicgKmLfAgrcAjE4LllUPTBjN0lBeVU2LWhjcENfLXVpeFpzMG91Q1Q5d0hucGhwbHVIT2toS0JFMTFicmVEcXduQ0dHTG1ZMTlyQWFmNi1GakpUeUVVZEVkQ0l6aGhPWXpnX3U0NTRIajRsalFDM0pKVUhvRWZ4TUxrMjdZWEZhZExwTXhaeDFkNDloMWhNMW5YaVg2MnVYNW1BWmNaZmswWE5aNmJONHJaN0EwQVI1bVBZNVVJWkx4SEh4VWZCdU1MUi0xN29jOE9DRmdjaHU1M2RTQ1gyc2VyQXotUm5DRkhCR2x6QXBEVGlxamR0QlduYUQ5dnhiTUtZOTRQOXJlby1UNWszaFBoNFNHSUItTGt0OThLa28zUml2S0dnMnZoMEtJcmV6bFl2OW1FaUNzbXpHYndGbVdqdy0wUzFyZ0ZaaU9vVHRzNFdzbEZrQkUwZnpfX3F3eGFlZFVaQzNOYU5aZw%3D%3D';
const PO_TOKEN = 'INSERISCI_QUI_IL_PO_TOKEN'; // Lo otterremo tra poco

async function initYoutube() {
    try {
        youtube = await Innertube.create({
            visitor_data: VISITOR_DATA,
            po_token: PO_TOKEN
        });
        console.log('✅ [YOUTUBE] Istanza Innertube pronta con credenziali');
    } catch (err) {
        console.error('❌ [YOUTUBE] Errore inizializzazione Innertube:', err.message);
    }
}
initYoutube();

app.get('/', (req, res) => {
    res.send('StreamVibe Backend is running with ESM and YouTubei.js!');
});

// Endpoint 1: Ricerca brani
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Testo di ricerca mancante' });

    try {
        console.log(`[API SEARCH] Cerco: ${query}...`);
        const r = await yts(query);
        const videos = r.videos.slice(0, 25).map(v => ({
            type: 'stream',
            title: v.title,
            thumbnail: v.thumbnail,
            uploaderName: v.author.name,
            duration: v.seconds, 
            url: v.url,
            videoId: v.videoId
        }));
        res.json({ items: videos });
    } catch (error) {
        console.error("Errore ricerca:", error);
        res.status(500).json({ error: "Errore durante la ricerca" });
    }
});

// Endpoint 2: Streaming del brano
app.get('/api/stream', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).send('ID del video mancante');

    try {
        console.log(`[API STREAM] Richiesta stream per: ${videoId}`);
        
        if (!youtube) {
            youtube = await Innertube.create();
        }

        // Ottieni info sul video
        const info = await youtube.getInfo(videoId);
        
        // Scegli il formato audio migliore
        const format = info.chooseFormat({ type: 'audio', quality: 'best' });
        
        if (!format) return res.status(404).send('Nessun formato audio trovato.');

        // Stream dei dati
        const stream = await info.download(format);
        
        res.header('Content-Type', 'audio/mpeg');
        res.header('Accept-Ranges', 'bytes');

        // Trasferimento dei chunk in tempo reale al client
        for await (const chunk of stream) {
            res.write(chunk);
        }
        res.end();
        
    } catch (err) {
        console.error('❌ Errore in /api/stream:', err.message);
        if (!res.headersSent) {
            res.status(500).send('YouTube ha bloccato la richiesta. Stiamo lavorando a una soluzione.');
        }
    }
});

app.listen(PORT, () => {
    console.log(`📡 [SERVER] Partito sulla porta ${PORT}`);
});
