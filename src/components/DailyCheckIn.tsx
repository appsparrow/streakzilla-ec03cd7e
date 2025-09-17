import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Camera, Upload, Star, Zap, Target, ArrowLeft, X } from 'lucide-react';

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Habit {
  id: string;
  title: string;
  points: number;
  category: string;
}

interface GroupInfo {
  id: string;
  name: string;
  start_date: string;
  duration_days: number;
}

export const DailyCheckIn = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedHabits, setCompletedHabits] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [dayNumber, setDayNumber] = useState(1);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (groupId && user) {
      fetchUserHabits();
      fetchGroupInfo();
    }
  }, [groupId, user]);

  useEffect(() => {
    // preselect if state passed
    try {
      const nav = (window as any).history?.state?.usr;
      if (nav?.preselected && Array.isArray(nav.preselected)) {
        setCompletedHabits(nav.preselected);
      }
    } catch {}
  }, []);

  const fetchUserHabits = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_selected_habits', { p_group_id: groupId, p_user_id: user?.id });

      if (error) throw error;

      const userHabits = (data || []).map((item: any) => ({
        id: item.habit_id,
        title: item.title,
        points: item.points,
        category: item.category
      }));

      setHabits(userHabits);
    } catch (error) {
      console.error('Error fetching habits:', error);
      toast({
        title: "Error",
        description: "Failed to load your powers",
        variant: "destructive",
      });
    }
  };

  const fetchGroupInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, start_date, duration_days')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      setGroupInfo(data);

      // Calculate day number
      const startDate = new Date(data.start_date);
      const today = new Date();
      const diffTime = today.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDayNumber(Math.max(1, diffDays));
    } catch (error) {
      console.error('Error fetching group info:', error);
    }
  };

  const handleHabitToggle = (habitId: string) => {
    setCompletedHabits(prev => 
      prev.includes(habitId) 
        ? prev.filter(id => id !== habitId)
        : [...prev, habitId]
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      setPhoto(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (completedHabits.length === 0) {
      toast({
        title: "No powers selected",
        description: "Please select at least one power to check in.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Call the checkin RPC function
      const { data, error } = await supabase.rpc('checkin', {
        p_group_id: groupId,
        p_day_number: dayNumber,
        p_completed_habit_ids: completedHabits,
        p_photo_path: null, // TODO: Implement photo upload
        p_note: note || null
      });

      if (error) throw error;

      // Show success with confetti effect
      setShowConfetti(true);
      
      toast({
        title: "Check-in Complete! 🎉",
        description: `You earned ${(data as any)?.points_earned || 0} gems! Current streak: ${(data as any)?.current_streak || 0}`,
      });

      // Redirect back to group dashboard after a delay
      setTimeout(() => {
        navigate(`/groups/${groupId}`);
      }, 2000);

    } catch (error: any) {
      console.error('Error checking in:', error);
      
      // Handle specific "already checked in" error
      if (error.code === 'P0001' && error.message?.includes('already checked in')) {
        toast({
          title: "Already Checked In",
          description: "You've already completed your check-in for today! Come back tomorrow.",
          variant: "default",
        });
        
        // Redirect back to group dashboard
        setTimeout(() => {
          navigate(`/groups/${groupId}`);
        }, 2000);
      } else {
        toast({
          title: "Check-in Failed",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = habits
    .filter(habit => completedHabits.includes(habit.id))
    .reduce((sum, habit) => sum + habit.points, 0);

  const completionPercentage = habits.length > 0 ? (completedHabits.length / habits.length) * 100 : 0;

  if (!groupInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading check-in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 animate-pulse" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="text-6xl animate-bounce-in">🎉</div>
          </div>
        </div>
      )}

      <div className="container max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(`/groups/${groupId}`)}
            className="hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Daily Check-In</h1>
            <p className="text-muted-foreground">
              {groupInfo.name} • Day {dayNumber}
            </p>
          </div>
        </div>

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
                    ? 'bg-accent/10 border-accent'
                    : 'bg-muted/20 border-border hover:bg-muted/30'
                }`}
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
                      completedHabits.includes(habit.id)
                        ? 'text-accent'
                        : 'text-foreground'
                    }`}
                  >
                    {habit.title}
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {habit.category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      <Star className="w-3 h-3 inline mr-1" />
                      {habit.points} gems
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Swipe Slider for Quick Selection */}
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
                    onValueChange={(value) => {
                      const numToSelect = value[0];
                      setCompletedHabits(habits.slice(0, numToSelect).map(h => h.id));
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>None</span>
                    <span>All</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo Upload */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Camera className="w-5 h-5 text-primary" />
              Progress Photo (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {photoPreview ? (
              <div className="relative group">
                <img
                  src={photoPreview}
                  alt="Progress photo"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoPreview(null);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove Photo
                  </Button>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-black/50 text-white">
                    {photo && `${(photo.size / 1024 / 1024).toFixed(1)}MB`}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/20 transition-colors group">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    Click to upload progress photo
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Max 5MB • JPG, PNG, GIF
                  </span>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Share your progress with the streak! Photos help motivate everyone.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="text-foreground">Daily Reflection (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="How did today go? Any challenges or wins to share?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-20 bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={loading || completedHabits.length === 0}
          className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Checking In...
            </div>
          ) : (
            <>
              <Zap className="w-5 h-5 mr-2" />
              Complete Check-In ({totalPoints} gems)
            </>
          )}
        </Button>
      </div>
    </div>
  );
};