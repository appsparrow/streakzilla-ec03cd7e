import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Target, 
  CheckCircle,
  AlertCircle,
  Flame,
  Trophy,
  Search,
  Filter,
  Star,
  Zap,
  X
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [groupData, setGroupData] = useState<any>(null);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [canModifyPowers, setCanModifyPowers] = useState(true);
  const [daysLeftToModify, setDaysLeftToModify] = useState(0);
  const [newHabit, setNewHabit] = useState({
    title: "",
    description: "",
    points: 10,
    category: "custom",
    frequency: "daily",
    default_set: "custom",
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchGroupData(),
          fetchHabits(),
          fetchUserHabits()
        ]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [groupId, user]);

  const fetchGroupData = async () => {
    if (!groupId) return;
    
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (error) throw error;
      setGroupData(data);

      // Check if it's first time (no habits selected yet)
      const { data: userHabits } = await supabase
        .from("user_habits")
        .select("habit_id")
        .eq("group_id", groupId)
        .eq("user_id", user?.id);

      setIsFirstTime(!userHabits || userHabits.length === 0);

      // Check if powers can be modified (until start date + 3 days)
      if (data) {
        const startDate = new Date(data.start_date);
        const today = new Date();
        const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        // Allow modification until 3 days after start date (including day 0, 1, 2, 3)
        const canModify = daysSinceStart <= 3;
        setCanModifyPowers(canModify);
        setDaysLeftToModify(Math.max(0, 3 - daysSinceStart));
      }
    } catch (error: any) {
      console.error("Error fetching group data:", error);
    }
  };

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
    }
  };

  const fetchUserHabits = async () => {
    if (!groupId || !user) return;

    try {
      const { data, error } = await (supabase as any)
        .rpc('get_user_selected_habits', { p_group_id: groupId, p_user_id: user.id });

      if (error) throw error;
      const habitIds = ((data as any[]) || []).map((uh: any) => uh.habit_id);
      setSelectedHabits(habitIds);
    } catch (error: any) {
      console.error("Error fetching user habits:", error);
    }
  };

  const handleHabitToggle = (habitId: string) => {
    if (!canModifyPowers) return;
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

  const handleAddHabit = async () => {
    try {
      const slug = newHabit.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!slug) return;
      const { data, error } = await (supabase as any).rpc('add_habit_if_absent', {
        p_slug: slug,
        p_title: newHabit.title.trim(),
        p_description: newHabit.description.trim(),
        p_points: Number(newHabit.points) || 10,
        p_category: newHabit.category,
        p_frequency: newHabit.frequency,
        p_default_set: newHabit.default_set,
      });
      if (error) throw error;
      // Refresh list after insert
      await fetchHabits();
      setShowAddHabit(false);
      setNewHabit({ title: "", description: "", points: 10, category: "custom", frequency: "daily", default_set: "custom" });
      toast({ title: "Habit added", description: "Your habit was added to the common pool." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to add habit", variant: "destructive" });
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
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

  const filteredHabits = habits.filter(habit => {
    // Filter by search term
    const matchesSearch = !searchTerm || 
      habit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      habit.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      habit.category.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by category tabs
    const matchesCategory = activeCategory === "all" || habit.category === activeCategory;

    // Filter by selected categories
    const matchesSelectedCategories = selectedCategories.length === 0 || 
      selectedCategories.includes(habit.category);

    return matchesSearch && matchesCategory && matchesSelectedCategories;
  });

  const getHabitsByDifficulty = (difficulty: string) => {
    return filteredHabits.filter(habit => habit.default_set === difficulty);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading powers...</p>
        </div>
      </div>
    );
  }

  // Show welcome message for first-time users but still display full interface
  const showWelcomeMessage = isFirstTime;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4 pb-32">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/groups/${groupId}`)}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
          <h1 className="text-3xl font-bold gradient-text">Select Your Powers</h1>
          <div className="w-20" />
        </div>

        {/* Welcome Message for First-Time Users */}
        {showWelcomeMessage && (
          <Card className="gaming-card border-primary/20 bg-gradient-to-r from-primary/10 to-purple-600/10">
            <CardContent className="p-6 text-center space-y-4">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold gradient-text">Welcome to Your Streak!</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Choose your powers to begin tracking your journey. Select at least 6 powers worth 75+ gems total.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Powers Modification Status */}
        {!canModifyPowers ? (
          <Card className="gaming-card border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-warning" />
                <div>
                  <p className="font-semibold text-warning">Powers Locked</p>
                  <p className="text-sm text-muted-foreground">
                    Power selection is frozen after day 3 of your streak. You can view your current powers below.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : daysLeftToModify > 0 && (
          <Card className="gaming-card border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold text-primary">Powers Can Be Modified</p>
                  <p className="text-sm text-muted-foreground">
                    You have {daysLeftToModify} day{daysLeftToModify !== 1 ? 's' : ''} left to modify your power selection.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selection Summary */}
        <Card className={`gaming-card ${canModifyPowers ? 'border-primary/20' : 'border-warning/20'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-lg font-semibold">
                  {canModifyPowers ? 'Selection Progress' : 'Current Powers'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {canModifyPowers 
                    ? 'Choose at least 6 powers worth 75+ gems total'
                    : 'Your powers are locked after day 3 of the streak'
                  }
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{selectedHabits.length}</p>
                    <p className="text-sm text-muted-foreground">Powers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold gradient-text">{getTotalPoints()}</p>
                    <p className="text-sm text-muted-foreground">Gems</p>
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

        {/* Search and Filter Bar */}
        <Card className="gaming-card">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search habits..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-border text-foreground hover:bg-muted/50"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </div>

              {/* Active Filters */}
              {(searchTerm || selectedCategories.length > 0) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {searchTerm && (
                    <Badge variant="secondary" className="bg-secondary/20 text-secondary">
                      Search: {searchTerm}
                    </Badge>
                  )}
                  {selectedCategories.map(category => (
                    <Badge 
                      key={category} 
                      variant="secondary" 
                      className="bg-secondary/20 text-secondary cursor-pointer hover:bg-secondary/30"
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </Button>
                </div>
              )}

              {/* Category Filters */}
              {showFilters && (
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Filter by Category</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {CATEGORIES.slice(1).map(category => (
                      <Button
                        key={category.id}
                        variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleCategory(category.id)}
                        className={`justify-start text-xs ${
                          selectedCategories.includes(category.id)
                            ? 'bg-primary text-primary-foreground'
                            : 'border-border text-foreground hover:bg-muted/50'
                        }`}
                      >
                        {category.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredHabits.length} of {habits.length} powers
        </div>

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
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="hard">Hard</TabsTrigger>
                <TabsTrigger value="medium">Medium</TabsTrigger>
                <TabsTrigger value="soft">Soft</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                <div className="grid gap-4">
                  {filteredHabits.map((habit) => (
                    <Card 
                      key={habit.id} 
                      className={`gaming-card cursor-pointer transition-all hover:scale-[1.02] ${
                        selectedHabits.includes(habit.id)
                          ? 'border-accent bg-accent/5'
                          : 'border-border hover:border-primary/30'
                      } ${!canModifyPowers ? 'opacity-75' : ''}`}
                      onClick={() => handleHabitToggle(habit.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedHabits.includes(habit.id)}
                            onChange={() => handleHabitToggle(habit.id)}
                            className="mt-1 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          />
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-foreground leading-tight">
                                {habit.title}
                              </h3>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Star className="w-3 h-3 text-secondary" />
                                <span className="text-sm font-semibold text-secondary">
                                  {habit.points}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {habit.description}
                            </p>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getCategoryColor(habit.category)}`}
                              >
                                {habit.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                {habit.frequency}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                                {habit.default_set}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="hard" className="space-y-4">
                <div className="grid gap-4">
                  {getHabitsByDifficulty("hard").map((habit) => (
                    <Card 
                      key={habit.id} 
                      className={`gaming-card cursor-pointer transition-all hover:scale-[1.02] ${
                        selectedHabits.includes(habit.id)
                          ? 'border-accent bg-accent/5'
                          : 'border-border hover:border-primary/30'
                      }`}
                      onClick={() => handleHabitToggle(habit.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedHabits.includes(habit.id)}
                            onChange={() => handleHabitToggle(habit.id)}
                            className="mt-1 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          />
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-foreground leading-tight">
                                {habit.title}
                              </h3>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Star className="w-3 h-3 text-secondary" />
                                <span className="text-sm font-semibold text-secondary">
                                  {habit.points}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {habit.description}
                            </p>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getCategoryColor(habit.category)}`}
                              >
                                {habit.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                {habit.frequency}
                              </Badge>
                            </div>
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
                      className={`gaming-card cursor-pointer transition-all hover:scale-[1.02] ${
                        selectedHabits.includes(habit.id)
                          ? 'border-accent bg-accent/5'
                          : 'border-border hover:border-primary/30'
                      }`}
                      onClick={() => handleHabitToggle(habit.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedHabits.includes(habit.id)}
                            onChange={() => handleHabitToggle(habit.id)}
                            className="mt-1 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          />
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-foreground leading-tight">
                                {habit.title}
                              </h3>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Star className="w-3 h-3 text-secondary" />
                                <span className="text-sm font-semibold text-secondary">
                                  {habit.points}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {habit.description}
                            </p>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getCategoryColor(habit.category)}`}
                              >
                                {habit.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                {habit.frequency}
                              </Badge>
                            </div>
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
                      className={`gaming-card cursor-pointer transition-all hover:scale-[1.02] ${
                        selectedHabits.includes(habit.id)
                          ? 'border-accent bg-accent/5'
                          : 'border-border hover:border-primary/30'
                      }`}
                      onClick={() => handleHabitToggle(habit.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedHabits.includes(habit.id)}
                            onChange={() => handleHabitToggle(habit.id)}
                            className="mt-1 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          />
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-foreground leading-tight">
                                {habit.title}
                              </h3>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Star className="w-3 h-3 text-secondary" />
                                <span className="text-sm font-semibold text-secondary">
                                  {habit.points}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {habit.description}
                            </p>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getCategoryColor(habit.category)}`}
                              >
                                {habit.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                {habit.frequency}
                              </Badge>
                            </div>
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
                      className={`gaming-card cursor-pointer transition-all hover:scale-[1.02] ${
                        selectedHabits.includes(habit.id)
                          ? 'border-accent bg-accent/5'
                          : 'border-border hover:border-primary/30'
                      }`}
                      onClick={() => handleHabitToggle(habit.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedHabits.includes(habit.id)}
                            onChange={() => handleHabitToggle(habit.id)}
                            className="mt-1 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          />
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-foreground leading-tight">
                                {habit.title}
                              </h3>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Star className="w-3 h-3 text-secondary" />
                                <span className="text-sm font-semibold text-secondary">
                                  {habit.points}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {habit.description}
                            </p>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getCategoryColor(habit.category)}`}
                              >
                                {habit.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                {habit.frequency}
                              </Badge>
                            </div>
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

        {/* No Results State */}
        {filteredHabits.length === 0 && (
          <Card className="gaming-card">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No habits found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Try adjusting your search terms or filters to find the habits you're looking for.
              </p>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="mt-4"
              >
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Save Button - Above Bottom Navigation */}
        <div className="sticky bottom-6 space-y-2 pb-24">
          <div className="flex gap-2">
            {/* Add Habit Dialog - Hidden for now */}
            {false && (
              <Dialog open={showAddHabit} onOpenChange={setShowAddHabit}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">Add Habit</Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add a new habit</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Title" value={newHabit.title} onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })} />
                  <Textarea placeholder="Description" value={newHabit.description} onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" placeholder="Points" value={newHabit.points} onChange={(e) => setNewHabit({ ...newHabit, points: Number(e.target.value) })} />
                    <Input placeholder="Category" value={newHabit.category} onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Frequency (daily/weekly)" value={newHabit.frequency} onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })} />
                    <Input placeholder="Set (hard/medium/soft/custom)" value={newHabit.default_set} onChange={(e) => setNewHabit({ ...newHabit, default_set: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddHabit}>Save to Pool</Button>
                </DialogFooter>
              </DialogContent>
              </Dialog>
            )}

            <Button 
              onClick={handleSaveHabits}
              variant="default" 
              size="lg" 
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
              disabled={!isValidSelection() || saving || !canModifyPowers}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              ) : !canModifyPowers ? (
                <>
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Powers Locked ({selectedHabits.length} powers, {getTotalPoints()} gems)
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Save Powers ({selectedHabits.length} selected, {getTotalPoints()} gems)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};