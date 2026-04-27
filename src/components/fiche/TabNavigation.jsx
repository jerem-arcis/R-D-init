import React from 'react';
import { Lock } from 'lucide-react';

const TABS = [
  { id: 'controle_gestion', label: 'ControleDeGestion', step: 1 },
  { id: 'supply_chain', label: 'SupplyChain', step: 2 },
  { id: 'gestion_besoin', label: 'Gestion du besoin', step: 3 },
  { id: 'industriel', label: 'Industriel', step: 4 },
  { id: 'commerce', label: 'Commerce', step: 5 },
  { id: 'fl', label: 'FL', step: 6 },
  { id: 'imprimable', label: 'Exportable', step: 7 },
];

export default function TabNavigation({ activeTab, setActiveTab, currentStep }) {
  return (
    <div className="bg-white border-b-2 border-[#5B3A8E]">
      <div className="max-w-6xl mx-auto px-6">
        <nav className="flex space-x-1 overflow-x-auto">
          {TABS.map((tab) => {
            const isAccessible = true;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-b-4 transition-all duration-200
                  flex items-center gap-2
                  ${isActive 
                    ? 'border-[#5B3A8E] text-[#5B3A8E] bg-[#F5F1E8]/50' 
                    : 'border-transparent text-gray-600 hover:text-[#5B3A8E] hover:border-gray-300'}
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}