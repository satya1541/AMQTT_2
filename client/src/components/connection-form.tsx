import React, { useState, useEffect } from 'react';
import { useMqtt, ConnectionProfile } from '@/hooks/use-mqtt';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const ConnectionForm: React.FC = () => {
  const { toast } = useToast();
  const { 
    connect, 
    disconnect, 
    connectionStatus, 
    connectionsProfiles, 
    saveProfile, 
    deleteProfile,
    connectionMode,
    setConnectionMode,
    qos,
    setQos,
    retain,
    setRetain,
    enableSysTopics,
    setEnableSysTopics,
    startAutoPublishing,
    startManualPublishing,
    autoPublishInterval,
    manualPublishInterval,
    manualMessage
  } = useMqtt();

  const [brokerUrl, setBrokerUrl] = useState('wss://test.mosquitto.org:8081');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [baseTopic, setBaseTopic] = useState('sensors/demo');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [profileName, setProfileName] = useState('');
  const [showSaveProfileDialog, setShowSaveProfileDialog] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);

  // Load the first profile by default if available
  useEffect(() => {
    if (connectionsProfiles.length > 0 && !selectedProfileId) {
      const profile = connectionsProfiles[0];
      setSelectedProfileId(profile.id);
      setBrokerUrl(profile.brokerUrl);
      setBaseTopic(profile.baseTopic);
      setUsername(profile.username);
      setPassword(profile.password);
    }
  }, [connectionsProfiles, selectedProfileId]);

  const handleConnect = () => {
    connect({
      brokerUrl,
      baseTopic,
      username: username || undefined,
      password: password || undefined,
      qos,
      retain,
      enableSysTopics
    });
  };

  const handleProfileSelect = (profileId: string) => {
    const profile = connectionsProfiles.find(p => p.id === profileId);
    if (profile) {
      setSelectedProfileId(profileId);
      setBrokerUrl(profile.brokerUrl);
      setBaseTopic(profile.baseTopic);
      setUsername(profile.username);
      setPassword(profile.password);
    }
  };

  const handleSaveProfile = () => {
    if (!profileName.trim()) {
      toast({
        title: "Profile Name Required",
        description: "Please enter a name for this profile",
        variant: "warning"
      });
      return;
    }

    const profile: ConnectionProfile = {
      id: selectedProfileId || Date.now().toString(),
      name: profileName,
      brokerUrl,
      baseTopic,
      username,
      password
    };

    saveProfile(profile);
    setShowSaveProfileDialog(false);
    setSelectedProfileId(profile.id);
  };

  const handleDeleteConfirm = () => {
    if (profileToDelete) {
      deleteProfile(profileToDelete);
      if (selectedProfileId === profileToDelete) {
        setSelectedProfileId('');
      }
      setProfileToDelete(null);
    }
  };

  const handleFormReset = () => {
    setBrokerUrl('wss://test.mosquitto.org:8081');
    setUsername('');
    setPassword('');
    setBaseTopic('sensors/demo');
    setSelectedProfileId('');
  };

  const handleConnectionModeSelect = (mode: string) => {
    const connectionMode = mode as 'connect-only' | 'connect-auto' | 'connect-manual';
    setConnectionMode(connectionMode);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4">
      <h2 className="font-heading text-xl mb-4 text-blue-400">Connection Settings</h2>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Connection Profiles Dropdown */}
          <div className="md:col-span-2">
            <Label htmlFor="profile-select" className="block text-gray-400 text-sm mb-1">Connection Profile</Label>
            <div className="flex space-x-2">
              <Select value={selectedProfileId} onValueChange={handleProfileSelect}>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 focus:border-purple-500">
                  <SelectValue placeholder="Select a profile" />
                </SelectTrigger>
                <SelectContent>
                  {connectionsProfiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={showSaveProfileDialog} onOpenChange={setShowSaveProfileDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-gray-700 hover:bg-gray-600 text-white" title="Save Profile">
                    <i className="fas fa-save"></i>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 text-white border-gray-700">
                  <DialogHeader>
                    <DialogTitle>Save Connection Profile</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="profile-name" className="text-gray-300">Profile Name</Label>
                    <Input 
                      id="profile-name" 
                      value={profileName} 
                      onChange={(e) => setProfileName(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                      placeholder="Enter profile name" 
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowSaveProfileDialog(false)}>Cancel</Button>
                    <Button onClick={handleSaveProfile}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <AlertDialog open={!!profileToDelete} onOpenChange={(open) => !open && setProfileToDelete(null)}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="bg-gray-700 hover:bg-gray-600 text-white" 
                    title="Delete Profile"
                    onClick={() => selectedProfileId && setProfileToDelete(selectedProfileId)}
                    disabled={!selectedProfileId}
                  >
                    <i className="fas fa-trash"></i>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-gray-800 text-white border-gray-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Profile</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      Are you sure you want to delete this connection profile? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setProfileToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          {/* Broker URL */}
          <div className="md:col-span-2 floating-label-input">
            <Input 
              type="text" 
              id="broker-url" 
              placeholder=" " 
              value={brokerUrl} 
              onChange={(e) => setBrokerUrl(e.target.value)}
              className="bg-gray-700 rounded w-full px-3 py-2 border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              disabled={connectionStatus !== 'disconnected'}
            />
            <Label htmlFor="broker-url" className="text-gray-400">Broker URL (wss:// or ws://)</Label>
          </div>
          
          {/* Username / Password */}
          <div className="floating-label-input">
            <Input 
              type="text" 
              id="username" 
              placeholder=" " 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              className="bg-gray-700 rounded w-full px-3 py-2 border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              disabled={connectionStatus !== 'disconnected'}
            />
            <Label htmlFor="username" className="text-gray-400">Username (optional)</Label>
          </div>
          
          <div className="floating-label-input">
            <Input 
              type="password" 
              id="password" 
              placeholder=" " 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-700 rounded w-full px-3 py-2 border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              disabled={connectionStatus !== 'disconnected'}
            />
            <Label htmlFor="password" className="text-gray-400">Password (optional)</Label>
          </div>
          
          {/* Base Topic */}
          <div className="md:col-span-2 floating-label-input">
            <Input 
              type="text" 
              id="base-topic" 
              placeholder=" " 
              value={baseTopic} 
              onChange={(e) => setBaseTopic(e.target.value)}
              className="bg-gray-700 rounded w-full px-3 py-2 border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              disabled={connectionStatus !== 'disconnected'}
            />
            <Label htmlFor="base-topic" className="text-gray-400">Base Topic</Label>
          </div>
          
          {/* QoS and Retain Flag */}
          <div>
            <Label htmlFor="qos-select" className="block text-gray-400 text-sm mb-1">Quality of Service (QoS)</Label>
            <Select value={qos.toString()} onValueChange={(value) => setQos(parseInt(value) as 0 | 1 | 2)}>
              <SelectTrigger id="qos-select" className="w-full bg-gray-700 border-gray-600 focus:border-purple-500">
                <SelectValue placeholder="Select QoS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 - At most once</SelectItem>
                <SelectItem value="1">1 - At least once</SelectItem>
                <SelectItem value="2">2 - Exactly once</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="retain-switch" 
                checked={retain}
                onCheckedChange={setRetain}
              />
              <Label htmlFor="retain-switch" className="text-gray-400">Retain Messages</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="sys-topics-switch" 
                checked={enableSysTopics}
                onCheckedChange={setEnableSysTopics}
                disabled={connectionStatus !== 'disconnected'}
              />
              <Label htmlFor="sys-topics-switch" className="text-gray-400">$SYS Topics</Label>
            </div>
          </div>
          
          {/* Connection Mode */}
          <div className="md:col-span-2">
            <Label className="block text-gray-400 text-sm mb-1">Connection Mode</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                type="button" 
                variant={connectionMode === 'connect-only' ? 'default' : 'outline'}
                className={connectionMode === 'connect-only' ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}
                onClick={() => handleConnectionModeSelect('connect-only')}
                disabled={connectionStatus !== 'disconnected'}
              >
                <i className="fas fa-plug mr-1"></i> Connect Only
              </Button>
              <Button 
                type="button" 
                variant={connectionMode === 'connect-auto' ? 'default' : 'outline'}
                className={connectionMode === 'connect-auto' ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}
                onClick={() => handleConnectionModeSelect('connect-auto')}
                disabled={connectionStatus !== 'disconnected'}
              >
                <i className="fas fa-random mr-1"></i> Connect & Auto
              </Button>
              <Button 
                type="button" 
                variant={connectionMode === 'connect-manual' ? 'default' : 'outline'}
                className={connectionMode === 'connect-manual' ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}
                onClick={() => handleConnectionModeSelect('connect-manual')}
                disabled={connectionStatus !== 'disconnected'}
              >
                <i className="fas fa-clock mr-1"></i> Connect & Manual
              </Button>
            </div>
          </div>
        </div>
        
        {/* Connection Buttons */}
        <div className="flex space-x-3 pt-2">
          <Button
            id="connect-btn"
            type="button" 
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white"
            onClick={handleConnect}
            disabled={connectionStatus !== 'disconnected' || !brokerUrl || !baseTopic}
          >
            <i className="fas fa-plug mr-2"></i> Connect
          </Button>
          <Button
            id="disconnect-btn"
            type="button" 
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white"
            onClick={disconnect}
            disabled={connectionStatus === 'disconnected'}
          >
            <i className="fas fa-power-off mr-2"></i> Disconnect
          </Button>
          <Button 
            type="reset" 
            variant="outline" 
            className="bg-gray-700 hover:bg-gray-600 text-white"
            onClick={handleFormReset}
            disabled={connectionStatus !== 'disconnected'}
          >
            <i className="fas fa-redo"></i>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionForm;
