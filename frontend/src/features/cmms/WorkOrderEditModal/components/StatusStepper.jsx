import React from 'react';

const STATUSES_FR = [
  { key: 'open', label: 'Ouvert' },
  { key: 'in_progress', label: 'En Cours' },
  { key: 'pending_parts', label: 'En Attente' },
  { key: 'resolved', label: 'Résolu' },
  { key: 'closed', label: 'Clôturé' }
];

const STATUSES_EN = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'pending_parts', label: 'Pending Parts' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' }
];

export const StatusStepper = ({ currentStatus, onChange, lang = 'fr' }) => {
  const statuses = lang === 'fr' ? STATUSES_FR : STATUSES_EN;
  const normalizedCurrent = (currentStatus || 'open').toLowerCase().replace(' ', '_');

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase mr-1">
        {lang === 'fr' ? 'Statut :' : 'Status :'}
      </span>
      {statuses.map((s, idx) => {
        const isSelected = normalizedCurrent === s.key;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1 border ${
              isSelected
                ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <span className="text-[9px] opacity-60">{idx + 1}.</span>
            <span>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
};
