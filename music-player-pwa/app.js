// === Configurazione API (Il Tuo Server Backend NodeJS) ===
// Sostituisci questo URL con l'indirizzo reale che ti darà Render.com!
const BACKEND_URL = 'https://streamvibe-backend.onrender.com';

// JSONBlob URL per sync globale (No Auth Cloud)
const JSONBLOB_API = 'https://jsonblob.com/api/jsonBlob';

// === Registrazione Service Worker (PWA) ===
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrato con successo.'))
            .catch(err => console.error('Errore SW:', err));
    });
}

// === Elementi DOM ===
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsList = document.getElementById('resultsList');
const loader = document.getElementById('loader');

// Tabs
const tabSearch = document.getElementById('tabSearch');
const tabPlaylists = document.getElementById('tabPlaylists');
const searchView = document.getElementById('searchView');
const playlistsView = document.getElementById('playlistsView');
const singlePlaylistView = document.getElementById('singlePlaylistView');
const searchContainer = document.getElementById('searchContainer');

// Playlists elements
const newPlaylistInput = document.getElementById('newPlaylistInput');
const createPlaylistBtn = document.getElementById('createPlaylistBtn');
const playlistsList = document.getElementById('playlistsList');
const backToPlaylists = document.getElementById('backToPlaylists');
const singlePlaylistTitle = document.getElementById('singlePlaylistTitle');
const singlePlaylistTracks = document.getElementById('singlePlaylistTracks');
const deleteLocalBtn = document.getElementById('deleteLocalBtn');
const deleteCloudBtn = document.getElementById('deleteCloudBtn');
const downloadCloudBtn = document.getElementById('downloadCloudBtn');
const uploadCloudBtn = document.getElementById('uploadCloudBtn');
const syncStatusText = document.getElementById('syncStatusText');

// Modale
const playlistModal = document.getElementById('playlistModal');
const modalPlaylistsContainer = document.getElementById('modalPlaylistsContainer');
const closeModalBtn = document.getElementById('closeModalBtn');

// Player DOM
const playerBar = document.getElementById('playerBar');
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const currentTitle = document.getElementById('currentTitle');
const currentArtist = document.getElementById('currentArtist');
const currentThumbnail = document.getElementById('currentThumbnail');

// === Stato dell'applicazione ===
let currentQueue = [];
let currentIndex = -1;
let isPlaying = false;

// Stato Playlists
let localPlaylists = {}; // formato: { "Nome Playlist": [ track1, track2 ] }
let cloudBlobId = localStorage.getItem('streamvibe_cloud_id') || null;
let trackToAddCache = null; // Traccia temporanea per la modale
let currentViewedPlaylist = null; // Nome della playlist attualmente aperta

// INIZIALIZZAZIONE!
initApp();

async function initApp() {
    // Carica da locale prima di tutto per essere subito veloci
    const cached = localStorage.getItem('streamvibe_playlists');
    if (cached) {
        localPlaylists = JSON.parse(cached);
    }
    
    // Prova a sincronizzare dal Cloud
    if (cloudBlobId) {
        setSyncStatus("☁️ Sincronizzazione...");
        try {
            const res = await fetch(`${JSONBLOB_API}/${cloudBlobId}`);
            if (res.ok) {
                const cloudData = await res.json();
                localPlaylists = cloudData;
                saveLocal();
                setSyncStatus("✅ Cloud Sync Attivo");
            } else {
                 setSyncStatus("⚠️ Errore Cloud");
            }
        } catch (e) {
            setSyncStatus("⚠️ Offline");
        }
    } else {
        setSyncStatus("💾 Solo Locale finchè non salvi");
    }
    renderPlaylistsTab();
}

function saveLocal() {
    localStorage.setItem('streamvibe_playlists', JSON.stringify(localPlaylists));
}

