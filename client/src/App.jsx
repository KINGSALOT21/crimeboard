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

    // Sticky-note color palette.
    const colors = ["#fff8b8", "#ffd1dc", "#c8f0c8", "#cce5ff", "#ffe0b3"];

    const newNote = {
      id: crypto.randomUUID(),
      type: "note",
      x: e.clientX - 75,
      y: e.clientY - 75,
      text: "",
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 8 - 4, // between -4° and +4°
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

  function addPolaroid() {
    const url = window.prompt("Paste an image URL:");
    if (!url) return;

    const newItem = {
      id: crypto.randomUUID(),
      type: "polaroid",
      x: window.innerWidth / 2 - 90,
      y: window.innerHeight / 2 - 110,
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
    if (now - lastCursorSent.current < 40) return; // ~25 updates/sec max
    lastCursorSent.current = now;
    socket.emit("cursor:move", { x: e.clientX, y: e.clientY });
  }

  // Called when a pin-drag starts on a note.
  function startConnection(fromId, e) {
    setPendingConnection({
      fromId,
      cursorX: e.clientX,
      cursorY: e.clientY,
    });

    function handleMove(moveEvent) {
      setPendingConnection((prev) =>
        prev
          ? { ...prev, cursorX: moveEvent.clientX, cursorY: moveEvent.clientY }
          : null
      );
    }

    function handleUp(upEvent) {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);

      // What did we release over? Find a note element under the cursor.
      const el = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      const noteEl = el ? el.closest(".note") : null;
      const targetId = noteEl ? noteEl.dataset.noteId : null;

      // Valid drop: a different note than we started from.
      if (targetId && targetId !== fromId) {
        const conn = {
          id: crypto.randomUUID(),
          fromId,
          toId: targetId,
        };
        setConnections((prev) => [...prev, conn]);
        socket.emit("connection:create", conn);
      }

      setPendingConnection(null); // clear the in-progress string either way
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  return (
    <div
      className="board"
      onDoubleClick={handleBoardDoubleClick}
      onPointerMove={handlePointerMove}
    >
      <div className="board-hint">
        Double-click to pin a note 📌
        <button className="add-photo-btn" onClick={addPolaroid}>
          + Add photo
        </button>
      </div>

      <Strings notes={notes} connections={connections} pending={pendingConnection} />

      {notes.map((note) => (
        <Note
          key={note.id}
          note={note}
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
  );
}