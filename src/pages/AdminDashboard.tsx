import { useState, useEffect, useCallback } from "react";
import { User } from "../App";
import Icon from "@/components/ui/icon";
import { apiGetOrders, apiCreateOrder, apiAssignOrder, apiGetOperators, apiGetMaterialStats } from "@/lib/api";

interface AdminDashboardProps {
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
  assignedTo: string | null;
  assignedName: string | null;
  createdAt: string;
  dueDate: string;
  materialUsed?: number;
  comment?: string;
}

interface Operator {
  id: string;
  name: string;
  position: string;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: string }> = {
  new: { label: "Новая", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: "Circle" },
  in_progress: { label: "В работе", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: "Loader" },
  done: { label: "Выполнена", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: "CheckCircle2" },
  paused: { label: "Приостановлена", color: "text-slate-600", bg: "bg-slate-50 border-slate-200", icon: "PauseCircle" },
};

type Tab = "orders" | "analytics" | "operators";

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [stats, setStats] = useState({ total: 0, new: 0, inProgress: 0, done: 0, totalMaterial: 0, avgPerOrder: 0, topOrders: [] as { id: number; number: string; client: string; materialUsed: number; operatorName: string }[] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [newOrder, setNewOrder] = useState({ client: "", material: "ППУ-35", thickness: "", dimensions: "", quantity: "", dueDate: "", comment: "" });

  const showNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ordersData, operatorsData, statsData] = await Promise.all([
      apiGetOrders(),
      apiGetOperators(),
      apiGetMaterialStats(),
    ]);
    setOrders(ordersData);
    setOperators(operatorsData);
    setStats({
      total: statsData.totalCount,
      new: statsData.newCount,
      inProgress: statsData.activeCount,
      done: statsData.doneCount,
      totalMaterial: statsData.totalMaterial,
      avgPerOrder: statsData.avgPerOrder,
      topOrders: statsData.topOrders,
    });
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAssign = async (orderId: string, operatorId: string) => {
    const op = operators.find(o => o.id === operatorId);
    await apiAssignOrder(orderId, operatorId, user.id);
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, assignedTo: operatorId, assignedName: op?.name ?? null, status: "in_progress" } : o
    ));
    setShowAssignModal(null);
    showNotify(`Заявка назначена оператору ${op?.name}`);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await apiCreateOrder({
      client: newOrder.client,
      material: newOrder.material,
      thickness: Number(newOrder.thickness),
      dimensions: newOrder.dimensions,
      quantity: Number(newOrder.quantity),
      dueDate: newOrder.dueDate || undefined,
      comment: newOrder.comment || undefined,
    }, user.id);
    setShowCreateModal(false);
    setNewOrder({ client: "", material: "ППУ-35", thickness: "", dimensions: "", quantity: "", dueDate: "", comment: "" });
    showNotify(`Заявка ${result.number} создана`);
    loadData();
  };

  const filteredOrders = filterStatus === "all" ? orders : orders.filter(o => o.status === filterStatus);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-golos flex flex-col">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-primary text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in-right text-sm font-medium">
          <Icon name="BellRing" size={16} />
          {notification}
        </div>
      )}

      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <Icon name="Factory" size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-foreground">ФомПоролон</span>
            <span className="ml-2 text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">Администратор</span>
          </div>
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

      {/* Tabs */}
      <div className="bg-card border-b border-border px-6">
        <div className="flex gap-1">
          {([
            { key: "orders", label: "Заявки", icon: "ClipboardList" },
            { key: "analytics", label: "Аналитика", icon: "BarChart3" },
            { key: "operators", label: "Операторы", icon: "Users" },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon name={icon} size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === "orders" && (
          <div className="animate-fade-in">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 stagger-children">
              {[
                { label: "Всего заявок", value: stats.total, icon: "ClipboardList", color: "text-primary" },
                { label: "Новые", value: stats.new, icon: "Circle", color: "text-blue-600" },
                { label: "В работе", value: stats.inProgress, icon: "Loader", color: "text-amber-600" },
                { label: "Выполнено", value: stats.done, icon: "CheckCircle2", color: "text-green-600" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="bg-card border border-border rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
                    <Icon name={icon} size={16} className={color} fallback="Circle" />
                  </div>
                  <div className={`text-3xl font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "Все" },
                  { key: "new", label: "Новые" },
                  { key: "in_progress", label: "В работе" },
                  { key: "done", label: "Выполнены" },
                  { key: "paused", label: "Приостановлены" },
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
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all"
              >
                <Icon name="Plus" size={15} />
                Новая заявка
              </button>
            </div>

            {/* Orders list */}
            <div className="space-y-3">
              {filteredOrders.map(order => {
                const s = STATUS_CONFIG[order.status];
                return (
                  <div key={order.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow animate-fade-in">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="font-mono-custom text-xs font-medium text-muted-foreground">{order.number}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${s.color} ${s.bg}`}>
                            <Icon name={s.icon} size={11} fallback="Circle" />
                            {s.label}
                          </span>
                          {order.assignedName && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Icon name="User" size={11} />
                              {order.assignedName}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">{order.client}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Icon name="Layers" size={13} />{order.material}</span>
                          <span className="flex items-center gap-1.5"><Icon name="Ruler" size={13} />{order.thickness}мм · {order.dimensions}</span>
                          <span className="flex items-center gap-1.5"><Icon name="Hash" size={13} />{order.quantity} шт.</span>
                          <span className="flex items-center gap-1.5"><Icon name="Calendar" size={13} />до {order.dueDate}</span>
                          {order.materialUsed && (
                            <span className="flex items-center gap-1.5 text-amber-600"><Icon name="Package" size={13} />{order.materialUsed} кг израсходовано</span>
                          )}
                        </div>
                      </div>
                      {order.status === "new" && (
                        <button
                          onClick={() => setShowAssignModal(order.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-all flex-shrink-0"
                        >
                          <Icon name="UserCheck" size={14} />
                          Назначить
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredOrders.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Icon name="ClipboardList" size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Нет заявок с выбранным статусом</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold mb-6 text-foreground">Аналитика и отчёты</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                { label: "Израсходовано сырья", value: `${stats.totalMaterial} кг`, icon: "Package", sub: "за текущий период", color: "text-amber-600" },
                { label: "Выполнено заявок", value: stats.done, icon: "CheckCircle2", sub: "успешно закрыто", color: "text-green-600" },
                { label: "Средний расход", value: `${stats.avgPerOrder} кг/заявку`, icon: "TrendingUp", sub: "на одну заявку", color: "text-blue-600" },
              ].map(({ label, value, icon, sub, color }) => (
                <div key={label} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</div>
                      <div className={`text-3xl font-bold ${color}`}>{value}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon name={icon} size={18} className={color} fallback="Circle" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-4">Расход сырья по заявкам</h3>
              <div className="space-y-3">
                {stats.topOrders.map(o => (
                  <div key={o.id} className="flex items-center gap-4">
                    <div className="w-28 text-xs text-muted-foreground font-mono-custom truncate">{o.number}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground truncate">{o.client}</span>
                        <span className="text-sm font-medium text-foreground ml-2">{o.materialUsed} кг</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, (o.materialUsed / Math.max(...stats.topOrders.map(x => x.materialUsed), 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {stats.topOrders.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">Нет данных о расходе сырья</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "operators" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold mb-6 text-foreground">Операторы</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {operators.map(op => {
                const opOrders = orders.filter(o => o.assignedTo === op.id);
                const done = opOrders.filter(o => o.status === "done").length;
                const inProgress = opOrders.filter(o => o.status === "in_progress").length;
                const material = opOrders.reduce((sum, o) => sum + (o.materialUsed ?? 0), 0);
                return (
                  <div key={op.id} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon name="User" size={18} className="text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-sm">{op.name}</div>
                        <div className="text-xs text-muted-foreground">{op.position}</div>
                      </div>
                      <div className={`ml-auto w-2 h-2 rounded-full ${inProgress > 0 ? "bg-green-500 animate-pulse-ring" : "bg-muted-foreground/30"}`} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-muted rounded-lg p-2">
                        <div className="text-lg font-bold text-foreground">{inProgress}</div>
                        <div className="text-xs text-muted-foreground">В работе</div>
                      </div>
                      <div className="bg-muted rounded-lg p-2">
                        <div className="text-lg font-bold text-green-600">{done}</div>
                        <div className="text-xs text-muted-foreground">Готово</div>
                      </div>
                      <div className="bg-muted rounded-lg p-2">
                        <div className="text-lg font-bold text-amber-600">{material}</div>
                        <div className="text-xs text-muted-foreground">кг сырья</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-lg animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-bold text-foreground text-lg">Новая заявка</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Клиент / Организация</label>
                <input required value={newOrder.client} onChange={e => setNewOrder(p => ({ ...p, client: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="ООО «Название»" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Материал</label>
                  <select required value={newOrder.material} onChange={e => setNewOrder(p => ({ ...p, material: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                    {["ППУ-25", "ППУ-30", "ППУ-35", "ППУ-40", "ППУ-45"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Толщина, мм</label>
                  <input required type="number" value={newOrder.thickness} onChange={e => setNewOrder(p => ({ ...p, thickness: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="80" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Размеры (ДxШ)</label>
                  <input required value={newOrder.dimensions} onChange={e => setNewOrder(p => ({ ...p, dimensions: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="2000×1000" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Количество, шт.</label>
                  <input required type="number" value={newOrder.quantity} onChange={e => setNewOrder(p => ({ ...p, quantity: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Срок выполнения</label>
                <input required type="date" value={newOrder.dueDate} onChange={e => setNewOrder(p => ({ ...p, dueDate: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Комментарий</label>
                <textarea value={newOrder.comment} onChange={e => setNewOrder(p => ({ ...p, comment: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" rows={2} placeholder="Дополнительные требования..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-all">Отмена</button>
                <button type="submit" className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all">Создать заявку</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowAssignModal(null)}>
          <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-sm animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-foreground">Назначить оператора</h3>
              <button onClick={() => setShowAssignModal(null)} className="text-muted-foreground hover:text-foreground">
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {operators.map(op => (
                <button
                  key={op.id}
                  onClick={() => handleAssign(showAssignModal, op.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="User" size={16} className="text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-sm">{op.name}</div>
                    <div className="text-xs text-muted-foreground">{op.position}</div>
                  </div>
                  <Icon name="ChevronRight" size={16} className="text-muted-foreground ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}