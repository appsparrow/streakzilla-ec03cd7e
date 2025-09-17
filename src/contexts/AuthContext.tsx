import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Ensure profile exists when user signs in (don't await to avoid blocking)
        if (event === 'SIGNED_IN' && session?.user) {
          ensureProfileExists(session.user).catch(console.error);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Ensure profile exists for existing session (don't await to avoid blocking)
      if (session?.user) {
        ensureProfileExists(session.user).catch(console.error);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureProfileExists = async (user: User) => {
    try {
      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      // If profile doesn't exist, create it
      if (fetchError && fetchError.code === 'PGRST116') {
        console.log('Creating missing profile for user:', user.id);
        
        const profileData = {
          id: user.id,
          full_name: user.user_metadata?.full_name || 'User',
          display_name: user.user_metadata?.display_name || 'User',
          email: user.email,
          max_groups: 1 // Default free plan
        };

        const { error: insertError } = await supabase
          .from('profiles')
          .insert([profileData]);

        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          console.log('Profile created successfully for user:', user.id);
        }
      }
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};