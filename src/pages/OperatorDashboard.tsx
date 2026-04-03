import { useState } from "react";
import { User } from "../App";
import Icon from "@/components/ui/icon";

interface OperatorDashboardProps {
  user: User;
  onLogout: () => void;
}

type OrderStatus = "new" | "in_progress" | "done" | "paused";

interface Order {
  id: string;
  number: string;
  client: string;
  material: string;
  thickness: number;
  dimensions: string;
  quantity: number;
  status: OrderStatus;
  dueDate: string;
  materialUsed?: number;
  comment?: string;
  isNew?: boolean;
}

const INITIAL_ORDERS: Order[] = [
  { id: "1", number: "ЗК-2024-001", client: "ООО «МебельТорг»", material: "ППУ-35", thickness: 80, dimensions: "2000×1000", quantity: 50, status: "in_progress", dueDate: "2024-04-05", materialUsed: 120, isNew: false },
  { id: "6", number: "ЗК-2024-006", client: "ЗАО «СофтМебель»", material: "ППУ-30", thickness: 60, dimensions: "1800×800", quantity: 20, status: "new", dueDate: "2024-04-09", isNew: true },
];

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: string }> = {
  new: { label: "Новая", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: "Circle" },
  in_progress: { label: "В работе", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: "Loader" },
  done: { label: "Выполнена", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: "CheckCircle2" },
  paused: { label: "Приостановлена", color: "text-slate-600", bg: "bg-slate-50 border-slate-200", icon: "PauseCircle" },
};

type ActiveView = "list" | "material_entry";

