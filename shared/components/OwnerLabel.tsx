import React from 'react';
import { StatOwnerType } from '../types/adminTech';

interface OwnerLabelProps {
  ownerType: StatOwnerType;
  ownerName: string;
  size?: 'sm' | 'md';
}

export const OwnerLabel: React.FC<OwnerLabelProps> = ({ ownerType, ownerName, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  };

  const getTypeLabel = (type: StatOwnerType): string => {
    switch (type) {
      case 'COMPANY':
        return 'КОМПАНИЯ';
      case 'DIVISION':
        return 'ДИВИЗИОН';
      case 'DEPARTMENT':
        return 'ОТДЕЛ';
      case 'EMPLOYEE':
        return 'СОТРУДНИК';
      default:
        return '';
    }
  };

  const getTypeColor = (type: StatOwnerType): string => {
    switch (type) {
      case 'COMPANY':
        return 'bg-amber-100 text-amber-700';
      case 'DIVISION':
        return 'bg-purple-100 text-purple-700';
      case 'DEPARTMENT':
        return 'bg-blue-100 text-blue-700';
      case 'EMPLOYEE':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${sizeClasses[size]}`}>
      <span className={`rounded font-bold uppercase ${getTypeColor(ownerType)}`}>
        {getTypeLabel(ownerType)}
      </span>
      <span className="font-medium text-slate-700">{ownerName}</span>
    </div>
  );
};

