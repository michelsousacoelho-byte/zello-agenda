import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Scissors, Calendar, Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useState } from 'react';

export default function Navigation() {
  const location = useLocation();
  const { user } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) return null;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/servicos', label: 'Serviços', icon: Scissors },
    { path: '/agenda', label: 'Agenda', icon: Calendar },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop */}
        <div className="hidden sm:flex gap-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors text-sm ${
                isActive(path)
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile */}
        <div className="sm:hidden flex items-center justify-between py-2">
          <span className="text-sm font-medium text-muted-foreground">
            {navItems.find(n => isActive(n.path))?.label || 'Menu'}
          </span>
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground"
          >
            {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuAberto && (
          <div className="sm:hidden pb-2 flex flex-col gap-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMenuAberto(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive(path)
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}