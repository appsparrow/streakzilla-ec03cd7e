import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Heart, Calendar, CheckCircle, X, AlertTriangle, Flame, Target, Star } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface UseLifeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  livesRemaining: number;
  onLifeUsed: () => void;
}

interface DayData {
  dayNumber: number;
  date: string;
  logged: boolean;
  canUseLife: boolean;
}

interface Habit {
  id: string;
  title: string;
  points: number;
}

export const UseLifeModal: React.FC<UseLifeModalProps> = ({
  open,
  onOpenChange,
  groupId,
  livesRemaining,
  onLifeUsed,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [missedDays, setMissedDays] = useState<DayData[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [userHabits, setUserHabits] = useState<Habit[]>([]);
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && groupId && user?.id) {
      fetchMissedDays();
      fetchUserHabits();
    }
  }, [open, groupId, user?.id]);

  const fetchMissedDays = async () => {
    setLoading(true);
    try {
      // Get group start date
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('start_date')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      const startDate = new Date(group.start_date);
      const today = new Date();
      
      // Get check-in history for the past days
      const { data: historyData, error: historyError } = await (supabase as any).rpc('get_user_checkin_history', {
        p_group_id: groupId,
        p_user_id: user?.id,
        p_days_back: 30 // Look back 30 days max
      });

      if (historyError) {
        console.warn('Checkin history RPC unavailable:', historyError);
        setMissedDays([]);
        return;
      }

      const history = (historyData as any[] || []).map((item: any) => ({
        date: item.checkin_date,
        logged: item.logged
      }));

      // Filter to get only missed days that are in the past (not today)
      const missed: DayData[] = [];
      for (let i = 1; i < history.length; i++) { // Start from 1 to skip today
        const dayData = history[i];
        if (!dayData.logged) {
          const dayDate = new Date(dayData.date);
          const dayNumber = Math.floor((dayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          missed.push({
            dayNumber: Math.max(1, dayNumber),
            date: dayData.date,
            logged: dayData.logged,
            canUseLife: true
          });
        }
      }

      setMissedDays(missed.reverse()); // Most recent first
    } catch (error) {
      console.error('Error fetching missed days:', error);
      setMissedDays([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHabits = async () => {
    try {
      const { data, error } = await (supabase as any).rpc('get_user_selected_habits', {
        p_group_id: groupId,
        p_user_id: user?.id,
      });

      if (error) throw error;

      const habits: Habit[] = (data || []).map((item: any) => ({
        id: item.habit_id,
        title: item.title,
        points: item.points,
      }));

      setUserHabits(habits);
      setSelectedHabits(habits.map(h => h.id)); // Select all by default
    } catch (error) {
      console.error('Error fetching user habits:', error);
      setUserHabits([]);
    }
  };

  const handleDaySelect = (day: DayData) => {
    setSelectedDay(day);
    setSelectedHabits(userHabits.map(h => h.id)); // Reset to all selected
  };

  const handleHabitToggle = (habitId: string) => {
    setSelectedHabits(prev => 
      prev.includes(habitId) 
        ? prev.filter(id => id !== habitId)
        : [...prev, habitId]
    );
  };

  const calculatePoints = () => {
    return userHabits
      .filter(h => selectedHabits.includes(h.id))
      .reduce((sum, h) => sum + h.points, 0);
  };

  const handleUseLife = () => {
    if (!selectedDay || selectedHabits.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select a day and at least one power.',
        variant: 'destructive'
      });
      return;
    }
    setConfirmOpen(true);
  };

  const confirmUseLife = async () => {
    if (!selectedDay || !user?.id) return;

    setSubmitting(true);
    try {
      // Use the regular checkin RPC for the selected day
      const { data, error } = await (supabase as any).rpc('checkin', {
        p_group_id: groupId,
        p_day_number: selectedDay.dayNumber,
        p_completed_habit_ids: selectedHabits,
        p_photo_path: null,
        p_note: 'Retroactive check-in using life'
      });

      if (error) throw error;

      // Deduct a life from the user
      const { error: lifeError } = await supabase
        .from('group_members')
        .update({ lives_remaining: livesRemaining - 1 })
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (lifeError) throw lifeError;

      toast({
        title: 'Life Used Successfully! ❤️',
        description: `Day ${selectedDay.dayNumber} marked as completed. You earned ${calculatePoints()} gems!`,
      });

      setConfirmOpen(false);
      setSelectedDay(null);
      setSelectedHabits([]);
      onLifeUsed(); // Refresh parent component
      fetchMissedDays(); // Refresh missed days
    } catch (error: any) {
      console.error('Error using life:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to use life. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-destructive" />
              Use Life to Fix Missed Days
              <Badge variant="destructive" className="ml-auto">
                {livesRemaining} ❤️ remaining
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Lives Warning */}
            {livesRemaining === 0 && (
              <Card className="gaming-card border-destructive/20 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <div>
                      <p className="font-semibold text-destructive">No Lives Remaining</p>
                      <p className="text-sm text-muted-foreground">
                        You have no lives left to fix missed days.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Missed Days List */}
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Missed Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading missed days...</p>
                  </div>
                ) : missedDays.length > 0 ? (
                  <div className="space-y-2">
                    {missedDays.map((day) => (
                      <div
                        key={day.dayNumber}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedDay?.dayNumber === day.dayNumber
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/30'
                        } ${livesRemaining === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => livesRemaining > 0 && handleDaySelect(day)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Day {day.dayNumber}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(day.date)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <X className="w-4 h-4 text-destructive" />
                            <span className="text-sm text-destructive">Missed</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
                    <h3 className="text-lg font-medium text-foreground mb-2">All Caught Up!</h3>
                    <p className="text-muted-foreground">
                      You haven't missed any days. Keep up the great work!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Day Powers */}
            {selectedDay && (
              <Card className="gaming-card border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Powers for Day {selectedDay.dayNumber}
                    <Badge variant="secondary" className="ml-auto">
                      {selectedHabits.length} selected • {calculatePoints()} gems
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select which powers you completed on {formatDate(selectedDay.date)}:
                  </p>
                  
                  <div className="space-y-3">
                    {userHabits.map((habit) => (
                      <div
                        key={habit.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedHabits.includes(habit.id)
                            ? 'border-accent bg-accent/10'
                            : 'border-border hover:border-primary/30'
                        }`}
                        onClick={() => handleHabitToggle(habit.id)}
                      >
                        <Checkbox
                          checked={selectedHabits.includes(habit.id)}
                          onChange={() => handleHabitToggle(habit.id)}
                          className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{habit.title}</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-secondary" />
                              <span className="text-sm font-semibold text-secondary">{habit.points}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleUseLife}
                      disabled={livesRemaining === 0 || selectedHabits.length === 0 || submitting}
                      className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Use 1 Life ({calculatePoints()} gems)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedDay(null)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Use Life to Mark Day as Completed?"
        description={`This will use 1 ❤️ life to mark Day ${selectedDay?.dayNumber} as completed. You'll earn ${calculatePoints()} gems. You'll have ${livesRemaining - 1} lives remaining.`}
        confirmText="Use Life ❤️"
        cancelText="Cancel"
        onConfirm={confirmUseLife}
        variant="destructive"
      />
    </>
  );
};
