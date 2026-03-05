from TikTokLive import TikTokLiveClient
try:
    from TikTokLive.events import GiftEvent, ConnectEvent, DisconnectEvent
    print("Found in TikTokLive.events")
except ImportError:
    try:
        from TikTokLive.client.events import GiftEvent, ConnectEvent, DisconnectEvent
        print("Found in TikTokLive.client.events")
    except ImportError:
        print("Not found in common locations")
