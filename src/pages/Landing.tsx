import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Flame, 
  Users, 
  Trophy, 
  Heart, 
  Zap, 
  Target, 
  Calendar,
  Star,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

export const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Flame,
      title: "Build Powerful Streaks",
      description: "Track daily habits and build momentum with streak counting",
      color: "text-orange-500"
    },
    {
      icon: Users,
      title: "Join Streakmates",
      description: "Team up with friends and challenge each other to stay consistent",
      color: "text-blue-500"
    },
    {
      icon: Target,
      title: "Select Your Powers",
      description: "Choose from hundreds of habits or create custom ones that fit your goals",
      color: "text-purple-500"
    },
    {
      icon: Star,
      title: "Earn Gems",
      description: "Complete daily powers to earn gems and climb the leaderboard",
      color: "text-yellow-500"
    },
    {
      icon: Heart,
      title: "Use Lives Wisely",
      description: "Missed a day? Use a life to keep your streak alive, but use them strategically",
      color: "text-red-500"
    },
    {
      icon: Trophy,
      title: "Compete & Win",
      description: "See who's leading in your streak group and celebrate victories together",
      color: "text-green-500"
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Create or Join a Streak",
      description: "Start your own streak challenge or join friends with a streak code",
      icon: Calendar
    },
    {
      step: "2", 
      title: "Select Your Powers",
      description: "Choose habits you want to track - exercise, reading, meditation, and more",
      icon: Zap
    },
    {
      step: "3",
      title: "Check In Daily",
      description: "Mark completed powers each day to earn gems and maintain your streak",
      icon: CheckCircle
    },
    {
      step: "4",
      title: "Build & Compete",
      description: "Watch your streak grow while competing with streakmates on the leaderboard",
      icon: Trophy
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-streakzilla-w.png" alt="Streakzilla" className="w-8 h-8" />
            <h1 className="text-2xl font-bold gradient-text">Streakzilla</h1>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/auth')}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <Badge variant="secondary" className="text-sm">
              🔥 Join the Ultimate Habit Challenge
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold gradient-text leading-tight">
              Build Streaks.<br />
              Earn Gems.<br />
              Challenge Friends.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your habits into an exciting game. Track powers, build streaks, 
              and compete with streakmates in the most engaging habit tracker ever built.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              variant="gaming" 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-6 h-auto"
            >
              Start Your Streak Journey
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-lg px-8 py-6 h-auto"
            >
              Learn How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">Why Streakmates Love Streakzilla</h3>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We've gamified habit tracking to make building streaks fun, social, and rewarding.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="gaming-card hover:scale-105 transition-transform">
                <CardContent className="p-6 text-center space-y-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r from-primary/20 to-purple-600/20 flex items-center justify-center mx-auto`}>
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h4 className="text-xl font-semibold">{feature.title}</h4>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-4 py-16 bg-muted/30 rounded-lg mx-4">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold mb-4">How Streakzilla Works</h3>
          <p className="text-muted-foreground text-lg">
            Get started in minutes and begin your transformation journey
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {howItWorks.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center mx-auto">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                </div>
                <h4 className="text-lg font-semibold">{step.title}</h4>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h3 className="text-3xl font-bold">Ready to Start Your Streak?</h3>
          <p className="text-muted-foreground text-lg">
            Join thousands of streakmates who are building better habits, one day at a time.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="gaming" 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-6 h-auto"
            >
              Create Your First Streak
              <Flame className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>✨ Free to start • ⚡ No credit card required • 🎮 Instant setup</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-border">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo-streakzilla-w.png" alt="Streakzilla" className="w-6 h-6" />
            <span className="font-semibold">Streakzilla</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Built for streakmates who want to level up their habits
          </div>
        </div>
      </footer>
    </div>
  );
};
