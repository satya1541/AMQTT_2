import { createRoot } from "react-dom/client";
import { StrictMode, Suspense, lazy, useState, useEffect } from "react";
import "./index.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { MQTTProvider } from "@/hooks/use-mqtt";
import { registerServiceWorker } from "@/lib/pwa-utils";

// Use lazy loading for App component
const App = lazy(() => import("./App"));

// Error boundary component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-lg w-full">
        <h1 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">Something went wrong</h1>
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-200 dark:border-red-800">
          <p className="font-mono text-sm break-words">{error.message}</p>
          {error.stack && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400">View stack trace</summary>
              <pre className="mt-2 text-xs overflow-auto p-2 bg-gray-100 dark:bg-gray-900 rounded">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm">Try the following:</p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li>Refresh the page</li>
            <li>Clear your browser cache</li>
            <li>Check the <a href="/basic-test.html" className="text-blue-600 dark:text-blue-400 underline">basic test page</a></li>
            <li>Visit the <a href="/diagnostic" className="text-blue-600 dark:text-blue-400 underline">diagnostic page</a></li>
          </ul>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

// Loading indicator component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading application...</p>
      </div>
    </div>
  );
}

// Root component with error handling
function Root() {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Global error handler
    const handleError = (event: ErrorEvent) => {
      console.error("Captured global error:", event.error);
      setError(event.error || new Error("Unknown error occurred"));
      event.preventDefault();
    };

    // Handle unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      setError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (error) {
    return <ErrorFallback error={error} />;
  }

  return (
    <StrictMode>
      <ThemeProvider>
        <MQTTProvider>
          <Suspense fallback={<LoadingFallback />}>
            <App />
          </Suspense>
        </MQTTProvider>
      </ThemeProvider>
    </StrictMode>
  );
}

// Register service worker only in production
if (import.meta.env.PROD) {
  registerServiceWorker().catch(error => 
    console.error('Service worker registration failed:', error)
  );
}

// Add a timeout to detect if the application is taking too long to load
setTimeout(() => {
  const root = document.getElementById("root");
  if (root && root.innerHTML === "") {
    console.error("Application failed to render within timeout period");
    root.innerHTML = `
      <div style="margin: 20px; font-family: system-ui, sans-serif;">
        <h1 style="color: #d32f2f;">Application Loading Error</h1>
        <p>The application is taking too long to load or has encountered an error.</p>
        <p>Please try:</p>
        <ul>
          <li><a href="/basic-test.html" style="color: #2196f3;">Visit the basic test page</a></li>
          <li><a href="/diagnostic" style="color: #2196f3;">Visit the diagnostic page</a></li>
          <li><a href="/" onclick="window.location.reload(); return false;" style="color: #2196f3;">Refresh the page</a></li>
        </ul>
      </div>
    `;
  }
}, 10000);

// Create and render the root component
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  const root = createRoot(rootElement);
  root.render(<Root />);
  console.log("Root component rendered successfully");
} catch (error) {
  console.error("Failed to render root component:", error);
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="margin: 20px; font-family: system-ui, sans-serif;">
        <h1 style="color: #d32f2f;">Rendering Error</h1>
        <p>Failed to render the application: ${error instanceof Error ? error.message : String(error)}</p>
        <p>Please try <a href="/basic-test.html" style="color: #2196f3;">the basic test page</a> or 
        <a href="/" onclick="window.location.reload(); return false;" style="color: #2196f3;">refresh</a>.</p>
      </div>
    `;
  }
}
