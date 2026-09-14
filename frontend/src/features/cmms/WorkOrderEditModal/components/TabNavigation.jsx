import React from 'react';

export const TabNavigation = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 gap-2 overflow-x-auto scrollbar-none shrink-0">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`py-3 px-3.5 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              isActive 
                ? 'border-amber-500 text-amber-500 dark:text-amber-400 bg-amber-500/5' 
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
