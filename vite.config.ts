import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Override manual: força o backend externo, ignorando o .env injetado pela plataforma.
const SUPABASE_URL = "https://ifrsvvstjoduvxfcsozu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xHQPErZrn0lwbIIaB0Yb-w_SzSztQRi";
const SUPABASE_PROJECT_ID = "ifrsvvstjoduvxfcsozu";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(SUPABASE_URL),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(SUPABASE_PUBLISHABLE_KEY),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(SUPABASE_PROJECT_ID),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
