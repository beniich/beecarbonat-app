import React, { useState, useRef } from 'react';
import { WorkOrdersManager } from '../features/cmms/WorkOrdersManager';
import { WorkOrderModal } from '../features/cmms/WorkOrderModal';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

export default function WorkOrders() {
  const { lang = 'fr' } = useLanguage ? useLanguage() : { lang: 'fr' };
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const managerKeyRef = useRef(0);

  const handleCreateSubmit = async (newOrder) => {
    try {
      await api.createWorkOrder(newOrder);
      toast.success(
        lang === 'fr' 
          ? `Ordre de travail ${newOrder.ticketNumber || newOrder.id} créé avec succès !`
          : `Work order ${newOrder.ticketNumber || newOrder.id} created successfully!`
      );
      // Trigger manager refresh
      managerKeyRef.current += 1;
    } catch (err) {
      console.error('Failed to create work order:', err);
      toast.error(lang === 'fr' ? 'Erreur lors de la création' : 'Error creating work order');
    }
  };

  return (
    <div className="p-3 sm:p-6 min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-[1700px] mx-auto space-y-4">
        <WorkOrdersManager
          key={managerKeyRef.current}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          lang={lang}
        />

        <WorkOrderModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateSubmit}
          lang={lang}
        />
      </div>
    </div>
  );
}
