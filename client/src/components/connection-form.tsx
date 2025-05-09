import React, { useState, useEffect } from 'react';
import { useMqtt, ConnectionProfile } from '@/hooks/use-mqtt';
import { useMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const NEW_PROFILE_VALUE = "_NEW_PROFILE_"; // Define a constant for the special value

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
  } = useMqtt();

  const [brokerUrl, setBrokerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [baseTopic, setBaseTopic] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [profileName, setProfileName] = useState('');
  const [showSaveProfileDialog, setShowSaveProfileDialog] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (connectionsProfiles.length > 0 && !selectedProfileId) {
      const firstProfile = connectionsProfiles[0];
      handleProfileSelect(firstProfile.id);
    } else if (connectionsProfiles.length === 0 && !selectedProfileId) {
        handleFormReset(false); // Initial reset without toast
    }
  }, [connectionsProfiles]);

  const handleConnect = () => {
    if (!brokerUrl.trim()) {
        toast({ title: "Broker URL Required", description: "Please enter a broker URL.", variant: "warning" });
        return;
    }
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
    if (profileId === NEW_PROFILE_VALUE) {
        handleFormReset(false); // Reset without toast when selecting "New"
        return;
    }
    const profile = connectionsProfiles.find(p => p.id === profileId);
    if (profile) {
      setSelectedProfileId(profile.id);
      setBrokerUrl(profile.brokerUrl);
      setBaseTopic(profile.baseTopic);
      setUsername(profile.username || '');
      setPassword(profile.password || '');
      setProfileName(profile.name);
    } else {
      handleFormReset(false); // Reset without toast if profile not found
    }
  };

  const handleSaveProfile = () => {
    if (!profileName.trim()) {
      toast({ title: "Profile Name Required", description: "Please enter a name for this profile.", variant: "warning" });
      return;
    }
    if (!brokerUrl.trim()) {
        toast({ title: "Broker URL Required", description: "Please enter a broker URL to save the profile.", variant: "warning" });
        return;
    }
    const profileData: ConnectionProfile = {
      id: selectedProfileId && selectedProfileId !== NEW_PROFILE_VALUE ? selectedProfileId : Date.now().toString(),
      name: profileName,
      brokerUrl,
      baseTopic,
      username,
      password
    };
    saveProfile(profileData);
    setShowSaveProfileDialog(false);
    setSelectedProfileId(profileData.id);
    // Show success toast for saving/updating
    toast({
        title: selectedProfileId && selectedProfileId !== NEW_PROFILE_VALUE ? "Profile Updated" : "Profile Saved",
        description: `Profile "${profileName}" has been saved successfully.`,
        variant: "success"
    });
  };

  const handleDeleteConfirm = () => {
    if (profileToDelete) {
      const profileBeingDeleted = connectionsProfiles.find(p => p.id === profileToDelete);
      deleteProfile(profileToDelete);
       toast({
        title: "Profile Deleted",
        description: `Profile "${profileBeingDeleted?.name || 'Selected Profile'}" has been deleted.`,
        variant: "success"
      });
      if (selectedProfileId === profileToDelete) {
        const remainingProfiles = connectionsProfiles.filter(p => p.id !== profileToDelete);
        if (remainingProfiles.length > 0) {
          handleProfileSelect(remainingProfiles[0].id);
        } else {
          handleFormReset(false); // Reset without toast if last profile deleted
        }
      }
      setProfileToDelete(null);
    }
  };

  // MODIFIED: Added optional parameter to control toast visibility
  const handleFormReset = (showToast = true) => {
    setBrokerUrl('');
    setUsername('');
    setPassword('');
    setBaseTopic('');
    setSelectedProfileId('');
    setProfileName('');
    if (showToast) {
        // --- Toast call removed ---
        // toast({
        //     title: "Form Cleared",
        //     description: "Connection details have been cleared for a new entry.",
        //     variant: "info"
        // });
    }
  };

  const handleConnectionModeSelect = (mode: string) => {
    const newConnectionMode = mode as 'connect-only' | 'connect-auto' | 'connect-manual';
    setConnectionMode(newConnectionMode);
  };

  const connectionStatusColors = { /* ... */ };
  const getStatusIndicatorClass = () => { /* ... */ };
  const containerVariants = { /* ... */ };
  const itemVariants = { /* ... */ };
  const isMobile = useMobile();

  return (
    <motion.div
      className="glass-card neon-border rounded-lg shadow-xl p-4 sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-3">
        <motion.h2 /* ... */ > Connection Settings </motion.h2>
        <motion.div /* ... Status Indicator ... */ >
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
          <motion.div className="md:col-span-2" variants={itemVariants}>
            <Label htmlFor="profile-select" className="block text-gray-300 text-sm mb-2 flex items-center">
              <i className="fas fa-bookmark text-purple-400 mr-2"></i>
              Connection Profile
            </Label>
            <div className="flex space-x-2">
              <Select
                value={selectedProfileId}
                onValueChange={handleProfileSelect}
                disabled={connectionStatus !== 'disconnected'}
              >
                <SelectTrigger className="w-full bg-gray-800/80 border-gray-700 focus:border-purple-500 shadow-inner">
                  <SelectValue placeholder="Select or create new profile..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value={NEW_PROFILE_VALUE} className="italic text-gray-400 hover:bg-gray-700">
                    -- New Connection --
                  </SelectItem>
                  {connectionsProfiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id} className="hover:bg-gray-700">
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Save Profile Dialog Trigger */}
              <Dialog open={showSaveProfileDialog} onOpenChange={setShowSaveProfileDialog}>
                <DialogTrigger asChild>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      className="bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-white rounded-full h-10 w-10 p-0 relative overflow-hidden"
                      title={selectedProfileId && selectedProfileId !== NEW_PROFILE_VALUE ? "Update Profile" : "Save New Profile"}
                      onClick={() => {
                        if (!selectedProfileId || selectedProfileId === NEW_PROFILE_VALUE) {
                            setProfileName('');
                        }
                        setShowSaveProfileDialog(true);
                      }}
                      disabled={connectionStatus !== 'disconnected' && (!!selectedProfileId && selectedProfileId !== NEW_PROFILE_VALUE)}
                    >
                      <motion.span className="absolute inset-0 bg-blue-500/10" initial={{ scale: 0, opacity: 0 }} whileHover={{ scale: 1.5, opacity: 1 }} transition={{ duration: 0.5 }} />
                      <motion.i className="fas fa-save text-blue-400 relative z-10" />
                    </Button>
                  </motion.div>
                </DialogTrigger>
                {/* Save Profile Dialog Content */}
                <DialogContent className="bg-gray-800 text-white border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                      {selectedProfileId && selectedProfileId !== NEW_PROFILE_VALUE && connectionsProfiles.find(p=>p.id === selectedProfileId) ? "Update Profile" : "Save New Profile"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="profile-name" className="text-gray-300">Profile Name</Label>
                    <Input id="profile-name" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="bg-gray-700 border-gray-600 text-white mt-1" placeholder="Enter profile name" />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowSaveProfileDialog(false); }}>Cancel</Button>
                    <Button onClick={handleSaveProfile} className="gradient-btn">Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete Profile Dialog Trigger */}
              <AlertDialog open={!!profileToDelete} onOpenChange={(open) => !open && setProfileToDelete(null)}>
                <AlertDialogTrigger asChild>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      className="bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-white rounded-full h-10 w-10 p-0 relative overflow-hidden"
                      title="Delete Selected Profile"
                      onClick={() => selectedProfileId && selectedProfileId !== NEW_PROFILE_VALUE && setProfileToDelete(selectedProfileId)}
                      disabled={!selectedProfileId || selectedProfileId === NEW_PROFILE_VALUE || connectionStatus !== 'disconnected'}
                    >
                      <motion.span className="absolute inset-0 bg-red-500/10" initial={{ scale: 0, opacity: 0 }} whileHover={{ scale: 1.5, opacity: 1 }} transition={{ duration: 0.5 }} />
                      <motion.i className="fas fa-trash text-red-400 relative z-10" />
                    </Button>
                  </motion.div>
                </AlertDialogTrigger>
                {/* Delete Profile Dialog Content */}
                <AlertDialogContent className="bg-gray-800 text-white border-gray-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Profile</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      Are you sure you want to delete the profile "{connectionsProfiles.find(p=>p.id === profileToDelete)?.name || 'this profile'}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setProfileToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>

          {/* ... Rest of the form inputs (Broker URL, Username, etc.) ... */}
          {/* Broker URL */}
          <motion.div className="md:col-span-2 floating-label-input" variants={itemVariants}>
            <div className="relative">
              <Input type="text" id="broker-url" placeholder=" " value={brokerUrl} onChange={(e) => setBrokerUrl(e.target.value)} className="bg-gray-800/80 rounded-md w-full pl-10 pr-3 py-3 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner" disabled={connectionStatus !== 'disconnected'} />
              <Label htmlFor="broker-url" className="text-gray-400 pl-8">Broker URL (wss:// or ws://)</Label>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none"><i className="fas fa-server"></i></div>
            </div>
          </motion.div>
          {/* Username */}
          <motion.div className="floating-label-input" variants={itemVariants}>
            <div className="relative">
              <Input type="text" id="username" placeholder=" " value={username} onChange={(e) => setUsername(e.target.value)} className="bg-gray-800/80 rounded-md w-full pl-10 pr-3 py-3 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner" disabled={connectionStatus !== 'disconnected'} />
              <Label htmlFor="username" className="text-gray-400 pl-8">Username (optional)</Label>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none"><i className="fas fa-user"></i></div>
            </div>
          </motion.div>
          {/* Password */}
          <motion.div className="floating-label-input" variants={itemVariants}>
            <div className="relative">
              <Input type="password" id="password" placeholder=" " value={password} onChange={(e) => setPassword(e.target.value)} className="bg-gray-800/80 rounded-md w-full pl-10 pr-3 py-3 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner" disabled={connectionStatus !== 'disconnected'} />
              <Label htmlFor="password" className="text-gray-400 pl-8">Password (optional)</Label>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-400 pointer-events-none"><i className="fas fa-key"></i></div>
            </div>
          </motion.div>
          {/* Base Topic */}
          <motion.div className="md:col-span-2 floating-label-input" variants={itemVariants}>
            <div className="relative">
              <Input type="text" id="base-topic" placeholder=" " value={baseTopic} onChange={(e) => setBaseTopic(e.target.value)} className="bg-gray-800/80 rounded-md w-full pl-10 pr-3 py-3 border border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner" disabled={connectionStatus !== 'disconnected'} />
              <Label htmlFor="base-topic" className="text-gray-400 pl-8">Base Topic</Label>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 pointer-events-none"><i className="fas fa-hashtag"></i></div>
            </div>
          </motion.div>
          {/* QoS and Retain Flag */}
          <motion.div variants={itemVariants}>
            <Label htmlFor="qos-select" className="block text-gray-300 text-sm mb-2 flex items-center"><i className="fas fa-shield-alt text-yellow-400 mr-2"></i>Quality of Service (QoS)</Label>
            <Select value={qos.toString()} onValueChange={(value) => setQos(parseInt(value) as 0 | 1 | 2)} disabled={connectionStatus !== 'disconnected'}>
              <SelectTrigger id="qos-select" className="w-full bg-gray-800/80 border-gray-700 focus:border-purple-500 shadow-inner"><SelectValue placeholder="Select QoS" /></SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="0" className="hover:bg-gray-700">0 - At most once</SelectItem>
                <SelectItem value="1" className="hover:bg-gray-700">1 - At least once</SelectItem>
                <SelectItem value="2" className="hover:bg-gray-700">2 - Exactly once</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
          <motion.div className="flex flex-col xs:flex-row gap-2 xs:gap-4" variants={itemVariants}>
            <div className="flex items-center space-x-2 bg-gray-800/60 p-2 rounded-lg border border-gray-700/50">
              <Switch id="retain-switch" checked={retain} onCheckedChange={setRetain} className="data-[state=checked]:bg-purple-600 h-4 w-7" disabled={connectionStatus !== 'disconnected'} />
              <Label htmlFor="retain-switch" className="text-gray-300 flex items-center text-xs sm:text-sm"><i className="fas fa-thumbtack text-purple-400 mr-1 sm:mr-2"></i>Retain</Label>
            </div>
            <div className="flex items-center space-x-2 bg-gray-800/60 p-2 rounded-lg border border-gray-700/50">
              <Switch id="sys-topics-switch" checked={enableSysTopics} onCheckedChange={setEnableSysTopics} disabled={connectionStatus !== 'disconnected'} className="data-[state=checked]:bg-teal-600 h-4 w-7" />
              <Label htmlFor="sys-topics-switch" className="text-gray-300 flex items-center text-xs sm:text-sm"><i className="fas fa-cogs text-teal-400 mr-1 sm:mr-2"></i>{isMobile ? '$SYS' : 'System Topics ($SYS)'}</Label>
            </div>
          </motion.div>
          {/* Connection Mode */}
          <motion.div className="md:col-span-2" variants={itemVariants}>
            <Label className="block text-gray-300 text-sm mb-2 flex items-center"><i className="fas fa-sliders-h text-blue-400 mr-2"></i>Connection Mode</Label>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2">
              <Button type="button" variant="outline" className={`transition-all duration-300 ease-in-out text-xs sm:text-sm ${connectionMode === 'connect-only' ? 'bg-gradient-to-r from-blue-600/70 to-blue-700/70 border-blue-500 text-white shadow-lg shadow-blue-900/30' : 'bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-gray-300'}`} onClick={() => handleConnectionModeSelect('connect-only')} disabled={connectionStatus !== 'disconnected'}><i className={`fas fa-plug mr-1 sm:mr-2 ${connectionMode === 'connect-only' ? 'text-white' : 'text-blue-400'}`}></i><span className="whitespace-nowrap">{isMobile ? 'Connect' : 'Connect Only'}</span></Button>
              <Button type="button" variant="outline" className={`transition-all duration-300 ease-in-out text-xs sm:text-sm ${connectionMode === 'connect-auto' ? 'bg-gradient-to-r from-purple-600/70 to-purple-700/70 border-purple-500 text-white shadow-lg shadow-purple-900/30' : 'bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-gray-300'}`} onClick={() => handleConnectionModeSelect('connect-auto')} disabled={connectionStatus !== 'disconnected'}><i className={`fas fa-random mr-1 sm:mr-2 ${connectionMode === 'connect-auto' ? 'text-white' : 'text-purple-400'}`}></i><span className="whitespace-nowrap">{isMobile ? 'Auto' : 'Connect & Auto'}</span></Button>
              <Button type="button" variant="outline" className={`transition-all duration-300 ease-in-out text-xs sm:text-sm ${connectionMode === 'connect-manual' ? 'bg-gradient-to-r from-teal-600/70 to-teal-700/70 border-teal-500 text-white shadow-lg shadow-teal-900/30' : 'bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-gray-300'} ${isMobile && 'col-span-full'}`} onClick={() => handleConnectionModeSelect('connect-manual')} disabled={connectionStatus !== 'disconnected'}><i className={`fas fa-clock mr-1 sm:mr-2 ${connectionMode === 'connect-manual' ? 'text-white' : 'text-teal-400'}`}></i><span className="whitespace-nowrap">{isMobile ? 'Manual' : 'Connect & Manual'}</span></Button>
            </div>
          </motion.div>
        </div>

        {/* Connection Buttons */}
        <motion.div className="flex gap-2 sm:gap-3 pt-3" variants={itemVariants} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.5 }}>
          <AnimatePresence mode="wait">
            {connectionStatus === 'disconnected' ? (
              <motion.div key="connect" className="flex-1" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
                <Button id="connect-btn" type="button" className="w-full h-10 sm:h-auto py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-900/30 border border-green-500/50 relative overflow-hidden text-sm sm:text-base" onClick={handleConnect} disabled={!brokerUrl }><motion.span className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/10 rounded-md" initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 2, repeat: Infinity, repeatType: 'loop' }} /><motion.div className="relative z-10 flex items-center justify-center" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><i className="fas fa-plug mr-1 sm:mr-2"></i> Connect</motion.div></Button>
              </motion.div>
            ) : (
              <motion.div key="disconnect" className="flex-1" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
                <Button id="disconnect-btn" type="button" className="w-full h-10 sm:h-auto py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-900/30 border border-red-500/50 relative overflow-hidden text-sm sm:text-base" onClick={disconnect}><motion.span className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-red-700/10 rounded-md" initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 2, repeat: Infinity, repeatType: 'loop' }} /><motion.div className="relative z-10 flex items-center justify-center" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}><i className="fas fa-power-off mr-1 sm:mr-2"></i> Disconnect</motion.div></Button>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 1, type: "spring" }}>
            {/* MODIFIED: Pass showToast=true to handleFormReset when button is clicked */}
            <Button type="reset" variant="outline" className="bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-white rounded-full h-10 w-10 p-0" onClick={() => handleFormReset(true)} disabled={connectionStatus !== 'disconnected'}><i className="fas fa-redo"></i></Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default ConnectionForm;