async function syncToCloud() {
    saveLocal();
    setSyncStatus("☁️ Salvataggio...");
    try {
        if (cloudBlobId) {
            // Aggiorna blob esistente tramite PUT
            await fetch(`${JSONBLOB_API}/${cloudBlobId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(localPlaylists)
            });
            setSyncStatus("✅ Cloud Sync Attivo");
        } else {
            // Crea un primissimo blob vuoto o coi dati correnti usando POST
            const res = await fetch(JSONBLOB_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(localPlaylists)
            });
            const locationUrl = res.headers.get('Location');
            if (locationUrl) {
                const parts = locationUrl.split('/');
                cloudBlobId = parts[parts.length - 1]; // il db auto genera l'id UUID
                localStorage.setItem('streamvibe_cloud_id', cloudBlobId);
                setSyncStatus("✅ Cloud Connesso!");
            }
        }
    } catch (e) {
        console.error(e);
        setSyncStatus("⚠️ Errore Cloud");
    }
    renderPlaylistsTab();
    if(currentViewedPlaylist) {
       renderSinglePlaylist(currentViewedPlaylist);
    }
}

function setSyncStatus(text) {
    if(syncStatusText) syncStatusText.textContent = text;
}

// === TABS LOGIC ===
tabSearch.addEventListener('click', () => {
    tabSearch.classList.add('active');
    tabPlaylists.classList.remove('active');
    searchView.classList.remove('hidden');
    searchContainer.classList.remove('hidden');
    playlistsView.classList.add('hidden');
    singlePlaylistView.classList.add('hidden');
    currentViewedPlaylist = null;
});

tabPlaylists.addEventListener('click', () => {
    tabPlaylists.classList.add('active');
    tabSearch.classList.remove('active');
    searchView.classList.add('hidden');
    searchContainer.classList.add('hidden');
    singlePlaylistView.classList.add('hidden');
    playlistsView.classList.remove('hidden');
    renderPlaylistsTab();
});

backToPlaylists.addEventListener('click', () => {
    singlePlaylistView.classList.add('hidden');
    playlistsView.classList.remove('hidden');
    currentViewedPlaylist = null;
});

// === PLAYLIST MANAGEMENT ===
createPlaylistBtn.addEventListener('click', () => {
    const name = newPlaylistInput.value.trim();
    if(!name) return;
    if(!localPlaylists[name]) {
        localPlaylists[name] = [];
        newPlaylistInput.value = '';
        syncToCloud();
    } else {
        alert("Playlist già esistente!");
    }
});

newPlaylistInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') createPlaylistBtn.click();
})

function renderPlaylistsTab() {
    playlistsList.innerHTML = '';
    const keys = Object.keys(localPlaylists);
    
    if (keys.length === 0) {
        playlistsList.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-books"></i>
                <p>Non hai ancora creato nessuna playlist.</p>
            </div>
        `;
        return;
    }
    
    keys.forEach(name => {
        const li = document.createElement('li');
        li.className = 'result-item';
        
        li.innerHTML = `
            <div class="result-info" style="margin-left: 10px;">
                <span class="result-title">${name}</span>
                <span class="result-channel" style="color:var(--accent-1);">${localPlaylists[name].length} brani</span>
            </div>
            <button class="add-track-btn" title="Apri Playlist" style="margin-right: 10px;"><i class="ph ph-caret-right"></i></button>
        `;
        
        li.addEventListener('click', () => {
            playlistsView.classList.add('hidden');
            singlePlaylistView.classList.remove('hidden');
            renderSinglePlaylist(name);
        });
        
        playlistsList.appendChild(li);
    });
}

function renderSinglePlaylist(name) {
    currentViewedPlaylist = name;
    singlePlaylistTitle.textContent = name;
    singlePlaylistTracks.innerHTML = '';
    
    const tracks = localPlaylists[name] || [];
    currentQueue = tracks; // la riproduzione va in base a questa lista!
    
    if(tracks.length === 0) {
         singlePlaylistTracks.innerHTML = `
            <div class="empty-state" style="margin-top: 20px;">
                <p>Nessun brano in questa playlist.</p>
                <button class="glass-btn" style="width: auto; padding: 0 20px; font-size: 1rem; margin-top:10px; border-radius:15px;" onclick="tabSearch.click()">Vai alla ricerca</button>
            </div>
        `;
        return;
    }
    
    tracks.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'result-item';
        
        const durationStr = formatTime(item.trackTimeMillis / 1000);
        const thumbnail = item.artworkUrl100 || 'https://via.placeholder.com/60';
        
        li.innerHTML = `
            <img src="${thumbnail}" alt="cover" class="result-thumb" loading="lazy">
            <div class="result-info">
                <span class="result-title">${item.trackName}</span>
                <span class="result-channel">${item.artistName}</span>
            </div>
            <span class="result-duration" style="margin-right:15px;">${durationStr}</span>
            <button class="remove-track-btn"><i class="ph ph-trash"></i></button>
        `;
        
        // Cliccare per riprodurre (sul testo e sull'immagine, non sul cestino per sbaglio)
        li.querySelector('.result-info').addEventListener('click', () => loadTrack(index));
        li.querySelector('.result-thumb').addEventListener('click', () => loadTrack(index));
        
        // Listener per rimuovere la traccia dalla playlist corrente
        li.querySelector('.remove-track-btn').addEventListener('click', (e) => {
             e.stopPropagation();
             localPlaylists[name].splice(index, 1);
             syncToCloud(); // Aggiorna sia il locale che il DB remoto in contemporanea!
        });
        
        singlePlaylistTracks.appendChild(li);
    });
}

