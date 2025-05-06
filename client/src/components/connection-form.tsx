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
import { motion, AnimatePresence } from 'framer-motion';

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
        variant: "warning",
        id: Date.now().toString()
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

  const connectionStatusColors = {
    connected: "from-green-600 to-green-500",
    connecting: "from-yellow-600 to-yellow-500",
    disconnected: "from-red-600 to-red-500"
  };

  // Helper function for status indicator classes
  const getStatusIndicatorClass = () => {
    switch (connectionStatus) {
      case 'connected': return 'status-indicator status-connected';
      case 'connecting': return 'status-indicator status-connecting';
      case 'disconnected': return 'status-indicator status-disconnected';
      default: return 'status-indicator';
    }
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div 
      className="glass-card neon-border rounded-lg shadow-xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-center mb-6">
        <motion.h2 
          className="font-heading text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Connection Settings
        </motion.h2>
        
        <motion.div 
          className={`px-3 py-1 rounded-full flex items-center text-sm bg-gradient-to-r ${connectionStatusColors[connectionStatus]} bg-opacity-20 shadow-lg`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className={getStatusIndicatorClass()}></div>
          <span className="ml-2 font-medium">
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </motion.div>
      </div>
      
      <motion.div 
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Connection Profiles Dropdown */}
          <motion.div 
            className="md:col-span-2" 
            variants={itemVariants}
          >
            <Label htmlFor="profile-select" className="block text-gray-300 text-sm mb-2 flex items-center">
              <i className="fas fa-bookmark text-purple-400 mr-2"></i>
              Connection Profile
            </Label>
            <div className="flex space-x-2">
              <Select value={selectedProfileId} onValueChange={handleProfileSelect}>
                <SelectTrigger className="w-full bg-gray-800/80 border-gray-700 focus:border-purple-500 shadow-inner">
                  <SelectValue placeholder="Select a profile" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {connectionsProfiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id} className="hover:bg-gray-700">
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Dialog open={showSaveProfileDialog} onOpenChange={setShowSaveProfileDialog}>
                <DialogTrigger asChild>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      variant="outline" 
                      className="bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-white rounded-full h-10 w-10 p-0 relative overflow-hidden" 
                      title="Save Profile"
                    >
                      <motion.span 
                        className="absolute inset-0 bg-blue-500/10"
                        initial={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.5, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                      />
                      <motion.i className="fas fa-save text-blue-400 relative z-10" />
                    </Button>
                  </motion.div>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 text-white border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                      Save Connection Profile
                    </DialogTitle>
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
                    <Button onClick={handleSaveProfile} className="gradient-btn">Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <AlertDialog open={!!profileToDelete} onOpenChange={(open) => !open && setProfileToDelete(null)}>
                <AlertDialogTrigger asChild>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      variant="outline" 
                      className="bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-white rounded-full h-10 w-10 p-0 relative overflow-hidden" 
                      title="Delete Profile"
                      onClick={() => selectedProfileId && setProfileToDelete(selectedProfileId)}
                      disabled={!selectedProfileId}
                    >
                      <motion.span 
                        className="absolute inset-0 bg-red-500/10"
                        initial={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.5, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                      />
                      <motion.i className="fas fa-trash text-red-400 relative z-10" />
                    </Button>
                  </motion.div>
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
          </motion.div>
          
          {/* Broker URL */}
          <motion.div className="md:col-span-2 floating-label-input" variants={itemVariants}>
            <div className="relative">
              <Input 
                type="text" 
                id="broker-url" 
                placeholder=" " 
                value={brokerUrl} 
                onChange={(e) => setBrokerUrl(e.target.value)}
                className="bg-gray-800/80 rounded-md w-full px-10 py-3 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner"
                disabled={connectionStatus !== 'disconnected'}
              />
              <Label htmlFor="broker-url" className="text-gray-400">Broker URL (wss:// or ws://)</Label>
              <div className="absolute left-3 top-3 text-purple-400">
                <i className="fas fa-server"></i>
              </div>
            </div>
          </motion.div>
          
          {/* Username / Password */}
          <motion.div className="floating-label-input" variants={itemVariants}>
            <div className="relative">
              <Input 
                type="text" 
                id="username" 
                placeholder=" " 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-800/80 rounded-md w-full px-10 py-3 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner"
                disabled={connectionStatus !== 'disconnected'}
              />
              <Label htmlFor="username" className="text-gray-400">Username (optional)</Label>
              <div className="absolute left-3 top-3 text-blue-400">
                <i className="fas fa-user"></i>
              </div>
            </div>
          </motion.div>
          
          <motion.div className="floating-label-input" variants={itemVariants}>
            <div className="relative">
              <Input 
                type="password" 
                id="password" 
                placeholder=" " 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-800/80 rounded-md w-full px-10 py-3 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner"
                disabled={connectionStatus !== 'disconnected'}
              />
              <Label htmlFor="password" className="text-gray-400">Password (optional)</Label>
              <div className="absolute left-3 top-3 text-teal-400">
                <i className="fas fa-key"></i>
              </div>
            </div>
          </motion.div>
          
          {/* Base Topic */}
          <motion.div className="md:col-span-2 floating-label-input" variants={itemVariants}>
            <div className="relative">
              <Input 
                type="text" 
                id="base-topic" 
                placeholder=" " 
                value={baseTopic} 
                onChange={(e) => setBaseTopic(e.target.value)}
                className="bg-gray-800/80 rounded-md w-full px-10 py-3 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner"
                disabled={connectionStatus !== 'disconnected'}
              />
              <Label htmlFor="base-topic" className="text-gray-400">Base Topic</Label>
              <div className="absolute left-3 top-3 text-green-400">
                <i className="fas fa-hashtag"></i>
              </div>
            </div>
          </motion.div>
          
          {/* QoS and Retain Flag */}
          <motion.div variants={itemVariants}>
            <Label htmlFor="qos-select" className="block text-gray-300 text-sm mb-2 flex items-center">
              <i className="fas fa-shield-alt text-yellow-400 mr-2"></i>
              Quality of Service (QoS)
            </Label>
            <Select value={qos.toString()} onValueChange={(value) => setQos(parseInt(value) as 0 | 1 | 2)}>
              <SelectTrigger id="qos-select" className="w-full bg-gray-800/80 border-gray-700 focus:border-purple-500 shadow-inner">
                <SelectValue placeholder="Select QoS" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="0" className="hover:bg-gray-700">0 - At most once</SelectItem>
                <SelectItem value="1" className="hover:bg-gray-700">1 - At least once</SelectItem>
                <SelectItem value="2" className="hover:bg-gray-700">2 - Exactly once</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
          
          <motion.div className="flex items-center space-x-4" variants={itemVariants}>
            <div className="flex items-center space-x-2 bg-gray-800/60 p-2 rounded-lg border border-gray-700/50">
              <Switch 
                id="retain-switch" 
                checked={retain}
                onCheckedChange={setRetain}
                className="data-[state=checked]:bg-purple-600"
              />
              <Label htmlFor="retain-switch" className="text-gray-300 flex items-center">
                <i className="fas fa-thumbtack text-purple-400 mr-2"></i>
                Retain
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 bg-gray-800/60 p-2 rounded-lg border border-gray-700/50">
              <Switch 
                id="sys-topics-switch" 
                checked={enableSysTopics}
                onCheckedChange={setEnableSysTopics}
                disabled={connectionStatus !== 'disconnected'}
                className="data-[state=checked]:bg-teal-600"
              />
              <Label htmlFor="sys-topics-switch" className="text-gray-300 flex items-center">
                <i className="fas fa-cogs text-teal-400 mr-2"></i>
                $SYS
              </Label>
            </div>
          </motion.div>
          
          {/* Connection Mode */}
          <motion.div className="md:col-span-2" variants={itemVariants}>
            <Label className="block text-gray-300 text-sm mb-2 flex items-center">
              <i className="fas fa-sliders-h text-blue-400 mr-2"></i>
              Connection Mode
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                type="button" 
                variant="outline"
                className={`transition-all duration-300 ease-in-out ${
                  connectionMode === 'connect-only' 
                    ? 'bg-gradient-to-r from-blue-600/70 to-blue-700/70 border-blue-500 text-white shadow-lg shadow-blue-900/30' 
                    : 'bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-gray-300'
                }`}
                onClick={() => handleConnectionModeSelect('connect-only')}
                disabled={connectionStatus !== 'disconnected'}
              >
                <i className={`fas fa-plug mr-2 ${connectionMode === 'connect-only' ? 'text-white' : 'text-blue-400'}`}></i> 
                Connect Only
              </Button>
              <Button 
                type="button" 
                variant="outline"
                className={`transition-all duration-300 ease-in-out ${
                  connectionMode === 'connect-auto' 
                    ? 'bg-gradient-to-r from-purple-600/70 to-purple-700/70 border-purple-500 text-white shadow-lg shadow-purple-900/30' 
                    : 'bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-gray-300'
                }`}
                onClick={() => handleConnectionModeSelect('connect-auto')}
                disabled={connectionStatus !== 'disconnected'}
              >
                <i className={`fas fa-random mr-2 ${connectionMode === 'connect-auto' ? 'text-white' : 'text-purple-400'}`}></i> 
                Connect & Auto
              </Button>
              <Button 
                type="button" 
                variant="outline"
                className={`transition-all duration-300 ease-in-out ${
                  connectionMode === 'connect-manual' 
                    ? 'bg-gradient-to-r from-teal-600/70 to-teal-700/70 border-teal-500 text-white shadow-lg shadow-teal-900/30' 
                    : 'bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-gray-300'
                }`}
                onClick={() => handleConnectionModeSelect('connect-manual')}
                disabled={connectionStatus !== 'disconnected'}
              >
                <i className={`fas fa-clock mr-2 ${connectionMode === 'connect-manual' ? 'text-white' : 'text-teal-400'}`}></i> 
                Connect & Manual
              </Button>
            </div>
          </motion.div>
        </div>
        
        {/* Connection Buttons */}
        <motion.div 
          className="flex space-x-3 pt-3"
          variants={itemVariants}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <AnimatePresence mode="wait">
            {connectionStatus === 'disconnected' ? (
              <motion.div 
                key="connect"
                className="flex-1"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Button
                  id="connect-btn"
                  type="button" 
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-900/30 border border-green-500/50 relative overflow-hidden"
                  onClick={handleConnect}
                  disabled={!brokerUrl || !baseTopic}
                >
                  <motion.span 
                    className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/10 rounded-md"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: 'loop' }}
                  />
                  <motion.div 
                    className="relative z-10 flex items-center justify-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <i className="fas fa-plug mr-2"></i> Connect
                  </motion.div>
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                key="disconnect"
                className="flex-1"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Button
                  id="disconnect-btn"
                  type="button"
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-900/30 border border-red-500/50 relative overflow-hidden"
                  onClick={disconnect}
                >
                  <motion.span 
                    className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-red-700/10 rounded-md"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: 'loop' }}
                  />
                  <motion.div 
                    className="relative z-10 flex items-center justify-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <i className="fas fa-power-off mr-2"></i> Disconnect
                  </motion.div>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.div 
            whileHover={{ rotate: 360 }}
            transition={{ duration: 1, type: "spring" }}
          >
            <Button 
              type="reset" 
              variant="outline" 
              className="bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-white rounded-full h-10 w-10 p-0"
              onClick={handleFormReset}
              disabled={connectionStatus !== 'disconnected'}
            >
              <i className="fas fa-redo"></i>
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default ConnectionForm;
