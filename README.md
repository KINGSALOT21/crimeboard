# 🔍 Crimeboard — Real-Time Collaborative Evidence Wall

A freeform, real-time collaborative pinboard — think a detective's evidence wall or a fridge covered in notes. Multiple people open the same board and every sticky note, drag, edit, and connection syncs **live** across everyone's screen via WebSockets.

> **Status:** Weekend 0 — skeleton. React + Express + Socket.IO are wired together and confirmed talking. No board yet; that's Weekend 1.

## Stack

- **Frontend:** React (Vite)
- **Backend / real-time:** Node + Express + Socket.IO
- **Database:** PostgreSQL *(added Weekend 3)*
- **Containerization:** Docker *(added Weekend 5)*

## Project structure

```
crimeboard/
├── server/          # Express + Socket.IO backend
│   ├── index.js     # Server entry point
│   └── package.json
└── client/          # React (Vite) frontend
    ├── src/
    │   ├── App.jsx
    │   ├── socket.js   # Socket.IO client connection
    │   └── main.jsx
    └── package.json
```

## Running it locally

You need **two terminals** — one for the server, one for the client.

**Terminal 1 — backend:**
```bash
cd server
npm install
npm run dev
```
Server runs on http://localhost:3001

**Terminal 2 — frontend:**
```bash
cd client
npm install
npm run dev
```
Client runs on http://localhost:5173

Open http://localhost:5173 — you should see a "Connected to server ✅" status, proving the WebSocket handshake works.

