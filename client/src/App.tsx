import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Visualize from "@/pages/visualize";
import Rules from "@/pages/rules";
import History from "@/pages/history";
import Settings from "@/pages/settings";
import LiveFeed from "@/pages/live-feed";
import AppHeader from "@/components/app-header";
import { useEffect, useState } from "react";
import { MQTTProvider } from "@/hooks/use-mqtt";
import { ThemeProvider } from "@/hooks/use-theme";
import { RulesProvider } from "@/hooks/use-rules";
import { ChartsProvider } from "@/hooks/use-charts";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import OfflineIndicator from "@/components/offline-indicator";
import { checkForAppUpdate } from "@/lib/pwa-utils";
import { useToast } from "@/hooks/use-toast";

function Router() {
  const [location] = useLocation();

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Alt+C for Connect
      if (e.ctrlKey && e.altKey && e.key === "c") {
        document.getElementById("connect-btn")?.click();
      }
      // Ctrl+Alt+D for Disconnect
      if (e.ctrlKey && e.altKey && e.key === "d") {
        document.getElementById("disconnect-btn")?.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <>
      <AppHeader currentPath={location} />
      <main className="flex-grow container mx-auto px-4 py-6 bg-grid">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/visualize" component={Visualize} />
          <Route path="/rules" component={Rules} />
          <Route path="/history" component={History} />
          <Route path="/live-feed" component={LiveFeed} />
          <Route path="/settings" component={Settings} />
          {/* Fallback to 404 */}
          <Route component={NotFound} />
        </Switch>
      </main>
      <footer className="bg-background border-t border-border py-4 mt-6">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <div>MQTT Explorer v1.0.0</div>
          <div className="flex space-x-4 mt-2 md:mt-0">
            <a href="#" className="hover:text-foreground">Documentation</a>
            <a href="#" className="hover:text-foreground">GitHub</a>
            <a href="#" className="hover:text-foreground">Report Issue</a>
          </div>
        </div>
      </footer>
    </>
  );
}

function App() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const { toast } = useToast();

  // Check for service worker updates
  useEffect(() => {
    if (toast) {
      checkForAppUpdate(() => {
        setUpdateAvailable(true);
        toast({
          title: "Update Available",
          description: "A new version is available. The app will update automatically.",
          variant: "info",
          id: Date.now().toString()
        });
      });
    }
  }, [toast]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MQTTProvider>
          <RulesProvider>
            <ChartsProvider>
              <Router />
              {/* Show PWA Install Prompt */}
              <div className="fixed bottom-4 left-4 right-4 md:left-auto z-40">
                <PWAInstallPrompt />
              </div>
              {/* Show Offline Indicator */}
              <OfflineIndicator />
              <Toaster />
            </ChartsProvider>
          </RulesProvider>
        </MQTTProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
