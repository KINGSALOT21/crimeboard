import { io } from "socket.io-client";

// A single shared socket connection for the whole app.
// Keeping it in its own module means every component imports the SAME
// connection instead of each opening its own — important once Weekend 2
// adds note events from multiple places.
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export const socket = io(SERVER_URL, {
  // autoConnect is true by default; left explicit here for clarity.
  autoConnect: true,
});
