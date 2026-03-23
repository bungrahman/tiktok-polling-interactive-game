let socket;
const container = document.getElementById('candidates-container');
const leaderboardList = document.getElementById('leaderboard-list');
const appTitle = document.getElementById('app-title');

function connectWS() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log('Connected to WebSocket');
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('DEBUG WS: Received data', data);

        if (data.type === 'comment') {
            console.log('DEBUG TTS: Processing comment', data.comment);
            speakComment(data.username, data.comment);
            return;
        }

        updateUI(data);
    };

    socket.onclose = () => {
        console.log('Disconnected from WebSocket. Retrying in 2s...');
        setTimeout(connectWS, 2000);
    };
}

function updateUI(state) {
    // Update Title
    if (state.app_title) appTitle.innerText = state.app_title;

    // Update Candidates
    const maxVotes = Math.max(...state.candidates.map(c => c.votes), 1);

    container.innerHTML = '';
    state.candidates.forEach(candidate => {
        const card = document.createElement('div');
        card.className = 'candidate-card';

        const progressPercent = (candidate.votes / maxVotes) * 100;

        card.innerHTML = `
            <div class="candidate-info">
                <img src="${candidate.photo || 'https://placehold.co/100x100?text=👤'}" alt="${candidate.name}" class="candidate-photo" style="border-color: ${candidate.color}">
                <div class="candidate-details">
                    <div class="candidate-name">${candidate.name}</div>
                    <div class="candidate-gift">
                        ${candidate.gift_icon ? `<img src="${candidate.gift_icon}" class="gift-icon">` : ''}
                        Send 1x ${candidate.gift_name} to Vote
                    </div>
                </div>
                <div class="vote-count" style="color: ${candidate.color}">${candidate.votes}</div>
            </div>
            <div class="progress-container">
                <div class="progress-bar" style="width: ${progressPercent}%; background-color: ${candidate.color}; color: ${candidate.color}"></div>
            </div>
        `;
        container.appendChild(card);
    });

    // Update Leaderboard
    renderLeaderboard(state.top_gifters);
}

function renderLeaderboard(gifters) {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    gifters.forEach((g, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        const avatar = g.avatar_url || 'https://placehold.co/100x100?text=👤';
        item.innerHTML = `
            <div class="rank-badge">${index + 1}</div>
            <img src="${avatar}" class="gifter-avatar" alt="${g.username}">
            <div class="gifter-name">${g.username}</div>
            <div class="gifter-score">${g.score}</div>
        `;
        list.appendChild(item);
    });
}

/* --- Reliable Text to Speech (Native Web Speech API) --- */
const audioQueue = [];
let isPlaying = false;
let audioEnabled = false;

// Global array to prevent Chrome garbage collector from destroying utterances
window.speechUtterances = [];

document.getElementById('unmute-btn').addEventListener('click', function() {
    audioEnabled = true;
    this.style.display = 'none';
    
    if (window.speechSynthesis) {
        // Unlock TTS audio context
        window.speechSynthesis.resume();
        const dummy = new SpeechSynthesisUtterance("");
        dummy.volume = 0;
        window.speechSynthesis.speak(dummy);
    }
});

function playNextAudio() {
    if (audioQueue.length === 0) {
        isPlaying = false;
        return;
    }
    
    if (!window.speechSynthesis) {
        audioQueue.shift(); // skip
        playNextAudio();
        return;
    }
    
    isPlaying = true;
    const item = audioQueue.shift();
    
    if (!audioEnabled) {
        console.warn("TTS Skipped: Audio not enabled by user yet.");
        playNextAudio();
        return;
    }
    
    const text = `${item.username} bilang, ${item.text}`;
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose ID voice if available
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.includes('id-ID') || v.lang.includes('id_ID'));
    if (idVoice) utterance.voice = idVoice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onend = () => {
        // Remove from memory
        window.speechUtterances = window.speechUtterances.filter(u => u !== utterance);
        playNextAudio();
    };
    
    utterance.onerror = (e) => {
        console.error("SpeechSynthesis error:", e);
        window.speechUtterances = window.speechUtterances.filter(u => u !== utterance);
        playNextAudio();
    };
    
    // Save to global to prevent GC bug
    window.speechUtterances.push(utterance);
    window.speechSynthesis.speak(utterance);
}

function speakComment(username, text) {
    console.log(`TTS Queued: "${text}" from ${username}`);
    audioQueue.push({ username, text });
    if (!isPlaying) {
        playNextAudio();
    }
}

// Initial connection
connectWS();
