import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

export const MobileNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: 'logo', label: 'Home' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="mobile-nav px-4 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
                active 
                  ? 'text-blue-400 bg-blue-400/10' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.icon === 'logo' ? (
                <img 
                  src="/logo-streakzilla-w.png" 
                  alt="Streakzilla" 
                  className={`w-5 h-5 object-contain ${active ? 'opacity-100' : 'opacity-60'}`}
                />
              ) : (
                <Icon className={`w-5 h-5 ${active ? 'text-blue-400' : ''}`} />
              )}
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};
