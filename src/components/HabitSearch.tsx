import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Star, Zap, X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface Habit {
  id: string;
  title: string;
  description: string;
  category: string;
  points: number;
  frequency: string;
}

interface HabitSearchProps {
  selectedHabits: string[];
  onHabitToggle: (habitId: string) => void;
  maxPoints?: number;
  minHabits?: number;
}

const categories = [
  'Physical Health',
  'Mental Health', 
  'Productivity',
  'Learning',
  'Social',
  'Creative',
  'Spiritual',
  'Financial'
];

export const HabitSearch: React.FC<HabitSearchProps> = ({
  selectedHabits,
  onHabitToggle,
  maxPoints = 100,
  minHabits = 6
}) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [filteredHabits, setFilteredHabits] = useState<Habit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHabits();
  }, []);

  useEffect(() => {
    filterHabits();
  }, [habits, searchTerm, selectedCategories]);

  const fetchHabits = async () => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .order('category', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;
      setHabits(data || []);
    } catch (error) {
      console.error('Error fetching habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterHabits = () => {
    let filtered = habits;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(habit => 
        habit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        habit.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        habit.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(habit => 
        selectedCategories.includes(habit.category)
      );
    }

    setFilteredHabits(filtered);
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

  const totalSelectedPoints = habits
    .filter(habit => selectedHabits.includes(habit.id))
    .reduce((sum, habit) => sum + habit.points, 0);

  const getCategoryColor = (category: string) => {
    const colors = {
      'Physical Health': 'bg-red-500/20 text-red-300 border-red-500/30',
      'Mental Health': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Productivity': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Learning': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'Social': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'Creative': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      'Spiritual': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      'Financial': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    };
    return colors[category as keyof typeof colors] || 'bg-muted/20 text-muted-foreground border-border';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-muted/20 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
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
          <Card className="gaming-card">
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-3">Categories</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategories.includes(category) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleCategory(category)}
                    className={`justify-start text-xs ${
                      selectedCategories.includes(category)
                        ? 'bg-primary text-primary-foreground'
                        : 'border-border text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selection Summary */}
        <Card className="gaming-card border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Selected: {selectedHabits.length} habits
                </p>
                <p className="text-xs text-muted-foreground">
                  Minimum {minHabits} habits required
                </p>
              </div>
              <div className="text-right space-y-1">
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-secondary" />
                  <span className="font-semibold text-foreground">
                    {totalSelectedPoints} points
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Target: {maxPoints}+ points
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredHabits.length} of {habits.length} habits
      </div>

      {/* Habits List */}
      <div className="space-y-3">
        {filteredHabits.map(habit => (
          <Card
            key={habit.id}
            className={`gaming-card cursor-pointer transition-all hover:scale-[1.02] ${
              selectedHabits.includes(habit.id)
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-primary/30'
            }`}
            onClick={() => onHabitToggle(habit.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedHabits.includes(habit.id)}
                  onChange={() => onHabitToggle(habit.id)}
                  className="mt-1 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-foreground leading-tight">
                      {habit.title}
                    </h4>
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

      {filteredHabits.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No habits found</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search terms or filters to find the habits you're looking for.
          </p>
        </div>
      )}
    </div>
  );
};