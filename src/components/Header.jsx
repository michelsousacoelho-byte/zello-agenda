import { Sun, Heart, LogOut, User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <header className="bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun className="w-7 h-7 sm:w-8 sm:h-8" />
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">Andréia Moura</h1>
              <p className="text-xs sm:text-sm opacity-90 flex items-center gap-1">
                Bronze & Estética <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
              </p>
            </div>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-sm opacity-90">
                <User className="w-4 h-4" />
                <span>{isAdmin ? 'Administradora' : user?.full_name || 'Cliente'}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-primary-foreground hover:bg-white/20 text-xs sm:text-sm"
              >
                <LogOut className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}