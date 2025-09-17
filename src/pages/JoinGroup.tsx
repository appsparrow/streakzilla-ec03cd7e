import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  ArrowLeft,
  UserPlus,
  CheckCircle
} from "lucide-react";

export const JoinGroup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [groupCode, setGroupCode] = useState("");
  const [joinedGroup, setJoinedGroup] = useState<string | null>(null);

  // Populate code from URL parameter
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setGroupCode(codeFromUrl.toUpperCase().trim());
    }
  }, [searchParams]);

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc("join_group", {
        p_code: groupCode.toUpperCase().trim(),
      });

      if (error) throw error;

      setJoinedGroup(data);

      toast({
        title: "Joined streak!",
        description: "You have successfully joined the streak.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join group",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (joinedGroup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center p-4">
        <Card className="gaming-card max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-success to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Welcome to the Streak!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="space-y-2">
              <p className="text-muted-foreground">
                You've successfully joined the streak! Now select your powers to begin tracking your journey.
              </p>
            </div>

            <div className="space-y-2">
              <Button 
                variant="gaming" 
                className="w-full"
                onClick={() => navigate(`/groups/${joinedGroup}/habits`)}
              >
                Select Your Powers
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate(`/groups/${joinedGroup}`)}
              >
                View Streak Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4 pb-32">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold gradient-text">Join Streak</h1>
          <div className="w-20" />
        </div>

        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-primary" />
              Enter Streak Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinGroup} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code">Streak Code</Label>
                <Input
                  id="code"
                  placeholder="Enter 6-character code"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono tracking-wider"
                  maxLength={6}
                  required
                />
                {searchParams.get('code') && (
                  <p className="text-sm text-primary flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Code pre-filled from your invitation link
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Ask your friend for the streak code they received when creating the streak.
                </p>
              </div>

              <Button 
                type="submit" 
                variant="gaming" 
                className="w-full" 
                disabled={isLoading || groupCode.length !== 6}
              >
                {isLoading ? "Joining..." : "Join Streak"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              What happens after joining?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. You'll be added to the streak</p>
            <p>2. Select your powers (6+ habits, 75+ points minimum)</p>
            <p>3. Wait for the challenge start date</p>
            <p>4. Start your daily check-ins and build your streak!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};