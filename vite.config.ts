import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const supabaseUrl = "https://ifrsvvstjoduvxfcsozu.supabase.co";
const supabasePublishableKey = "sb_publishable_xHQPErZrn0lwbIIaB0Yb-w_SzSztQRi";
const supabaseProjectId = "ifrsvvstjoduvxfcsozu";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(supabaseProjectId),
  },
}));
