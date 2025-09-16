import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  Users, 
  ArrowLeft,
  Copy,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const CHALLENGE_MODES = [
  { value: "hard", label: "Hard Mode", description: "Strict rules, maximum challenge" },
  { value: "medium", label: "Medium Mode", description: "Balanced approach" },
  { value: "soft", label: "Soft Mode", description: "Flexible and forgiving" },
  { value: "custom", label: "Custom Mode", description: "Set your own rules" },
  { value: "open", label: "Open Streak", description: "No end date, last one standing wins" },
];

const DURATION_OPTIONS = [
  { value: 15, label: "15 Days" },
  { value: 30, label: "30 Days" },
  { value: 45, label: "45 Days" },
  { value: 60, label: "60 Days" },
  { value: 75, label: "75 Days" },
];

export const CreateGroup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [groupCreated, setGroupCreated] = useState(false);
  const [groupCode, setGroupCode] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    mode: "",
    duration_days: "",
    start_date: new Date(),
  });

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc("create_group", {
        p_name: formData.name,
        p_start_date: format(formData.start_date, "yyyy-MM-dd"),
        p_duration_days: formData.mode === "open" ? null : parseInt(formData.duration_days),
        p_mode: formData.mode,
      });

      if (error) throw error;

      const result = data[0];
      setGroupCode(result.join_code);
      setGroupCreated(true);

      toast({
        title: "Group created!",
        description: `Your group "${formData.name}" has been created successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyGroupCode = () => {
    navigator.clipboard.writeText(groupCode);
    toast({
      title: "Copied!",
      description: "Group code copied to clipboard",
    });
  };

  if (groupCreated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center p-4">
        <Card className="gaming-card max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-success to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Group Created!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="space-y-2">
              <p className="text-muted-foreground">Your group has been created successfully.</p>
              <p className="font-semibold">Share this code with your friends:</p>
            </div>
            
            <div className="flex items-center gap-2 p-4 bg-muted/20 rounded-lg">
              <code className="flex-1 text-2xl font-bold text-center tracking-wider">
                {groupCode}
              </code>
              <Button size="sm" variant="outline" onClick={copyGroupCode}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Button 
                variant="gaming" 
                className="w-full"
                onClick={() => navigate("/")}
              >
                Go to Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setGroupCreated(false);
                  setFormData({
                    name: "",
                    mode: "",
                    duration_days: "",
                    start_date: new Date(),
                  });
                }}
              >
                Create Another Group
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
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
          <h1 className="text-3xl font-bold gradient-text">Create Group</h1>
          <div className="w-20" />
        </div>

        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Group Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateGroup} className="space-y-6">
              {/* Group Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Fitness Warriors, Study Buddies"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Challenge Mode */}
              <div className="space-y-2">
                <Label>Challenge Mode</Label>
                <Select 
                  value={formData.mode} 
                  onValueChange={(value) => setFormData({ ...formData, mode: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select challenge difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div className="space-y-1">
                          <p className="font-medium">{mode.label}</p>
                          <p className="text-sm text-muted-foreground">{mode.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration (only for non-open modes) */}
              {formData.mode && formData.mode !== "open" && (
                <div className="space-y-2">
                  <Label>Challenge Duration</Label>
                  <Select 
                    value={formData.duration_days} 
                    onValueChange={(value) => setFormData({ ...formData, duration_days: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((duration) => (
                        <SelectItem key={duration.value} value={duration.value.toString()}>
                          {duration.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Start Date */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.start_date ? (
                        format(formData.start_date, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.start_date}
                      onSelect={(date) => date && setFormData({ ...formData, start_date: date })}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                variant="gaming" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Creating Group..." : "Create Group"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="gaming-card">
          <CardContent className="p-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">What happens next?</p>
              <ul className="space-y-1 ml-4">
                <li>• You'll get a unique group code to share</li>
                <li>• Friends can join using the code</li>
                <li>• Everyone selects their habits before the start date</li>
                <li>• The challenge begins on your chosen start date</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};