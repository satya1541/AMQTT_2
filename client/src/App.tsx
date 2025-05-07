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
import Diagnostic from "@/pages/diagnostic";
import TestPage from "@/pages/test";
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
          <Route path="/settings" component={Settings} />
          <Route path="/diagnostic" component={Diagnostic} />
          <Route path="/test" component={TestPage} />
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
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Error boundary for the entire app
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error);
      setError(event.error);
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Check for service worker updates
  useEffect(() => {
    if (toast) {
      checkForAppUpdate(() => {
        setUpdateAvailable(true);
        toast({
          title: "Update Available",
          description: "A new version is available. The app will update automatically.",
          variant: "info"
        });
      });
    }
  }, [toast]);

  // Show error UI if there's a critical error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <div className="bg-red-900/70 p-6 rounded-lg max-w-lg w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <div className="mb-4 text-red-200 overflow-auto max-h-40 p-2 bg-red-950/50 rounded text-left">
            <p className="font-mono text-sm">{error.message}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

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