deleteLocalBtn.addEventListener('click', () => {
    if(confirm(`Vuoi rimuovere la playlist "${currentViewedPlaylist}" SOLO DALLA MEMORIA LOCALE del tuo browser?`)) {
        delete localPlaylists[currentViewedPlaylist];
        currentViewedPlaylist = null;
        singlePlaylistView.classList.add('hidden');
        playlistsView.classList.remove('hidden');
        saveLocal();
        setSyncStatus("Cancellato dal Dispositivo (Cloud intatto)");
        renderPlaylistsTab();
    }
});

deleteCloudBtn.addEventListener('click', async () => {
    if(confirm(`Vuoi rimuovere la playlist "${currentViewedPlaylist}" SOLO DAL CLOUD? \n(La playlist rimarrà salvata in locale)`)) {
        if(!cloudBlobId) return alert("Nessun database cloud collegato.");
        
        try {
            const res = await fetch(`${JSONBLOB_API}/${cloudBlobId}`);
            if(res.ok) {
                const cloudData = await res.json();
                delete cloudData[currentViewedPlaylist];
                
                await fetch(`${JSONBLOB_API}/${cloudBlobId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(cloudData)
                });
                alert("Playlist eliminata fisicamente dal Cloud!");
            }
        } catch(e) {
            alert("Errore nell'eliminazione dal cloud.");
        }
    }
});

downloadCloudBtn.addEventListener('click', async () => {
    if(!cloudBlobId) return alert("Non ho trovato nessun salvataggio cloud.");
    setSyncStatus("☁️ Download in corso...");
    try {
        const res = await fetch(`${JSONBLOB_API}/${cloudBlobId}`);
        if(res.ok) {
            localPlaylists = await res.json();
            saveLocal();
            renderPlaylistsTab();
            if(currentViewedPlaylist) {
                 if(!localPlaylists[currentViewedPlaylist]) {
                     singlePlaylistView.classList.add('hidden');
                     playlistsView.classList.remove('hidden');
                     currentViewedPlaylist = null;
                 } else {
                     renderSinglePlaylist(currentViewedPlaylist);
                 }
            }
            setSyncStatus("✅ Sincronizzato dal Cloud");
            alert("Ripristino o Aggiornamento dal Cloud completato con successo!");
        }
    } catch(e) {}
});

uploadCloudBtn.addEventListener('click', () => {
    if(confirm("Vuoi inviare le tue playlist locali in CLOUD? (Questo sovrascriverà dal Cloud il salvataggio precedente)")) {
        syncToCloud(); 
    }
});

// === MODALE AGGIUNTA BRANO ===
closeModalBtn.addEventListener('click', () => {
    playlistModal.classList.add('hidden');
    trackToAddCache = null;
});

function openAddToPlaylistModal(track) {
    trackToAddCache = track;
    modalPlaylistsContainer.innerHTML = '';
    
    const keys = Object.keys(localPlaylists);
    if(keys.length === 0) {
         modalPlaylistsContainer.innerHTML = '<p style="text-align:center;color:gray;">Nessuna playlist creata. Creane una prima!</p>';
    } else {
         keys.forEach(name => {
              const div = document.createElement('div');
              div.className = 'modal-playlist-item';
              div.textContent = name;
              div.addEventListener('click', () => {
                   // Aggiunge la canzone se non c'è già nella specifica playlist
                   const exists = localPlaylists[name].find(t => t.trackId === track.trackId);
                   if(!exists) {
                       localPlaylists[name].push(track);
                       syncToCloud(); // sincro nel cloud rapido
                       alert(`Aggiunto a ${name}!`);
                   } else {
                       alert("Già presente in questa playlist.");
                   }
                   playlistModal.classList.add('hidden');
              });
              modalPlaylistsContainer.appendChild(div);
         });
    }
    playlistModal.classList.remove('hidden');
}


// === EVENT LISTENER STORICO RICERCA ===
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
playPauseBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', playPrevious);
nextBtn.addEventListener('click', playNext);

progressContainer.addEventListener('click', (e) => {
    if (!audioPlayer.duration) return;
    const clickPosition = e.offsetX;
    const totalWidth = progressContainer.clientWidth;
    const percentage = clickPosition / totalWidth;
    audioPlayer.currentTime = percentage * audioPlayer.duration;
});

audioPlayer.addEventListener('timeupdate', updateProgress);
audioPlayer.addEventListener('ended', playNext); // Vai alla successiva in automatico
audioPlayer.addEventListener('loadedmetadata', () => {
    totalTimeEl.textContent = formatTime(audioPlayer.duration);
});

// === RICERCA LOGIC ===
async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    searchInput.blur();
    resultsList.innerHTML = '';
    loader.classList.remove('hidden');

    try {
        const response = await fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        loader.classList.add('hidden');
        renderResults(data.items);
        
    } catch (error) {
        console.error('Errore durante la ricerca:', error);
        loader.classList.add('hidden');
        resultsList.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-warning"></i>
                <p>Errore di connessione. Riprova più tardi.</p>
            </div>
        `;
    }
}

function renderResults(items) {
    if (items.length === 0) {
        resultsList.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-magnifying-glass"></i>
                <p>Nessun risultato trovato.</p>
            </div>
        `;
        return;
    }

    currentQueue = items;

    items.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'result-item';
        
        const durationStr = formatTime(item.duration);
        const thumbnail = item.thumbnail || 'https://via.placeholder.com/60';
        
        li.innerHTML = `
            <img src="${thumbnail}" alt="cover" class="result-thumb" loading="lazy">
            <div class="result-info">
                <span class="result-title">${item.title}</span>
                <span class="result-channel">${item.uploaderName}</span>
            </div>
            <span class="result-duration" style="margin-right:15px;">${durationStr}</span>
            <button class="add-track-btn" title="Aggiungi alla Playlist"><i class="ph ph-plus"></i></button>
        `;
        
        li.querySelector('.result-info').addEventListener('click', () => loadTrack(index));
        li.querySelector('.result-thumb').addEventListener('click', () => loadTrack(index));
        
        li.querySelector('.add-track-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openAddToPlaylistModal(item);
        });
        
        resultsList.appendChild(li);
    });
}

function loadTrack(index) {
    currentIndex = index;
    const trackInfo = currentQueue[index];
    const thumbnail = trackInfo.thumbnail || 'https://via.placeholder.com/60';
    
    playerBar.classList.remove('hidden');
    currentTitle.textContent = "Caricamento stream (Brano intero!)...";
    currentArtist.textContent = trackInfo.uploaderName;
    currentThumbnail.src = thumbnail;
    playIcon.className = 'ph-bold ph-spinner spinner';

    try {
        // Usa il server proxy per riprodurre l'audio completo senza blocchi
        audioPlayer.src = `${BACKEND_URL}/api/stream?id=${trackInfo.videoId}`;
        currentTitle.textContent = trackInfo.title;
        
        togglePlay(true);
        setupMediaSession(trackInfo);
        
    } catch (error) {
        console.error('Errore caricamento traccia:', error);
        currentTitle.textContent = "Errore di riproduzione";
        playIcon.className = 'ph-fill ph-play';
    }
}

function togglePlay(forcePlay = false) {
    if (forcePlay === true || audioPlayer.paused) {
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                playIcon.className = 'ph-fill ph-pause';
            })
            .catch(err => console.error("Autoplay bloccato:", err));
    } else {
        audioPlayer.pause();
        isPlaying = false;
        playIcon.className = 'ph-fill ph-play';
    }
}

function playNext() {
    if (currentIndex < currentQueue.length - 1) {
        loadTrack(currentIndex + 1);
    }
}

function playPrevious() {
    if (audioPlayer.currentTime > 3) {
        audioPlayer.currentTime = 0;
    } else if (currentIndex > 0) {
        loadTrack(currentIndex - 1);
    }
}

function updateProgress() {
    const { currentTime, duration } = audioPlayer;
    if (duration) {
        const percent = (currentTime / duration) * 100;
        progressBar.style.width = `${percent}%`;
        currentTimeEl.textContent = formatTime(currentTime);
    }
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function setupMediaSession(track) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.uploaderName,
            album: 'StreamVibe App',
            artwork: [
                { src: track.thumbnail || 'https://via.placeholder.com/60', sizes: '512x512', type: 'image/jpeg' }
            ]
        });

        navigator.mediaSession.setActionHandler('play', () => togglePlay(true));
        navigator.mediaSession.setActionHandler('pause', () => togglePlay(false));
        navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
        navigator.mediaSession.setActionHandler('nexttrack', playNext);
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.fastSeek && ('fastSeek' in audioPlayer)) {
              audioPlayer.fastSeek(details.seekTime);
            } else {
              audioPlayer.currentTime = details.seekTime;
            }
        });
    }
}
