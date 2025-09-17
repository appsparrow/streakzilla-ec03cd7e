import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Target, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Habit {
  id: string;
  title: string;
  points: number;
  category?: string;
}

interface CheckInPanelProps {
  groupId: string;
}

export const CheckInPanel: React.FC<CheckInPanelProps> = ({ groupId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedHabits, setCompletedHabits] = useState<string[]>([]);
  const [dayNumber, setDayNumber] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [streakStarted, setStreakStarted] = useState(false);
  const [daysUntilStart, setDaysUntilStart] = useState(0);

  useEffect(() => {
    if (!groupId || !user?.id) return;
    fetchUserHabits();
    fetchDayNumber();
  }, [groupId, user?.id]);

  const fetchUserHabits = async () => {
    try {
      const { data, error } = await (supabase as any).rpc("get_user_selected_habits", {
        p_group_id: groupId,
        p_user_id: user?.id,
      });
      if (error) throw error;
      const userHabits: Habit[] = (data || []).map((item: any) => ({
        id: item.habit_id,
        title: item.title,
        points: item.points,
        category: item.category,
      }));
      setHabits(userHabits);
      setCompletedHabits([]);
    } catch (e) {
      console.error("Error fetching habits:", e);
      toast({ title: "Error", description: "Failed to load your powers", variant: "destructive" });
    }
  };

  const fetchDayNumber = async () => {
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("start_date")
        .eq("id", groupId)
        .single();
      if (error) throw error;
      const startDate = new Date((data as any).start_date);
      const today = new Date();
      
      // Reset time to start of day for accurate comparison
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startDateStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      
      const diffTime = todayStart.getTime() - startDateStart.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0) {
        // Streak has started
        setStreakStarted(true);
        setDayNumber(Math.max(1, diffDays + 1));
        setDaysUntilStart(0);
      } else {
        // Streak hasn't started yet
        setStreakStarted(false);
        setDaysUntilStart(Math.abs(diffDays));
        setDayNumber(1);
      }
    } catch (e) {
      console.error("Error calculating day number:", e);
    }
  };

  const handleHabitToggle = (habitId: string) => {
    setCompletedHabits((prev) => (prev.includes(habitId) ? prev.filter((id) => id !== habitId) : [...prev, habitId]));
  };

  const handleQuickSelect = (value: number[]) => {
    const numToSelect = value[0] ?? 0;
    setCompletedHabits(habits.slice(0, numToSelect).map((h) => h.id));
  };

  const totalPoints = habits
    .filter((h) => completedHabits.includes(h.id))
    .reduce((sum, h) => sum + (h.points || 0), 0);
  const completionPercentage = habits.length > 0 ? (completedHabits.length / habits.length) * 100 : 0;

  const submitCheckIn = async () => {
    if (completedHabits.length === 0) {
      toast({ title: "No powers selected", description: "Select at least one power to check in.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("checkin", {
        p_group_id: groupId,
        p_day_number: dayNumber,
        p_completed_habit_ids: completedHabits,
        p_photo_path: null,
        p_note: null,
      });
      if (error) {
        if ((error as any).message?.includes("already checked in")) {
          toast({ title: "Already Checked In", description: "Come back tomorrow.", variant: "default" });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Check-in Complete! 🎉",
          description: `You earned ${(data as any)?.points_earned || 0} gems! Current streak: ${(data as any)?.current_streak || 0}`,
        });
        // Refresh UI
        await fetchUserHabits();
      }
    } catch (e: any) {
      console.error("Error checking in:", e);
      toast({ title: "Check-in Failed", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Show countdown if streak hasn't started yet
  if (!streakStarted) {
    return (
      <Card className="gaming-card border-primary/20 bg-gradient-to-r from-primary/10 to-purple-600/10">
        <CardContent className="p-8 text-center space-y-6">
          <div className="space-y-3">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold gradient-text">You're All Set!</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your streak starts in {daysUntilStart} day{daysUntilStart !== 1 ? 's' : ''}. 
              Get ready to begin your transformation journey!
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="text-4xl font-bold text-primary">
              {daysUntilStart}
            </div>
            <div className="text-sm text-muted-foreground">
              Day{daysUntilStart !== 1 ? 's' : ''} until your streak begins
            </div>
          </div>
          
          <div className="pt-4">
            <div className="text-sm text-muted-foreground">
              Selected {habits.length} powers • {habits.reduce((sum, h) => sum + h.points, 0)} gems total
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="gaming-card border-primary/20">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Today's Progress</h3>
              <Badge variant="secondary" className="bg-secondary/20 text-secondary">
                <Zap className="w-3 h-3 mr-1" />
                {totalPoints} gems
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completion</span>
                <span className="text-foreground font-medium">
                  {completedHabits.length}/{habits.length} powers
                </span>
              </div>
              <Progress value={completionPercentage} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Habits Checklist */}
      <Card className="gaming-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Target className="w-5 h-5 text-primary" />
            Your Powers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${
                completedHabits.includes(habit.id)
                  ? "bg-accent/10 border-accent"
                  : "bg-muted/20 border-border hover:bg-muted/30"
              }`}
              onClick={() => handleHabitToggle(habit.id)}
            >
              <Checkbox
                id={habit.id}
                checked={completedHabits.includes(habit.id)}
                onCheckedChange={() => handleHabitToggle(habit.id)}
                className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
              />
              <div className="flex-1">
                <label
                  htmlFor={habit.id}
                  className={`font-medium cursor-pointer ${
                    completedHabits.includes(habit.id) ? "text-accent" : "text-foreground"
                  }`}
                >
                  {habit.title}
                </label>
                <div className="flex items-center gap-2 mt-1">
                  {habit.category && (
                    <Badge variant="outline" className="text-xs">
                      {habit.category}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    <Star className="w-3 h-3 inline mr-1" />
                    {habit.points} gems
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Quick Select */}
          {habits.length > 0 && (
            <div className="pt-4 border-t border-border">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Quick Select</span>
                  <span className="text-sm text-muted-foreground">
                    {completedHabits.length}/{habits.length} selected
                  </span>
                </div>
                <Slider
                  value={[completedHabits.length]}
                  max={habits.length}
                  step={1}
                  onValueChange={handleQuickSelect}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>None</span>
                  <span>All</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <Button
              onClick={submitCheckIn}
              disabled={submitting || completedHabits.length === 0}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground"
            >
              {submitting ? "Checking In..." : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Complete Check-In ({totalPoints} gems)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckInPanel;


