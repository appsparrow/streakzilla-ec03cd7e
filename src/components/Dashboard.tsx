import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StreakDisplay } from "./StreakDisplay";
import { ProgressBar } from "./ProgressBar";
import { HabitCard } from "./HabitCard";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, Calendar, Target, TrendingUp, Flame } from "lucide-react";

const todaysHabits = [
  {
    id: 1,
    title: "Two 45-min workouts",
    points: 20,
    category: "fitness",
    description: "Complete 2 intense workout sessions"
  },
  {
    id: 2,
    title: "Drink 1 gallon water",
    points: 15,
    category: "hydration", 
    description: "Stay fully hydrated with 3.8L of water"
  },
  {
    id: 3,
    title: "Read 10 pages nonfiction",
    points: 10,
    category: "reading",
    description: "Read physical book pages"
  }
];

const recentActivity = [
  { day: "Yesterday", points: 85, completed: 7, total: 7 },
  { day: "2 days ago", points: 75, completed: 6, total: 7 },
  { day: "3 days ago", points: 80, completed: 7, total: 7 },
];

export const Dashboard = () => {
  const [completedToday, setCompletedToday] = useState<number[]>([1, 2]);
  
  const todaysPoints = todaysHabits
    .filter(habit => completedToday.includes(habit.id))
    .reduce((sum, habit) => sum + habit.points, 0);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold gradient-text">Streakzilla</h1>
        <p className="text-muted-foreground">Day 15 • Team Fitness Warriors</p>
      </div>

      {/* Current Stats */}
      <StreakDisplay 
        currentStreak={15}
        livesRemaining={2}
        totalPoints={1275}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="gaming-card p-4 text-center hover:scale-105 transition-all duration-300 cursor-pointer">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
          <p className="font-semibold">Daily Check-In</p>
          <p className="text-sm text-muted-foreground">Log today's habits</p>
        </div>
        <div className="gaming-card p-4 text-center hover:scale-105 transition-all duration-300 cursor-pointer">
          <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
          <p className="font-semibold">Leaderboard</p>
          <p className="text-sm text-muted-foreground">See group rankings</p>
        </div>
      </div>

      {/* Today's Progress */}
      <div className="gaming-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Today's Progress
          </h2>
          <Badge variant={completedToday.length === todaysHabits.length ? "success" : "secondary"}>
            {completedToday.length}/{todaysHabits.length} habits
          </Badge>
        </div>
        
        <ProgressBar 
          current={todaysPoints} 
          total={85}
          label={`${todaysPoints} of 85 points earned`}
        />

        {/* Quick habit preview */}
        <div className="space-y-2">
          {todaysHabits.slice(0, 3).map((habit) => (
            <div key={habit.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded border-2 ${
                  completedToday.includes(habit.id) 
                    ? 'bg-success border-success' 
                    : 'border-muted-foreground'
                }`}>
                  {completedToday.includes(habit.id) && (
                    <CheckCircle className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className="text-sm font-medium">{habit.title}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Flame className="w-3 h-3 text-energy" />
                <span className="text-energy font-bold">{habit.points}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Challenge Overview */}
      <div className="gaming-card p-6 bg-gradient-to-r from-primary/10 to-purple-600/10 border border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Challenge Progress</h3>
          <Badge variant="outline" className="border-primary text-primary">
            75-Day Challenge
          </Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold gradient-text">15</p>
            <p className="text-sm text-muted-foreground">Days Done</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">60</p>
            <p className="text-sm text-muted-foreground">Days Left</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-energy">20%</p>
            <p className="text-sm text-muted-foreground">Complete</p>
          </div>
        </div>

        <ProgressBar current={15} total={75} className="mb-4" />
        
        <div className="flex items-center justify-center gap-2 text-sm text-primary">
          <TrendingUp className="w-4 h-4" />
          <span>On track to finish strong!</span>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="gaming-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          Recent Activity
        </h3>
        
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="font-medium">{activity.day}</p>
                <p className="text-sm text-muted-foreground">
                  {activity.completed}/{activity.total} habits completed
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-energy" />
                  <span className="font-bold text-energy">{activity.points}</span>
                </div>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Check-In Button */}
      <div className="sticky bottom-4">
        <Button variant="gaming" size="lg" className="w-full">
          <CheckCircle className="w-5 h-5" />
          Complete Today's Check-In
        </Button>
      </div>
    </div>
  );
};