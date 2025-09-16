import { Flame, Heart, Trophy } from "lucide-react";

interface StreakDisplayProps {
  currentStreak: number;
  livesRemaining: number;
  totalPoints: number;
  className?: string;
}

export const StreakDisplay = ({ 
  currentStreak, 
  livesRemaining, 
  totalPoints,
  className = ""
}: StreakDisplayProps) => {
  return (
    <div className={`gaming-card p-4 ${className}`}>
      <div className="flex items-center justify-between">
        
        {/* Streak */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-r from-energy to-warning">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Streak</p>
            <p className="text-xl font-bold text-energy">{currentStreak} days</p>
          </div>
        </div>

        {/* Lives */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-r from-destructive to-red-600">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Lives</p>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart 
                  key={i} 
                  className={`w-4 h-4 ${i < livesRemaining ? 'text-destructive fill-destructive' : 'text-muted'}`} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Points */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-r from-primary to-purple-600">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Points</p>
            <p className="text-xl font-bold gradient-text">{totalPoints}</p>
          </div>
        </div>
        
      </div>
    </div>
  );
};