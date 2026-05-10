import express from 'express';
import cors from 'cors';
import yts from 'yt-search';
import { Innertube, UniversalCache } from 'youtubei.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

let youtube;

async function initYoutube() {
    try {
        // Inizializzazione con client ANDROID_TESTSUITE (molto resiliente)
        youtube = await Innertube.create({
            cache: new UniversalCache(false),
            generate_session_store: true
        });
        console.log('✅ [SERVER] Motore YouTube pronto');
    } catch (err) {
        console.error('❌ [SERVER] Errore inizializzazione:', err.message);
    }
}

initYoutube();

app.get('/', (req, res) => {
    res.send('StreamVibe Backend v3 (Android TestSuite) is online!');
});

app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Manca query' });
    try {
        const r = await yts(query);
        res.json({ items: r.videos.slice(0, 20).map(v => ({
            title: v.title,
            thumbnail: v.thumbnail,
            uploaderName: v.author.name,
            duration: v.seconds,
            videoId: v.videoId
        }))});
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/api/stream', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).send('Manca ID');

    try {
        console.log(`[STREAM] Tentativo per ${videoId}...`);
        if (!youtube) await initYoutube();

        // Forza l'uso del client ANDROID_TESTSUITE per lo streaming
        const info = await youtube.getInfo(videoId, 'ANDROID_TESTSUITE');
        const format = info.chooseFormat({ type: 'audio', quality: 'best' });

        if (!format) {
            console.log("[STREAM] Formato non trovato, provo TV...");
            const tvInfo = await youtube.getInfo(videoId, 'TV');
            const tvFormat = tvInfo.chooseFormat({ type: 'audio', quality: 'best' });
            if (!tvFormat) throw new Error('Nessun formato disponibile');
            
            const stream = await tvInfo.download(tvFormat);
            res.header('Content-Type', 'audio/mpeg');
            for await (const chunk of stream) res.write(chunk);
            return res.end();
        }

        const stream = await info.download(format);
        res.header('Content-Type', 'audio/mpeg');
        res.header('Transfer-Encoding', 'chunked');

        for await (const chunk of stream) {
            res.write(chunk);
        }
        res.end();

    } catch (err) {
        console.error('❌ [STREAM] Fallito:', err.message);
        if (!res.headersSent) {
            res.status(500).send(`Errore YouTube: ${err.message}`);
        }
    }
});

app.listen(PORT, () => console.log(`🚀 Server pronto sulla porta ${PORT}`));
