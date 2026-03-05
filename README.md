# TikTok Polling Interactive Game

A real-time interactive polling game for TikTok Live streamers. Viewers can vote for their favorite candidates by sending specific gifts. The app features a beautiful overlay for OBS/TikTok Live and a comprehensive admin panel for management.

## 🚀 Features

- **Real-time Polling**: Votes update instantly via WebSockets.
- **TikTok Integration**: Automatically detects gifts and comments from your live stream.
- **Customizable Candidates**: Add/Remove candidates, set their photos, names, and associated gifts.
- **Top Gifter Leaderboard**: Showcases the most generous viewers.
- **Admin Control Panel**: Easy-to-use interface to manage the game, connect to TikTok, and test features.
- **Responsive & Modern UI**: Built with a "premium" aesthetic using modern typography and smooth animations.

## 🛠 Technology Stack

- **Backend**: Python, FastAPI, Uvicorn (ASGI Server).
- **TikTok Integration**: [TikTokLive](https://github.com/isaackogan/TikTokLive) (Python library).
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+).
- **Real-time**: WebSockets for low-latency updates between backend and frontend.

## 📦 Libraries Used

- `TikTokLive`: For connecting to TikTok Live and listening to events.
- `fastapi`: Modern, fast web framework for building APIs.
- `uvicorn`: Lightning-fast ASGI server implementation.
- `python-multipart`: For handling file uploads (candidate photos).
- `aiofiles`: For asynchronous file operations.
- `websockets`: For real-time communication.

## 🕹️ Admin Settings & URLs

| URL | Description |
| --- | --- |
| `http://localhost:8000/` | **Game Overlay**: Open this in OBS as a Browser Source. |
| `http://localhost:8000/admin` | **Admin Panel**: Manage settings, candidates, and live connection. |
| `/ws` | WebSocket endpoint for real-time data sync. |

### Admin Panel Tabs:
1. **General Settings**:
   - Change the application title.
   - Set the TikTok username to connect to.
   - Configure the number of top gifters to display.
2. **Manage Candidates**:
   - Add new candidates.
   - Upload candidate photos.
   - Set the **Gift Filter**: Define which gift name (e.g., "Rose", "Finger Heart") counts as a vote for that candidate.
3. **Live Control & Testing**:
   - **Connect/Disconnect**: Start or stop listening to your TikTok Live.
   - **Simulate Gift**: Test the voting logic without needing actual gifts.
   - **Simulate Comment**: Test the comment display/TTS features.
   - **Reset Game Data**: Clear all votes and the leaderboard.

## 🛠️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/bungrahman/tiktok-polling-interactive-game.git
   cd tiktok-polling-interactive-game
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**:
   ```bash
   python main.py
   ```

4. **Access the app**:
   - Open `http://localhost:8000/admin` in your browser.
   - Configure your candidates and TikTok username.
   - Click "Connect to Live" to start receiving real-time votes!

## 📸 Screenshots

*(Add your screenshots here, e.g., using `Gambar UI.png` artifacts from the root folder)*

- **Overlay**: `Gambar UI.png`
- **Candidate Management**: `Gambar UI Candidate Polling.png`
- **Admin Settings**: `Gambar UI Settings App.png`
- **Live Control**: `Gambar UI Live Control & Testing.png`

---
Developed with ❤️ for TikTok Streamers.
