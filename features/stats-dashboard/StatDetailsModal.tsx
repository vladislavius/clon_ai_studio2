import React, { useState, useEffect } from 'react';
import { X, Save, FileText, TrendingUp } from 'lucide-react';
import { Stat, StatCondition } from '../../shared/types/adminTech';
import {
  getStatById,
  getSuggestedConditionForStat,
  updateStatPlan,
  getStatHistory,
} from '../api/mockAdminTechApi';
import { TrendBadge } from '../../shared/components/TrendBadge';
import { OwnerLabel } from '../../shared/components/OwnerLabel';
import {
  getConditionColor,
  getConditionLabel,
} from '../../shared/utils/statCalculations';
import { StatMiniChart } from '../../shared/components/StatMiniChart';

interface StatDetailsModalProps {
  statId: string;
  onClose: () => void;
  onCreateZRS?: (statId: string, conditionLevel: string) => void;
  onCreateProgram?: (statId: string, conditionLevel: string) => void;
}

export const StatDetailsModal: React.FC<StatDetailsModalProps> = ({
  statId,
  onClose,
  onCreateZRS,
  onCreateProgram,
}) => {
  const [stat, setStat] = useState<Stat | null>(null);
  const [condition, setCondition] = useState<StatCondition | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [newPlan, setNewPlan] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [statData, conditionData, historyData] = await Promise.all([
          getStatById(statId),
          getSuggestedConditionForStat(statId),
          getStatHistory(statId),
        ]);

        if (statData) {
          setStat(statData);
          setNewPlan(statData.plan.toString());
          setHistory(statData.history || historyData.map(h => h.value));
        }
        setCondition(conditionData);
      } catch (error) {
        console.error('Error loading stat details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [statId]);

  const handleSavePlan = async () => {
    if (!stat || !newPlan) return;

    const planValue = parseFloat(newPlan);
    if (isNaN(planValue) || planValue < 0) {
      alert('Введите корректное значение плана');
      return;
    }

    setSaving(true);
    try {
      const updatedStat = await updateStatPlan(statId, planValue);
      setStat(updatedStat);
      alert('План успешно обновлен');
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('Ошибка обновления плана');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !stat) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8">
          <div className="text-center text-slate-600">Загрузка...</div>
        </div>
      </div>
    );
  }

  const conditionColor = condition ? getConditionColor(condition.level) : '#6b7280';
  const conditionLabel = condition ? getConditionLabel(condition.level) : 'Неизвестно';

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{stat.name}</h2>
              <OwnerLabel
                ownerType={stat.ownerType}
                ownerName={`${stat.ownerType} ${stat.ownerId}`}
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-xs text-slate-500 mb-1">План</div>
              <div className="text-xl font-bold text-slate-800">
                {stat.plan.toLocaleString()} {stat.unit}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-xs text-slate-500 mb-1">Факт</div>
              <div className="text-xl font-bold text-slate-800">
                {stat.fact.toLocaleString()} {stat.unit}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-xs text-slate-500 mb-1">Изменение</div>
              <div
                className={`text-xl font-bold ${
                  stat.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {stat.changePercent >= 0 ? '+' : ''}
                {stat.changePercent.toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-xs text-slate-500 mb-1">Тренд</div>
              <TrendBadge trend={stat.trend} changePercent={stat.changePercent} />
            </div>
          </div>

          {/* Chart */}
          {history.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-6 mb-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                История значений
              </h3>
              <StatMiniChart data={history} width={600} height={120} />
            </div>
          )}

          {/* Condition */}
          {condition && (
            <div
              className="rounded-xl p-6 mb-6 border-2"
              style={{
                backgroundColor: `${conditionColor}15`,
                borderColor: conditionColor,
              }}
            >
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2">
                Рекомендуемое условие
              </h3>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="px-3 py-1 rounded-full font-bold text-white text-sm"
                  style={{ backgroundColor: conditionColor }}
                >
                  {conditionLabel}
                </span>
                <span className="text-slate-700">{condition.reason}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => onCreateZRS?.(statId, condition.level)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FileText size={16} />
                  Создать ЗРС
                </button>
                <button
                  onClick={() => onCreateProgram?.(statId, condition.level)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <TrendingUp size={16} />
                  Создать программу
                </button>
              </div>
            </div>
          )}

          {/* Edit Plan */}
          <div className="bg-slate-50 rounded-xl p-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
              Редактирование плана
            </h3>
            <div className="flex gap-3">
              <input
                type="number"
                value={newPlan}
                onChange={e => setNewPlan(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Введите новый план"
              />
              <button
                onClick={handleSavePlan}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Сохранение...' : 'Сохранить план'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

