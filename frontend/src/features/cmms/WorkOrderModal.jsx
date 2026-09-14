import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { X, Wrench, AlertTriangle } from 'lucide-react';

export const WorkOrderModal = ({
  isOpen,
  onClose,
  onSubmit,
  preselectedAsset,
  lang = 'fr'
}) => {
  const [title, setTitle] = useState(
    preselectedAsset
      ? lang === 'fr'
        ? `Inspection Diagnostique : ${preselectedAsset.name}`
        : `Diagnostic Inspection: ${preselectedAsset.name}`
      : ''
  );
  const [description, setDescription] = useState(
    preselectedAsset
      ? lang === 'fr'
        ? `Inspection de maintenance déclenchée pour l'équipement ${preselectedAsset.code || preselectedAsset.id} (${preselectedAsset.name}) au niveau ${preselectedAsset.floor || 'Floor 1'}.`
        : `Initiated maintenance inspection for asset ${preselectedAsset.code || preselectedAsset.id} (${preselectedAsset.name}) on ${preselectedAsset.floor || 'Floor 1'}.`
      : ''
  );
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState(preselectedAsset?.buildingId || '');

  useEffect(() => {
    if (api.getBuildings) {
      api.getBuildings().then(data => {
        if (data && data.length > 0) {
          setBuildings(data);
          if (!preselectedAsset) {
            setBuildingId(data[0].id);
          }
        }
      }).catch(err => console.warn('Could not load buildings:', err));
    }
  }, [preselectedAsset]);

  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('preventive');
  const [technicianName, setTechnicianName] = useState('Alexandre Mercer');

  const [currentWorkOrderCount, setCurrentWorkOrderCount] = useState(0);
  const [userPlan, setUserPlan] = useState('free');

  useEffect(() => {
    if (isOpen) {
      if (api.getWorkOrders) {
        api.getWorkOrders().then(data => {
          if (Array.isArray(data)) {
            setCurrentWorkOrderCount(data.length);
          }
        }).catch(() => {});
      }

      try {
        const saved = localStorage.getItem('beecarbonat_user') || localStorage.getItem('user');
        if (saved) {
          const userObj = JSON.parse(saved);
          const rawPlan = (userObj.plan || '').toLowerCase();
          const role = (userObj.role || '').toUpperCase();
          if (rawPlan === 'enterprise' || rawPlan === 'unlimited' || role === 'SUPERADMIN' || role === 'ADMIN') {
            setUserPlan('enterprise');
          } else if (rawPlan === 'pro') {
            setUserPlan('pro');
          } else {
            setUserPlan('free');
          }
        } else {
          setUserPlan('enterprise'); // Default permissive
        }
      } catch {
        setUserPlan('enterprise');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isLimitReached = (() => {
    if (userPlan === 'free' && currentWorkOrderCount >= 15) return true;
    if (userPlan === 'pro' && currentWorkOrderCount >= 50) return true;
    return false;
  })();

  const limitMax = userPlan === 'free' ? 15 : 50;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || isLimitReached) return;

    const bld = buildings.find(b => b.id === buildingId) || buildings[0] || { id: 'bld-1', name: 'BeeCarbonat Tower HQ' };

    onSubmit({
      id: `wo-${Date.now()}`,
      ticketNumber: `WO-2026-0${Math.floor(850 + Math.random() * 100)}`,
      title,
      description,
      assetId: preselectedAsset?.id,
      assetName: preselectedAsset?.name,
      buildingId: bld?.id || 'bld-1',
      buildingName: bld?.name || 'BeeCarbonat Tower HQ',
      floor: preselectedAsset?.floor || 'Floor 1',
      priority,
      category,
      status: 'open',
      assignedTechnician: {
        name: technicianName,
        avatar: '',
        role: 'Field Maintenance Specialist'
      },
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      slaDeadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 16),
      estimatedHours: 3.5
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {lang === 'fr' ? 'Créer un Ordre de Travail' : 'Dispatch New Work Order'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLimitReached ? (
          <div className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
              <AlertTriangle className="w-10 h-10 animate-pulse" />
            </div>
            <h4 className="text-sm font-mono font-bold uppercase text-slate-900 dark:text-white">
              {lang === 'fr' ? 'Limite de tickets atteinte' : 'Ticket Limit Reached'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-xs leading-relaxed">
              {lang === 'fr' 
                ? `Votre plan actuel (${userPlan.toUpperCase()}) est limité à ${limitMax} tickets. Vous avez atteint ce seuil avec vos ${currentWorkOrderCount} tickets actifs.`
                : `Your current plan (${userPlan.toUpperCase()}) is limited to ${limitMax} tickets. You have reached this limit with your ${currentWorkOrderCount} active tickets.`}
            </p>
            <div className="pt-4 flex w-full gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs rounded-xl font-mono border border-slate-300 dark:border-slate-700 transition-colors"
              >
                {lang === 'fr' ? 'Fermer' : 'Close'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4 flex-1 overflow-y-auto max-h-[70vh] text-xs font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  {lang === 'fr' ? 'Intitulé de l\'Intervention *' : 'Work Order Title *'}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={lang === 'fr' ? 'ex: Fuite CVC niveau 2' : 'e.g. HVAC Leak Floor 2'}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  {lang === 'fr' ? 'Bâtiment' : 'Building Location'}
                </label>
                <select
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                  {buildings.length === 0 && (
                    <option value="bld-1">BeeCarbonat Tower HQ</option>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  {lang === 'fr' ? 'Priorité de l\'Intervention' : 'Urgency Level'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['low', 'medium', 'high'].map((p) => {
                    const labels = {
                      low: { fr: 'Basse', en: 'Low' },
                      medium: { fr: 'Moyenne', en: 'Medium' },
                      high: { fr: 'Haute', en: 'High' }
                    };
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                          priority === p
                            ? 'bg-amber-600 border-amber-500 text-white font-extrabold shadow-sm'
                            : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        {labels[p][lang]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  {lang === 'fr' ? 'Catégorie d\'Activité' : 'Activity Type'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="preventive">{lang === 'fr' ? 'Préventive' : 'Preventative'}</option>
                  <option value="corrective">{lang === 'fr' ? 'Corrective (Dépannage)' : 'Corrective'}</option>
                  <option value="inspection">{lang === 'fr' ? 'Audit Sécurité' : 'Safety Audit'}</option>
                  <option value="emergency">{lang === 'fr' ? 'Urgence' : 'Emergency'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                {lang === 'fr' ? 'Technicien Assigné d\'Office' : 'Assigned Technician'}
              </label>
              <select
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Alexandre Mercer">Alexandre Mercer ({lang === 'fr' ? 'Mobilité / Électromécanique' : 'Mobility'})</option>
                <option value="Elena Rostova">Elena Rostova ({lang === 'fr' ? 'Thermique / CVC' : 'Thermal/HVAC'})</option>
                <option value="Dr. Tariq Al-Mansoor">Dr. Tariq Al-Mansoor ({lang === 'fr' ? 'Énergie / Haute Tension' : 'Power'})</option>
                <option value="Carlos Mendez">Carlos Mendez ({lang === 'fr' ? 'Intervention Rapide' : 'Rapid Response'})</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                {lang === 'fr' ? 'Description détaillée & Symptômes' : 'Detailed Description & Symptoms'}
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={lang === 'fr' ? 'Décrivez les anomalies observées, les pièces requises ou consignes de sécurité...' : 'Describe anomaly symptoms, parts required, or safety precautions...'}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
              >
                {lang === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/40 transition-all"
              >
                {lang === 'fr' ? 'Créer & Assigner l\'Ordre' : 'Create & Dispatch Order'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default WorkOrderModal;
