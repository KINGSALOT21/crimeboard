import { useRef } from "react";

export default function Note({ note, onUpdate, onDelete }) {
  // Track the drag offset so the note doesn't "jump" to the cursor on grab.
  const dragOffset = useRef({ x: 0, y: 0 });

  function handlePointerDown(e) {
    // Don't start a drag when clicking the textarea or delete button.
    if (
      e.target.tagName === "TEXTAREA" ||
      e.target.tagName === "INPUT" ||
      e.target.tagName === "BUTTON"
    ) {
      return;
    }
    // Remember where inside the note we grabbed it.
    dragOffset.current = {
      x: e.clientX - note.x,
      y: e.clientY - note.y,
    };

    function handlePointerMove(moveEvent) {
      onUpdate(note.id, {
        x: moveEvent.clientX - dragOffset.current.x,
        y: moveEvent.clientY - dragOffset.current.y,
      });
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  const isPolaroid = note.type === "polaroid";

  return (
    <div
      className={isPolaroid ? "note polaroid" : "note"}
      style={{
        left: note.x,
        top: note.y,
        background: note.color || "#fff8b8",
        transform: `rotate(${note.rotation || 0}deg)`,
      }}
      onPointerDown={handlePointerDown}
    >
      <button
        className="note-delete"
        onClick={() => onDelete(note.id)}
        title="Remove"
      >
        ×
      </button>

      {isPolaroid ? (
        <>
          <img
            className="polaroid-img"
            src={note.imageUrl}
            alt="evidence"
            draggable={false}
          />
          <textarea
            className="polaroid-caption"
            value={note.text}
            placeholder="caption..."
            rows={2}
            onChange={(e) => onUpdate(note.id, { text: e.target.value })}
          />
        </>
      ) : (
        <textarea
          className="note-text"
          value={note.text}
          placeholder="Write a clue..."
          onChange={(e) => onUpdate(note.id, { text: e.target.value })}
        />
      )}
    </div>
  );
}