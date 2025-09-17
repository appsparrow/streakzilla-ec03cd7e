import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Leaderboard } from "@/components/Leaderboard";
import CheckInPanel from "@/components/CheckInPanel";
import { GroupCheckinsFeed } from "@/components/GroupCheckinsFeed";
import { UseLifeModal } from "@/components/UseLifeModal";
import { 
  Calendar, 
  Settings, 
  MessageSquare, 
  CheckCircle,
  Flame,
  ArrowLeft,
  Heart
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

interface Group {
  id: string;
  name: string;
  code: string;
  start_date: string;
  duration_days: number;
  mode: string;
  is_active: boolean;
}

interface GroupMember {
  id: string;
  role: string;
  lives_remaining: number;
  total_points: number;
  current_streak: number;
  is_out: boolean;
  profiles?: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface UserMembership {
  role: string;
  total_points: number;
  current_streak: number;
  lives_remaining: number;
  joined_at: string;
}

export const GroupDashboard = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [userMembership, setUserMembership] = useState<UserMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [userHabits, setUserHabits] = useState<{ id: string; title: string; points: number; }[]>([]);
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [todayCompleted, setTodayCompleted] = useState<string[]>([]);
  const [checkinHistory, setCheckinHistory] = useState<{ date: string; logged: boolean }[]>([]);
  const [missedYesterday, setMissedYesterday] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [useLifeModalOpen, setUseLifeModalOpen] = useState(false);

  useEffect(() => {
    if (groupId && user) {
      fetchGroupData();
    }
  }, [groupId, user]);

  const fetchGroupData = async () => {
    try {
      // Fetch group details and user membership via RPC
      const { data: groupDetails, error: groupError } = await (supabase as any).rpc(
        'get_group_details',
        { p_group_id: groupId, p_user_id: user?.id }
      );

      if (groupError) throw groupError;
      
      if (groupDetails?.[0]) {
        const details = groupDetails[0];
        setGroup({
          id: details.group_id,
          name: details.name,
          code: details.code,
          start_date: details.start_date,
          duration_days: details.duration_days,
          mode: details.mode,
          is_active: details.is_active
        });

        // Determine role with a reliable fallback: treat group creator as admin
        let resolvedRole = details.user_role as string;
        try {
          const { data: meta } = await supabase
            .from('groups')
            .select('created_by')
            .eq('id', details.group_id)
            .single();
          if ((meta as any)?.created_by && (meta as any).created_by === user?.id) {
            resolvedRole = 'admin';
          }
        } catch {}

        setUserMembership({
          role: resolvedRole,
          total_points: details.user_total_points,
          current_streak: details.user_current_streak,
          lives_remaining: details.user_lives_remaining,
          joined_at: details.user_joined_at
        });
      }

      // Fetch group members via RPC
      const { data: memberDetails, error: membersError } = await (supabase as any).rpc(
        'get_group_members_details',
        { p_group_id: groupId }
      );

      if (membersError) throw membersError;

      const normalized = (memberDetails || []).map(m => ({
        id: m.user_id,
        role: m.role,
        lives_remaining: m.lives_remaining,
        total_points: m.total_points,
        current_streak: m.current_streak,
        is_out: m.is_out,
        profiles: {
          display_name: m.display_name,
          avatar_url: m.avatar_url
        }
      }));
      setMembers(normalized);

      // Fetch current user's selected habits
      if (groupId && user?.id) {
        setHabitsLoading(true);
        const { data: uhData, error: uhErr } = await (supabase as any).rpc('get_user_selected_habits', {
          p_group_id: groupId,
          p_user_id: user.id,
        });
        if (!uhErr && uhData) {
          setUserHabits((uhData as any[]).map(h => ({ id: h.habit_id, title: h.title, points: h.points })));
        } else {
          setUserHabits([]);
        }
        setHabitsLoading(false);
      }

      // Fetch check-in history for progress chart
      await fetchCheckinHistory();

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load group data",
        variant: "destructive",
      });
      console.error("Error fetching group data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckinHistory = async () => {
    if (!groupId || !user?.id) return;
    
    try {
      // Use the new RPC function to get checkin history
      const { data: historyData, error } = await (supabase as any).rpc('get_user_checkin_history', {
        p_group_id: groupId,
        p_user_id: user.id,
        p_days_back: 7
      });

      if (error) {
        // If RPC is missing in prod, just skip without breaking the page
        console.warn('Checkin history RPC unavailable:', error);
        setCheckinHistory([]);
        setCheckedInToday(false);
        setMissedYesterday(false);
        return;
      }

      // Convert to our format
      const history = (historyData as any[] || []).map((item: any) => ({
        date: item.checkin_date,
        logged: item.logged
      }));
      
      setCheckinHistory(history);
      
      // Check if user checked in today (last item in array)
      const today = history[0]; // First item is today
      setCheckedInToday(today?.logged || false);
      
      // Check if user missed yesterday (second item)
      const yesterday = history[1]; // Second item is yesterday
      setMissedYesterday(!yesterday?.logged);
      
    } catch (error) {
      console.error('Error fetching check-in history:', error);
      // Fallback to empty state
      setCheckinHistory([]);
      setCheckedInToday(false);
      setMissedYesterday(false);
    }
  };

  const useLifeToCheckIn = async () => {
    if (!userMembership || userMembership.lives_remaining <= 0) {
      toast({
        title: "No Lives Left",
        description: "You don't have any lives remaining.",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Implement use life functionality
      // This would typically involve:
      // 1. Deducting a life from user's account
      // 2. Allowing them to check in for yesterday
      // 3. Updating their streak
      
      toast({
        title: "Life Used",
        description: "You've used a life to check in for yesterday.",
      });
      
      // Refresh data
      await fetchGroupData();
      
    } catch (error) {
      console.error('Error using life:', error);
      toast({
        title: "Error",
        description: "Failed to use life. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLifeUsed = async () => {
    // Refresh all data after using a life
    await fetchGroupData();
    setUseLifeModalOpen(false);
  };

  const calculateDaysRemaining = () => {
    if (!group?.start_date || !group?.duration_days) return 0;
    const startDate = new Date(group.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + group.duration_days);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getCurrentDay = () => {
    if (!group?.start_date) return 0;
    const startDate = new Date(group.start_date);
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  const daysFromJoin = () => {
    if (!userMembership?.joined_at) return 0;
    const joinDate = new Date(userMembership.joined_at);
    const today = new Date();
    return Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
  };
  const canEditHabits = daysFromJoin() <= 3;

  const toggleToday = (id: string) => {
    setTodayCompleted(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const markAllDone = () => {
    setTodayCompleted(userHabits.map(h => h.id));
  };
  const handleCheckIn = async () => {
    if (todayCompleted.length === 0) {
      toast({
        title: "No powers selected",
        description: "Please select at least one power to check in.",
        variant: "destructive",
      });
      return;
    }

    try {
      const currentDay = getCurrentDay();
      
      // Call the checkin RPC function
      const { data, error } = await supabase.rpc('checkin', {
        p_group_id: groupId,
        p_day_number: currentDay,
        p_completed_habit_ids: todayCompleted,
        p_photo_path: null, // TODO: Implement photo upload
        p_note: null
      });

      if (error) {
        // Handle specific "already checked in" error
        if (error.code === 'P0001' && error.message?.includes('already checked in')) {
          toast({
            title: "Already Checked In",
            description: "You've already completed your check-in for today! Come back tomorrow.",
            variant: "default",
          });
        } else {
          throw error;
        }
      } else {
        // Show success
        toast({
          title: "Check-in Complete! 🎉",
          description: `You earned ${(data as any)?.points_earned || 0} gems! Current streak: ${(data as any)?.current_streak || 0}`,
        });

        // Refresh data to show updated stats
        await fetchGroupData();
        
        // Clear selections
        setTodayCompleted([]);
      }
    } catch (error: any) {
      console.error('Error checking in:', error);
      toast({
        title: "Check-in Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };
  const handleSlide = (val: number[]) => {
    const v = Math.min(100, Math.max(0, val?.[0] ?? 0));
    const count = Math.round((v / 100) * userHabits.length);
    setTodayCompleted(userHabits.slice(0, count).map(h => h.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Group not found</h2>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const daysRemaining = calculateDaysRemaining();
  const currentDay = getCurrentDay();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4 pb-32">
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
             
          </Button>
          <div className="text-center flex-1 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden p-1 shadow-md">
              <img 
                src="/logo-streakzilla-w.png" 
                alt="Streakzilla" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">{group.name}</h1>
              <p className="text-muted-foreground">Code: {group.code}</p>
            </div>
          </div>
          <div className="w-20" /> {/* Spacer */}
        </div>

        {/* No Powers Selected - Prominent Call to Action */}
        {userHabits.length === 0 && !habitsLoading && (
          <Card className="gaming-card border-primary/20 bg-gradient-to-r from-primary/10 to-purple-600/10">
            <CardContent className="p-8 text-center space-y-6">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto">
                  <Flame className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold gradient-text">Ready to Begin Your Journey?</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Select your powers to start tracking your streak and begin your transformation journey!
                </p>
              </div>
              
              <Button 
                onClick={() => navigate(`/groups/${groupId}/habits`)}
                variant="default"
                size="lg"
                className="w-full h-14 text-xl font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <Flame className="w-6 h-6 mr-3" />
                Select Powers to Begin Tracking
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Power Modification Window Reminder */}
        {userHabits.length > 0 && !habitsLoading && (() => {
          const startDate = new Date(group?.start_date || '');
          const today = new Date();
          const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const canModifyPowers = daysSinceStart <= 3;
          const daysLeftToModify = Math.max(0, 3 - daysSinceStart);
          
          return canModifyPowers && daysLeftToModify > 0 ? (
            <Card className="gaming-card border-primary/20 bg-gradient-to-r from-primary/5 to-blue-600/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-semibold text-primary">Powers Can Be Modified</p>
                    <p className="text-sm text-muted-foreground">
                      {daysLeftToModify} day{daysLeftToModify !== 1 ? 's' : ''} left to adjust your power selection
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/groups/${groupId}/habits`)}
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    Modify Powers
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null;
        })()}

        {/* Streak Status - Prominent Display */}
        <Card className={`mobile-card border-2 ${
          checkedInToday 
            ? 'bg-gradient-to-r from-green-500/20 to-emerald-600/20 border-green-500/40' 
            : 'bg-gradient-to-r from-primary/10 to-purple-600/10 border-primary/20'
        }`}>
          <CardContent className="p-6 text-center space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              
              {checkedInToday ? (
                <div className="space-y-3">
                  <div className="text-4xl font-bold text-green-500 animate-pulse">
                    🎉 WOOHOO! 🎉
                  </div>
                  <h2 className="text-2xl font-bold text-green-600">
                    Already Checked In!
                  </h2>
                  <p className="text-sm text-green-500 font-medium">
                    You're crushing it! Keep the momentum going! 💪
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold gradient-text">
                    {daysRemaining} Days to Go!
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    You're doing amazing! Stay consistent to climb the leaderboard.
                  </p>
                </div>
              )}
            </div>
            
            {/* 7-Day Progress Chart */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Last 7 Days Progress</h3>
              <div className="flex items-end justify-center gap-2 h-20">
                {checkinHistory.map((day, i) => {
                  const dayDate = new Date(day.date);
                  const height = day.logged ? Math.random() * 60 + 20 : 10;
                  
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div 
                        className={`w-6 rounded-t transition-all duration-300 ${
                          day.logged 
                            ? 'bg-green-500 hover:bg-green-600' 
                            : 'bg-red-500 hover:bg-red-600'
                        }`}
                        style={{ height: `${height}px` }}
                        title={`${dayDate.toLocaleDateString()}: ${day.logged ? 'Logged' : 'Missed'}`}
                      />
                      <div className="text-xs text-muted-foreground">
                        {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Missed Login Warning */}
              {missedYesterday && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-sm text-red-400 font-medium">
                    You did not log yesterday. Do you want to use a life to check in?
                  </p>
                  <p className="text-xs text-red-300 mt-1">
                    Reminder: Once all lives are lost, the streak is broken.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-400 border-red-400/30 hover:bg-red-500/10"
                      onClick={useLifeToCheckIn}
                    >
                      Use Life ({userMembership?.lives_remaining || 0} left)
                    </Button>
                    <Button size="sm" variant="ghost" className="text-muted-foreground">
                      Skip
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Spacer for layout consistency (stats removed) */}
        <div className="h-2" />

        {/* Daily Check-in Section - Reused from CheckIn page */}
        <CheckInPanel groupId={groupId as string} />

        {/* User Stats Card */}
        {userMembership && (
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-energy" />
                Your Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-bold text-energy">{userMembership.current_streak} days</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-sm text-muted-foreground">Total Gems</p>
                  <p className="text-lg font-semibold">{userMembership.total_points}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium">{userMembership.lives_remaining} Lives Remaining</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUseLifeModalOpen(true)}
                  disabled={userMembership.lives_remaining === 0}
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Heart className="w-3 h-3 mr-1" />
                  Use Life
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="leaderboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="members">Streakmates</TabsTrigger>
            <TabsTrigger value="checkins">Check-ins</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            <Leaderboard groupId={groupId} />
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle>Streakmates ({members.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/groups/${groupId}/members/${member.id}`)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {member.profiles?.display_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-semibold">{member.profiles?.display_name || "Unknown"}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{member.total_points} gems</span>
                          <span>•</span>
                          <span>{member.current_streak} streak</span>
                          <span>•</span>
                          <span>{member.lives_remaining} lives</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === 'admin' && (
                        <Badge variant="default" className="bg-blue-400/20 text-blue-400 border-blue-400/30">Admin</Badge>
                      )}
                      {member.is_out && (
                        <Badge variant="destructive">Out</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkins" className="space-y-4">
            <GroupCheckinsFeed groupId={groupId as string} />
          </TabsContent>
        </Tabs>

        {/* Floating Action Button */}
        <Button
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
          onClick={() => navigate(`/groups/${groupId}/checkin`)}
        >
          <Calendar className="w-6 h-6" />
        </Button>

        {/* Use Life Modal */}
        {userMembership && (
          <UseLifeModal
            open={useLifeModalOpen}
            onOpenChange={setUseLifeModalOpen}
            groupId={groupId as string}
            livesRemaining={userMembership.lives_remaining}
            onLifeUsed={handleLifeUsed}
          />
        )}
      </div>
    </div>
  );
};