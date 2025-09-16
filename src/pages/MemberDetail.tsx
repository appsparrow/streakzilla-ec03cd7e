import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Flame, Star, Calendar, Image as ImageIcon, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string;
  bio?: string;
}

interface CheckinItem {
  id: string;
  day_number: number;
  points_earned: number;
  photo_path: string | null;
  note: string | null;
  created_at: string;
}

export const MemberDetail = () => {
  const navigate = useNavigate();
  const { groupId, userId } = useParams();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId || !userId) return;
    let isMounted = true;

    const load = async () => {
      try {
        // Fetch profile (public policy allows this)
        const { data: pData, error: pErr } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, bio")
          .eq("id", userId)
          .single();
        if (pErr) throw pErr;
        if (!isMounted) return;
        setProfile(pData as unknown as Profile);

        // Fetch recent check-ins (may fail due to current RLS recursion; handle gracefully)
        const { data: cData, error: cErr } = await supabase
          .from("checkins")
          .select("id, day_number, points_earned, photo_path, note, created_at")
          .eq("group_id", groupId)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);
        if (cErr) {
          setError("Unable to load check-ins right now (needs DB policy fix).");
          setCheckins([]);
        } else {
          setCheckins((cData || []) as unknown as CheckinItem[]);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load member details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [groupId, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading member...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/groups/${groupId}`)} className="hover:bg-muted/50">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold gradient-text">Member</h1>
        </div>

        {/* Profile Card */}
        <Card className="gaming-card">
          <CardContent className="p-6 flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url} alt={profile?.display_name} />
              <AvatarFallback>{profile?.display_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold text-foreground">{profile?.display_name || "Member"}</h2>
              </div>
              {profile?.bio && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Check-ins */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Check-ins
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 text-warning">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {checkins.length === 0 && !error && (
              <p className="text-sm text-muted-foreground">No check-ins yet.</p>
            )}

            {checkins.map((c) => (
              <div key={c.id} className="p-4 bg-muted/20 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-energy" />
                    <span className="text-sm text-muted-foreground">Day</span>
                    <span className="font-semibold">{c.day_number}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-secondary" />
                    <span className="font-medium text-secondary">{c.points_earned}</span>
                  </div>
                </div>
                {c.note && (
                  <p className="text-sm text-muted-foreground mt-2">{c.note}</p>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(c.created_at).toLocaleString()}</span>
                </div>
                {c.photo_path && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="w-4 h-4" />
                    <span>Photo attached</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
