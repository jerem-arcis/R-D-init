import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  FileText,
  ClipboardList,
  LayoutDashboard,
  Zap,
  Menu,
  X,
  ChevronRight,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStaleWaitingTransitions } from '@/lib/cycleStats';

const NAV_ITEMS = [
  { label: "Tableau de bord",     page: "Dashboard",     icon: LayoutDashboard, match: ["Dashboard"], badgeKey: "delays" },
  { label: "Demandes d'Étude",    page: "DemandesEtude", icon: FileText,        match: ["DemandesEtude", "CreerDE", "TraiterDE"] },
  { label: "Fiches de Lancement", page: "Accueil",       icon: ClipboardList,   match: ["Accueil", "FicheDetail", "CreerFL"] },
  { label: "Déclencher le flux",  page: "DeclencherFlux", icon: Zap,            match: ["DeclencherFlux"] },
  { label: "Admin",               page: "Admin",          icon: Settings2,       match: ["Admin"] },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: fiches = [] } = useQuery({
    queryKey: ['fiches'],
    queryFn: () => base44.entities.FicheLancement.list('-created_date'),
  });

  const delaysCount = useMemo(
    () => getStaleWaitingTransitions(fiches).length,
    [fiches],
  );

  const badges = { delays: delaysCount };

  const isActive = (item) => item.match.includes(currentPageName);

  return (
    <div className="min-h-screen flex bg-background font-inter">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 z-50 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ background: "hsl(270, 65%, 22%)" }}
      >
        {/* Logo */}
        <div
          className="h-20 flex items-center px-5 gap-3"
          style={{ borderBottom: "1px solid hsl(270, 50%, 28%)" }}
        >
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md flex-shrink-0">
            <span
              className="font-black text-lg"
              style={{ color: "hsl(270, 62%, 37%)" }}
            >
              B.
            </span>
          </div>
          <div>
            <h1 className="font-extrabold text-base text-white tracking-wide">
              BONCOLAC
            </h1>
            <p
              className="text-[10px] tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Gestion Articles
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const badge = item.badgeKey ? badges[item.badgeKey] : 0;
            return (
              <Link
                key={item.label}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active ? "shadow font-semibold" : "hover:bg-white/10"
                }`}
                style={
                  active
                    ? { background: "hsl(38, 80%, 55%)", color: "hsl(270, 65%, 15%)" }
                    : { color: "rgba(255,255,255,0.75)" }
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {badge > 0 && (
                  <span
                    className={`ml-auto px-1.5 min-w-[20px] h-[20px] rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm ${
                      active ? 'bg-rose-600 text-white' : 'bg-rose-500 text-white'
                    }`}
                    title={`${badge} fiche${badge > 1 ? 's' : ''} en retard (> 3j)`}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
                {active && badge === 0 && <ChevronRight className="w-3 h-3 ml-auto opacity-80" />}
              </Link>
            );
          })}
        </nav>

      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center px-4 border-b border-border bg-card lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span
            className="ml-3 font-bold text-sm tracking-wide"
            style={{ color: "hsl(270, 62%, 37%)" }}
          >
            BONCOLAC
          </span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
