import os
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from TikTokLive import TikTokLiveClient
from TikTokLive.events import GiftEvent, ConnectEvent, DisconnectEvent, CommentEvent
from game_engine import GameEngine
import uvicorn
import aiofiles

app = FastAPI()

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "config", "candidates.json")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
OVERLAY_DIR = os.path.join(BASE_DIR, "overlay")

# Ensure uploads dir exists
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Initialize Game Engine
engine = GameEngine(CONFIG_PATH)

# TikTok Client
client = None
tiktok_task = None

# Static files
app.mount("/overlay", StaticFiles(directory=OVERLAY_DIR), name="overlay")
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Send initial state
        await websocket.send_json(engine.get_state())

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# --- API ENDPOINTS ---

@app.get("/")
async def get_overlay():
    with open(os.path.join(OVERLAY_DIR, "index.html"), "r") as f:
        return HTMLResponse(content=f.read())

@app.get("/admin")
async def get_admin():
    with open(os.path.join(OVERLAY_DIR, "admin", "index.html"), "r") as f:
        return HTMLResponse(content=f.read())

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/state")
async def get_state():
    return engine.get_state()

@app.get("/admin/config")
async def get_config():
    return engine.config

@app.post("/admin/config")
async def update_config(request: Request):
    new_config = await request.json()
    engine.save_config(new_config)
    await manager.broadcast(engine.get_state())
    return {"status": "success"}

@app.post("/admin/upload-photo")
async def upload_photo(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOADS_DIR, file.filename)
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    return {"url": f"/uploads/{file.filename}"}

@app.post("/admin/reset")
async def reset_game():
    engine.reset_scores()
    await manager.broadcast(engine.get_state())
    return {"status": "success"}

@app.post("/admin/test-gift")
async def test_gift(request: Request):
    data = await request.json()
    username = data.get("username", "TestUser")
    gift_name = data.get("gift_name", "Rose")
    count = int(data.get("count", 1))
    
    engine.process_gift(username, gift_name, count)
    await manager.broadcast(engine.get_state())
    return {"status": "success"}

# --- TIKTOK LIVE CLIENT ---

async def tiktok_listener(username):
    global client
    # Sanitize username (strip @ if present)
    sanitized_username = username.strip().replace("@", "")
    print(f"DEBUG: Attempting to connect to TikTok Live for @{sanitized_username} (original: {username})")
    
    client = TikTokLiveClient(unique_id=sanitized_username)

    @client.on(ConnectEvent)
    async def on_connect(event: ConnectEvent):
        print(f"DEBUG: Connected to @{sanitized_username} successfully!")
        await manager.broadcast({"status": "connected", "username": sanitized_username})

    @client.on(DisconnectEvent)
    async def on_disconnect(event: DisconnectEvent):
        print(f"DEBUG: Disconnected from @{sanitized_username}.")
        await manager.broadcast({"status": "disconnected", "username": sanitized_username})

    @client.on(CommentEvent)
    async def on_comment(event: CommentEvent):
        print(f"DEBUG: Received comment from {event.user.unique_id}: {event.comment}")
        await manager.broadcast({
            "type": "comment",
            "username": event.user.unique_id,
            "comment": event.comment
        })

    @client.on(GiftEvent)
    async def on_gift(event: GiftEvent):
        # Extract avatar URL safely
        avatar_url = ""
        try:
            if event.user.avatar and event.user.avatar.urls:
                avatar_url = event.user.avatar.urls[0]
        except:
            pass

        print(f"DEBUG: Received gift: {event.gift.info.name} x{event.gift.count} from {event.user.unique_id} (Avatar: {avatar_url})")
        
        if event.gift.repeat_end:
            # For repeatable gifts, process when done
            engine.process_gift(event.user.unique_id, event.gift.info.name, event.gift.count, avatar_url=avatar_url)
            await manager.broadcast(engine.get_state())
        elif not event.gift.repeatable:
            # Non-repeatable gifts
            engine.process_gift(event.user.unique_id, event.gift.info.name, event.gift.count, avatar_url=avatar_url)
            await manager.broadcast(engine.get_state())

    try:
        await client.start()
    except Exception as e:
        print(f"DEBUG: TikTok Connection Error: {e}")
        await manager.broadcast({"status": "error", "message": str(e)})

@app.post("/admin/connect")
async def connect_tiktok(request: Request):
    global tiktok_task, client
    data = await request.json()
    username = data.get("username")
    
    if tiktok_task:
        tiktok_task.cancel()
    
    tiktok_task = asyncio.create_task(tiktok_listener(username))
    return {"status": "connecting", "username": username}

@app.post("/admin/disconnect")
async def disconnect_tiktok():
    global tiktok_task, client
    if client:
        await client.stop()
    if tiktok_task:
        tiktok_task.cancel()
        tiktok_task = None
    return {"status": "disconnected"}

@app.post("/admin/test-gift")
async def test_gift(request: Request):
    data = await request.json()
    username = data.get("username", "TestUser")
    gift_name = data.get("gift_name", "Rose")
    count = int(data.get("count", 1))
    avatar_url = data.get("avatar_url", "https://placehold.co/100x100?text=Top")
    
    engine.process_gift(username, gift_name, count, avatar_url=avatar_url)
    await manager.broadcast(engine.get_state())
    return {"status": "success"}

@app.post("/admin/test-comment")
async def test_comment(request: Request):
    data = await request.json()
    username = data.get("username", "TestUser")
    comment = data.get("comment", "Halo guys, semangat ya!")
    
    await manager.broadcast({
        "type": "comment",
        "username": username,
        "comment": comment
    })
    return {"status": "success"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
