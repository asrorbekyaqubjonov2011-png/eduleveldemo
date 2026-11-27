import { PromoCodesManager } from './PromoCodesManager';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { VIPPlan, VIPTier } from '../../types';
import {
  Save,
  CheckCircle,
  Sparkles,
  CreditCard,
  Plus,
  Trash2,
  Edit3,
  Shield,
  BookOpen,
  PlayCircle,
  Award,
  Crown,
  Check,
  X
} from 'lucide-react';

export const VIPTariffsManager: React.FC = () => {
  const { db, updateVIPPlans } = useApp();
  const [plans, setPlans] = useState<VIPPlan[]>(JSON.parse(JSON.stringify(db.vipPlans || [])));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<VIPPlan>>({
    id: 'super_vip' as VIPTier,
    name: 'Super Diamond VIP',
    priceMonthly: 199000,
    durationDays: 30,
    description: 'Barcha Mock testlar, cheksiz AI insho tahlillari va barcha Cambridge kitoblari ochiq!',
    features: [
      'Barcha 50+ Mock testlar to‘liq ochiq',
      'Cheksiz AI Writing Band 9 tekshiruvi',
      'Virtual Speaking imtihonchisi cheksiz',
      'Cambridge va CEFR barcha PDF kitoblari',
      '2x XP ko‘paytirgich'
    ],
    hasAI: true,
    aiDailyLimit: 100
  });

  const handlePlanChange = (index: number, field: keyof VIPPlan, value: any) => {
    setPlans(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleFeatureChange = (planIndex: number, featureIndex: number, value: string) => {
    setPlans(prev => {
      const copy = [...prev];
      const newFeatures = [...(copy[planIndex].features || [])];
      newFeatures[featureIndex] = value;
      copy[planIndex] = { ...copy[planIndex], features: newFeatures };
      return copy;
    });
  };

  const handleAddFeature = (planIndex: number) => {
    setPlans(prev => {
      const copy = [...prev];
      copy[planIndex] = {
        ...copy[planIndex],
        features: [...(copy[planIndex].features || []), 'Yangi VIP imtiyoz']
      };
      return copy;
    });
  };

  const handleRemoveFeature = (planIndex: number, featureIndex: number) => {
    setPlans(prev => {
      const copy = [...prev];
      const newFeatures = (copy[planIndex].features || []).filter((_, i) => i !== featureIndex);
      copy[planIndex] = { ...copy[planIndex], features: newFeatures };
      return copy;
    });
  };

  const handleDeletePlan = (planId: string, planName: string) => {
    if (confirm(`Haqiqatan ham "${planName}" VIP tarifini platformadan butunlay o‘chirmoqchimisiz?`)) {
      const updated = plans.filter(p => p.id !== planId);
      setPlans(updated);
      updateVIPPlans(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleSave = async () => {
    await updateVIPPlans(plans);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCreateNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.name || !newPlan.id) {
      alert("Iltimos, tarif nomi va ID sini kiriting");
      return;
    }
    const cleanId = newPlan.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const created: VIPPlan = {
      id: cleanId as VIPTier,
      name: newPlan.name,
      priceMonthly: Number(newPlan.priceMonthly) || 99000,
      durationDays: Number(newPlan.durationDays) || 30,
      description: newPlan.description || 'Eksklyuziv Edu Level VIP imtiyozlari',
      features: newPlan.features || ['Barcha darslar ochiq', 'AI Writing yordamchisi'],
      hasAI: Boolean(newPlan.hasAI),
      aiDailyLimit: Number(newPlan.aiDailyLimit) || 50
    };

    const updated = [...plans, created];
    setPlans(updated);
    await updateVIPPlans(updated);
    setIsAddingPlan(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Crown className="w-3.5 h-3.5" />
            <span>👑 VIP Tariflar & Cheklovlar Boshqaruvi</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
            VIP Tariflar, Narxlar va Kirish Ruxsatlarini Boshqarish
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-2xl">
            Har bir VIP tarifni tahrirlash, o‘chirish yoki yangi VIP paket qo‘shish. Oddiy va VIP o‘quvchilar o‘rtasidagi farqni (kitoblar, video darslar, mock imtihonlar ruxsatini) shu yerdan to‘liq boshqarasiz.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsAddingPlan(true)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Yangi VIP Tarif Qo‘shish</span>
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Barchasini Saqlash</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-bold">VIP Tariflar va imtiyozlar darhol butun platformada yangilandi!</span>
        </div>
      )}

      {/* Grid of VIP Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {plans.map((plan, idx) => (
          <div
            key={plan.id}
            className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between relative group hover:border-amber-500/50 transition-all"
          >
            {/* Delete button */}
            <button
              onClick={() => handleDeletePlan(plan.id, plan.name)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              title="Ushbu tarifni butunlay o‘chirish"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-3 pr-8">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black">
                  <Crown className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <input
                    type="text"
                    value={plan.name}
                    onChange={e => handlePlanChange(idx, 'name', e.target.value)}
                    className="font-extrabold text-sm text-stone-900 dark:text-white bg-transparent border-b border-transparent hover:border-stone-300 dark:hover:border-stone-700 w-full"
                  />
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-500 block">
                    ID: {plan.id}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-500 dark:text-stone-400 mb-1 font-bold">
                    Narxi (so‘m / oy):
                  </label>
                  <input
                    type="number"
                    value={plan.priceMonthly}
                    onChange={e => handlePlanChange(idx, 'priceMonthly', parseInt(e.target.value, 10))}
                    className="w-full p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-transparent font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-stone-500 dark:text-stone-400 mb-1 font-bold">
                    Muddat (Kun):
                  </label>
                  <input
                    type="number"
                    value={plan.durationDays}
                    onChange={e => handlePlanChange(idx, 'durationDays', parseInt(e.target.value, 10))}
                    className="w-full p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-transparent font-bold"
                  />
                </div>

                <div>
                  <label className="block text-stone-500 dark:text-stone-400 mb-1 font-bold">
                    Tavsif:
                  </label>
                  <textarea
                    rows={2}
                    value={plan.description}
                    onChange={e => handlePlanChange(idx, 'description', e.target.value)}
                    className="w-full p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-transparent text-xs"
                  />
                </div>

                {/* Features List */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-stone-500 dark:text-stone-400">
                      Imtiyozlar ({plan.features?.length || 0}):
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddFeature(idx)}
                      className="text-[10px] font-bold text-cyan-500 hover:underline cursor-pointer"
                    >
                      + Imtiyoz qo‘shish
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {(plan.features || []).map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        <input
                          type="text"
                          value={feat}
                          onChange={e => handleFeatureChange(idx, fIdx, e.target.value)}
                          className="flex-1 px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-[11px]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx, fIdx)}
                          className="text-stone-400 hover:text-red-500 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Limits */}
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-stone-700 dark:text-stone-300">AI Imtihonchi:</span>
                    <input
                      type="checkbox"
                      checked={plan.hasAI}
                      onChange={e => handlePlanChange(idx, 'hasAI', e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  {plan.hasAI && (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-stone-400">Kunlik AI so‘rov:</span>
                      <input
                        type="number"
                        value={plan.aiDailyLimit || 50}
                        onChange={e => handlePlanChange(idx, 'aiDailyLimit', parseInt(e.target.value, 10))}
                        className="w-20 p-1 rounded-lg border border-stone-200 dark:border-stone-700 text-center font-mono font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
              <span>Status: <strong className="text-emerald-500">Faol</strong></span>
              <span className="font-mono">{plan.durationDays} kun</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal to Add New VIP Plan */}
      {isAddingPlan && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsAddingPlan(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900 dark:text-white">
                  Yangi VIP Tarif Qo‘shish
                </h3>
                <p className="text-xs text-stone-500">
                  Yangi paket narxi, muddati va o‘quvchilarga beriladigan imtiyozlarni belgilang.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateNewPlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Tarif Nomi:
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlan.name}
                    onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                    placeholder="Masalan: Diamond Royal"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Tarif ID (kodi):
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlan.id}
                    onChange={e => setNewPlan({ ...newPlan, id: e.target.value })}
                    placeholder="diamond_royal"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Oylik Narx (so‘m):
                  </label>
                  <input
                    type="number"
                    required
                    value={newPlan.priceMonthly}
                    onChange={e => setNewPlan({ ...newPlan, priceMonthly: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-mono font-bold text-emerald-600 text-sm"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Muddati (Kun):
                  </label>
                  <input
                    type="number"
                    required
                    value={newPlan.durationDays}
                    onChange={e => setNewPlan({ ...newPlan, durationDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 dark:text-stone-300 block mb-1">
                  Qisqa Tavsif:
                </label>
                <textarea
                  rows={2}
                  value={newPlan.description}
                  onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-transparent"
                />
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-900 dark:text-white block">AI Writing/Speaking Imtihonchi:</span>
                  <span className="text-[10px] text-stone-400">Kuniga AI so‘rov limiti</span>
                </div>
                <input
                  type="number"
                  value={newPlan.aiDailyLimit || 50}
                  onChange={e => setNewPlan({ ...newPlan, aiDailyLimit: Number(e.target.value) })}
                  className="w-20 p-1.5 rounded-lg border border-stone-300 dark:border-stone-600 font-mono text-center font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddingPlan(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-black shadow-md hover:opacity-90"
                >
                  Tarifni Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <PromoCodesManager />
    </div>
  );
};
