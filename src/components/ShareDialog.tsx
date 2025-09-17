import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, MessageSquare, Share2, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streakName: string;
  inviteCode: string;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  onOpenChange,
  streakName,
  inviteCode
}) => {
  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/join-group?code=${inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard.",
    });
  };

  const shareViaSMS = () => {
    const message = `Join my Streakzilla challenge "${streakName}"! Use code: ${inviteCode}`;
    const smsLink = `sms:?body=${encodeURIComponent(message)}`;
    window.open(smsLink);
  };

  const shareViaWhatsApp = () => {
    const message = `Join my Streakzilla challenge "${streakName}"! Use code: ${inviteCode}`;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
  };

  const shareViaEmail = () => {
    const subject = `Join my Streakzilla challenge: ${streakName}`;
    const body = `Hey! I'd love for you to join my Streakzilla challenge "${streakName}". Use the invite code: ${inviteCode}`;
    const emailLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(emailLink);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mobile-card max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Share Streak</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-foreground">{streakName}</h3>
            <p className="text-sm text-muted-foreground">Invite code: {inviteCode}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={copyInviteLink} className="mobile-button">
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button variant="outline" onClick={shareViaSMS} className="mobile-button">
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS
            </Button>
            <Button variant="outline" onClick={shareViaWhatsApp} className="mobile-button">
              <Share2 className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button variant="outline" onClick={shareViaEmail} className="mobile-button">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
