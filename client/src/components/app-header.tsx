import React from 'react';
import { Link } from 'wouter';
import { useTheme } from '@/hooks/use-theme';
import { useMqtt } from '@/hooks/use-mqtt';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AppHeaderProps {
  currentPath: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({ currentPath }) => {
  const { theme, toggleTheme } = useTheme();
  const { connectionStatus } = useMqtt();

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border shadow-md">
      <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center space-x-2 mb-3 md:mb-0">
          <i className="fas fa-satellite-dish text-purple-500 text-2xl"></i>
          <h1 className="font-heading text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse-slow">MQTT Explorer</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="bg-gray-800 px-3 py-1 rounded-full flex items-center text-sm">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getStatusColor()}`}></span>
            <span>{connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <i className={`fas ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}></i>
          </Button>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <nav className="container mx-auto px-4 flex overflow-x-auto">
        <Tabs defaultValue={currentPath === '/' ? '/' : currentPath} className="w-full">
          <TabsList className="w-full justify-start h-auto bg-transparent">
            <TabsTrigger value="/" asChild className="data-[state=active]:border-purple-500 data-[state=active]:border-b-2 data-[state=active]:text-purple-500 py-3 rounded-none">
              <Link href="/" className="flex items-center px-4">
                <i className="fas fa-home mr-2"></i>Connection
              </Link>
            </TabsTrigger>
            <TabsTrigger value="/visualize" asChild className="data-[state=active]:border-purple-500 data-[state=active]:border-b-2 data-[state=active]:text-purple-500 py-3 rounded-none">
              <Link href="/visualize" className="flex items-center px-4">
                <i className="fas fa-chart-line mr-2"></i>Visualize
              </Link>
            </TabsTrigger>
            <TabsTrigger value="/rules" asChild className="data-[state=active]:border-purple-500 data-[state=active]:border-b-2 data-[state=active]:text-purple-500 py-3 rounded-none">
              <Link href="/rules" className="flex items-center px-4">
                <i className="fas fa-brain mr-2"></i>AI & Rules
              </Link>
            </TabsTrigger>
            <TabsTrigger value="/history" asChild className="data-[state=active]:border-purple-500 data-[state=active]:border-b-2 data-[state=active]:text-purple-500 py-3 rounded-none">
              <Link href="/history" className="flex items-center px-4">
                <i className="fas fa-history mr-2"></i>History
              </Link>
            </TabsTrigger>
            <TabsTrigger value="/settings" asChild className="data-[state=active]:border-purple-500 data-[state=active]:border-b-2 data-[state=active]:text-purple-500 py-3 rounded-none">
              <Link href="/settings" className="flex items-center px-4">
                <i className="fas fa-cog mr-2"></i>Settings
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </nav>
    </header>
  );
};

export default AppHeader;
