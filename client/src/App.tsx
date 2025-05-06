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
import AppHeader from "@/components/app-header";
import { useEffect } from "react";
import { MQTTProvider } from "@/hooks/use-mqtt";
import { ThemeProvider } from "@/hooks/use-theme";
import { RulesProvider } from "@/hooks/use-rules";
import { ChartsProvider } from "@/hooks/use-charts";

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
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MQTTProvider>
          <RulesProvider>
            <ChartsProvider>
              <Router />
              <Toaster />
            </ChartsProvider>
          </RulesProvider>
        </MQTTProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
