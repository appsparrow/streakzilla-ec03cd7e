import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Auth } from "./pages/Auth";
import { CreateGroup } from "./pages/CreateGroup";
import { JoinGroup } from "./pages/JoinGroup";
import { GroupDashboard } from "./pages/GroupDashboard";
import { DailyCheckIn } from "./components/DailyCheckIn";
import { HabitSelectionPage } from "./pages/HabitSelectionPage";
import { Profile } from "./pages/Profile";
import { CheckIn } from "./pages/CheckIn";
import { MemberDetail } from "./pages/MemberDetail";
import { MobileNavigation } from "./components/MobileNavigation";
import { StreakSettings } from "./pages/StreakSettings";
import { Settings as AppSettings } from "./pages/Settings";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return (
    <>
      {children}
      <MobileNavigation />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } />
          <Route path="/create-group" element={
            <ProtectedRoute>
              <CreateGroup />
            </ProtectedRoute>
          } />
          <Route path="/join-group" element={
            <ProtectedRoute>
              <JoinGroup />
            </ProtectedRoute>
          } />
          <Route path="/groups/:groupId" element={
            <ProtectedRoute>
              <GroupDashboard />
            </ProtectedRoute>
          } />
          <Route path="/groups/:groupId/checkin" element={
            <ProtectedRoute>
              <DailyCheckIn />
            </ProtectedRoute>
          } />
          <Route path="/groups/:groupId/habits" element={
            <ProtectedRoute>
              <HabitSelectionPage />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/checkin" element={
            <ProtectedRoute>
              <CheckIn />
            </ProtectedRoute>
          } />
          <Route path="/groups/:groupId/members/:userId" element={
            <ProtectedRoute>
              <MemberDetail />
            </ProtectedRoute>
          } />
          <Route path="/groups/:groupId/settings" element={
            <ProtectedRoute>
              <StreakSettings />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <AppSettings />
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
