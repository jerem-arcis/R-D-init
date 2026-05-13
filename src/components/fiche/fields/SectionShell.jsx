import React from 'react';
import { Lock, ShieldCheck, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import RefusSection from '../RefusSection';
import { ValidationBadge, RefusBadge, RefusAlert } from '../StatusBadges';

// Coque commune à chaque section de la fiche
export default function SectionShell({
  id,
  title,
  subtitle,
  icon: Icon,
  accentColor = 'violet',
  isLocked,
  isEditable,
  isValidated,
  validatedAt,
  isRefused,
  refusedAt,
  refusMotif,
  onVisa,
  onRefus,
  visaLabel,
  children,
}) {
  const accent = {
    violet: 'from-violet-50 to-violet-100/50 border-violet-200',
    sky: 'from-sky-50 to-sky-100/50 border-sky-200',
    emerald: 'from-emerald-50 to-emerald-100/50 border-emerald-200',
    amber: 'from-amber-50 to-amber-100/50 border-amber-200',
    rose: 'from-rose-50 to-rose-100/50 border-rose-200',
  }[accentColor];

  return (
    <section id={id} className={`scroll-mt-32 bg-white rounded-2xl border ${isLocked ? 'border-slate-200 opacity-60' : 'border-slate-200'} shadow-sm overflow-hidden`}>
      <header className={`bg-gradient-to-r ${accent} border-b px-6 py-4 flex items-start justify-between gap-4`}>
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-slate-700 flex-shrink-0" />}
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isLocked && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600">
              <Lock className="w-3.5 h-3.5" />
              Verrouillée
            </div>
          )}
          <RefusBadge isRefused={isRefused} date={refusedAt} />
          <ValidationBadge isValidated={isValidated} date={validatedAt} />
        </div>
      </header>

      <div className={`p-6 space-y-5 ${isLocked ? 'pointer-events-none select-none' : ''}`}>
        <RefusAlert motif={refusMotif} />
        {children}
        {!isLocked && isEditable && onVisa && (
          <RefusSection
            onVisa={onVisa}
            onRefus={onRefus}
            visaLabel={visaLabel}
            isVisible={true}
          />
        )}
      </div>
    </section>
  );
}
