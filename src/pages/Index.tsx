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
  UserCircle,
  ArrowRight
} from "lucide-react";

interface UserGroup {
  group_id: string;
  role: string;
  total_points: number;
  current_streak: number;
  lives_remaining: number;
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
        console.error("Profile error:", profileError);
        // If profile doesn't exist, create a default one
        if (profileError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: user?.id,
              display_name: user?.email?.split('@')[0] || 'User',
              full_name: user?.user_metadata?.full_name || '',
              email: user?.email,
              max_groups: 1
            })
            .select()
            .single();
          
          if (createError) {
            console.error("Error creating profile:", createError);
            setProfile(null);
          } else {
            setProfile(newProfile);
          }
        } else {
          throw profileError;
        }
      } else {
        setProfile(profileData);
      }

      // Fetch user's groups via RPC (requires FIX_DATABASE_POLICIES.sql)
      try {
        const { data: rpcGroups, error: rpcErr } = await (supabase as any).rpc('get_user_groups');
        if (rpcErr) {
          console.error('get_user_groups error:', rpcErr);
          setUserGroups([]);
        } else {
          const combined = (rpcGroups || []).map((g: any) => ({
            group_id: g.group_id,
            total_points: g.total_points,
            current_streak: g.current_streak,
            lives_remaining: g.lives_remaining,
            role: g.role,
            groups: {
              id: g.group_id,
              name: g.name,
              code: g.code,
              start_date: g.start_date,
              duration_days: g.duration_days,
              mode: g.mode,
              is_active: g.is_active,
            },
          }));
          setUserGroups(combined);
        }
      } catch (err) {
        console.error('Error fetching groups via RPC:', err);
        setUserGroups([]);
      }
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4 pb-32 overflow-auto">
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col items-center justify-center text-center gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden p-1 shadow-md">
              <img 
                src="/logo-streakzilla-w.png" 
                alt="Streakzilla" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl text-blue-400">Streakzilla</h1>
          </div>
          <p className="text-sm text-muted-foreground">Welcome back, {profile?.display_name || user?.email}</p>
        </div>

        {/* Streaks Horizontal Tiles */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Your Streaks
          </h2>
          
          <div className="flex justify-center gap-2 mb-2">
            <Button onClick={() => navigate("/create-group")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Streak
            </Button>
            <Button variant="outline" onClick={() => navigate("/join-group")}>
              <Users className="w-4 h-4 mr-2" />
              Join Streak
            </Button>
          </div>

          {userGroups.length === 0 ? (
            <Card className="gaming-card">
              <CardContent className="p-6 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold text-foreground mb-2">No Streaks yet!</h3>
                <p className="text-muted-foreground mb-4">
                  Create or join a Streak to start your journey.
                </p>
                <div />
              </CardContent>
            </Card>
          ) : (
                <div className="grid grid-cols-1 gap-4">
              {userGroups.map((userGroup) => (
                <Card
                  key={userGroup.group_id}
                  className="mobile-tile cursor-pointer animate-slide-up"
                  onClick={() => navigate(`/groups/${userGroup.group_id}`)}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold gradient-text">{userGroup.groups?.name || "Unknown Streak"}</h3>
                      {userGroup.groups?.is_active ? (
                        <Badge className="bg-success/20 text-success border-success/30">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-energy" />
                        <span className="font-semibold text-foreground">{userGroup.total_points} Gems</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-warning" />
                        <span className="font-semibold text-foreground">{userGroup.current_streak} day Streak</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-foreground">{userGroup.role === 'admin' ? 'Admin' : 'Member'}</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Optional quick links removed from home as requested */}
      </div>
    </div>
  );
};

export default Index;
