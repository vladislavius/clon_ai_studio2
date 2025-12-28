import React from 'react';
import { Network, Users, TrendingUp, Settings, GraduationCap } from 'lucide-react';
import { ViewMode } from '../types';

interface MobileBottomNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  isAdmin: boolean;
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-1.5
        px-3 py-2.5 rounded-xl
        transition-all duration-200
        min-h-[56px] min-w-[56px]
        ${active 
          ? 'text-blue-600 bg-blue-50' 
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
        }
      `}
      aria-label={label}
    >
      <div className={active ? 'scale-110' : 'scale-100 transition-transform'}>
        {icon}
      </div>
      <span className={`text-xs font-semibold leading-tight ${active ? 'font-bold' : 'font-medium'}`}>
        {label}
      </span>
    </button>
  );
};

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onViewChange,
  isAdmin
}) => {
  // Показываем только на мобильных устройствах (< 768px)
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-area-bottom z-50 md:hidden shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.1)]">
      <div className="flex justify-around items-center py-2.5 px-2">
        <NavButton
          icon={<Network size={22} />}
          label="Оргсхема"
          active={currentView === 'org_chart'}
          onClick={() => onViewChange('org_chart')}
        />
        {isAdmin && (
          <NavButton
            icon={<Users size={22} />}
            label="Сотрудники"
            active={currentView === 'employees'}
            onClick={() => onViewChange('employees')}
          />
        )}
        <NavButton
          icon={<GraduationCap size={22} />}
          label="Академия"
          active={currentView === 'academy'}
          onClick={() => onViewChange('academy')}
        />
        {isAdmin && (
          <NavButton
            icon={<Settings size={22} />}
            label="Настройки"
            active={currentView === 'settings'}
            onClick={() => onViewChange('settings')}
          />
        )}
      </div>
    </nav>
  );
};










