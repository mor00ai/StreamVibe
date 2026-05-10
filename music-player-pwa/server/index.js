import express from 'express';
import cors from 'cors';
import yts from 'yt-search';
import { Innertube, UniversalCache } from 'youtubei.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Abilita CORS
app.use(cors());

// Inizializza l'istanza YouTube con logica di fallback
let youtube;

async function initYoutube() {
    try {
        // Proviamo a inizializzare con il client standard ma con cache disabilitata per evitare conflitti
        youtube = await Innertube.create({
            cache: new UniversalCache(false),
            generate_session_store: true
        });
        console.log('✅ [YOUTUBE] Istanza Innertube pronta');
    } catch (err) {
        console.error('❌ [YOUTUBE] Errore inizializzazione Innertube:', err.message);
    }
}

initYoutube();

app.get('/', (req, res) => {
    res.send('StreamVibe Backend is running with Smart Fallback and YouTubei.js!');
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
            await initYoutube();
        }

        // TENTATIVO 1: Client Standard
        try {
            const info = await youtube.getInfo(videoId);
            const format = info.chooseFormat({ type: 'audio', quality: 'best' });
            if (format) {
                const stream = await info.download(format);
                res.header('Content-Type', 'audio/mpeg');
                for await (const chunk of stream) { res.write(chunk); }
                return res.end();
            }
        } catch (e) {
            console.log("Tentativo 1 fallito, provo modalità TV...");
        }

        // TENTATIVO 2: Client TV (più permissivo)
        const tvYoutube = await Innertube.create({ clientType: 'TV' });
        const infoTv = await tvYoutube.getInfo(videoId);
        const formatTv = infoTv.chooseFormat({ type: 'audio', quality: 'best' });
        
        if (!formatTv) return res.status(404).send('Nessun formato trovato.');

        const streamTv = await infoTv.download(formatTv);
        res.header('Content-Type', 'audio/mpeg');
        for await (const chunk of streamTv) {
            res.write(chunk);
        }
        res.end();
        
    } catch (err) {
        console.error('❌ Errore finale in /api/stream:', err.message);
        if (!res.headersSent) {
            res.status(500).send('YouTube ha bloccato anche il fallback. Server-side block attivo.');
        }
    }
});

app.listen(PORT, () => {
    console.log(`📡 [SERVER] Partito sulla porta ${PORT}`);
});
