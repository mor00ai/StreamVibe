const express = require('express');
const cors = require('cors');
const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = process.env.PORT || 3000;

// Abilita richieste da qualsiasi client (Rimuove il blocco CORS)
app.use(cors());

app.get('/', (req, res) => {
    res.send('StreamVibe Backend is running perfectly!');
});

// Endpoint 1: Ricerca brani su YouTube
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Testo di ricerca mancante' });

    try {
        console.log(`[API SEARCH] Cerco: ${query}...`);
        const r = await yts(query);
        
        // Mappa i campi per adattarli alla nostra PWA
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

// Endpoint 2: Streaming del brano completo (Bypass CORS e Decifratura!)
app.get('/api/stream', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).send('ID del video mancante');

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`[API STREAM] Inizio proxy per: ${videoUrl}`);
        
        const info = await ytdl.getInfo(videoUrl);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
        
        if (!format) return res.status(404).send('Nessun file audio trovato.');

        // Header per il browser per fargli capire che sta ricevendo un MP3 in stream!
        res.header('Content-Type', 'audio/mpeg');
        res.header('Accept-Ranges', 'bytes');
        
        const audioStream = ytdl(videoUrl, { format: format });
        
        // Trasferisce i dati in tempo reale da YouTube al tuo browser tramite il server
        audioStream.pipe(res);
        
        audioStream.on('error', (err) => {
            console.error('Errore flusso audio dal server youtube:', err.message);
            if (!res.headersSent) res.status(500).send('Errore di decifrazione YouTube');
        });
        
    } catch (err) {
        console.error('Errore fatale in /api/stream:', err.message);
        if (!res.headersSent) res.status(500).send('YouTube ha bloccato la richiesta in corso.');
    }
});

app.listen(PORT, () => {
    console.log(`📡 [SERVER] Partito. In ascolto sulla porta ${PORT}`);
});
