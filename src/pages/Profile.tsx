import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from 'lucide-react';
import { ProfileScreen } from '@/components/ProfileScreen';

export const Profile = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4 pb-32">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 justify-between">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-muted/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden  p-1 shadow-md">
              <img 
                src="/logo-streakzilla-c.png" 
                alt="Streakzilla" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold gradient-text">Profile</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="hover:bg-muted/50"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Profile Content */}
        <ProfileScreen />
      </div>
    </div>
  );
};
