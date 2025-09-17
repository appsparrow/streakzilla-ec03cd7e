import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Trophy, Flame, Users } from "lucide-react";

interface UserHabit {
  id: string;
  title: string;
  points: number;
}

interface UserStreak {
  group_id: string;
  name: string;
  current_streak: number;
  total_points: number;
}

export const CheckIn = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userStreaks, setUserStreaks] = useState<UserStreak[]>([]);
  const [selectedStreak, setSelectedStreak] = useState<string | null>(null);
  const [userHabits, setUserHabits] = useState<UserHabit[]>([]);
  const [todayCompleted, setTodayCompleted] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchUserStreaks();
    }
  }, [user]);

  useEffect(() => {
    if (selectedStreak) {
      fetchUserHabits(selectedStreak);
    }
  }, [selectedStreak]);

  const fetchUserStreaks = async () => {
    try {
      const { data: streaks, error } = await (supabase as any).rpc('get_user_groups');
      if (error) throw error;

      const activeStreaks = streaks.map((s: any) => ({
        group_id: s.group_id,
        name: s.name,
        current_streak: s.current_streak,
        total_points: s.total_points
      })).filter((s: UserStreak) => s.name);

      setUserStreaks(activeStreaks);
      if (activeStreaks.length > 0) {
        setSelectedStreak(activeStreaks[0].group_id);
      }
    } catch (error) {
      console.error('Error fetching streaks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your streaks',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHabits = async (groupId: string) => {
    try {
      const { data: habits, error } = await supabase
        .from('user_habits')
        .select('id, habits(title, points)')
        .eq('group_id', groupId)
        .eq('user_id', user?.id);

      if (error) throw error;

      const formattedHabits = habits.map(h => ({
        id: h.id,
        title: h.habits.title,
        points: h.habits.points
      }));

      setUserHabits(formattedHabits);
      setTodayCompleted([]);
    } catch (error) {
      console.error('Error fetching habits:', error);
      toast({
        title: 'Error',
        description: 'Failed to load habits',
        variant: 'destructive'
      });
    }
  };

  const toggleHabit = (id: string) => {
    setTodayCompleted(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSlide = (val: number[]) => {
    const v = Math.min(100, Math.max(0, val?.[0] ?? 0));
    const count = Math.round((v / 100) * userHabits.length);
    setTodayCompleted(userHabits.slice(0, count).map(h => h.id));
  };

  const handleCheckIn = async () => {
    if (!selectedStreak || todayCompleted.length === 0) {
      toast({
        title: 'Select Powers',
        description: 'Please select at least one power to check in.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('checkin', {
        p_group_id: selectedStreak,
        p_day_number: getCurrentDay(selectedStreak),
        p_completed_habit_ids: todayCompleted,
        p_photo_path: null,
        p_note: null
      });

      if (error) {
        if (error.message?.includes('already checked in')) {
          toast({
            title: 'Already Checked In',
            description: "You've already completed your check-in for today! Come back tomorrow.",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Check-in Complete! 🎉',
          description: `You earned ${(data as any)?.points_earned || 0} gems! Current streak: ${(data as any)?.current_streak || 0}`,
        });

        // Refresh data
        await fetchUserStreaks();
        if (selectedStreak) {
          await fetchUserHabits(selectedStreak);
        }
      }
    } catch (error: any) {
      console.error('Error checking in:', error);
      toast({
        title: 'Check-in Failed',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getCurrentDay = (groupId: string) => {
    const streak = userStreaks.find(s => s.group_id === groupId);
    return streak?.current_streak || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading check-in...</p>
        </div>
      </div>
    );
  }

  if (userStreaks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4 pb-32">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="gaming-card">
            <CardContent className="p-6 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold text-foreground mb-2">No Active Streaks</h3>
              <p className="text-muted-foreground mb-4">
                Join or create a streak to start checking in!
              </p>
              <Button onClick={() => navigate("/")}>Go to Home</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4 pb-32">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col items-center justify-center text-center gap-2">
          <h1 className="text-2xl text-blue-400">Daily Check-in</h1>
          <p className="text-sm text-muted-foreground">Track your progress for today</p>
        </div>

        {/* Streak Selection */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="text-blue-400 text-lg">Select Streak</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {userStreaks.map(streak => (
              <div
                key={streak.group_id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedStreak === streak.group_id
                    ? 'bg-blue-400/10 border-blue-400'
                    : 'bg-muted/50 border-border hover:bg-muted/70'
                }`}
                onClick={() => setSelectedStreak(streak.group_id)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{streak.name}</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-energy" />
                      {streak.total_points}
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-4 h-4 text-warning" />
                      {streak.current_streak}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Powers Check-in */}
        {selectedStreak && (
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="text-blue-400 text-lg">Your Powers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userHabits.length === 0 ? (
                <p className="text-center text-muted-foreground">No powers selected for this streak.</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {userHabits.map(habit => (
                      <div
                        key={habit.id}
                        className="flex items-center gap-2 p-3 rounded bg-muted/20 border border-border cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => toggleHabit(habit.id)}
                      >
                        <Checkbox
                          checked={todayCompleted.includes(habit.id)}
                          onCheckedChange={() => toggleHabit(habit.id)}
                        />
                        <div className="flex-1 text-sm">{habit.title}</div>
                        <div className="text-xs text-blue-400 font-semibold">{habit.points} gems</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="text-xs text-muted-foreground">Slide to mark all done</div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Slider
                          defaultValue={[0]}
                          max={100}
                          step={5}
                          onValueChange={handleSlide}
                          className="w-full"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleCheckIn}
                        disabled={todayCompleted.length === 0}
                      >
                        Check In
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
