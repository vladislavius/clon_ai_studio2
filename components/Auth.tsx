import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, ArrowRight, Loader2, ShieldCheck, WifiOff, AlertCircle } from 'lucide-react';
import { useRateLimit, MAX_ATTEMPTS } from '../hooks/useRateLimit';

interface AuthProps {
  onBypass: () => void;
}

export default function Auth({ onBypass }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  
  // Rate limiting для защиты от брутфорса
  const { checkRateLimit, recordAttempt, getDelay, getRemainingLockoutTime, state: rateLimitState } = useRateLimit();

  // Показываем оставшееся время блокировки
  useEffect(() => {
    if (rateLimitState.locked && rateLimitState.lockoutUntil) {
      const interval = setInterval(() => {
        const remaining = getRemainingLockoutTime();
        if (remaining > 0) {
          const minutes = Math.ceil(remaining / 60000);
          setMessage({
            type: 'error',
            text: `Слишком много неудачных попыток. Попробуйте через ${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'}.`
          });
        } else {
          clearInterval(interval);
          setMessage(null);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [rateLimitState.locked, rateLimitState.lockoutUntil, getRemainingLockoutTime]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Проверяем rate limit перед попыткой
    try {
      checkRateLimit();
    } catch (rateLimitError) {
      const errorMessage = rateLimitError instanceof Error ? rateLimitError.message : 'Слишком много попыток';
      setMessage({ type: 'error', text: errorMessage });
      setLoading(false);
      return;
    }

    if (!supabase) {
        setMessage({ type: 'error', text: 'Ошибка подключения к базе данных.' });
        setLoading(false);
        return;
    }

    // Добавляем задержку перед запросом (экспоненциальная задержка)
    const delay = getDelay();
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          recordAttempt(false); // Неудачная попытка
          throw error;
        }
        recordAttempt(true); // Успешная попытка
        // Успешный вход перехватывается в App.tsx через onAuthStateChange
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) {
          recordAttempt(false); // Неудачная попытка
          throw error;
        }
        recordAttempt(true); // Успешная попытка
        setMessage({ type: 'success', text: 'Ссылка для сброса пароля отправлена на ваш Email.' });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      const isNetworkError = errorMessage === 'Failed to fetch' || errorMessage.includes('SSL');
      
      if (isNetworkError) {
           setMessage({ type: 'error', text: 'Нет соединения с сервером.' });
      } else if (errorMessage.includes('Invalid login credentials')) {
           setMessage({ type: 'error', text: 'Неверный Email или пароль.' });
      } else {
           setMessage({ type: 'error', text: errorMessage || 'Ошибка входа' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-800 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-slate-700 opacity-20 transform -skew-y-6 scale-150 origin-top-left"></div>
            <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-white/10">
                    <ShieldCheck className="text-white" size={32} />
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">HR System Pro</h1>
                <p className="text-slate-300 text-sm">Корпоративный доступ</p>
            </div>
        </div>

        {/* Body */}
        <div className="p-8">
            <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-slate-700">
                    {mode === 'login' && 'Вход в систему'}
                    {mode === 'forgot' && 'Восстановление доступа'}
                </h2>
                <p className="text-sm text-slate-400">
                    {mode === 'login' && 'Введите свои учетные данные'}
                    {mode === 'forgot' && 'Введите email для сброса пароля'}
                </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
                {message && (
                    <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.type === 'error' && rateLimitState.locked ? (
                            <AlertCircle className="flex-shrink-0 mt-0.5" size={16} />
                        ) : (
                            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                        )}
                        <span className="flex-1 break-words">{message.text}</span>
                    </div>
                )}

                {/* Индикатор оставшихся попыток */}
                {mode === 'login' && rateLimitState.attempts > 0 && !rateLimitState.locked && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={14} />
                            <span>Осталось попыток: {MAX_ATTEMPTS - rateLimitState.attempts} из {MAX_ATTEMPTS}</span>
                        </div>
                    </div>
                )}

                {/* Кнопка оффлайн режима появляется ТОЛЬКО при ошибке сети */}
                {message && message.text.includes('Нет соединения') && (
                    <button 
                        type="button"
                        onClick={onBypass}
                        className="w-full py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all animate-in fade-in slide-in-from-top-2 shadow-md shadow-slate-200"
                    >
                        <WifiOff size={16} />
                        Войти в оффлайн-режиме
                    </button>
                )}

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="email" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-800"
                            placeholder="employee@company.com"
                        />
                    </div>
                </div>

                {mode !== 'forgot' && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Пароль</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="password" 
                                required 
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-slate-800"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
                >
                    {loading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            {mode === 'login' && <>Войти <ArrowRight size={18} /></>}
                            {mode === 'forgot' && <>Отправить ссылку <ArrowRight size={18} /></>}
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                {mode === 'login' ? (
                    <button 
                        type="button"
                        onClick={() => { setMode('forgot'); setMessage(null); }}
                        className="text-sm text-slate-400 hover:text-blue-600 transition-colors font-medium"
                    >
                        Забыли пароль?
                    </button>
                ) : (
                    <button 
                        type="button"
                        onClick={() => { setMode('login'); setMessage(null); }}
                        className="text-sm text-slate-400 hover:text-blue-600 transition-colors font-medium"
                    >
                        Вернуться ко входу
                    </button>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">© 2024 HR System Pro.</p>
        </div>
      </div>
    </div>
  );
}
