import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export default function Chat({ user, matchUser, onExit }) {
  const roomId = [user.email, matchUser.email].sort().join("_"); // stable id
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "chats", roomId, "messages"),
      orderBy("timestamp")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => d.data()));
    });
    return unsub;
  }, [roomId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    await addDoc(collection(db, "chats", roomId, "messages"), {
      text,
      sender: user.email,
      senderName: user.name,
      timestamp: serverTimestamp(),
    });
    setInput("");
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel__header">
        <div>
          <p className="pill">Live chat</p>
          <h3>Chat with {matchUser.name}</h3>
          <p className="muted">Keep the momentum going with realtime messages.</p>
        </div>
        <div className="chat-actions">
          <button 
            className="btn small danger"
            title="Block user"
            onClick={() => alert('Block user functionality will be added later')}
          >
            🚫 Block User
          </button>
          <button className="btn ghost" onClick={onExit}>
            Close
          </button>
        </div>
      </div>

      <div className="chat-panel__messages">
        {messages.map((m, i) => {
          const mine = m.sender === user.email;
          return (
            <div
              key={i}
              className={`chat-bubble ${mine ? "chat-bubble--me" : ""}`}
            >
              <p>{m.text}</p>
              <small>{mine ? "You" : m.senderName || matchUser.name}</small>
            </div>
          );
        })}
      </div>

      <div className="chat-panel__input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message…"
        />
        <button className="btn primary" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
