import json
import os

class GameEngine:
    def __init__(self, config_path):
        self.config_path = config_path
        self.base_dir = os.path.dirname(config_path)
        self.votes_path = os.path.join(self.base_dir, "votes.json")
        self.gifters_path = os.path.join(self.base_dir, "gifters.json")
        
        self.votes = {}
        self.gifters = {}
        self.config = {}
        self.load_config()
        self.load_scores()

    def load_config(self):
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r') as f:
                self.config = json.load(f)
        else:
            self.config = {
                "app_title": "Tokoh Favorit",
                "background_color": "#00000000",
                "top_gifter_count": 5,
                "candidates": []
            }

    def load_scores(self):
        # Initialize default votes for candidates in config
        for c in self.config.get('candidates', []):
            if c['id'] not in self.votes:
                self.votes[c['id']] = 0
        
        # Load persisted votes
        if os.path.exists(self.votes_path):
            with open(self.votes_path, 'r') as f:
                loaded_votes = json.load(f)
                self.votes.update(loaded_votes)
        
        # Load persisted gifters
        if os.path.exists(self.gifters_path):
            with open(self.gifters_path, 'r') as f:
                self.gifters = json.load(f)

    def save_scores(self):
        with open(self.votes_path, 'w') as f:
            json.dump(self.votes, f)
        with open(self.gifters_path, 'w') as f:
            json.dump(self.gifters, f)

    def reset_scores(self):
        self.votes = {c['id']: 0 for c in self.config.get('candidates', [])}
        self.gifters = {}
        self.save_scores()

    def process_gift(self, username, gift_name, count, avatar_url=None):
        gift_name_clean = gift_name.strip().lower()
        print(f"DEBUG ENGINE: Processing gift '{gift_name_clean}' from {username} x{count}")
        
        # find candidate that matches the gift name
        candidate_id = None
        for c in self.config.get('candidates', []):
            if c['gift_name'].strip().lower() == gift_name_clean:
                candidate_id = c['id']
                break
        
        if candidate_id:
            self.votes[candidate_id] = self.votes.get(candidate_id, 0) + count
            print(f"DEBUG ENGINE: Matched candidate {candidate_id}. New votes: {self.votes[candidate_id]}")
        else:
            print(f"DEBUG ENGINE: No candidate matched gift '{gift_name_clean}'")
            
        # Update leaderboard
        current_data = self.gifters.get(username, {"score": 0, "avatar_url": ""})
        # Handle cases where gifters might still be just an int from old data
        if isinstance(current_data, int):
            current_data = {"score": current_data, "avatar_url": ""}
            
        new_score = current_data["score"] + count
        # Update avatar only if provided
        new_avatar = avatar_url if avatar_url else current_data.get("avatar_url", "")
        
        self.gifters[username] = {"score": new_score, "avatar_url": new_avatar}
        self.save_scores()
        
        return candidate_id

    def get_state(self):
        # Sort gifters and take top N
        # Handle both old (int) and new (dict) gifter formats
        processed_gifters = []
        for username, data in self.gifters.items():
            if isinstance(data, int):
                processed_gifters.append({"username": username, "score": data, "avatar_url": ""})
            else:
                processed_gifters.append({
                    "username": username, 
                    "score": data.get("score", 0), 
                    "avatar_url": data.get("avatar_url", "")
                })

        sorted_gifters = sorted(processed_gifters, key=lambda x: x["score"], reverse=True)
        top_gifters = sorted_gifters[:self.config.get('top_gifter_count', 5)]
        
        # Sort candidates by votes in descending order
        sorted_candidates = sorted(
            [
                {**c, "votes": self.votes.get(c['id'], 0)} 
                for c in self.config.get('candidates', [])
            ],
            key=lambda x: x['votes'],
            reverse=True
        )
        
        return {
            "app_title": self.config.get("app_title"),
            "background_color": self.config.get("background_color"),
            "candidates": sorted_candidates,
            "top_gifters": top_gifters
        }

    def save_config(self, new_config):
        self.config = new_config
        with open(self.config_path, 'w') as f:
            json.dump(new_config, f, indent=2)
        # Ensure new candidates have 0 votes if not present
        for c in new_config.get('candidates', []):
            if c['id'] not in self.votes:
                self.votes[c['id']] = 0
        self.save_scores()
