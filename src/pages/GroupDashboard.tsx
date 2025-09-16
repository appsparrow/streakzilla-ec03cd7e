import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Leaderboard } from "@/components/Leaderboard";
import { 
  Calendar, 
  Users, 
  Settings, 
  MessageSquare, 
  CheckCircle,
  Flame,
  Heart,
  Trophy,
  ArrowLeft
} from "lucide-react";

interface Group {
  id: string;
  name: string;
  code: string;
  start_date: string;
  duration_days: number;
  mode: string;
  is_active: boolean;
  created_at: string;
}

interface GroupMember {
  id: string;
  role: string;
  joined_at: string;
  lives_remaining: number;
  total_points: number;
  current_streak: number;
  restart_count: number;
  is_out: boolean;
  profiles: {
    display_name: string;
    avatar_url: string;
  };
}

export const GroupDashboard = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [userMembership, setUserMembership] = useState<GroupMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groupId && user) {
      fetchGroupData();
    }
  }, [groupId, user]);

  const fetchGroupData = async () => {
    try {
      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      // Fetch group members
      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select(`
          *,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .eq("group_id", groupId);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Find current user's membership
      const currentUserMembership = membersData?.find(m => m.user_id === user?.id);
      setUserMembership(currentUserMembership || null);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load group data",
        variant: "destructive",
      });
      console.error("Error fetching group data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupId || !user) return;

    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Left group",
        description: "You have successfully left the group",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to leave group",
        variant: "destructive",
      });
    }
  };

  const calculateDaysRemaining = () => {
    if (!group?.start_date || !group?.duration_days) return 0;
    const startDate = new Date(group.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + group.duration_days);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getCurrentDay = () => {
    if (!group?.start_date) return 0;
    const startDate = new Date(group.start_date);
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Group not found</h2>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const daysRemaining = calculateDaysRemaining();
  const currentDay = getCurrentDay();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
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
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold gradient-text">{group.name}</h1>
            <p className="text-muted-foreground">Code: {group.code}</p>
          </div>
          <div className="w-20" /> {/* Spacer */}
        </div>

        {/* Group Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="gaming-card">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold gradient-text">{currentDay}</p>
              <p className="text-sm text-muted-foreground">Current Day</p>
            </CardContent>
          </Card>

          <Card className="gaming-card">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold text-success">{members.length}</p>
              <p className="text-sm text-muted-foreground">Members</p>
            </CardContent>
          </Card>

          <Card className="gaming-card">
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-energy" />
              <p className="text-2xl font-bold text-energy">{userMembership?.total_points || 0}</p>
              <p className="text-sm text-muted-foreground">Your Points</p>
            </CardContent>
          </Card>

          <Card className="gaming-card">
            <CardContent className="p-4 text-center">
              <Heart className="w-6 h-6 mx-auto mb-2 text-destructive" />
              <p className="text-2xl font-bold text-destructive">{userMembership?.lives_remaining || 0}</p>
              <p className="text-sm text-muted-foreground">Lives Left</p>
            </CardContent>
          </Card>
        </div>

        {/* User Stats Card */}
        {userMembership && (
          <Card className="gaming-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-energy" />
                Your Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-bold text-energy">{userMembership.current_streak} days</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-sm text-muted-foreground">Restarts</p>
                  <p className="text-lg font-semibold">{userMembership.restart_count}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Badge variant={userMembership.role === 'admin' ? 'default' : 'secondary'}>
                  {userMembership.role === 'admin' ? 'Admin' : 'Member'}
                </Badge>
                <Badge variant="outline">
                  {group.mode} Mode
                </Badge>
                {group.duration_days && (
                  <Badge variant="outline">
                    {group.duration_days} Days
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="leaderboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            <Leaderboard groupId={groupId} />
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle>Group Members ({members.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {member.profiles?.display_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-semibold">{member.profiles?.display_name || "Unknown"}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{member.total_points} pts</span>
                          <span>•</span>
                          <span>{member.current_streak} streak</span>
                          <span>•</span>
                          <span>{member.lives_remaining} lives</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === 'admin' && (
                        <Badge variant="default">Admin</Badge>
                      )}
                      {member.is_out && (
                        <Badge variant="destructive">Out</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Group Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Chat feature coming soon!</p>
                  <p className="text-sm">Stay tuned for group discussions</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Group Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="font-semibold">Group Information</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Name: {group.name}</p>
                    <p>Code: {group.code}</p>
                    <p>Mode: {group.mode}</p>
                    <p>Duration: {group.duration_days} days</p>
                    <p>Started: {new Date(group.start_date).toLocaleDateString()}</p>
                    {daysRemaining > 0 && (
                      <p>Days remaining: {daysRemaining}</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    variant="destructive" 
                    onClick={handleLeaveGroup}
                    className="w-full"
                  >
                    Leave Group
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="fixed bottom-6 right-6 space-y-2">
          <Button 
            variant="gaming" 
            size="lg" 
            className="rounded-full shadow-lg"
            onClick={() => navigate(`/groups/${groupId}/checkin`)}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Check In
          </Button>
        </div>
      </div>
    </div>
  );
};