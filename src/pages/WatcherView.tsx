import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Flame, 
  Trophy, 
  Calendar,
  Target,
  Heart,
  Star,
  Zap,
  Eye,
  ArrowRight
} from 'lucide-react';

interface StreakData {
  id: string;
  name: string;
  start_date: string;
  duration_days: number;
  created_at: string;
  member_count: number;
  total_points: number;
  average_streak: number;
  days_completed: number;
  days_remaining: number;
}

interface MemberData {
  id: string;
  display_name: string;
  avatar_url: string;
  total_points: number;
  current_streak: number;
  lives_remaining: number;
  rank: number;
}

export const WatcherView = () => {
  const { groupId } = useParams();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupId) {
      fetchStreakData();
    }
  }, [groupId]);

  const fetchStreakData = async () => {
    try {
      setLoading(true);
      
      // Fetch public streak data
      const { data: streak, error: streakError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (streakError) throw streakError;

      // Fetch member leaderboard using existing function
      const { data: memberData, error: memberError } = await (supabase as any)
        .rpc('get_group_members_details', { p_group_id: groupId });

      if (memberError) throw memberError;

      // Calculate streak stats
      const today = new Date();
      const startDate = new Date(streak.start_date);
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysCompleted = Math.max(0, daysSinceStart);
      const daysRemaining = Math.max(0, streak.duration_days - daysCompleted);
      
      const members = (memberData as any[]) || [];
      const totalPoints = members.reduce((sum: number, member: any) => sum + (member.total_points || 0), 0);
      const averageStreak = members.length > 0 
        ? Math.round(members.reduce((sum: number, member: any) => sum + (member.current_streak || 0), 0) / members.length)
        : 0;

      setStreakData({
        ...streak,
        member_count: members.length,
        total_points: totalPoints,
        average_streak: averageStreak,
        days_completed: daysCompleted,
        days_remaining: daysRemaining
      });

      // Add rank to member data
      const membersWithRank = members.map((member, index) => ({
        ...member,
        id: member.user_id,
        rank: index + 1
      }));
      
      setMembers(membersWithRank);
    } catch (error: any) {
      setError(error.message || 'Failed to load streak data');
    } finally {
      setLoading(false);
    }
  };

  const getJoinCTA = () => {
    if (!streakData) return null;
    
    const daysLeft = streakData.days_remaining;
    
    if (daysLeft >= 60) {
      return {
        title: "Join the Challenge!",
        subtitle: "75 days of transformation awaits",
        button: "Start Your Journey",
        color: "bg-gradient-to-r from-green-500 to-emerald-600"
      };
    } else if (daysLeft >= 45) {
      return {
        title: "Still Time to Join!",
        subtitle: "60+ days of growth remaining",
        button: "Jump In Now",
        color: "bg-gradient-to-r from-blue-500 to-cyan-600"
      };
    } else if (daysLeft >= 30) {
      return {
        title: "Last Chance!",
        subtitle: "45+ days of progress still possible",
        button: "Join Today",
        color: "bg-gradient-to-r from-orange-500 to-red-500"
      };
    } else if (daysLeft >= 15) {
      return {
        title: "Final Sprint!",
        subtitle: "30+ days to make a difference",
        button: "Join the Final Push",
        color: "bg-gradient-to-r from-purple-500 to-pink-500"
      };
    } else {
      return {
        title: "Challenge Complete!",
        subtitle: "Watch their amazing transformation",
        button: "Start Your Own Streak",
        color: "bg-gradient-to-r from-gray-500 to-slate-600"
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading streak data...</p>
        </div>
      </div>
    );
  }

  if (error || !streakData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
            <Eye className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">Streak Not Found</h2>
          <p className="text-muted-foreground">This streak may be private or no longer exists.</p>
        </div>
      </div>
    );
  }

  const joinCTA = getJoinCTA();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <img src="/logo-streakzilla-c.png" alt="Streakzilla" className="w-8 h-8" />
            <h1 className="text-3xl font-bold gradient-text">Streakzilla</h1>
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Public Streak View</span>
          </div>
        </div>

        {/* Streak Overview */}
        <Card className="gaming-card border-primary/20 bg-gradient-to-r from-primary/5 to-purple-600/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-6 h-6 text-primary" />
              {streakData.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{streakData.days_completed} / {streakData.duration_days} days</span>
              </div>
              <Progress 
                value={(streakData.days_completed / streakData.duration_days) * 100} 
                className="h-3"
              />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-2xl font-bold">{streakData.member_count}</span>
                </div>
                <p className="text-sm text-muted-foreground">Streakmates</p>
              </div>
              
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-2xl font-bold">{streakData.total_points}</span>
                </div>
                <p className="text-sm text-muted-foreground">Total Gems</p>
              </div>
              
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <Zap className="w-4 h-4 text-purple-500" />
                  <span className="text-2xl font-bold">{streakData.average_streak}</span>
                </div>
                <p className="text-sm text-muted-foreground">Avg Streak</p>
              </div>
              
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="w-4 h-4 text-green-500" />
                  <span className="text-2xl font-bold">{streakData.days_remaining}</span>
                </div>
                <p className="text-sm text-muted-foreground">Days Left</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Join CTA */}
        {joinCTA && (
          <Card className={`gaming-card ${joinCTA.color} text-white`}>
            <CardContent className="p-6 text-center space-y-4">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">{joinCTA.title}</h3>
                <p className="text-lg opacity-90">{joinCTA.subtitle}</p>
              </div>
              <Button 
                size="lg" 
                className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-8"
                onClick={() => window.location.href = '/auth'}
              >
                {joinCTA.button}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member, index) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
                      {member.rank}
                    </div>
                    <div className="flex items-center gap-2">
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt={member.display_name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-semibold">
                            {member.display_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-semibold">{member.display_name}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="font-semibold">{member.total_points}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Gems</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        <span className="font-semibold">{member.current_streak}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Streak</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-red-500" />
                        <span className="font-semibold">{member.lives_remaining}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Lives</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-8">
          <p>Want to start your own streak? <a href="/auth" className="text-primary hover:underline">Join Streakzilla</a></p>
        </div>
      </div>
    </div>
  );
};
