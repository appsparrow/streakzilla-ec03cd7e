import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Star, Target, Zap, CheckCircle, Users, Calendar, Flame } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { HabitSearch } from "./HabitSearch";

const allHabits = [
  {
    id: 1,
    title: "Two 45-min workouts",
    points: 20,
    category: "fitness",
    description: "Complete 2 intense workout sessions, one preferably outdoors",
    difficulty: "hard"
  },
  {
    id: 2,
    title: "One 45-min workout",
    points: 15,
    category: "fitness", 
    description: "Complete 1 solid workout session anywhere",
    difficulty: "medium"
  },
  {
    id: 3,
    title: "Move 30 min daily",
    points: 10,
    category: "fitness",
    description: "Walk, yoga, or any movement for 30 minutes",
    difficulty: "soft"
  },
  {
    id: 4,
    title: "Drink 1 gallon water",
    points: 15,
    category: "hydration", 
    description: "Stay fully hydrated with 3.8L of water throughout the day",
    difficulty: "hard"
  },
  {
    id: 5,
    title: "Drink 3L water",
    points: 10,
    category: "hydration",
    description: "Maintain good hydration with 3 liters of water",
    difficulty: "medium"
  },
  {
    id: 6,
    title: "Read 10 pages nonfiction",
    points: 10,
    category: "reading",
    description: "Read physical book pages to expand knowledge",
    difficulty: "medium"
  },
  {
    id: 7,
    title: "Meditation (10 min)",
    points: 10,
    category: "mental",
    description: "Practice mindfulness to enhance mental clarity",
    difficulty: "medium"
  },
  {
    id: 8,
    title: "Progress photo",
    points: 5,
    category: "wellness",
    description: "Document your journey with a daily progress photo",
    difficulty: "soft"
  },
  {
    id: 9,
    title: "Gratitude journaling",
    points: 8,
    category: "mental",
    description: "Write down 3 things you're grateful for today",
    difficulty: "soft"
  },
  {
    id: 10,
    title: "Daily micro-ship",
    points: 12,
    category: "creativity",
    description: "Create and share something small - sketch, code, photo, poem",
    difficulty: "medium"
  },
  {
    id: 11,
    title: "18-hour fast",
    points: 15,
    category: "wellness",
    description: "Practice intermittent fasting for metabolic health",
    difficulty: "hard"
  },
  {
    id: 12,
    title: "No phone first/last hour",
    points: 8,
    category: "mental",
    description: "Digital wellness - no phone when waking up or before bed",
    difficulty: "medium"
  }
];

const categories = ["all", "fitness", "hydration", "reading", "mental", "wellness", "creativity"];

interface HabitSelectionProps {
  groupId?: string;
}

export const HabitSelection = ({ groupId }: HabitSelectionProps = {}) => {
  const [selectedHabits, setSelectedHabits] = useState<number[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  
  const filteredHabits = activeCategory === "all" 
    ? allHabits 
    : allHabits.filter(habit => habit.category === activeCategory);
    
  const totalPoints = allHabits
    .filter(habit => selectedHabits.includes(habit.id))
    .reduce((sum, habit) => sum + habit.points, 0);
    
  const minRequired = 75;
  const isValidSelection = selectedHabits.length >= 6 && totalPoints >= minRequired;

  const toggleHabit = (habitId: number) => {
    if (selectedHabits.includes(habitId)) {
      setSelectedHabits(prev => prev.filter(id => id !== habitId));
    } else {
      setSelectedHabits(prev => [...prev, habitId]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold gradient-text">Choose Your Challenge</h1>
        <p className="text-muted-foreground">Select at least 6 habits worth 75+ points</p>
      </div>

      {/* Group Info */}
      <div className="gaming-card p-4 bg-gradient-to-r from-primary/10 to-purple-600/10 border border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold">Team Fitness Warriors</p>
              <p className="text-sm text-muted-foreground">5 members • 75-day challenge</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Starts in 3 days</span>
          </div>
        </div>
      </div>

      {/* Selection Progress */}
      <div className="gaming-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Your Selection
          </h2>
          <div className="text-right">
            <p className="text-2xl font-bold gradient-text">{totalPoints}</p>
            <p className="text-sm text-muted-foreground">of {minRequired} min points</p>
          </div>
        </div>
        
        <Progress 
          current={Math.min(totalPoints, minRequired)} 
          total={minRequired}
          className="mb-4"
        />
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedHabits.length} habits selected (min 6)
          </span>
          {isValidSelection && (
            <div className="flex items-center gap-1 text-sm text-success">
              <Flame className="w-4 h-4" />
              Ready to start!
            </div>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(category)}
            className="capitalize whitespace-nowrap"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Habits Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          {activeCategory === "all" ? "All Habits" : `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Habits`}
        </h3>
        <div className="space-y-3">
          {/* Use HabitSearch component instead */}
          <HabitSearch
              key={habit.id}
              title={habit.title}
              points={habit.points}
              category={habit.category}
              description={habit.description}
              selected={selectedHabits.includes(habit.id)}
              onClick={() => toggleHabit(habit.id)}
            />
          ))}
        </div>
      </div>

      {/* Selected Habits Summary */}
      {selectedHabits.length > 0 && (
        <div className="gaming-card p-4">
          <h4 className="font-semibold mb-3">Selected Habits Summary</h4>
          <div className="flex flex-wrap gap-2">
            {selectedHabits.map(habitId => {
              const habit = allHabits.find(h => h.id === habitId);
              return habit ? (
                <Badge key={habitId} variant="secondary" className="flex items-center gap-1">
                  {habit.title} 
                  <span className="text-energy font-bold">+{habit.points}</span>
                </Badge>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Confirm Button */}
      <div className="sticky bottom-4">
        <Button 
          variant="gaming" 
          size="lg" 
          className="w-full"
          disabled={!isValidSelection}
        >
          <Target className="w-5 h-5" />
          {isValidSelection 
            ? `Confirm Challenge (${totalPoints} points)` 
            : `Select ${6 - selectedHabits.length} more habits (${Math.max(0, minRequired - totalPoints)} points needed)`
          }
        </Button>
      </div>
    </div>
  );
};