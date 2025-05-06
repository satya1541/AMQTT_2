import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { MQTTProvider } from "@/hooks/use-mqtt";
import { registerServiceWorker } from "@/lib/pwa-utils";

// Register service worker for PWA functionality
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <MQTTProvider>
      <App />
    </MQTTProvider>
  </ThemeProvider>
);
