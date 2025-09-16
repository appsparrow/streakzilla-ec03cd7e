import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays, Star, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FeedItem {
  id: string;
  day_number: number;
  points_earned: number;
  note: string | null;
  photo_path: string | null;
  created_at: string;
  profiles: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

export const GroupCheckinsFeed = ({ groupId }: { groupId: string }) => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        // Join to profiles is allowed by policy; if not, we still show empty without crashing
        const { data, error } = await supabase
          .from("checkins")
          .select(`
            id, day_number, points_earned, note, photo_path, created_at,
            profiles:profiles ( id, display_name, avatar_url )
          `)
          .eq("group_id", groupId)
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) {
          setItems([]);
        } else {
          setItems((data || []) as unknown as FeedItem[]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [groupId]);

  return (
    <Card className="gaming-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          Group Check-ins
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <div className="text-sm text-muted-foreground">Loading check-ins...</div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-sm text-muted-foreground">No recent check-ins.</div>
        )}
        {items.map((it) => (
          <div key={it.id} className="p-3 bg-muted/20 rounded-lg border border-border flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={it.profiles?.avatar_url || undefined} />
              <AvatarFallback>{it.profiles?.display_name?.slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="font-medium">{it.profiles?.display_name || "Member"}</div>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 text-secondary" />
                  <span className="text-secondary font-semibold">{it.points_earned}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Day {it.day_number} • {new Date(it.created_at).toLocaleString()}</div>
              {it.note && <div className="text-sm text-muted-foreground mt-1">{it.note}</div>}
              {it.photo_path && (
                <Badge variant="outline" className="mt-2 flex items-center gap-1 text-xs">
                  <ImageIcon className="w-3 h-3" />
                  Photo attached
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
