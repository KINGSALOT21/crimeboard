import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { pool, initDb } from "./db.js";

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Crimeboard server is running" });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

// Convert a database row (snake_case) to the shape the client expects.
function rowToNote(row) {
  return {
    id: row.id,
    type: row.type,
    x: row.x,
    y: row.y,
    text: row.text,
    color: row.color,
    rotation: row.rotation,
    imageUrl: row.image_url,
  };
}

io.on("connection", async (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Load the whole board from the database for this new client.
  try {
    const { rows } = await pool.query("SELECT * FROM notes");
    socket.emit("board:init", rows.map(rowToNote));
  } catch (err) {
    console.error("Failed to load board:", err);
  }

  // Create: insert the new note, then broadcast it.
  socket.on("note:create", async (note) => {
    try {
      await pool.query(
        `INSERT INTO notes (id, type, x, y, text, color, rotation, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          note.id,
          note.type || "note",
          note.x,
          note.y,
          note.text || "",
          note.color || "#fff8b8",
          note.rotation || 0,
          note.imageUrl || "",
        ]
      );
      socket.broadcast.emit("note:create", note);
    } catch (err) {
      console.error("Create failed:", err);
    }
  });

  // Update: build a query from whatever fields changed, then broadcast.
  socket.on("note:update", async ({ id, changes }) => {
    try {
      // Map client field names to DB column names.
      const columnMap = {
        x: "x",
        y: "y",
        text: "text",
        color: "color",
        rotation: "rotation",
        imageUrl: "image_url",
      };
      const sets = [];
      const values = [];
      let i = 1;
      for (const [key, value] of Object.entries(changes)) {
        if (columnMap[key]) {
          sets.push(`${columnMap[key]} = $${i}`);
          values.push(value);
          i++;
        }
      }
      if (sets.length > 0) {
        values.push(id);
        await pool.query(
          `UPDATE notes SET ${sets.join(", ")} WHERE id = $${i}`,
          values
        );
      }
      socket.broadcast.emit("note:update", { id, changes });
    } catch (err) {
      console.error("Update failed:", err);
    }
  });

  // Delete: remove the row, then broadcast.
  socket.on("note:delete", async (id) => {
    try {
      await pool.query("DELETE FROM notes WHERE id = $1", [id]);
      socket.broadcast.emit("note:delete", id);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
  });
});

// Make sure the table exists before we start accepting connections.
initDb()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🔍 Crimeboard server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Could not initialize database:", err);
    process.exit(1);
  });