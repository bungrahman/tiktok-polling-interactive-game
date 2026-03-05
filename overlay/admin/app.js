let config = {
    app_title: "LIVE POLL 🔥",
    tiktok_username: "",
    top_gifter_count: 5,
    candidates: []
};

// --- TAB SYSTEM ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

        if (btn.dataset.tab === 'control') populateTestGifts();
    });
});

async function loadConfig() {
    const res = await fetch('/admin/config');
    config = await res.json();

    document.getElementById('config-title').value = config.app_title || '';
    document.getElementById('config-username').value = config.tiktok_username || '';
    document.getElementById('config-gifter-count').value = config.top_gifter_count || 5;

    renderCandidates();
}

function renderCandidates() {
    const list = document.getElementById('candidates-list');
    list.innerHTML = '';

    config.candidates.forEach((c, index) => {
        const item = document.createElement('div');
        item.className = 'candidate-item';
        item.innerHTML = `
            <div class="candidate-photo-preview" onclick="triggerUpload(${index})">
                <img id="img-${index}" src="${c.photo || 'https://placehold.co/100x100?text=Photo'}" alt="Photo">
                <input type="file" id="file-${index}" style="display:none" onchange="uploadImage(${index})">
            </div>
            <div class="flex-1">
                <div class="grid-2">
                    <div class="form-group">
                        <label>Candidate Name</label>
                        <input type="text" value="${c.name || ''}" onchange="updateCandidate(${index}, 'name', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Gift Filter (Name)</label>
                        <input type="text" value="${c.gift_name || ''}" placeholder="e.g. Rose" onchange="updateCandidate(${index}, 'gift_name', this.value)">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Color (Hex)</label>
                        <input type="color" value="${c.color || '#4f46e5'}" onchange="updateCandidate(${index}, 'color', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Sub Text</label>
                        <input type="text" value="${c.description || ''}" onchange="updateCandidate(${index}, 'description', this.value)">
                    </div>
                </div>
                <button class="danger-btn" style="padding: 5px 10px; font-size: 12px;" onclick="removeCandidate(${index})">Remove</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function addCandidate() {
    config.candidates.push({
        id: 'C' + Date.now(),
        name: 'New Candidate',
        description: 'Send gift to vote',
        photo: '',
        gift_name: '',
        color: '#4f46e5'
    });
    renderCandidates();
}

function updateCandidate(index, field, value) {
    config.candidates[index][field] = value;
}

function removeCandidate(index) {
    config.candidates.splice(index, 1);
    renderCandidates();
}

function triggerUpload(index) {
    document.getElementById(`file-${index}`).click();
}

async function uploadImage(index) {
    const file = document.getElementById(`file-${index}`).files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/admin/upload-photo', {
        method: 'POST',
        body: formData
    });
    const data = await res.json();
    config.candidates[index].photo = data.url;
    document.getElementById(`img-${index}`).src = data.url;
}

async function saveGeneralConfig() {
    config.app_title = document.getElementById('config-title').value;
    config.tiktok_username = document.getElementById('config-username').value;
    config.top_gifter_count = parseInt(document.getElementById('config-gifter-count').value);

    await saveConfigToServer();
    alert('Settings saved!');
}

async function saveCandidates() {
    await saveConfigToServer();
    alert('Candidates updated!');
}

async function saveConfigToServer() {
    await fetch('/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
}

// --- LIVE CONTROL ---

async function connectTikTok() {
    const username = document.getElementById('config-username').value;
    if (!username) return alert('Enter TikTok username first!');

    const res = await fetch('/admin/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });
    const data = await res.json();
    document.getElementById('connection-status').innerText = 'Connecting...';
    document.getElementById('connection-status').className = 'status-badge connected';
}

async function disconnectTikTok() {
    await fetch('/admin/disconnect', { method: 'POST' });
    document.getElementById('connection-status').innerText = 'Disconnected';
    document.getElementById('connection-status').className = 'status-badge disconnected';
}

function populateTestGifts() {
    const select = document.getElementById('test-gift-name');
    select.innerHTML = '';
    config.candidates.forEach(c => {
        if (!c.gift_name) return;
        const opt = document.createElement('option');
        opt.value = c.gift_name;
        opt.innerText = `${c.gift_name} (${c.name})`;
        select.appendChild(opt);
    });
}

async function sendTestGift() {
    const username = document.getElementById('test-username').value;
    const gift_name = document.getElementById('test-gift-name').value;
    const count = document.getElementById('test-gift-count').value;

    await fetch('/admin/test-gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, gift_name, count })
    });
}

async function resetGame() {
    if (confirm('Reset all scores?')) {
        await fetch('/admin/reset', { method: 'POST' });
    }
}

// --- WEBSOCKET FOR REALTIME STATUS ---
let socket;
function connectWS() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.status) {
            updateConnectionStatus(data.status, data.message || "");
        }
    };

    socket.onclose = () => setTimeout(connectWS, 2000);
}

function updateConnectionStatus(status, message) {
    const el = document.getElementById('connection-status');
    if (!el) return;

    if (status === 'connected') {
        el.innerText = 'Connected';
        el.className = 'status-badge connected';
    } else if (status === 'disconnected') {
        el.innerText = 'Disconnected';
        el.className = 'status-badge disconnected';
    } else if (status === 'connecting') {
        el.innerText = 'Connecting...';
        el.className = 'status-badge connected'; // Use same color as connected for now
    } else if (status === 'error') {
        el.innerText = 'Error: ' + message;
        el.className = 'status-badge disconnected';
    }
}

async function sendTestComment() {
    const text = document.getElementById('test-comment-text').value;
    const username = document.getElementById('test-username').value;

    await fetch('/admin/test-comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            comment: text
        })
    });
}

// Initial load
loadConfig();
connectWS();
