import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Link as LinkIcon, Users, Crown, Settings, Copy, Calendar, Clock, Edit, Eye, Share2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ShareDialog } from '@/components/ShareDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export const StreakSettings = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingStartDate, setEditingStartDate] = useState(false);
  const [newStartDate, setNewStartDate] = useState("");
  const [editingDuration, setEditingDuration] = useState(false);
  const [newDuration, setNewDuration] = useState("");
  const [canEditDetails, setCanEditDetails] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: g, error } = await supabase.from('groups').select('*').eq('id', groupId).single();
        if (error) throw error;
        setGroup(g);
        setNewName(g?.name || "");
        setNewStartDate(g?.start_date || "");
        setNewDuration(g?.duration_days?.toString() || "");
        
        // Fallback: creator is always admin
        let admin = g?.created_by === user?.id;
        try {
          const { data: groupDetails } = await (supabase as any).rpc('get_group_details', {
            p_group_id: groupId,
            p_user_id: user?.id
          });
          admin = admin || (groupDetails && groupDetails.length > 0 && groupDetails[0].user_role === 'admin');
        } catch (e) {
          // ignore; rely on creator fallback
        }
        setIsAdmin(admin);

        // Check if admin can edit details (until end of start date)
        if (admin && g?.start_date) {
          const startDate = new Date(g.start_date);
          const today = new Date();
          const endOfStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1);
          setCanEditDetails(today <= endOfStartDate);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId, user?.id]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(group?.code || '');
      toast({ title: 'Invite code copied', description: 'Share the code with your streakmates.' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeave = async () => {
    if (!groupId || !user) return;
    try {
      // Use the RPC function to leave the group (bypasses RLS issues)
      const { error: rpcError } = await (supabase as any).rpc('leave_group', {
        p_group_id: groupId,
        p_user_id: user.id
      });
      
      if (rpcError) throw rpcError;

      toast({ 
        title: 'Left streak', 
        description: 'You have successfully left the streak.' 
      });
      navigate('/');
    } catch (e: any) {
      console.error('Error leaving streak:', e);
      toast({ 
        title: 'Error', 
        description: e.message || 'Failed to leave streak. Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupId) return;
    try {
      const { error } = await (supabase as any).rpc('delete_group', { p_group_id: groupId });
      if (error) throw error;
      toast({ title: 'Group deleted', description: 'The streak has been deleted.' });
      navigate('/');
    } catch (e: any) {
      console.error('Delete group error:', e);
      toast({ title: 'Error', description: e.message || 'Failed to delete group', variant: 'destructive' });
    }
  };

  const handleRename = async () => {
    if (!groupId || !newName?.trim()) return;
    try {
      const { error } = await supabase
        .from('groups')
        .update({ name: newName.trim() })
        .eq('id', groupId);
      if (error) throw error;
      setGroup({ ...group, name: newName.trim() });
      setRenaming(false);
      toast({ title: 'Updated', description: 'Streak name updated.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update name', variant: 'destructive' });
    }
  };

  const handleUpdateStartDate = async () => {
    if (!groupId || !newStartDate) return;
    try {
      const { error } = await supabase
        .from('groups')
        .update({ start_date: newStartDate })
        .eq('id', groupId);
      if (error) throw error;
      setGroup({ ...group, start_date: newStartDate });
      setEditingStartDate(false);
      toast({ title: 'Updated', description: 'Start date updated.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update start date', variant: 'destructive' });
    }
  };

  const handleUpdateDuration = async () => {
    if (!groupId || !newDuration) return;
    const duration = parseInt(newDuration);
    if (isNaN(duration) || duration <= 0) {
      toast({ title: 'Error', description: 'Duration must be a positive number', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase
        .from('groups')
        .update({ duration_days: duration })
        .eq('id', groupId);
      if (error) throw error;
      setGroup({ ...group, duration_days: duration });
      setEditingDuration(false);
      toast({ title: 'Updated', description: 'Duration updated.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update duration', variant: 'destructive' });
    }
  };

  const copyWatcherLink = () => {
    const watcherLink = `${window.location.origin}/watch/${groupId}`;
    navigator.clipboard.writeText(watcherLink);
    toast({
      title: "Watcher link copied!",
      description: "Share this link with family and friends who want to watch your progress.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading streak settings...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Streak Not Found</h2>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4 pb-32">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/groups/${groupId}`)} className="hover:bg-muted/50">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h1 className="text-2xl text-blue-400">Streak Settings</h1>
          </div>
        </div>

        {/* Info */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="text-blue-400 text-lg">Streak Info</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-blue-400">Name</Label>
                {isAdmin && !renaming && (
                  <Button variant="ghost" size="sm" onClick={() => setRenaming(true)}>Edit</Button>
                )}
              </div>
              {isAdmin && renaming ? (
                <div className="flex gap-2">
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <Button size="sm" onClick={handleRename}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setRenaming(false); setNewName(group.name); }}>Cancel</Button>
                </div>
              ) : (
                <p className="text-lg font-medium text-foreground">{group.name}</p>
              )}
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-1">
              <Label className="text-xs text-blue-400">Invite Code</Label>
              <p className="text-lg font-medium text-foreground font-mono">{group.code}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-1">
                <Label className="text-xs text-blue-400">Mode</Label>
                <p className="text-lg font-medium text-foreground capitalize">{group.mode}</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-blue-400">Duration</Label>
                  {isAdmin && canEditDetails && !editingDuration && (
                    <Button variant="ghost" size="sm" onClick={() => setEditingDuration(true)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                {isAdmin && canEditDetails && editingDuration ? (
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      value={newDuration} 
                      onChange={(e) => setNewDuration(e.target.value)}
                      placeholder="Days"
                      className="h-8"
                    />
                    <Button size="sm" onClick={handleUpdateDuration}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => { 
                      setEditingDuration(false); 
                      setNewDuration(group.duration_days?.toString() || "");
                    }}>Cancel</Button>
                  </div>
                ) : (
                  <p className="text-lg font-medium text-foreground">{group.duration_days} days</p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-blue-400">Start Date</Label>
                {isAdmin && canEditDetails && !editingStartDate && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingStartDate(true)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {isAdmin && canEditDetails && editingStartDate ? (
                <div className="flex gap-2">
                  <Input 
                    type="date" 
                    value={newStartDate} 
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="h-8"
                  />
                  <Button size="sm" onClick={handleUpdateStartDate}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { 
                    setEditingStartDate(false); 
                    setNewStartDate(group.start_date || "");
                  }}>Cancel</Button>
                </div>
              ) : (
                <p className="text-lg font-medium text-foreground">
                  {new Date(group.start_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              )}
              {!canEditDetails && isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Editing locked after start date
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invite & Actions */}
        <Card className="gaming-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-400 text-lg">
              <Users className="w-5 h-5" />
              Invite & Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-blue-400">Your Role</Label>
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-secondary" />
                    <p className="text-lg font-medium text-secondary">Admin</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <p className="text-lg font-medium text-foreground">Member</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="default" 
                  className="mobile-button bg-blue-600 hover:bg-blue-700" 
                  onClick={() => setShareDialogOpen(true)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Share Link
                </Button>
                <Button 
                  variant="outline" 
                  className="mobile-button border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white" 
                  onClick={copyWatcherLink}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Watcher Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="gaming-card border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive text-lg">
              <Settings className="w-5 h-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 space-y-3">
              <p className="text-sm text-muted-foreground">
                These actions are permanent and cannot be undone. Please proceed with caution.
              </p>
              
              <div className="grid grid-cols-1 gap-2">
                <Button 
                  variant="outline" 
                  className="mobile-button text-destructive hover:text-destructive-foreground hover:bg-destructive border-destructive/30" 
                  onClick={() => setConfirmLeaveOpen(true)}
                >
                  Leave Streak
                </Button>
                {isAdmin && (
                  <Button 
                    variant="destructive"
                    className="mobile-button"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    Delete Streak
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share Dialog */}
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          streakName={group?.name || ""}
          inviteCode={group?.code || ""}
        />

        {/* Confirm Leave Dialog */}
        <ConfirmDialog
          open={confirmLeaveOpen}
          onOpenChange={setConfirmLeaveOpen}
          title="Leave Streak"
          description="Are you sure you want to leave this streak? This action cannot be undone."
          confirmText="Leave Streak"
          cancelText="Cancel"
          onConfirm={handleLeave}
          variant="destructive"
        />

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
          title="Delete Streak"
          description="This will permanently delete the group and all its data for everyone. This action cannot be undone."
          confirmText="Delete Streak"
          cancelText="Cancel"
          onConfirm={handleDeleteGroup}
          variant="destructive"
        />
      </div>
    </div>
  );
};
