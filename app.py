"""
Campus Connect — Personality Match Backend (Flask + SQLite, MVP)
----------------------------------------------------------------
Features:
- Register/Login (password hashing)
- Create/Fetch/Update user profiles
- Matching endpoint with simple tag + interest similarity
- SQLite via SQLAlchemy, JSON-serialized tags & interests
- CORS enabled for local React dev

Run locally:
1) python -m venv .venv && source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
2) pip install -r requirements.txt  (or pip install flask flask-cors sqlalchemy pydantic werkzeug)
3) python app.py

API base: http://localhost:5000

Example curl:
- Register:
  curl -X POST http://localhost:5000/api/register -H 'Content-Type: application/json' \
    -d '{"name":"Aarav","email":"aarav@uni.edu","password":"secret","year":"2","bio":"CS + football","tags":["Study Buddy","Sports Partner"],"interests":["AI","Football"]}'
- Match for a user id:
  curl 'http://localhost:5000/api/match?user_id=1'
"""

from __future__ import annotations
from typing import List, Dict, Any
import json

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import sessionmaker, declarative_base, scoped_session

# ----------------------
# Setup
# ----------------------
app = Flask(__name__)
CORS(app)

engine = create_engine("sqlite:///campus_connect.db", echo=False, future=True)
SessionLocal = scoped_session(sessionmaker(bind=engine, autoflush=False, autocommit=False))
Base = declarative_base()

# ----------------------
# Models
# ----------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    year = Column(String(20), nullable=True)
    department = Column(String(120), nullable=True)
    bio = Column(Text, nullable=True)
    tags_json = Column(Text, default="[]")        # JSON list of strings
    interests_json = Column(Text, default="[]")   # JSON list of strings
    personality = Column(String(50), nullable=True)

    # Helpers
    @property
    def tags(self) -> List[str]:
        try:
            return json.loads(self.tags_json or "[]")
        except Exception:
            return []

    @tags.setter
    def tags(self, v: List[str]):
        self.tags_json = json.dumps(v or [])

    @property
    def interests(self) -> List[str]:
        try:
            return json.loads(self.interests_json or "[]")
        except Exception:
            return []

    @interests.setter
    def interests(self, v: List[str]):
        self.interests_json = json.dumps(v or [])

    def to_public_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "year": self.year,
            "department": self.department,
            "bio": self.bio,
            "tags": self.tags,
            "interests": self.interests,
            "personality": self.personality,
        }


Base.metadata.create_all(bind=engine)

# ----------------------
# Utilities: Matching
# ----------------------

def jaccard_similarity(a: List[str], b: List[str]) -> float:
    sa, sb = set(map(str.lower, a or [])), set(map(str.lower, b or []))
    if not sa and not sb:
        return 0.0
    inter = len(sa & sb)
    union = len(sa | sb)
    return inter / union if union else 0.0


def match_score(u: User, v: User) -> int:
    """Compute 0-100 score from tag + interest overlap.
    Weighted: tags 60%, interests 40%.
    """
    tag_sim = jaccard_similarity(u.tags, v.tags)
    interest_sim = jaccard_similarity(u.interests, v.interests)

    # Optional: light personality bonus if same type
    personality_bonus = 0.05 if (u.personality and v.personality and u.personality == v.personality) else 0.0

    score = (0.6 * tag_sim + 0.4 * interest_sim + personality_bonus) * 100
    return int(round(min(score, 100)))


# ----------------------
# Routes: Auth
# ----------------------
@app.post("/api/register")
def register():
    data = request.get_json(force=True)
    required = ["name", "email", "password"]
    if not all(k in data and data[k] for k in required):
        return jsonify({"error": "name, email, password are required"}), 400
        
    # Check for thapar.edu email
    if not data["email"].lower().endswith('@thapar.edu'):
        return jsonify({"error": "Only thapar.edu email addresses are allowed"}), 400

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == data["email"]).first():
            return jsonify({"error": "email already registered"}), 409

        user = User(
            name=data["name"].strip(),
            email=data["email"].lower().strip(),
            password_hash=generate_password_hash(data["password"]),
            year=data.get("year"),
            department=data.get("department"),
            bio=data.get("bio"),
            personality=data.get("personality"),
        )
        user.tags = data.get("tags", [])
        user.interests = data.get("interests", [])
        db.add(user)
        db.commit()
        db.refresh(user)
        return jsonify({"message": "registered", "user": user.to_public_dict()}), 201
    finally:
        db.close()


@app.post("/api/login")
def login():
    data = request.get_json(force=True)
    email = (data.get("email") or "").lower().strip()
    password = data.get("password") or ""

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "invalid credentials"}), 401
        # MVP: return user id; in production use JWT sessions
        return jsonify({"message": "ok", "user": user.to_public_dict()}), 200
    finally:
        db.close()


# ----------------------
# Routes: Users
# ----------------------
@app.get("/api/users/<int:user_id>")
def get_user(user_id: int):
    db = SessionLocal()
    try:
        user = db.query(User).get(user_id)
        if not user:
            return jsonify({"error": "user not found"}), 404
        return jsonify(user.to_public_dict())
    finally:
        db.close()


@app.put("/api/users/<int:user_id>")
def update_user(user_id: int):
    data = request.get_json(force=True)
    db = SessionLocal()
    try:
        user = db.query(User).get(user_id)
        if not user:
            return jsonify({"error": "user not found"}), 404

        for field in ["name", "year", "department", "bio", "personality"]:
            if field in data:
                setattr(user, field, data[field])
        if "tags" in data:
            user.tags = data["tags"]
        if "interests" in data:
            user.interests = data["interests"]
        db.commit()
        return jsonify({"message": "updated", "user": user.to_public_dict()})
    finally:
        db.close()


# ----------------------
# Routes: Matching
# ----------------------
@app.get("/api/match")
def match_for_user():
    """Get matches for a given user_id (query param). Optional: limit.
    Example: /api/match?user_id=1&limit=10
    """
    user_id = request.args.get("user_id", type=int)
    limit = request.args.get("limit", type=int, default=20)
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    db = SessionLocal()
    try:
        me = db.query(User).get(user_id)
        if not me:
            return jsonify({"error": "user not found"}), 404

        others = db.query(User).filter(User.id != me.id).all()
        results = []
        for other in others:
            score = match_score(me, other)
            results.append({
                "user": other.to_public_dict(),
                "score": score
            })
        results.sort(key=lambda x: x["score"], reverse=True)
        return jsonify(results[:limit])
    finally:
        db.close()


# ----------------------
# Health + Defaults
# ----------------------
@app.get("/")
def health():
    return jsonify({"status": "ok", "app": "Campus Connect Backend"})



if __name__ == "__main__":
    # Simple dev server
    app.run(host="0.0.0.0", port=5001, debug=True)
