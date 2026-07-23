import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { runMigrations } from "./lib/migrations";

try {
  const stats = runMigrations();
  if (stats.dropped > 0 || stats.fixedPieces > 0) {
    console.info('[migrations] repaired data', stats);
  }
} catch (err) {
  console.warn('[migrations] failed', err);
}

createRoot(document.getElementById("root")!).render(<App />);
