import { useState, useEffect, useRef } from "react";
import { socket } from "./socket";
import Note from "./Note";
import "./index.css";
import Strings from "./Strings";

export default function App() {
  const [notes, setNotes] = useState([]);
  const [connections, setConnections] = useState([]);
  // While dragging a new string: which note it started from, and where
  // the cursor currently is. null when not connecting.
  const [pendingConnection, setPendingConnection] = useState(null);
  // Other people's cursors, keyed by their socket id.
  const [cursors, setCursors] = useState({});
  // Camera: how far the board is panned, and the zoom level.
  const [camera, setCamera] = useState({ panX: 0, panY: 0, zoom: 1 });


  // ---- Listen for changes coming FROM the server (other people) ----
  useEffect(() => {
    // board:init now sends { notes, connections }
    socket.on("board:init", (board) => {
      setNotes(board.notes || []);
      setConnections(board.connections || []);
    });

    socket.on("note:create", (note) => {
      setNotes((prev) => [...prev, note]);
    });

    socket.on("note:update", ({ id, changes }) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...changes } : n))
      );
    });

    socket.on("note:delete", (id) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      // also drop any strings touching that note
      setConnections((prev) =>
        prev.filter((c) => c.fromId !== id && c.toId !== id)
      );
    });

    socket.on("connection:create", (conn) => {
      setConnections((prev) => [...prev, conn]);
    });

    socket.on("connection:delete", (id) => {
      setConnections((prev) => prev.filter((c) => c.id !== id));
    });

    socket.on("cursor:move", ({ id, x, y }) => {
      setCursors((prev) => ({ ...prev, [id]: { x, y } }));
    });

    socket.on("cursor:gone", (id) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    return () => {
      socket.off("board:init");
      socket.off("note:create");
      socket.off("note:update");
      socket.off("note:delete");
      socket.off("connection:create");
      socket.off("connection:delete");
      socket.off("cursor:move");
      socket.off("cursor:gone");
    };
  }, []);

  // ---- Our own actions: update local state AND tell the server ----

  function handleBoardDoubleClick(e) {
    if (e.target.closest(".note")) return;

    const colors = ["#fff8b8", "#ffd1dc", "#c8f0c8", "#cce5ff", "#ffe0b3"];

    // Convert screen click to board coordinates (accounts for pan + zoom).
    const board = screenToBoard(e.clientX, e.clientY);

    const newNote = {
      id: crypto.randomUUID(),
      type: "note",
      x: board.x - 75,
      y: board.y - 75,
      text: "",
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 8 - 4,
    };
    setNotes((prev) => [...prev, newNote]);
    socket.emit("note:create", newNote);
  }


  function updateNote(id, changes) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...changes } : n))
    );
    socket.emit("note:update", { id, changes });
  }

  // Convert a screen coordinate to a board coordinate using the camera.
  function screenToBoard(screenX, screenY) {
    return {
      x: (screenX - camera.panX) / camera.zoom,
      y: (screenY - camera.panY) / camera.zoom,
    };
  }

  // Pan the board by dragging empty space.
  function handleBoardPanStart(e) {
    // Only pan when pressing the board background itself, not a note/cursor.
    if (e.target.closest(".note") || e.target.closest(".board-hint")) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startPan = { x: camera.panX, y: camera.panY };

    function onMove(moveEvent) {
      setCamera((cam) => ({
        ...cam,
        panX: startPan.x + (moveEvent.clientX - startX),
        panY: startPan.y + (moveEvent.clientY - startY),
      }));
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // Zoom with the scroll wheel, centered on the cursor.
  function handleWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9; // scroll up = zoom in
    setCamera((cam) => {
      const newZoom = Math.min(Math.max(cam.zoom * zoomFactor, 0.3), 3);
      // Keep the point under the cursor stationary while zooming.
      const k = newZoom / cam.zoom;
      return {
        zoom: newZoom,
        panX: e.clientX - (e.clientX - cam.panX) * k,
        panY: e.clientY - (e.clientY - cam.panY) * k,
      };
    });
  }


  function addPolaroid() {
    const url = window.prompt("Paste an image URL:");
    if (!url) return;

    // Drop it in the middle of the current view, in board coordinates.
    const center = screenToBoard(window.innerWidth / 2, window.innerHeight / 2);

    const newItem = {
      id: crypto.randomUUID(),
      type: "polaroid",
      x: center.x - 90,
      y: center.y - 110,
      imageUrl: url,
      text: "",
      color: "#ffffff",
      rotation: Math.random() * 8 - 4,
    };
    setNotes((prev) => [...prev, newItem]);
    socket.emit("note:create", newItem);
  }

  function deleteNote(id) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    socket.emit("note:delete", id);
  }

  // Throttle cursor broadcasts so we don't spam the server.
  const lastCursorSent = useRef(0);

  function handlePointerMove(e) {
    const now = Date.now();
    if (now - lastCursorSent.current < 40) return;
    lastCursorSent.current = now;
    const board = screenToBoard(e.clientX, e.clientY);
    socket.emit("cursor:move", { x: board.x, y: board.y });
  }

  // Called when a pin-drag starts on a note.
  function startConnection(fromId, e) {
    const board = screenToBoard(e.clientX, e.clientY);
    setPendingConnection({
      fromId,
      cursorX: board.x,
      cursorY: board.y,
    });

    function handleMove(moveEvent) {
      const b = screenToBoard(moveEvent.clientX, moveEvent.clientY);
      setPendingConnection((prev) =>
        prev ? { ...prev, cursorX: b.x, cursorY: b.y } : null
      );
    }

    function handleUp(upEvent) {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);

      const el = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      const noteEl = el ? el.closest(".note") : null;
      const targetId = noteEl ? noteEl.dataset.noteId : null;

      if (targetId && targetId !== fromId) {
        const conn = {
          id: crypto.randomUUID(),
          fromId,
          toId: targetId,
        };
        setConnections((prev) => [...prev, conn]);
        socket.emit("connection:create", conn);
      }

      setPendingConnection(null);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  return (
    <div
      className="board"
      onPointerDown={handleBoardPanStart}
      onDoubleClick={handleBoardDoubleClick}
      onPointerMove={handlePointerMove}
      onWheel={handleWheel}
    >
      <div className="board-hint">
        Double-click to pin a note 📌 · drag empty space to pan · scroll to zoom
        <button className="add-photo-btn" onClick={addPolaroid}>
          + Add photo
        </button>
      </div>

      {/* Everything on the board lives in here and moves with the camera. */}
      <div
        className="board-content"
        style={{
          transform: `translate(${camera.panX}px, ${camera.panY}px) scale(${camera.zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <Strings notes={notes} connections={connections} pending={pendingConnection} />

        {notes.map((note) => (
          <Note
            key={note.id}
            note={note}
            zoom={camera.zoom}
            onUpdate={updateNote}
            onDelete={deleteNote}
            onStartConnection={startConnection}
          />
        ))}

        {Object.entries(cursors).map(([id, pos]) => (
          <div
            key={id}
            className="remote-cursor"
            style={{ left: pos.x, top: pos.y }}
          >
            <div className="remote-cursor-dot" />
            <span className="remote-cursor-label">detective</span>
          </div>
        ))}
      </div>
    </div>
  );
}