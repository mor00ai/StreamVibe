import express from 'express';
import cors from 'cors';
import yts from 'yt-search';
import { Innertube, UniversalCache } from 'youtubei.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Abilita CORS
app.use(cors());

let youtube;
async function initYoutube() {
    try {
        // Usiamo una cache e il client Android che è più difficile da bloccare
        youtube = await Innertube.create({
            cache: new UniversalCache(false),
            generate_session_store: true
        });
        console.log('✅ [YOUTUBE] Istanza Innertube (Android Client) creata');
    } catch (err) {
        console.error('❌ [YOUTUBE] Errore inizializzazione:', err.message);
    }
}
initYoutube();

app.get('/', (req, res) => {
    res.send('StreamVibe Backend is running with Android Bypass!');
});

// Endpoint 1: Ricerca brani (Invariato)
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Testo di ricerca mancante' });

    try {
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
        res.status(500).json({ error: "Errore ricerca" });
    }
});

// Endpoint 2: Streaming con Bypass "Android"
app.get('/api/stream', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).send('ID del video mancante');

    try {
        console.log(`[STREAM] Tentativo bypass per: ${videoId}`);
        
        if (!youtube) youtube = await Innertube.create();

        // Forza il client Android per evitare il blocco "Bot Detection"
        const info = await youtube.getInfo(videoId, 'ANDROID');
        const format = info.chooseFormat({ type: 'audio', quality: 'best' });
        
        if (!format) return res.status(404).send('Audio non trovato');

        // Ottieni lo stream
        const stream = await info.download(format);
        
        res.header('Content-Type', 'audio/mpeg');
        res.header('Accept-Ranges', 'bytes');

        for await (const chunk of stream) {
            res.write(chunk);
        }
        res.end();
        
    } catch (err) {
        console.error('❌ Errore Stream:', err.message);
        
        // Se fallisce ancora, proviamo a mandare un link diretto (ultima spiaggia)
        try {
             const info = await youtube.getInfo(videoId);
             const url = info.streaming_data?.formats[0]?.url;
             if (url) return res.redirect(url);
        } catch (e) {}

        if (!res.headersSent) {
            res.status(500).send('YouTube continua a bloccare. Prova un altro brano o riprova tra poco.');
        }
    }
});

app.listen(PORT, () => {
    console.log(`📡 [SERVER] Partito su porta ${PORT}`);
});
