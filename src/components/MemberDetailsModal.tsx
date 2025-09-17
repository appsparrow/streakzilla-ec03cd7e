import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Flame, Heart, Target, Star, Zap, Crown } from 'lucide-react';

interface MemberDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  memberRank: number;
  memberPoints: number;
  memberStreak: number;
  memberLives: number;
  groupId: string;
}

interface MemberHabit {
  id: string;
  title: string;
  points: number;
  category: string;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-600" />;
    default:
      return <Crown className="w-5 h-5 text-primary" />;
  }
};

const getCategoryColor = (category: string) => {
  const colors = {
    'fitness': 'bg-red-500/20 text-red-300 border-red-500/30',
    'diet': 'bg-green-500/20 text-green-300 border-green-500/30',
    'hydration': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'reading': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'learning': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    'mental': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    'creativity': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    'lifestyle': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'wellness': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    'finance': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };
  return colors[category as keyof typeof colors] || 'bg-muted/20 text-muted-foreground border-border';
};

export const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({
  open,
  onOpenChange,
  memberId,
  memberName,
  memberAvatar,
  memberRank,
  memberPoints,
  memberStreak,
  memberLives,
  groupId,
}) => {
  const [habits, setHabits] = useState<MemberHabit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && memberId) {
      fetchMemberHabits();
    }
  }, [open, memberId, groupId]);

  const fetchMemberHabits = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_user_selected_habits', {
        p_group_id: groupId,
        p_user_id: memberId,
      });

      if (error) throw error;

      const memberHabits: MemberHabit[] = (data || []).map((item: any) => ({
        id: item.habit_id,
        title: item.title,
        points: item.points,
        category: item.category || 'other',
      }));

      setHabits(memberHabits);
    } catch (error) {
      console.error('Error fetching member habits:', error);
      setHabits([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPowerPoints = habits.reduce((sum, habit) => sum + habit.points, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={memberAvatar} alt={memberName} />
              <AvatarFallback>{memberName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                {getRankIcon(memberRank)}
                <span className="text-xl font-bold">{memberName}</span>
              </div>
              <p className="text-sm text-muted-foreground">Rank #{memberRank}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="gaming-card">
              <CardContent className="p-4 text-center">
                <Zap className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold gradient-text">{memberPoints}</p>
                <p className="text-sm text-muted-foreground">Total Gems</p>
              </CardContent>
            </Card>

            <Card className="gaming-card">
              <CardContent className="p-4 text-center">
                <Flame className="w-6 h-6 mx-auto mb-2 text-warning" />
                <p className="text-2xl font-bold text-warning">{memberStreak}</p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </CardContent>
            </Card>

            <Card className="gaming-card">
              <CardContent className="p-4 text-center">
                <Heart className="w-6 h-6 mx-auto mb-2 text-destructive" />
                <p className="text-2xl font-bold text-destructive">{memberLives}</p>
                <p className="text-sm text-muted-foreground">Lives Left</p>
              </CardContent>
            </Card>
          </div>

          {/* Powers Section */}
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Selected Powers
                <Badge variant="secondary" className="ml-auto">
                  {habits.length} powers • {totalPowerPoints} gems
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading powers...</p>
                </div>
              ) : habits.length > 0 ? (
                <div className="space-y-3">
                  {habits.map((habit) => (
                    <div 
                      key={habit.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-foreground">{habit.title}</h3>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-secondary" />
                            <span className="text-sm font-semibold text-secondary">{habit.points}</span>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs mt-1 ${getCategoryColor(habit.category)}`}
                        >
                          {habit.category}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Powers Selected</h3>
                  <p className="text-muted-foreground">
                    This member hasn't selected their powers yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Power Categories Summary */}
          {habits.length > 0 && (
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="text-sm">Power Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(habits.map(h => h.category))).map(category => {
                    const categoryHabits = habits.filter(h => h.category === category);
                    const categoryPoints = categoryHabits.reduce((sum, h) => sum + h.points, 0);
                    
                    return (
                      <Badge 
                        key={category}
                        variant="outline" 
                        className={`${getCategoryColor(category)}`}
                      >
                        {category} ({categoryHabits.length}) • {categoryPoints} gems
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
