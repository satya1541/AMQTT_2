import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { MQTTProvider } from "@/hooks/use-mqtt";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <MQTTProvider>
      <App />
    </MQTTProvider>
  </ThemeProvider>
);
