import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Sparkles, Calendar, Menu, X } from 'lucide-react'; // Trocado Scissors por Sparkles
import { useAuth } from '@/lib/AuthContext';
import { useState } from 'react';

export default function Navigation() {
  const location = useLocation();
  const { user } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  const isAdmin = user?.role === 'admin';
  if (!isAdmin) return null;

  const extrairSlugDaUrl = () => {
    const partes = location.pathname.split('/');
    if (partes[1] === 'admin' && partes[2]) return partes[2];
    return 'studio-demo';
  };

  const studioSlug = extrairSlugDaUrl();
  const navItems = [
    { path: `/admin/${studioSlug}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
    { path: `/admin/${studioSlug}/servicos`, label: 'Serviços', icon: Sparkles }, // Substituído aqui também
    { path: `/admin/${studioSlug}/agenda`, label: 'Agenda', icon: Calendar },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-slate-100 border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Desktop Menu */}
        <div className="hidden sm:flex gap-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all text-xs font-black uppercase tracking-wider ${
                isActive(path)
                  ? 'border-slate-900 text-slate-900 bg-white/80'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive(path) ? 'text-slate-900' : 'text-slate-500'}`} />
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile Menu Bar */}
        <div className="sm:hidden flex items-center justify-between py-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            {navItems.find(n => isActive(n.path))?.label || 'Navegação'}
          </span>
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="p-2 rounded-xl text-slate-700 bg-white border border-slate-200 shadow-sm"
          >
            {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {menuAberto && (
          <div className="sm:hidden pb-3 flex flex-col gap-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMenuAberto(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wide transition-colors ${
                  isActive(path)
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
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