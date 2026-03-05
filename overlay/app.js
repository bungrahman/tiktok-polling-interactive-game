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

        if (data.type === 'comment') {
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
                <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-photo" style="border-color: ${candidate.color}">
                <div class="candidate-details">
                    <div class="candidate-name">${candidate.name}</div>
                    <div class="candidate-gift">Send 1x ${candidate.gift_name} to Vote</div>
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

function speakComment(username, text) {
    if (!window.speechSynthesis) return;

    // Optional: add "kata [username]" or similar
    const utterance = new SpeechSynthesisUtterance(`${text}`);

    // Try to find an Indonesian voice
    const idVoice = window.speechSynthesis.getVoices().find(v => v.lang.includes('id-ID'));
    if (idVoice) utterance.voice = idVoice;

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
}

// Initial connection
connectWS();
