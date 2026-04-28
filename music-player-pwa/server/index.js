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
        
        // Ottieni info del video
        const info = await ytdl.getInfo(videoUrl);
        
        // Scegli il formato audio migliore
        const format = ytdl.chooseFormat(info.formats, { 
            quality: 'highestaudio',
            filter: 'audioonly' 
        });
        
        if (!format) return res.status(404).send('Nessun file audio trovato.');

        // Header per il browser
        res.header('Content-Type', 'audio/mpeg');
        res.header('Accept-Ranges', 'bytes');
        
        // Crea lo stream usando le info già ottenute (più veloce e stabile)
        const audioStream = ytdl.downloadFromInfo(info, { 
            format: format,
            highWaterMark: 1 << 25, // Buffer di 32MB per evitare interruzioni
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Connection': 'keep-alive'
                }
            }
        });
        
        // Trasferisce i dati in tempo reale
        audioStream.pipe(res);
        
        audioStream.on('error', (err) => {
            console.error('Errore flusso audio:', err.message);
            if (!res.headersSent) res.status(500).send('Errore durante lo streaming');
        });

        // Gestione chiusura connessione improvvisa
        req.on('close', () => {
            if (audioStream.destroy) audioStream.destroy();
        });
        
    } catch (err) {
        console.error('Errore fatale in /api/stream:', err.message);
        if (!res.headersSent) {
            if (err.message.includes('403')) {
                res.status(403).send('YouTube ha bloccato la richiesta (403 Forbidden).');
            } else {
                res.status(500).send('Errore interno del server proxy.');
            }
        }
    }
});

app.listen(PORT, () => {
    console.log(`📡 [SERVER] Partito. In ascolto sulla porta ${PORT}`);
});

