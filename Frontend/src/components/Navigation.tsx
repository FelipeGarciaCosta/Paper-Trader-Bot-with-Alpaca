import { Link, useLocation } from 'react-router-dom';
import { Activity, Home, Search, Bot, Menu, LogOut, BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export const Navigation = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();

  const links = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/explore', label: 'Explore', icon: Search },
    { to: '/strategy', label: 'Strategy Config', icon: Bot },
    { to: '/backtesting-strategy', label: 'Backtesting', icon: BarChart3 },
    { to: '/paper-trading-live', label: 'Trading Live', icon: TrendingUp },
  ];

  // Determinar el título según la ruta actual
  const getPageTitle = () => {
    const path = location.pathname.toLowerCase();
    
    if (path === '/') {
      return 'Trading Bot Home';
    } else if (path === '/explore') {
      return 'Trading Bot Explore';
    } else if (path === '/login') {
      return 'Login';
    } else if (path.startsWith('/vieworder')) {
      return 'Trading Bot View Order';
    } else if (path === '/strategy') {
      return 'Trading Bot Strategy';
    } else if (path === '/backtesting-strategy') {
      return 'Backtesting Strategy';
    } else if (path === '/paper-trading-live') {
      return 'Paper Trading Live';
    } else {
      return 'Trading Bot Default';
    }
  };

  // Don't show navigation on login page
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Menú hamburguesa a la izquierda */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetHeader>
                <SheetTitle>Menú</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                {links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;

                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  );
                })}

                {/* Separador */}
                <div className="border-t border-border my-4" />

                {/* Toggle de tema */}
                <div className="px-4">
                  <p className="text-sm font-medium mb-3">Tema</p>
                  <ThemeToggle />
                </div>

                {/* Logout button */}
                {isAuthenticated && (
                  <>
                    <div className="border-t border-border my-4" />
                    <div className="px-4 space-y-3">
                      <p className="text-sm text-muted-foreground">Logged in as: <span className="font-medium text-foreground">{user?.username}</span></p>
                      <Button 
                        variant="destructive" 
                        className="w-full flex items-center gap-2"
                        onClick={() => {
                          logout();
                          setOpen(false);
                          navigate('/login');
                        }}
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </Button>
                    </div>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Título a la derecha */}
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            <button onClick={() => navigate('/')}>
              <div>
                <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
                <p className="text-sm text-muted-foreground">Automated Trading System</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
