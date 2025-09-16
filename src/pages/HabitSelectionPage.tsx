import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Target, 
  CheckCircle,
  AlertCircle,
  Flame,
  Trophy
} from "lucide-react";

interface Habit {
  id: string;
  slug: string;
  title: string;
  description: string;
  points: number;
  category: string;
  frequency: string;
  default_set: string;
}

const CATEGORIES = [
  { id: "all", label: "All Habits", icon: Target },
  { id: "fitness", label: "Fitness", icon: Flame },
  { id: "diet", label: "Diet", icon: Trophy },
  { id: "hydration", label: "Hydration", icon: Trophy },
  { id: "reading", label: "Reading", icon: Trophy },
  { id: "learning", label: "Learning", icon: Trophy },
  { id: "mental", label: "Mental", icon: Trophy },
  { id: "creativity", label: "Creativity", icon: Trophy },
  { id: "lifestyle", label: "Lifestyle", icon: Trophy },
  { id: "wellness", label: "Wellness", icon: Trophy },
  { id: "finance", label: "Finance", icon: Trophy },
];

export const HabitSelectionPage = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHabits();
    fetchUserHabits();
  }, [groupId, user]);

  const fetchHabits = async () => {
    try {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .order("category", { ascending: true })
        .order("points", { ascending: false });

      if (error) throw error;
      setHabits(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load habits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHabits = async () => {
    if (!groupId || !user) return;

    try {
      const { data, error } = await supabase
        .from("user_habits")
        .select("habit_id")
        .eq("group_id", groupId)
        .eq("user_id", user.id);

      if (error) throw error;
      
      const habitIds = data?.map(uh => uh.habit_id) || [];
      setSelectedHabits(habitIds);
    } catch (error: any) {
      console.error("Error fetching user habits:", error);
    }
  };

  const handleHabitToggle = (habitId: string) => {
    setSelectedHabits(prev => 
      prev.includes(habitId) 
        ? prev.filter(id => id !== habitId)
        : [...prev, habitId]
    );
  };

  const getTotalPoints = () => {
    return selectedHabits.reduce((sum, habitId) => {
      const habit = habits.find(h => h.id === habitId);
      return sum + (habit?.points || 0);
    }, 0);
  };

  const isValidSelection = () => {
    return selectedHabits.length >= 6 && getTotalPoints() >= 75;
  };

  const handleSaveHabits = async () => {
    if (!groupId || !user || !isValidSelection()) return;

    setSaving(true);

    try {
      // First, delete existing user habits for this group
      await supabase
        .from("user_habits")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);

      // Then insert new selections
      const userHabits = selectedHabits.map(habitId => ({
        group_id: groupId,
        user_id: user.id,
        habit_id: habitId,
      }));

      const { error } = await supabase
        .from("user_habits")
        .insert(userHabits);

      if (error) throw error;

      toast({
        title: "Habits saved!",
        description: "Your habit selection has been saved successfully.",
      });

      navigate(`/groups/${groupId}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save habits",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredHabits = activeCategory === "all" 
    ? habits 
    : habits.filter(habit => habit.category === activeCategory);

  const getHabitsByDifficulty = (difficulty: string) => {
    return filteredHabits.filter(habit => habit.default_set === difficulty);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading habits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/groups/${groupId}`)}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Group
          </Button>
          <h1 className="text-3xl font-bold gradient-text">Select Your Habits</h1>
          <div className="w-20" />
        </div>

        {/* Selection Summary */}
        <Card className="gaming-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-lg font-semibold">Selection Summary</p>
                <p className="text-sm text-muted-foreground">
                  Choose at least 6 habits worth 75+ points total
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{selectedHabits.length}</p>
                    <p className="text-sm text-muted-foreground">Habits</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold gradient-text">{getTotalPoints()}</p>
                    <p className="text-sm text-muted-foreground">Points</p>
                  </div>
                  <div className="text-center">
                    {isValidSelection() ? (
                      <CheckCircle className="w-8 h-8 text-success mx-auto" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-warning mx-auto" />
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {isValidSelection() ? "Valid" : "Need more"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid grid-cols-6 lg:grid-cols-11 w-full">
            {CATEGORIES.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="text-xs">
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-6">
            <Tabs defaultValue="hard">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="hard">Hard</TabsTrigger>
                <TabsTrigger value="medium">Medium</TabsTrigger>
                <TabsTrigger value="soft">Soft</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>

              <TabsContent value="hard" className="space-y-4">
                <div className="grid gap-4">
                  {getHabitsByDifficulty("hard").map((habit) => (
                    <Card 
                      key={habit.id} 
                      className={`gaming-card cursor-pointer transition-all hover:scale-105 ${
                        selectedHabits.includes(habit.id) ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleHabitToggle(habit.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Checkbox 
                            checked={selectedHabits.includes(habit.id)}
                            onChange={() => handleHabitToggle(habit.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold">{habit.title}</h3>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{habit.points} pts</Badge>
                                <Badge variant="outline">{habit.frequency}</Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{habit.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="medium" className="space-y-4">
                <div className="grid gap-4">
                  {getHabitsByDifficulty("medium").map((habit) => (
                    <Card 
                      key={habit.id} 
                      className={`gaming-card cursor-pointer transition-all hover:scale-105 ${
                        selectedHabits.includes(habit.id) ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleHabitToggle(habit.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Checkbox 
                            checked={selectedHabits.includes(habit.id)}
                            onChange={() => handleHabitToggle(habit.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold">{habit.title}</h3>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{habit.points} pts</Badge>
                                <Badge variant="outline">{habit.frequency}</Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{habit.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="soft" className="space-y-4">
                <div className="grid gap-4">
                  {getHabitsByDifficulty("soft").map((habit) => (
                    <Card 
                      key={habit.id} 
                      className={`gaming-card cursor-pointer transition-all hover:scale-105 ${
                        selectedHabits.includes(habit.id) ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleHabitToggle(habit.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Checkbox 
                            checked={selectedHabits.includes(habit.id)}
                            onChange={() => handleHabitToggle(habit.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold">{habit.title}</h3>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{habit.points} pts</Badge>
                                <Badge variant="outline">{habit.frequency}</Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{habit.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="custom" className="space-y-4">
                <div className="grid gap-4">
                  {getHabitsByDifficulty("custom").map((habit) => (
                    <Card 
                      key={habit.id} 
                      className={`gaming-card cursor-pointer transition-all hover:scale-105 ${
                        selectedHabits.includes(habit.id) ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleHabitToggle(habit.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Checkbox 
                            checked={selectedHabits.includes(habit.id)}
                            onChange={() => handleHabitToggle(habit.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold">{habit.title}</h3>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{habit.points} pts</Badge>
                                <Badge variant="outline">{habit.frequency}</Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{habit.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="sticky bottom-6">
          <Button 
            onClick={handleSaveHabits}
            variant="gaming" 
            size="lg" 
            className="w-full"
            disabled={!isValidSelection() || saving}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            {saving ? "Saving..." : `Save Habits (${selectedHabits.length} selected, ${getTotalPoints()} points)`}
          </Button>
        </div>
      </div>
    </div>
  );
};