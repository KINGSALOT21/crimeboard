# 🔍 Crimeboard — Real-Time Collaborative Evidence Wall

A freeform, multiplayer pinboard — think a detective's evidence wall. Drop sticky notes and photos anywhere on an infinite, pannable, zoomable canvas, connect clues with red string, and watch everyone's changes (and cursors) sync **live** across every screen.

**🌐 Live demo:** [crimeboard-app.onrender.com](https://crimeboard-app.onrender.com)
*(Open it in two tabs — or send it to a friend — and watch the board sync in real time.)*

> ⏳ Hosted on a free tier, so the first load may take ~30–60 seconds to wake the server. Give it a moment.

![Crimeboard demo](docs/demo.gif)


---

## What it does

- **Freeform canvas** — place notes and polaroids anywhere; no rigid columns
- **Real-time collaboration** — every create, move, edit, and delete syncs instantly across all connected users via WebSockets
- **Live cursors** — see where everyone else is on the board, in real time
- **Red string connections** — drag from a note's pin to another to link clues; the string follows the notes as they move
- **Pan & zoom** — navigate an infinite board, with all coordinates handled correctly across the camera transform
- **Photo evidence** — paste an image URL to pin a polaroid; click to enlarge
- **Persistence** — the board is saved to PostgreSQL and survives restarts

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React (Vite) |
| Real-time | Socket.IO (WebSockets) |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Containerization | Docker + Docker Compose |
| Hosting | Render (app) + Neon (managed Postgres) |

## Architecture

The server is the source of truth. Clients emit changes over WebSockets; the server persists each change to PostgreSQL and broadcasts it to all *other* connected clients. New clients receive the full board state on connect. Cursors are ephemeral — broadcast in board coordinates so they map to the same spot on every screen regardless of each viewer's pan/zoom.

```
React client  ──WebSocket──▶  Express + Socket.IO server  ──SQL──▶  PostgreSQL
     ▲                                    │
     └──────── broadcast to peers ◀───────┘
```

## Running locally

You'll need Node.js and Docker installed.

**Option A — Docker (one command):**
```bash
docker compose up --build
```
Then open http://localhost:5173

**Option B — manual (two terminals):**
```bash
# Terminal 1 — backend
cd server
npm install
npm run dev

# Terminal 2 — frontend
cd client
npm install
npm run dev
```
(Requires a local PostgreSQL; see `server/db.js` for connection defaults.)

## What I learned

This was a build-from-scratch project to go deep on real-time systems. Highlights of what I worked through:

- **WebSocket sync** — moving from the request/response model to a server that *pushes* state to clients, including handling the "don't echo a change back to its sender" and "catch up late joiners" problems.
- **Coordinate systems** — implementing pan + zoom meant every screen-to-board conversion (placing notes, dragging, drawing string, positioning remote cursors) had to account for the camera transform. Getting cursors to map across viewers with different zoom levels was a satisfying fix.
- **Debugging real infrastructure** — traced a stubborn database auth failure to two PostgreSQL instances colliding on the same port (found it with `netstat`), and fixed a Docker startup race between the server and database using health checks and `depends_on: service_healthy`.
- **Deployment** — split hosting across Render (compute) and Neon (managed Postgres), wired together with environment variables, and debugged the inevitable CORS/origin mismatches between the deployed frontend and backend.

## What's next

- Sagging, shadowed string for a more physical "yarn" look
- Named, color coded cursors per user
- Click-to-delete for connections
- Auto growing polaroid captions
- Private rooms for individuals to play with friends(right now is public)
- Sign up username
- Fix Add photo issue
- Add local files 

---

Built by Kingsley Randle.