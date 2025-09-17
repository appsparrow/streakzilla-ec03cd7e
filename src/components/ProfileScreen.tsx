import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShareDialog } from "@/components/ShareDialog";
import { 
  User, 
  Settings, 
  Crown, 
  Target, 
  Zap, 
  Calendar,
  Users,
  Edit,
  Save,
  X,
  Heart,
  Trophy,
  Flame,
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from 'lucide-react';
import { toast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  display_name: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  subscription_status: string;
  max_groups: number;
}

interface UserStats {
  total_points: number;
  current_streak: number;
  restart_count: number;
  total_streaks: number;
  active_streaks: number;
}

interface StreakMembership {
  streak: {
    id: string;
    name: string;
    mode: string;
    start_date: string;
    duration_days: number;
  };
  total_points: number;
  current_streak: number;
  lives_remaining: number;
  role: string;
}

export const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [streaks, setStreaks] = useState<StreakMembership[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    full_name: '',
    bio: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [currentStreak, setCurrentStreak] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserStats();
      fetchUserStreaks();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditForm({
        display_name: data.display_name || '',
        full_name: data.full_name || '',
        bio: data.bio || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      // Temporarily disable stats fetching to avoid RLS recursion
      // TODO: Re-enable after running FIX_DATABASE_POLICIES.sql
      console.log("Stats fetching temporarily disabled due to RLS recursion. Please run FIX_DATABASE_POLICIES.sql");
      setStats({
        total_points: 0,
        current_streak: 0,
        restart_count: 0,
        total_streaks: 0,
        active_streaks: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUserStreaks = async () => {
    try {
      // Use RPC to fetch user streaks to avoid RLS recursion
      const { data: userStreaksData, error: userStreaksError } = await (supabase as any).rpc('get_user_groups');

      if (userStreaksError) {
        console.error("Error fetching user streaks via RPC:", userStreaksError);
        setStreaks([]);
      } else {
        // Transform the data to match our interface
        const transformedStreaks = (userStreaksData || []).map((item: any) => ({
          streak: {
            id: item.group_id,
            name: item.name || item.groups?.name || "Unknown Streak",
            mode: item.mode || item.groups?.mode || "custom",
            start_date: item.start_date || item.groups?.start_date || new Date().toISOString(),
            duration_days: item.duration_days || item.groups?.duration_days || 30,
            code: item.code || item.groups?.code || ""
          },
          total_points: item.total_points || 0,
          current_streak: item.current_streak || 0,
          lives_remaining: item.lives_remaining || 3,
          role: item.role || 'member'
        }));
        setStreaks(transformedStreaks);
      }
    } catch (error) {
      console.error('Error fetching streaks:', error);
      setStreaks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editForm.display_name,
          full_name: editForm.full_name,
          bio: editForm.bio
        })
        .eq('id', user?.id);

      if (error) throw error;

      await fetchProfile();
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStreakStatus = (streak: StreakMembership) => {
    const startDate = new Date(streak.streak.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + streak.streak.duration_days);
    const now = new Date();

    if (now < startDate) return { status: 'upcoming', color: 'bg-blue-500/20 text-blue-300' };
    if (now > endDate) return { status: 'completed', color: 'bg-green-500/20 text-green-300' };
    return { status: 'active', color: 'bg-primary/20 text-primary' };
  };

  const handleShareStreak = (streak: any) => {
    setCurrentStreak(streak);
    setShareDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Profile Not Found</h2>
          <p className="text-muted-foreground">Unable to load your profile information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5">
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
            {/* Profile Header */}
            <Card className="mobile-card">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Avatar className="w-16 h-16 sm:w-20 sm:h-20">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="text-lg sm:text-xl font-bold bg-primary text-primary-foreground">
                      {profile.display_name?.charAt(0) || profile.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                        {profile.display_name || profile.full_name || 'Anonymous User'}
                      </h1>
                      {profile.subscription_status === 'paid' && (
                        <Badge className="bg-secondary/20 text-secondary border-secondary/30 w-fit">
                          <Crown className="w-3 h-3 mr-1" />
                          Pro
                        </Badge>
                      )}
                    </div>

                    {profile.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-blue-400" />
                        <span className="text-sm font-semibold text-foreground">{stats?.total_points || 0}</span>
                        <span className="text-xs text-blue-400">gems</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-blue-400" />
                        <span className="text-sm font-semibold text-foreground">{stats?.current_streak || 0}</span>
                        <span className="text-xs text-blue-400">streak</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-400" />
                        <span className="text-sm font-semibold text-foreground">{stats?.active_streaks || 0}</span>
                        <span className="text-xs text-blue-400">active</span>
                      </div>
                    </div>
                  </div>

                  
                </div>
              </CardContent>
            </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Overview
            </TabsTrigger>
            <TabsTrigger value="streaks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              My Streaks
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="gaming-card">
                <CardContent className="p-4 text-center">
                  <Trophy className="w-8 h-8 text-secondary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{stats?.total_points || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Gems</div>
                </CardContent>
              </Card>
              
              <Card className="gaming-card">
                <CardContent className="p-4 text-center">
                  <Flame className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{stats?.current_streak || 0}</div>
                  <div className="text-sm text-muted-foreground">Best Streak</div>
                </CardContent>
              </Card>
              
              <Card className="gaming-card">
                <CardContent className="p-4 text-center">
                  <Heart className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{stats?.restart_count || 0}</div>
                  <div className="text-sm text-muted-foreground">Restarts</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="streaks" className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" onClick={() => navigate('/create-group')} className="bg-blue-600 hover:bg-blue-700">
                Create Streak
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/join-group')}>
                Join Streak
              </Button>
            </div>
            {streaks.length > 0 ? (
              streaks.map((membership) => {
                const streakStatus = getStreakStatus(membership);
                return (
                  <Card key={membership.streak.id} className="gaming-card hover:scale-[1.02] transition-transform">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-semibold text-foreground">{membership.streak.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={streakStatus.color}>
                                {streakStatus.status}
                              </Badge>
                              <Badge variant="outline" className="border-border text-muted-foreground">
                                {membership.streak.mode}
                              </Badge>
                              {membership.role === 'admin' && (
                                <Badge className="bg-secondary/20 text-secondary border-secondary/30">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-foreground">{membership.total_points}</div>
                              <div className="text-xs text-blue-400">Gems</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-foreground">{membership.current_streak}</div>
                              <div className="text-xs text-blue-400">Streak</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-foreground">{membership.lives_remaining}</div>
                              <div className="text-xs text-blue-400">Lives</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/groups/${membership.streak.id}/settings`)}>
                              Manage
                            </Button>
                            <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => handleShareStreak(membership.streak)}>
                              Invite
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Streaks Yet</h3>
                <p className="text-muted-foreground">Join or create a streak to start your journey!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {isEditing ? (
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="text-foreground">Edit Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="display_name" className="text-foreground">Display Name</Label>
                    <Input
                      id="display_name"
                      value={editForm.display_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-foreground">Full Name</Label>
                    <Input
                      id="full_name"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-foreground">Bio</Label>
                    <Textarea
                      id="bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
                  <div className="space-y-4">
                    <Card className="gaming-card">
                      <CardHeader>
                        <CardTitle className="text-foreground">Profile Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="display_name">Display Name</Label>
                          <Input
                            id="display_name"
                            value={editForm.display_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                            placeholder="How others will see you"
                            className="mobile-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Full Name</Label>
                          <Input
                            id="full_name"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Your full name"
                            className="mobile-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea
                            id="bio"
                            value={editForm.bio}
                            onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="Tell others about yourself..."
                            className="mobile-input"
                          />
                        </div>
                        <Button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="w-full mobile-button"
                        >
                          {saving ? (
                            <>
                              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="gaming-card">
                      <CardHeader>
                        <CardTitle className="text-foreground">Account Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-foreground">Subscription Status</h4>
                            <p className="text-sm text-muted-foreground">
                              {profile.subscription_status === 'paid' ? 'Pro Member' : 'Free Member'}
                            </p>
                          </div>
                          <Badge className={profile.subscription_status === 'paid' ? 'bg-secondary/20 text-secondary' : 'bg-muted/20 text-muted-foreground'}>
                            {profile.subscription_status === 'paid' ? 'Pro' : 'Free'}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-foreground">Max Streaks</h4>
                            <p className="text-sm text-muted-foreground">Maximum streaks you can join</p>
                          </div>
                          <span className="font-semibold text-foreground">{profile.max_groups}</span>
                        </div>

                        <Button
                          variant="destructive"
                          onClick={handleSignOut}
                          className="w-full mobile-button mt-4"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Sign Out
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Share Dialog */}
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          streakName={currentStreak?.name || ""}
          inviteCode={currentStreak?.code || ""}
        />
      </div>
    </div>
  );
};