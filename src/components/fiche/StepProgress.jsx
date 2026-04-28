import React from 'react';
import { Check, Circle, Loader2 } from 'lucide-react';

const STEPS = [
  { num: 1, name: 'ControleDeGestion', service: 'ADV' },
  { num: 2, name: 'SupplyChain', service: 'ADV' },
  { num: 3, name: 'Gestion du besoin', service: 'ADV' },
  { num: 4, name: 'Industriel', service: 'Site' },
  { num: 5, name: 'Commerce', service: 'ADV + Commerce' },
  { num: 6, name: 'FL', service: '' },
  { num: 7, name: 'Exportable', service: '' },
];

export default function StepProgress({ currentStep, fiche }) {
  const getStepStatus = (stepNum) => {
    // L'étape est validée uniquement si son visa est posé
    switch (stepNum) {
      case 1:
        return fiche.visa_controle_gestion ? 'terminee' : 'non_commencee';
      case 2:
        return fiche.visa_supply_chain ? 'terminee' : 'non_commencee';
      case 3:
        return fiche.visa_gestion_besoin ? 'terminee' : 'non_commencee';
      case 4:
        return fiche.visa_industriel ? 'terminee' : 'non_commencee';
      case 5:
        return fiche.visa_commerce ? 'terminee' : 'non_commencee';
      case 6:
        return fiche.statut_sap === 'Création SAP effectuée' ? 'terminee' : 'non_commencee';
      case 7:
        return fiche.fl_exportee ? 'terminee' : 'non_commencee';
      default:
        return 'non_commencee';
    }
  };

  return (
    <div className="w-full bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {STEPS.map((step, index) => {
          const status = getStepStatus(step.num);
          
          return (
            <React.Fragment key={step.num}>
              <div className="flex flex-col items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                  ${status === 'terminee'
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-100'
                    : 'bg-card text-muted-foreground border-2 border-border hover:border-primary/30'}
                `}>
                  {status === 'terminee' ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.num
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium leading-tight max-w-[80px] ${
                    status === 'terminee' ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {step.name}
                  </p>
                  {step.service && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{step.service}</p>
                  )}
                </div>
              </div>
              
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-500 ${
                  getStepStatus(step.num) === 'terminee'
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    : 'bg-slate-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}