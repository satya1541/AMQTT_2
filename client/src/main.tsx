import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { MQTTProvider } from "@/hooks/use-mqtt";
import { registerServiceWorker } from "@/lib/pwa-utils";

// Register service worker only in production
if (import.meta.env.PROD) {
  registerServiceWorker().catch(error => 
    console.error('Service worker registration failed:', error)
  );
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <MQTTProvider>
      <App />
    </MQTTProvider>
  </ThemeProvider>
);
