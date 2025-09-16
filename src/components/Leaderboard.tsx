import { Trophy, Medal, Flame, Heart, TrendingUp, Calendar, Users, Target, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const mockLeaderboard = [
  {
    id: 1,
    name: "Alex Chen",
    avatar: "/api/placeholder/40/40",
    streak: 15,
    points: 1125,
    livesRemaining: 3,
    rank: 1,
    todayPoints: 85
  },
  {
    id: 2,
    name: "Maria Santos", 
    avatar: "/api/placeholder/40/40",
    streak: 15,
    points: 1020,
    livesRemaining: 2,
    rank: 2,
    todayPoints: 75
  },
  {
    id: 3,
    name: "David Kim",
    avatar: "/api/placeholder/40/40", 
    streak: 14,
    points: 980,
    livesRemaining: 3,
    rank: 3,
    todayPoints: 70
  },
  {
    id: 4,
    name: "You",
    avatar: "/api/placeholder/40/40",
    streak: 15,
    points: 875,
    livesRemaining: 1,
    rank: 4,
    todayPoints: 80
  },
  {
    id: 5,
    name: "Sarah Johnson",
    avatar: "/api/placeholder/40/40",
    streak: 12,
    points: 720,
    livesRemaining: 2,
    rank: 5,
    todayPoints: 60
  }
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-6 h-6 text-yellow-500" />;
    case 2: 
      return <Medal className="w-6 h-6 text-gray-400" />;
    case 3:
      return <Medal className="w-6 h-6 text-amber-600" />;
    default:
      return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
  }
};

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1:
      return "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30";
    case 2:
      return "from-gray-400/20 to-gray-500/20 border-gray-400/30";
    case 3:
      return "from-amber-600/20 to-amber-700/20 border-amber-600/30";
    default:
      return "from-card to-muted border-border";
  }
};

interface LeaderboardMember {
  id: string;
  name: string;
  avatar?: string;
  streak: number;
  points: number;
  livesRemaining: number;
  rank: number;
  todayPoints: number;
  completionRate: number;
  totalDays: number;
  daysCompleted: number;
}

interface GroupStats {
  totalMembers: number;
  totalPoints: number;
  averageStreak: number;
  daysComplete: number;
  totalDays: number;
}

interface LeaderboardProps {
  groupId?: string;
}

