import express from 'express';
import cors from 'cors';
import yts from 'yt-search';
import { Innertube } from 'youtubei.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Abilita CORS
app.use(cors());

let youtube;
async function initYoutube() {
    try {
        youtube = await Innertube.create();
        console.log('✅ [YOUTUBE] Istanza Innertube creata con successo');
    } catch (err) {
        console.error('❌ [YOUTUBE] Errore inizializzazione Innertube:', err.message);
    }
}
initYoutube();

app.get('/', (req, res) => {
    res.send('StreamVibe Backend is running perfectly with YouTube.js (ESM)!');
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

        const info = await youtube.getInfo(videoId);
        const format = info.chooseFormat({ type: 'audio', quality: 'best' });
        
        if (!format) return res.status(404).send('Nessun formato audio trovato.');

        const stream = await info.download(format);
        
        res.header('Content-Type', 'audio/mpeg');
        res.header('Accept-Ranges', 'bytes');

        for await (const chunk of stream) {
            res.write(chunk);
        }
        res.end();
        
    } catch (err) {
        console.error('❌ Errore in /api/stream:', err.message);
        if (!res.headersSent) {
            res.status(500).send('YouTube ha bloccato il server. Stiamo lavorando per risolvere.');
        }
    }
});

app.listen(PORT, () => {
    console.log(`📡 [SERVER] Partito sulla porta ${PORT}`);
});
