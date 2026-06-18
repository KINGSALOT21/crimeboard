// Draws all the red strings as an SVG layer over the board.
// Each connection links two notes; we look up their current positions
// and draw a line between the centers. Because positions come from the
// live notes array, dragging a note redraws its strings automatically.
export default function Strings({ notes, connections }) {
  // Quick lookup: note id -> note, so we can find positions fast.
  const noteById = {};
  for (const n of notes) noteById[n.id] = n;

  // Notes are 150px wide; aim the string at roughly the note's center.
  const NOTE_HALF = 75;

  return (
    <svg className="strings-layer">
      {connections.map((conn) => {
        const from = noteById[conn.fromId];
        const to = noteById[conn.toId];
        // If either note is missing, skip (shouldn't happen, but safe).
        if (!from || !to) return null;

        return (
          <line
            key={conn.id}
            x1={from.x + NOTE_HALF}
            y1={from.y + NOTE_HALF}
            x2={to.x + NOTE_HALF}
            y2={to.y + NOTE_HALF}
            className="string-line"
          />
        );
      })}
    </svg>
  );
}