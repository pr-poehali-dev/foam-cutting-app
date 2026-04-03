import { useState } from "react";
import { User } from "../App";
import Icon from "@/components/ui/icon";
import { apiLogin } from "@/lib/api";

interface LoginPageProps {
  onLogin: (user: User) => void;
  onRegister: () => void;
}

export default function LoginPage({ onLogin, onRegister }: LoginPageProps) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) return "";
    if (digits.length <= 1) return "+7";
    if (digits.length <= 4) return `+7 (${digits.slice(1)}`;
    if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`;
    if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await apiLogin(phone);
      onLogin(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-[45%] sidebar-dark flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, hsl(215 25% 85%) 40px, hsl(215 25% 85%) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, hsl(215 25% 85%) 40px, hsl(215 25% 85%) 41px)"
          }} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded bg-accent flex items-center justify-center">
              <Icon name="Factory" size={20} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-wide">ФомПоролон</span>
          </div>
          <div className="animate-fade-in">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Система учёта<br />производства
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Управление заявками на резку поролона,<br />
              учёт расхода сырья и контроль операторов
            </p>
          </div>
        </div>

        <div className="relative z-10 stagger-children">
          {[
            { icon: "ClipboardList", label: "Управление заявками", desc: "Распределение между операторами" },
            { icon: "Package", label: "Учёт сырья", desc: "Фиксация расхода при резке" },
            { icon: "BarChart3", label: "Аналитика", desc: "Отчёты по выполнению и расходам" },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="flex items-start gap-4 mb-6 animate-fade-in">
              <div className="w-9 h-9 rounded bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name={icon} fallback="Circle" size={16} className="text-accent" />
              </div>
              <div>
                <div className="text-white font-medium text-sm">{label}</div>
                <div className="text-slate-500 text-xs mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-scale-in">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded bg-primary flex items-center justify-center">
              <Icon name="Factory" size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-primary">ФомПоролон</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">Вход в систему</h2>
            <p className="text-muted-foreground mt-2">Введите ваш номер телефона для авторизации</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Номер телефона
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Icon name="Phone" size={16} />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="+7 (___) ___-__-__"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono-custom text-sm"
                  maxLength={18}
                  required
                />
              </div>
              {error && (
                <p className="text-destructive text-sm mt-2 flex items-center gap-1.5 animate-fade-in">
                  <Icon name="AlertCircle" size={14} />
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm tracking-wide hover:bg-primary/90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Проверка...
                </>
              ) : (
                <>
                  Войти
                  <Icon name="ArrowRight" size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3">Нет аккаунта?</p>
            <button
              onClick={onRegister}
              className="w-full py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/50 transition-all flex items-center justify-center gap-2"
            >
              <Icon name="UserPlus" size={15} />
              Зарегистрироваться
            </button>
          </div>

          {/* Demo hint */}
          <div className="mt-6 p-4 rounded-lg bg-accent/5 border border-accent/20">
            <p className="text-xs font-medium text-accent mb-2 flex items-center gap-1.5">
              <Icon name="Info" size={13} />
              Демо-доступ
            </p>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Админ: <span className="font-mono-custom text-foreground">+7 (900) 000-00-01</span></p>
              <p className="text-xs text-muted-foreground">Оператор: <span className="font-mono-custom text-foreground">+7 (900) 000-00-02</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}