export const Leaderboard = ({ groupId }: LeaderboardProps) => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardMember[]>([]);
  const [groupStats, setGroupStats] = useState<GroupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    if (groupId) {
      fetchLeaderboardData();
    }
  }, [groupId]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch group info
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('name, start_date, duration_days')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroupName(groupData.name);

      // Calculate days complete
      const startDate = new Date(groupData.start_date);
      const today = new Date();
      const diffTime = today.getTime() - startDate.getTime();
      const daysComplete = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      // Prefer RPC for consistent ordering and policy-safe access
      const { data: rpcData, error: rpcErr } = await supabase
        .rpc('get_group_leaderboard', { p_group_id: groupId });

      let members: LeaderboardMember[] = [];
      if (!rpcErr && rpcData) {
        members = (rpcData as any[]).map((row, index) => ({
          id: row.user_id,
          name: row.display_name || 'Anonymous',
          avatar: row.avatar_url,
          streak: row.current_streak || 0,
          points: row.total_points || 0,
          livesRemaining: row.lives_remaining || 3,
          rank: row.rank || index + 1,
          todayPoints: 0,
          completionRate: 0,
          totalDays: groupData.duration_days,
          daysCompleted: daysComplete,
        }));
      } else {
        // Fallback to direct table if RPC not available
        const { data: fallback, error: fallbackErr } = await supabase
          .from('group_members')
          .select(`
            user_id, total_points, current_streak, lives_remaining,
            profiles ( display_name, avatar_url )
          `)
          .eq('group_id', groupId)
          .order('total_points', { ascending: false });
        if (fallbackErr) throw fallbackErr;
        members = (fallback || []).map((member: any, index: number) => ({
          id: member.user_id,
          name: member.profiles?.display_name || 'Anonymous',
          avatar: member.profiles?.avatar_url,
          streak: member.current_streak || 0,
          points: member.total_points || 0,
          livesRemaining: member.lives_remaining || 3,
          rank: index + 1,
          todayPoints: 0,
          completionRate: 0,
          totalDays: groupData.duration_days,
          daysCompleted: daysComplete,
        }));
      }

      setLeaderboard(members);

      // Calculate group stats
      const totalMembers = members.length;
      const totalPoints = members.reduce((sum, member) => sum + member.points, 0);
      const averageStreak = totalMembers > 0 ? members.reduce((sum, m) => sum + m.streak, 0) / totalMembers : 0;

      setGroupStats({
        totalMembers,
        totalPoints,
        averageStreak: Math.round(averageStreak),
        daysComplete,
        totalDays: groupData.duration_days,
      });

    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      // Fallback to mock if all else fails
      setLeaderboard(mockLeaderboard);
      setGroupStats({
        totalMembers: mockLeaderboard.length,
        totalPoints: mockLeaderboard.reduce((s, m) => s + m.points, 0),
        averageStreak: Math.round(mockLeaderboard.reduce((s, m) => s + m.streak, 0) / mockLeaderboard.length),
        daysComplete: 1,
        totalDays: 75,
      });
      setGroupName("Your Group");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold gradient-text">Leaderboard</h1>
        <p className="text-muted-foreground">{groupName} • Day {groupStats?.daysComplete} of {groupStats?.totalDays}</p>
      </div>

      {/* Challenge Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="gaming-card">
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold gradient-text">{groupStats?.daysComplete}</p>
            <p className="text-sm text-muted-foreground">Days Complete</p>
            <div className="mt-2">
              <Progress 
                value={(groupStats?.daysComplete || 0) / (groupStats?.totalDays || 1) * 100} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>
        
        <Card className="gaming-card">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-success" />
            <p className="text-2xl font-bold text-success">{groupStats?.totalMembers}</p>
            <p className="text-sm text-muted-foreground">Streakmates</p>
          </CardContent>
        </Card>
        
        <Card className="gaming-card">
          <CardContent className="p-4 text-center">
            <Zap className="w-6 h-6 mx-auto mb-2 text-energy" />
            <p className="text-2xl font-bold text-energy">{groupStats?.totalPoints.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Scales</p>
          </CardContent>
        </Card>
        
        <Card className="gaming-card">
          <CardContent className="p-4 text-center">
            <Flame className="w-6 h-6 mx-auto mb-2 text-warning" />
            <p className="text-2xl font-bold text-warning">{groupStats?.averageStreak}</p>
            <p className="text-sm text-muted-foreground">Avg Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="gaming-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Current Standings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaderboard.map((member) => {
            const isCurrentUser = member.id === user?.id;
            
            return (
              <div 
                key={member.id} 
                className={`p-4 rounded-lg bg-gradient-to-r ${getRankColor(member.rank)} ${
                  isCurrentUser ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getRankIcon(member.rank)}
                  </div>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground truncate">{member.name}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{member.streak}d streak</span>
                        <span>{member.livesRemaining} lives</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold gradient-text">{member.points.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">+{member.todayPoints} scales today</div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {leaderboard.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">No members yet</h3>
              <p className="text-muted-foreground">
                Invite friends to join your group and start competing!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Motivational Footer */}
      <Card className="gaming-card border-primary/20">
        <CardContent className="p-6 text-center bg-gradient-to-r from-primary/10 to-primary/20">
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            {groupStats ? `${groupStats.totalDays - groupStats.daysComplete} Days to Go!` : "Keep Going!"}
          </h3>
          <p className="text-muted-foreground mb-4">
            You're doing amazing! Stay consistent to climb the leaderboard.
          </p>
          <div className="flex items-center justify-center gap-2 text-energy">
            <Flame className="w-5 h-5" />
            <span className="font-semibold">Keep the streak alive!</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};