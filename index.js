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
        console.log('✅ [YOUTUBE] Istanza Innertube pronta');
    } catch (err) {
        console.error('❌ [YOUTUBE] Errore inizializzazione:', err.message);
    }
}
initYoutube();

app.get('/', (req, res) => {
    res.send('StreamVibe Backend is Online (Version 3.0)!');
});

// Endpoint 1: Ricerca
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Manca query' });
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

// Endpoint 2: Streaming con parametro Client corretto
app.get('/api/stream', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).send('ID mancante');

    try {
        console.log(`[STREAM] Avvio per: ${videoId}`);
        
        if (!youtube) youtube = await Innertube.create();

        // Usiamo il client ANDROID correttamente come oggetto
        const info = await youtube.getInfo(videoId, { client: 'ANDROID' });
        const format = info.chooseFormat({ type: 'audio', quality: 'best' });
        
        if (!format) return res.status(404).send('Audio non trovato');

        const stream = await info.download(format);
        
        res.header('Content-Type', 'audio/mpeg');
        res.header('Accept-Ranges', 'bytes');

        for await (const chunk of stream) {
            res.write(chunk);
        }
        res.end();
        
    } catch (err) {
        console.error('❌ Errore Stream:', err.message);
        
        // Tentativo di fallback: Link diretto
        try {
             const info = await youtube.getInfo(videoId);
             const url = info.streaming_data?.formats[0]?.url;
             if (url) {
                 console.log("-> Fallback: Redirect a URL diretto");
                 return res.redirect(url);
             }
        } catch (e) {}

        if (!res.headersSent) {
            res.status(500).send('YouTube blocca la richiesta. Prova un altro brano.');
        }
    }
});

app.listen(PORT, () => {
    console.log(`📡 [SERVER] Partito su porta ${PORT}`);
});

