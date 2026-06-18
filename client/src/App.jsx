import { useState, useEffect } from "react";
import { socket } from "./socket";
import Note from "./Note";
import "./index.css";
import Strings from "./Strings";

export default function App() {
  const [notes, setNotes] = useState([]);
  const [connections, setConnections] = useState([]);

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

    return () => {
      socket.off("board:init");
      socket.off("note:create");
      socket.off("note:update");
      socket.off("note:delete");
      socket.off("connection:create");
      socket.off("connection:delete");
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

  return (
    <div className="board" onDoubleClick={handleBoardDoubleClick}>
      <div className="board-hint">
        Double-click to pin a note 📌
        <button className="add-photo-btn" onClick={addPolaroid}>
          + Add photo
        </button>
      </div>

      <Strings notes={notes} connections={connections} />

      {notes.map((note) => (
        <Note
          key={note.id}
          note={note}
          onUpdate={updateNote}
          onDelete={deleteNote}
        />
      ))}
    </div>
  );
}