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
        console.error("Profile error:", profileError);
        // If profile doesn't exist, create a default one
        if (profileError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: user?.id,
              display_name: user?.email?.split('@')[0] || 'User',
              full_name: user?.user_metadata?.full_name || '',
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
        const { data: rpcGroups, error: rpcErr } = await supabase.rpc('get_user_groups');
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
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/profile")}
              className="hover:bg-muted/50"
            >
              <UserCircle className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/settings")}
              className="hover:bg-muted/50"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSignOut}
              className="hover:bg-muted/50"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Group List */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Your Streaks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {userGroups.length === 0 && (
              <p className="text-sm text-muted-foreground">You are not part of any streak yet. Use Profile to create or join.</p>
            )}
            {userGroups.slice(0, 2).map((g: any) => (
              <div key={g.group_id} className="p-3 rounded border border-border bg-muted/20 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/groups/${g.group_id}`)} role="button" aria-label={`Open ${g.groups?.name}`}>
                <div>
                  <div className="font-semibold">{g.groups?.name}</div>
                  <div className="text-xs text-muted-foreground">Code: {g.groups?.code}</div>
                </div>
                <ArrowRight className="w-4 h-4" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Optional quick links removed from home as requested */}
      </div>
    </div>
  );
};

export default Index;
