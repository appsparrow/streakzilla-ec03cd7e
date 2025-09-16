import { useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { HabitSelection } from "@/components/HabitSelection";
import { Leaderboard } from "@/components/Leaderboard";
import { Navigation } from "@/components/Navigation";

const Index = () => {
  const [activeView, setActiveView] = useState("dashboard");

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
      case "checkin":
        return <DailyCheckIn />;
      case "habits":
        return <HabitSelection />;
      case "leaderboard":
        return <Leaderboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {renderView()}
      <Navigation activeView={activeView} onViewChange={setActiveView} />
    </div>
  );
};

export default Index;
