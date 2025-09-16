import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Flame
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  total_groups: number;
  active_groups: number;
}

interface GroupMembership {
  group: {
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
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [groups, setGroups] = useState<GroupMembership[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    full_name: '',
    bio: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserStats();
      fetchUserGroups();
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
      // Aggregate stats from group memberships
      const { data: memberships, error } = await supabase
        .from('group_members')
        .select(`
          total_points,
          current_streak,
          restart_count,
          groups!inner (
            id,
            is_active
          )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;

      const totalPoints = memberships.reduce((sum, m) => sum + (m.total_points || 0), 0);
      const maxStreak = Math.max(...memberships.map(m => m.current_streak || 0), 0);
      const totalRestarts = memberships.reduce((sum, m) => sum + (m.restart_count || 0), 0);
      const totalGroups = memberships.length;
      const activeGroups = memberships.filter(m => m.groups.is_active).length;

      setStats({
        total_points: totalPoints,
        current_streak: maxStreak,
        restart_count: totalRestarts,
        total_groups: totalGroups,
        active_groups: activeGroups
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUserGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          total_points,
          current_streak,
          lives_remaining,
          role,
          groups (
            id,
            name,
            mode,
            start_date,
            duration_days,
            is_active
          )
        `)
        .eq('user_id', user?.id)
        .order('total_points', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match the GroupMembership interface
      const transformedData = data?.map(item => ({
        group: item.groups,
        total_points: item.total_points,
        current_streak: item.current_streak,
        lives_remaining: item.lives_remaining,
        role: item.role
      })) || [];
      
      setGroups(transformedData);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
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

  const getGroupStatus = (group: GroupMembership) => {
    const startDate = new Date(group.group.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + group.group.duration_days);
    const now = new Date();

    if (now < startDate) return { status: 'upcoming', color: 'bg-blue-500/20 text-blue-300' };
    if (now > endDate) return { status: 'completed', color: 'bg-green-500/20 text-green-300' };
    return { status: 'active', color: 'bg-primary/20 text-primary' };
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
        <Card className="gaming-card border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                  {profile.display_name?.charAt(0) || profile.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">
                    {profile.display_name || profile.full_name || 'Anonymous User'}
                  </h1>
                  {profile.subscription_status === 'paid' && (
                    <Badge className="bg-secondary/20 text-secondary border-secondary/30">
                      <Crown className="w-3 h-3 mr-1" />
                      Pro
                    </Badge>
                  )}
                </div>
                
                {profile.bio && (
                  <p className="text-muted-foreground">{profile.bio}</p>
                )}
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-secondary" />
                    <span className="font-semibold text-foreground">{stats?.total_points || 0}</span>
                    <span className="text-sm text-muted-foreground">points</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="font-semibold text-foreground">{stats?.current_streak || 0}</span>
                    <span className="text-sm text-muted-foreground">streak</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-accent" />
                    <span className="font-semibold text-foreground">{stats?.active_groups || 0}</span>
                    <span className="text-sm text-muted-foreground">active groups</span>
                  </div>
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
                className="border-border text-foreground hover:bg-muted/50"
              >
                {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Overview
            </TabsTrigger>
            <TabsTrigger value="groups" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              My Groups
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
                  <div className="text-sm text-muted-foreground">Total Points</div>
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

          <TabsContent value="groups" className="space-y-4">
            {groups.length > 0 ? (
              groups.map((membership) => {
                const groupStatus = getGroupStatus(membership);
                return (
                  <Card key={membership.group.id} className="gaming-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-semibold text-foreground">{membership.group.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={groupStatus.color}>
                                {groupStatus.status}
                              </Badge>
                              <Badge variant="outline" className="border-border text-muted-foreground">
                                {membership.group.mode}
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
                        
                        <div className="text-right">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="font-semibold text-foreground">{membership.total_points}</div>
                              <div className="text-xs text-muted-foreground">Points</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-foreground">{membership.current_streak}</div>
                              <div className="text-xs text-muted-foreground">Streak</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-foreground">{membership.lives_remaining}</div>
                              <div className="text-xs text-muted-foreground">Lives</div>
                            </div>
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
                <h3 className="text-lg font-medium text-foreground mb-2">No Groups Yet</h3>
                <p className="text-muted-foreground">Join or create a group to start your streak journey!</p>
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
                      <h4 className="font-medium text-foreground">Max Groups</h4>
                      <p className="text-sm text-muted-foreground">Maximum groups you can join</p>
                    </div>
                    <span className="font-semibold text-foreground">{profile.max_groups}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};