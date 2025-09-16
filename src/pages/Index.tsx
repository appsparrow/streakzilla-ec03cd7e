import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Users, 
  Flame, 
  Trophy,
  Calendar,
  Settings,
  LogOut,
  UserCircle
} from "lucide-react";

interface UserGroup {
  id: string;
  role: string;
  joined_at: string;
  lives_remaining: number;
  total_points: number;
  current_streak: number;
  restart_count: number;
  is_out: boolean;
  groups: {
    id: string;
    name: string;
    code: string;
    start_date: string;
    duration_days: number;
    mode: string;
    is_active: boolean;
  };
}

interface Profile {
  id: string;
  full_name: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  subscription_status: string;
  max_groups: number;
}

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      setProfile(profileData);

      // Fetch user's groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("group_members")
        .select(`
          *,
          groups (
            id,
            name,
            code,
            start_date,
            duration_days,
            mode,
            is_active
          )
        `)
        .eq("user_id", user?.id);

      if (groupsError) throw groupsError;

      setUserGroups(groupsData || []);
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const getTotalPoints = () => {
    return userGroups.reduce((sum, group) => sum + group.total_points, 0);
  };

  const getBestStreak = () => {
    return Math.max(...userGroups.map(group => group.current_streak), 0);
  };

  const getActiveGroups = () => {
    return userGroups.filter(group => group.groups.is_active).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Streakzilla</h1>
              <p className="text-muted-foreground">Welcome back, {profile?.display_name || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <UserCircle className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="gaming-card">
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-energy" />
              <p className="text-2xl font-bold text-energy">{getTotalPoints()}</p>
              <p className="text-sm text-muted-foreground">Total Points</p>
            </CardContent>
          </Card>

          <Card className="gaming-card">
            <CardContent className="p-4 text-center">
              <Flame className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold gradient-text">{getBestStreak()}</p>
              <p className="text-sm text-muted-foreground">Best Streak</p>
            </CardContent>
          </Card>

          <Card className="gaming-card">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold text-success">{getActiveGroups()}</p>
              <p className="text-sm text-muted-foreground">Active Groups</p>
            </CardContent>
          </Card>

          <Card className="gaming-card">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{profile?.max_groups || 1}</p>
              <p className="text-sm text-muted-foreground">Max Groups</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate("/create-group")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New Group
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Start a new challenge with friends</p>
            </CardContent>
          </Card>

          <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate("/join-group")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Join Group
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Enter a group code to join a challenge</p>
            </CardContent>
          </Card>
        </div>

        {/* User Groups */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Your Groups</h2>
            <Badge variant="outline">
              {profile?.subscription_status === 'paid' ? 'Premium' : 'Free'}
            </Badge>
          </div>

          {userGroups.length === 0 ? (
            <Card className="gaming-card">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first group or join an existing one to start your journey
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="gaming" onClick={() => navigate("/create-group")}>
                    Create Group
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/join-group")}>
                    Join Group
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {userGroups.map((userGroup) => (
                <Card 
                  key={userGroup.id} 
                  className="gaming-card hover:scale-105 transition-transform cursor-pointer"
                  onClick={() => navigate(`/groups/${userGroup.groups.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {userGroup.groups.name}
                      </CardTitle>
                      <div className="flex gap-2">
                        {userGroup.role === 'admin' && (
                          <Badge variant="default">Admin</Badge>
                        )}
                        <Badge variant="outline">{userGroup.groups.mode}</Badge>
                        {userGroup.is_out && (
                          <Badge variant="destructive">Out</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-lg font-bold text-energy">{userGroup.total_points}</p>
                        <p className="text-muted-foreground">Points</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary">{userGroup.current_streak}</p>
                        <p className="text-muted-foreground">Streak</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-destructive">{userGroup.lives_remaining}</p>
                        <p className="text-muted-foreground">Lives</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Code: {userGroup.groups.code}</span>
                      <span>Started: {new Date(userGroup.groups.start_date).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
