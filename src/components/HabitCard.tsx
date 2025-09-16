import { Badge } from "@/components/ui/badge";
import { Check, Flame, Dumbbell, Book, Heart, Droplet, Brain, Palette } from "lucide-react";

interface HabitCardProps {
  title: string;
  points: number;
  category: string;
  description: string;
  selected?: boolean;
  completed?: boolean;
  onClick?: () => void;
}

const categoryIcons = {
  fitness: Dumbbell,
  reading: Book,
  wellness: Heart,
  hydration: Droplet,
  mental: Brain,
  creativity: Palette,
} as const;

const categoryColors = {
  fitness: "bg-red-500/20 text-red-400",
  reading: "bg-blue-500/20 text-blue-400", 
  wellness: "bg-green-500/20 text-green-400",
  hydration: "bg-cyan-500/20 text-cyan-400",
  mental: "bg-purple-500/20 text-purple-400",
  creativity: "bg-orange-500/20 text-orange-400",
} as const;

export const HabitCard = ({ 
  title, 
  points, 
  category, 
  description, 
  selected = false, 
  completed = false,
  onClick 
}: HabitCardProps) => {
  const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Dumbbell;
  const categoryColor = categoryColors[category as keyof typeof categoryColors] || categoryColors.fitness;

  return (
    <div 
      className={`habit-card relative ${selected ? 'ring-2 ring-primary streak-glow' : ''} ${completed ? 'ring-2 ring-success' : ''}`}
      onClick={onClick}
    >
      {/* Completion Check */}
      {completed && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-success rounded-full flex items-center justify-center animate-bounce-in">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      
      {/* Selection Indicator */}
      {selected && (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-bounce-in">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <div className={`p-2 rounded-lg ${categoryColor}`}>
          <IconComponent className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title and Points */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-foreground truncate">{title}</h3>
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-energy" />
              <span className="font-bold text-energy">{points}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-3">{description}</p>

          {/* Category Badge */}
          <Badge variant="secondary" className="text-xs capitalize">
            {category}
          </Badge>
        </div>
      </div>
    </div>
  );
};