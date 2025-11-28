import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
import Chat from "./Chat"; // <-- import Chat component
import "./App.css";

// Reusable Card component
const Card = ({ children, className = "" }) => (
  <div className={`form-card ${className}`}>{children}</div>
);

export default function App() {
  const [view, setView] = useState("register"); // register | login | profile | matches
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    bio: "",
    tags: [],
    interests: "",
    personality: "",
  });
  const [matches, setMatches] = useState([]);
  const [chatUser, setChatUser] = useState(null); // <-- selected user to chat with
  const [profileName, setProfileName] = useState("");
  const [profileTags, setProfileTags] = useState([]);
  const [profileInterests, setProfileInterests] = useState("");
  const [profilePersonality, setProfilePersonality] = useState("");

  // Change port if Flask runs on 5001 instead of 5000
  const API = "http://localhost:5001/api";

  const tagOptions = [
    "Study Buddy",
    "Sports Partner",
    "Reading Partner",
    "Event Partner",
    "Music Jamming",
    "Tech Projects",
    "Fitness",
    "Volunteer",
    "Gaming",
    "Coffee Chats",
  ];
  const personalityOptions = [
    "INTJ","INTP","ENTJ","ENTP",
    "INFJ","INFP","ENFJ","ENFP",
    "ISTJ","ISFJ","ESTJ","ESFJ",
    "ISTP","ISFP","ESTP","ESFP",
  ];

  const handleChange = useCallback((e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  useEffect(() => {
    setProfileName(user?.name || "");
    setProfileTags(user?.tags || []);
    setProfileInterests((user?.interests || []).join(", "));
    setProfilePersonality(user?.personality || "");
  }, [user]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cc_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setView("profile");
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  const persistUser = (nextUser) => {
    setUser(nextUser);
    try {
      if (nextUser) {
        localStorage.setItem("cc_user", JSON.stringify(nextUser));
      } else {
        localStorage.removeItem("cc_user");
      }
    } catch {
      // storage might be unavailable (Safari private mode, etc.)
    }
  };


  const toggleTag = (tag) => {
    setForm((prev) => {
      const newTags = prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag];
      return { ...prev, tags: newTags };
    });
  };

  const register = async () => {
    try {
      const res = await axios.post(`${API}/register`, {
        name: form.name,
        email: form.email,
        password: form.password,
        bio: form.bio,
        tags: form.tags,
        interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
        personality: form.personality || null,
      });
      persistUser(res.data.user);
      setView("profile");
    } catch (err) {
      alert(err.response?.data?.error || "Error registering");
    }
  };

  const login = async () => {
    try {
      const res = await axios.post(`${API}/login`, {
        email: form.email,
        password: form.password,
      });
      persistUser(res.data.user);
      setView("profile");
    } catch (err) {
      alert(err.response?.data?.error || "Login failed");
    }
  };

  const getMatches = async () => {
    try {
      const res = await axios.get(`${API}/match?user_id=${user.id}`);
      setMatches(res.data);
      setView("matches");
    } catch (err) {
      alert("Error fetching matches");
    }
  };

  const logout = () => {
    persistUser(null);
    setView("login");
  };

  const updateName = async () => {
    if (!user) return;
    const nextName = profileName.trim();
    if (!nextName) {
      alert("Name cannot be empty.");
      return;
    }
    try {
      const res = await axios.put(`${API}/users/${user.id}`, { name: nextName });
      persistUser(res.data.user);
      setProfileName(res.data.user.name);
    } catch (err) {
      alert(err.response?.data?.error || "Unable to update name");
    }
  };

  const toggleProfileTag = (tag) => {
    setProfileTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const updatePreferences = async () => {
    if (!user) return;
    const interestsArray = profileInterests
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await axios.put(`${API}/users/${user.id}`, {
        tags: profileTags,
        interests: interestsArray,
        personality: profilePersonality || null,
      });
      persistUser(res.data.user);
      setProfileTags(res.data.user.tags);
      setProfileInterests(res.data.user.interests.join(", "));
    } catch (err) {
      alert(err.response?.data?.error || "Unable to update preferences");
    }
  };

  const isAuthView = !user && (view === "register" || view === "login");

  return (
    <div className="app-shell">
      <div className="bg-blob blob-one" />
      <div className="bg-blob blob-two" />

      <header className="app-hero">
        <p className="eyebrow">Solace</p>
        <h1>Meet collaborators, classmates, and co-founders in minutes.</h1>
        <p className="hero-copy">
          Build a beautiful, detailed profile and let our matching engine pair
          you with people who share your tags, interests, and energy.
        </p>
        <div className="hero-actions">
          <button
            className="btn primary"
            onClick={() => setView(user ? "profile" : "register")}
          >
            {user ? "Go to dashboard" : "Create your profile"}
          </button>
          {!user && (
            <button className="btn ghost" onClick={() => setView("login")}>
              I already have an account
            </button>
          )}
        </div>
        <div className="hero-stats">
          <div>
            <span>✨</span>
            <p>
              Smart tags
              <small>Curated list for every kind of student</small>
            </p>
          </div>
          <div>
            <span>🤝</span>
            <p>
              Real matches
              <small>{matches.length || 0}+ connections per session</small>
            </p>
          </div>
          <div>
            <span>⚡</span>
            <p>
              Live chat
              <small>Instant Firebase-powered DMs</small>
            </p>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="info-panel glass-card">
          <p className="subheading">Designed for campus builders</p>
          <h2>Tell your story. Discover your crew.</h2>
          <p className="info-copy">
            Swap study tips, launch side projects, train for meets, or plan the
            next showcase. Solace helps you find the exact person you
            need to do it with.
          </p>
          <ul className="info-list">
            <li>
              🎯 <span>Precision matching</span>—balanced between tags and
              interests.
            </li>
            <li>
              🧭 <span>Profile-first design</span> so you stand out instantly.
            </li>
            <li>
              🔔 <span>Realtime chat</span> to keep new connections warm.
            </li>
          </ul>
          <div className="stat-grid">
            <div>
              <strong>8+</strong>
              <small>Personality tags per user</small>
            </div>
            <div>
              <strong>40%</strong>
              <small>Interest weighting</small>
            </div>
            <div>
              <strong>100</strong>
              <small>Max match score</small>
            </div>
          </div>
        </section>

        <section className="content-panel glass-card">
          {isAuthView && (
            <div className="auth-toggle">
              <button
                className={view === "register" ? "is-active" : ""}
                onClick={() => setView("register")}
              >
                Create account
              </button>
              <button
                className={view === "login" ? "is-active" : ""}
                onClick={() => setView("login")}
              >
                Log in
              </button>
            </div>
          )}

      {/* === REGISTER === */}
      {view === "register" && (
        <Card>
              <div className="card-heading">
                <p className="pill">Step 1 · Profile</p>
                <h3>Tell us about yourself</h3>
                <p className="muted">
                  Share a quick story so we can connect you with the right
                  people.
                </p>
              </div>
              <label>
                Full name
          <input
            name="name"
                  placeholder="Aanya Patel"
                  value={form.name}
            onChange={handleChange}
          />
              </label>
              <label>
                Campus email
          <input
            name="email"
                  placeholder="you@university.edu"
                  value={form.email}
            onChange={handleChange}
          />
              </label>
              <label>
                Password
          <input
            name="password"
            type="password"
                  placeholder="••••••••"
                  value={form.password}
            onChange={handleChange}
          />
              </label>
              <label>
                Short bio
          <textarea
            name="bio"
                  placeholder="Eg. Product design major building community tools."
                  value={form.bio}
            onChange={handleChange}
                  rows={3}
                />
              </label>
              <label>
                Personality type (MBTI)
                <select
                  name="personality"
                  value={form.personality}
                  onChange={handleChange}
                >
                  <option value="">Select your MBTI</option>
                  {personalityOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
          </label>

              <label>Pick your vibe tags</label>
              <div className="tag-grid">
            {tagOptions.map((tag) => {
              const isSelected = form.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                      className={`tag-chip ${isSelected ? "is-selected" : ""}`}
                    >
                      {tag}
                </button>
              );
            })}
          </div>

              <label>
                Interests (comma separated)
          <input
            name="interests"
                  placeholder="AI research, basketball, hackathons"
                  value={form.interests}
            onChange={handleChange}
          />
              </label>

              <button className="btn primary w-full" onClick={register}>
                Sign up & find matches
          </button>
              <p className="muted center">
            Already have an account?{" "}
            <button
                  className="link-button"
              onClick={() => setView("login")}
            >
                  Log in
            </button>
          </p>
        </Card>
      )}

      {/* === LOGIN === */}
      {view === "login" && (
        <Card>
              <div className="card-heading">
                <p className="pill">Welcome back</p>
                <h3>Sign in to continue</h3>
                <p className="muted">
                  Hop back into your dashboard and continue the conversation.
                </p>
              </div>
              <label>
                Email address
          <input
            name="email"
                  placeholder="you@university.edu"
                  value={form.email}
            onChange={handleChange}
          />
              </label>
              <label>
                Password
          <input
            name="password"
            type="password"
                  placeholder="••••••••"
                  value={form.password}
            onChange={handleChange}
          />
              </label>
              <button className="btn primary w-full" onClick={login}>
                Log in
          </button>
              <p className="muted center">
                New to Solace?{" "}
            <button
                  className="link-button"
              onClick={() => setView("register")}
            >
                  Create an account
            </button>
          </p>
        </Card>
      )}

      {/* === PROFILE === */}
      {view === "profile" && user && (
            <Card className="profile-card">
              <div className="profile-header">
                <div>
                  <p className="pill">Dashboard</p>
                  <h3>Hey {user.name}, ready to meet someone new?</h3>
                  <p className="muted">Here’s a quick snapshot of your card.</p>
                </div>
                <button className="btn ghost" onClick={logout}>
                  Logout
                </button>
              </div>
              <div className="profile-body">
                <section>
                  <h4>Display name</h4>
                  <div className="name-edit">
                    <input
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Your preferred name"
                    />
                    <button className="btn primary" onClick={updateName}>
                      Save
                    </button>
                  </div>
                </section>
                <section>
                  <h4>Bio</h4>
                  <p>{user.bio || "Add a quick intro to stand out."}</p>
                </section>
                <section>
                  <h4>Personality</h4>
                  <p className="muted">
                    Select the MBTI type that best fits your vibe.
                  </p>
                  <select
                    value={profilePersonality}
                    onChange={(e) => setProfilePersonality(e.target.value)}
                  >
                    <option value="">Not set</option>
                    {personalityOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </section>
                <section>
                  <h4>Tags</h4>
                  <p className="muted">
                    Refresh your tag set to change how you show up in search.
                  </p>
                  <div className="tag-grid profile-grid">
                    {tagOptions.map((tag) => {
                      const isSelected = profileTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleProfileTag(tag)}
                          className={`tag-chip ${isSelected ? "is-selected" : ""}`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </section>
                <section>
                  <h4>Interests</h4>
                  <p className="muted">
                    Separate each interest with a comma for better discovery.
                  </p>
                  <input
                    value={profileInterests}
                    onChange={(e) => setProfileInterests(e.target.value)}
                    placeholder="e.g. AI research, volleyball, theatre tech"
                  />
                </section>
          </div>
          <button
                className="btn primary w-full"
                onClick={updatePreferences}
          >
                Update tags & interests
          </button>
              <button className="btn secondary w-full" onClick={getMatches}>
                Find my matches
          </button>
        </Card>
      )}

      {/* === MATCHES === */}
          {view === "matches" && (
            <div className="matches-card">
              <div className="card-heading">
                <p className="pill">Top recommendations</p>
                <h3>Your curated matches</h3>
                <p className="muted">
                  Tap a card to start a conversation or return to your profile to
                  fine-tune details.
                </p>
              </div>
              {matches.length === 0 && (
                <p className="muted">
                  No matches just yet. Try updating your tags or interests!
                </p>
              )}
              <div className="match-list">
                {matches.map((m, i) => (
                  <div key={i} className="match-card">
                    <div className="match-card__score">{m.score}%</div>
                    <div className="match-card__body">
                      <h4>{m.user.name}</h4>
                      <p>{m.user.bio}</p>
                      <div className="match-meta">
                        <span>{m.user.tags.slice(0, 3).join(" · ")}</span>
                        <span>{m.user.interests.slice(0, 3).join(" · ")}</span>
                      </div>
                    </div>
              <button
                      className="btn tertiary"
                onClick={() => setChatUser(m.user)}
              >
                      Chat
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn ghost w-full" onClick={() => setView("profile")}>
                Back to profile
              </button>
            </div>
          )}
        </section>
      </main>

      {/* === CHAT POPUP === */}
      {chatUser && (
        <div className="chat-overlay">
          <Chat user={user} matchUser={chatUser} onExit={() => setChatUser(null)} />
        </div>
      )}
    </div>
  );
}
