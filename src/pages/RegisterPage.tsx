import { useState } from "react";
import Icon from "@/components/ui/icon";

interface RegisterPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

const POSITIONS = [
  "Оператор линии №1",
  "Оператор линии №2",
  "Оператор линии №3",
  "Главный технолог",
  "Менеджер производства",
  "Начальник смены",
  "Кладовщик",
];

export default function RegisterPage({ onBack, onSuccess }: RegisterPageProps) {
  const [form, setForm] = useState({ lastName: "", firstName: "", middleName: "", position: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
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

  const handleChange = (field: string, value: string) => {
    if (field === "phone") {
      setForm(f => ({ ...f, phone: formatPhone(value) }));
    } else {
      setForm(f => ({ ...f, [field]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Icon name="CheckCircle2" size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Заявка отправлена</h2>
          <p className="text-muted-foreground mb-8">
            Ваша заявка на регистрацию передана администратору.<br />
            После подтверждения вы получите доступ к системе.
          </p>
          <button
            onClick={onSuccess}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
          >
            Вернуться к входу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-lg animate-scale-in">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <Icon name="ArrowLeft" size={16} />
          Назад к входу
        </button>

        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <div className="mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center mb-4">
              <Icon name="UserPlus" size={18} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Регистрация</h2>
            <p className="text-muted-foreground text-sm mt-1">Заполните данные для создания аккаунта</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {[
                { field: "lastName", label: "Фамилия", placeholder: "Иванов" },
                { field: "firstName", label: "Имя", placeholder: "Иван" },
                { field: "middleName", label: "Отчество", placeholder: "Иванович" },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
                  <input
                    type="text"
                    value={form[field as keyof typeof form]}
                    onChange={e => handleChange(field, e.target.value)}
                    placeholder={placeholder}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Должность</label>
              <select
                value={form.position}
                onChange={e => handleChange("position", e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
              >
                <option value="">Выберите должность</option>
                {POSITIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Номер телефона</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Icon name="Phone" size={15} />
                </div>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => handleChange("phone", e.target.value)}
                  placeholder="+7 (___) ___-__-__"
                  required
                  maxLength={18}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono-custom text-sm"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Отправка заявки...
                  </>
                ) : (
                  <>
                    Отправить заявку на регистрацию
                    <Icon name="Send" size={15} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
