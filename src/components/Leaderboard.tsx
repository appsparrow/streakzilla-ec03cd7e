import { Trophy, Medal, Flame, Heart, TrendingUp, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const mockLeaderboard = [
  {
    id: 1,
    name: "Alex Chen",
    avatar: "/api/placeholder/40/40",
    streak: 15,
    points: 1125,
    livesRemaining: 3,
    rank: 1,
    todayPoints: 85
  },
  {
    id: 2,
    name: "Maria Santos", 
    avatar: "/api/placeholder/40/40",
    streak: 15,
    points: 1020,
    livesRemaining: 2,
    rank: 2,
    todayPoints: 75
  },
  {
    id: 3,
    name: "David Kim",
    avatar: "/api/placeholder/40/40", 
    streak: 14,
    points: 980,
    livesRemaining: 3,
    rank: 3,
    todayPoints: 70
  },
  {
    id: 4,
    name: "You",
    avatar: "/api/placeholder/40/40",
    streak: 15,
    points: 875,
    livesRemaining: 1,
    rank: 4,
    todayPoints: 80
  },
  {
    id: 5,
    name: "Sarah Johnson",
    avatar: "/api/placeholder/40/40",
    streak: 12,
    points: 720,
    livesRemaining: 2,
    rank: 5,
    todayPoints: 60
  }
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-6 h-6 text-yellow-500" />;
    case 2: 
      return <Medal className="w-6 h-6 text-gray-400" />;
    case 3:
      return <Medal className="w-6 h-6 text-amber-600" />;
    default:
      return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
  }
};

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1:
      return "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30";
    case 2:
      return "from-gray-400/20 to-gray-500/20 border-gray-400/30";
    case 3:
      return "from-amber-600/20 to-amber-700/20 border-amber-600/30";
    default:
      return "from-card to-muted border-border";
  }
};

export const Leaderboard = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold gradient-text">Leaderboard</h1>
        <p className="text-muted-foreground">Team Fitness Warriors • Day 15 of 75</p>
      </div>

      {/* Challenge Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="gaming-card p-4 text-center">
          <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold gradient-text">15</p>
          <p className="text-sm text-muted-foreground">Days Complete</p>
        </div>
        <div className="gaming-card p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-success" />
          <p className="text-2xl font-bold text-success">5</p>
          <p className="text-sm text-muted-foreground">Active Members</p>
        </div>
        <div className="gaming-card p-4 text-center">
          <Flame className="w-6 h-6 mx-auto mb-2 text-energy" />
          <p className="text-2xl font-bold text-energy">4,720</p>
          <p className="text-sm text-muted-foreground">Total Points</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Current Standings
        </h2>
        
        {mockLeaderboard.map((member) => {
          const isCurrentUser = member.name === "You";
          
          return (
            <div 
              key={member.id} 
              className={`gaming-card p-4 bg-gradient-to-r ${getRankColor(member.rank)} ${
                isCurrentUser ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="flex-shrink-0">
                  {getRankIcon(member.rank)}
                </div>

                {/* Avatar & Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate flex items-center gap-2">
                      {member.name}
                      {isCurrentUser && <Badge variant="secondary" className="text-xs">You</Badge>}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-energy" />
                        {member.streak} day streak
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-destructive" />
                        {member.livesRemaining} lives
                      </span>
                    </div>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold gradient-text">{member.points.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">+{member.todayPoints} today</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Motivational Footer */}
      <div className="gaming-card p-6 text-center bg-gradient-to-r from-primary/10 to-purple-600/10 border border-primary/20">
        <h3 className="text-lg font-semibold mb-2">60 Days to Go!</h3>
        <p className="text-muted-foreground mb-4">
          You're doing amazing! Stay consistent to climb the leaderboard.
        </p>
        <div className="flex items-center justify-center gap-2 text-energy">
          <Flame className="w-5 h-5" />
          <span className="font-semibold">Keep the streak alive!</span>
        </div>
      </div>
    </div>
  );
};