export default function OperatorDashboard({ user, onLogout }: OperatorDashboardProps) {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [activeView, setActiveView] = useState<ActiveView>("list");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [materialForm, setMaterialForm] = useState({ amount: "", unit: "кг", notes: "" });
  const [notification, setNotification] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const showNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleStartWork = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "in_progress", isNew: false } : o));
    showNotify("Заявка принята в работу");
  };

  const handleOpenMaterial = (order: Order) => {
    setSelectedOrder(order);
    setMaterialForm({ amount: String(order.materialUsed ?? ""), unit: "кг", notes: "" });
    setActiveView("material_entry");
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const amount = Number(materialForm.amount);
    setOrders(prev => prev.map(o =>
      o.id === selectedOrder.id ? { ...o, materialUsed: (o.materialUsed ?? 0) + amount } : o
    ));
    setActiveView("list");
    setSelectedOrder(null);
    showNotify(`Расход ${amount} ${materialForm.unit} зафиксирован`);
  };

  const handleFinish = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "done" } : o));
    showNotify("Заявка отмечена как выполненная");
  };

  const filteredOrders = filterStatus === "all" ? orders : orders.filter(o => o.status === filterStatus);

  const stats = {
    active: orders.filter(o => o.status === "in_progress").length,
    done: orders.filter(o => o.status === "done").length,
    newCount: orders.filter(o => o.isNew).length,
    totalMaterial: orders.reduce((sum, o) => sum + (o.materialUsed ?? 0), 0),
  };

  return (
    <div className="min-h-screen bg-background font-golos flex flex-col">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-primary text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in-right text-sm font-medium">
          <Icon name="BellRing" size={16} />
          {notification}
        </div>
      )}

      {/* New order notification banner */}
      {stats.newCount > 0 && activeView === "list" && (
        <div className="bg-blue-600 text-white px-6 py-2.5 flex items-center justify-center gap-2 text-sm font-medium animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          У вас {stats.newCount} новая заявка — примите в работу
        </div>
      )}

      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {activeView === "material_entry" ? (
            <button onClick={() => setActiveView("list")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Icon name="ArrowLeft" size={16} />
              Назад
            </button>
          ) : (
            <>
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
                <Icon name="Factory" size={16} className="text-white" />
              </div>
              <div>
                <span className="font-bold text-foreground">ФомПоролон</span>
                <span className="ml-2 text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">Оператор</span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-foreground">{user.name}</div>
            <div className="text-xs text-muted-foreground">{user.position}</div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
            <Icon name="LogOut" size={15} />
            Выйти
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {activeView === "list" && (
          <div className="animate-fade-in">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 stagger-children">
              {[
                { label: "В работе", value: stats.active, icon: "Loader", color: "text-amber-600" },
                { label: "Выполнено", value: stats.done, icon: "CheckCircle2", color: "text-green-600" },
                { label: "Новые", value: stats.newCount, icon: "BellRing", color: "text-blue-600" },
                { label: "Сырьё, кг", value: stats.totalMaterial, icon: "Package", color: "text-primary" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="bg-card border border-border rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
                    <Icon name={icon} size={15} className={color} fallback="Circle" />
                  </div>
                  <div className={`text-3xl font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: "all", label: "Все заявки" },
                { key: "new", label: "Новые" },
                { key: "in_progress", label: "В работе" },
                { key: "done", label: "Выполнены" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === key ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredOrders.map(order => {
                const s = STATUS_CONFIG[order.status];
                return (
                  <div key={order.id} className={`bg-card border rounded-xl p-5 transition-shadow animate-fade-in ${order.isNew ? "border-blue-300 shadow-blue-100 shadow-md" : "border-border hover:shadow-md"}`}>
                    {order.isNew && (
                      <div className="flex items-center gap-1.5 text-blue-600 text-xs font-semibold mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        Новая заявка от администратора
                      </div>
                    )}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="font-mono-custom text-xs font-medium text-muted-foreground">{order.number}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${s.color} ${s.bg}`}>
                            <Icon name={s.icon} size={11} fallback="Circle" />
                            {s.label}
                          </span>
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">{order.client}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5"><Icon name="Layers" size={13} />{order.material}</div>
                          <div className="flex items-center gap-1.5"><Icon name="Ruler" size={13} />{order.thickness}мм</div>
                          <div className="flex items-center gap-1.5"><Icon name="Maximize2" size={13} />{order.dimensions}</div>
                          <div className="flex items-center gap-1.5"><Icon name="Hash" size={13} />{order.quantity} шт.</div>
                        </div>
                        {order.materialUsed !== undefined && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                              <Icon name="Package" size={14} />
                              Израсходовано: {order.materialUsed} кг
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {order.status === "new" && (
                          <button
                            onClick={() => handleStartWork(order.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all"
                          >
                            <Icon name="Play" size={14} />
                            Принять в работу
                          </button>
                        )}
                        {order.status === "in_progress" && (
                          <>
                            <button
                              onClick={() => handleOpenMaterial(order)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-all"
                            >
                              <Icon name="Package" size={14} />
                              Фиксировать сырьё
                            </button>
                            <button
                              onClick={() => handleFinish(order.id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-all"
                            >
                              <Icon name="CheckCheck" size={14} />
                              Завершить
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredOrders.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Icon name="ClipboardList" size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Нет заявок</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === "material_entry" && selectedOrder && (
          <div className="animate-scale-in max-w-lg mx-auto">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="bg-amber-50 border-b border-amber-200 p-5">
                <div className="flex items-center gap-2 text-amber-700 font-semibold mb-1">
                  <Icon name="Package" size={18} />
                  Фиксация расхода сырья
                </div>
                <div className="text-sm text-amber-600">{selectedOrder.number} — {selectedOrder.client}</div>
              </div>

              <div className="p-5">
                {/* Order details */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted rounded-lg mb-6 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Материал</span>
                    <div className="font-medium">{selectedOrder.material}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Толщина</span>
                    <div className="font-medium">{selectedOrder.thickness} мм</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Размеры</span>
                    <div className="font-medium">{selectedOrder.dimensions}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Количество</span>
                    <div className="font-medium">{selectedOrder.quantity} шт.</div>
                  </div>
                  {selectedOrder.materialUsed !== undefined && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs">Уже зафиксировано</span>
                      <div className="font-semibold text-amber-600">{selectedOrder.materialUsed} кг</div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveMaterial} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Добавить расход сырья</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        required
                        value={materialForm.amount}
                        onChange={e => setMaterialForm(p => ({ ...p, amount: e.target.value }))}
                        className="flex-1 px-3.5 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-lg font-semibold"
                        placeholder="0.0"
                      />
                      <select
                        value={materialForm.unit}
                        onChange={e => setMaterialForm(p => ({ ...p, unit: e.target.value }))}
                        className="px-3 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm font-medium"
                      >
                        <option>кг</option>
                        <option>м³</option>
                        <option>листов</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Примечание (необязательно)</label>
                    <textarea
                      value={materialForm.notes}
                      onChange={e => setMaterialForm(p => ({ ...p, notes: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                      rows={2}
                      placeholder="Обрезки, потери, особенности..."
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveView("list")}
                      className="flex-1 py-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-all"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Icon name="Save" size={16} />
                      Зафиксировать
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
