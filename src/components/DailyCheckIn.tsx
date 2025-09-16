import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HabitCard } from "./HabitCard";
import { ProgressBar } from "./ProgressBar";
import { Flame, CheckCircle, Camera } from "lucide-react";

const sampleHabits = [
  {
    id: 1,
    title: "Two 45-min workouts",
    points: 20,
    category: "fitness",
    description: "Complete 2 intense workout sessions, one preferably outdoors"
  },
  {
    id: 2,
    title: "Drink 1 gallon water",
    points: 15,
    category: "hydration", 
    description: "Stay fully hydrated with 3.8L of water throughout the day"
  },
  {
    id: 3,
    title: "Read 10 pages nonfiction",
    points: 10,
    category: "reading",
    description: "Read physical book pages to expand knowledge"
  },
  {
    id: 4,
    title: "Meditation (10 min)",
    points: 10,
    category: "mental",
    description: "Practice mindfulness to enhance mental clarity"
  },
  {
    id: 5,
    title: "Progress photo",
    points: 5,
    category: "wellness",
    description: "Document your journey with a daily progress photo"
  },
  {
    id: 6,
    title: "Gratitude journaling",
    points: 8,
    category: "mental",
    description: "Write down 3 things you're grateful for today"
  },
  {
    id: 7,
    title: "Daily micro-ship",
    points: 12,
    category: "creativity",
    description: "Create and share something small - sketch, code, photo, poem"
  }
];

export const DailyCheckIn = () => {
  const [completedHabits, setCompletedHabits] = useState<number[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const totalPoints = sampleHabits.reduce((sum, habit) => sum + habit.points, 0);
  const earnedPoints = sampleHabits
    .filter(habit => completedHabits.includes(habit.id))
    .reduce((sum, habit) => sum + habit.points, 0);

  const toggleHabit = (habitId: number) => {
    if (completedHabits.includes(habitId)) {
      setCompletedHabits(prev => prev.filter(id => id !== habitId));
    } else {
      setCompletedHabits(prev => [...prev, habitId]);
    }
  };

  const handleSubmitCheckIn = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold gradient-text">Daily Check-In</h1>
        <p className="text-muted-foreground">Day 15 • Complete your habits to earn points</p>
      </div>

      {/* Progress Overview */}
      <div className="gaming-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Flame className="w-6 h-6 text-energy" />
            Today's Progress
          </h2>
          <div className="text-right">
            <p className="text-2xl font-bold gradient-text">{earnedPoints}</p>
            <p className="text-sm text-muted-foreground">of {totalPoints} points</p>
          </div>
        </div>
        
        <ProgressBar 
          current={earnedPoints} 
          total={totalPoints}
          className="mb-4"
        />
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {completedHabits.length} of {sampleHabits.length} habits completed
          </span>
          <div className="flex items-center gap-1 text-sm text-energy">
            <CheckCircle className="w-4 h-4" />
            {Math.round((earnedPoints / totalPoints) * 100)}% complete
          </div>
        </div>
      </div>

      {/* Habits List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Your Habits</h3>
        <div className="grid gap-4">
          {sampleHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              title={habit.title}
              points={habit.points}
              category={habit.category}
              description={habit.description}
              completed={completedHabits.includes(habit.id)}
              onClick={() => toggleHabit(habit.id)}
            />
          ))}
        </div>
      </div>

      {/* Photo Upload */}
      <div className="gaming-card p-4">
        <div className="flex items-center gap-3">
          <Camera className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium">Progress Photo</p>
            <p className="text-sm text-muted-foreground">Optional - upload your daily progress photo</p>
          </div>
          <Button variant="outline" size="sm">Upload</Button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-4">
        <Button 
          onClick={handleSubmitCheckIn}
          variant="gaming" 
          size="lg" 
          className="w-full"
          disabled={completedHabits.length === 0}
        >
          <CheckCircle className="w-5 h-5" />
          Submit Check-In ({earnedPoints} points)
        </Button>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="gaming-card p-8 text-center max-w-sm mx-4 animate-bounce-in">
            <div className="w-16 h-16 bg-gradient-to-r from-success to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Check-In Complete!</h3>
            <p className="text-muted-foreground mb-4">
              You earned {earnedPoints} points today. Keep it up!
            </p>
            <div className="flex items-center justify-center gap-2 text-energy">
              <Flame className="w-5 h-5" />
              <span className="font-semibold">15 day streak!</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};