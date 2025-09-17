import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Bell, 
  Shield, 
  Trash2, 
  CreditCard,
  Moon,
  Sun,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const Settings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  
  const [notifications, setNotifications] = useState({
    dailyReminders: true,
    groupUpdates: true,
    achievements: true,
    pushNotifications: false,
  });

  const [preferences, setPreferences] = useState({
    darkMode: true,
    soundEffects: true,
    hapticFeedback: true,
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account Deletion",
      description: "This feature is not yet implemented. Please contact support.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4 pb-32">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-muted/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden p-1 shadow-md">
              <img 
                src="/logo-streakzilla-w.png" 
                alt="Streakzilla" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold gradient-text">Settings - COMING SOON</h1>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Notifications */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="daily-reminders" className="text-foreground">Daily Reminders</Label>
                  <p className="text-sm text-muted-foreground">Get reminded to check in daily</p>
                </div>
                <Switch
                  id="daily-reminders"
                  checked={notifications.dailyReminders}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, dailyReminders: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="group-updates" className="text-foreground">Group Updates</Label>
                  <p className="text-sm text-muted-foreground">Notifications when group members check in</p>
                </div>
                <Switch
                  id="group-updates"
                  checked={notifications.groupUpdates}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, groupUpdates: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="achievements" className="text-foreground">Achievements</Label>
                  <p className="text-sm text-muted-foreground">Celebrate your milestones and streaks</p>
                </div>
                <Switch
                  id="achievements"
                  checked={notifications.achievements}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, achievements: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications" className="text-foreground">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications even when app is closed</p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={notifications.pushNotifications}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, pushNotifications: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Moon className="w-5 h-5 text-primary" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode" className="text-foreground">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Use dark theme for better visibility</p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={preferences.darkMode}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, darkMode: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound-effects" className="text-foreground">Sound Effects</Label>
                  <p className="text-sm text-muted-foreground">Play sounds for interactions and achievements</p>
                </div>
                <Switch
                  id="sound-effects"
                  checked={preferences.soundEffects}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, soundEffects: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="haptic-feedback" className="text-foreground">Haptic Feedback</Label>
                  <p className="text-sm text-muted-foreground">Vibrate on interactions (mobile only)</p>
                </div>
                <Switch
                  id="haptic-feedback"
                  checked={preferences.hapticFeedback}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, hapticFeedback: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <CreditCard className="w-5 h-5 text-primary" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Current Plan</Label>
                  <p className="text-sm text-muted-foreground">Free tier</p>
                </div>
                <Badge variant="secondary">Free</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Upgrades coming soon. You already have access to all core features.
              </p>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Shield className="w-5 h-5 text-primary" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Your Data</Label>
                <p className="text-sm text-muted-foreground">
                  Your data is encrypted and protected. We never sell personal data.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="gaming-card border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Delete Account</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDeleteAccount}
                >
                  Delete Account
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
