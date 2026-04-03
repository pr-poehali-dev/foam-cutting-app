import func2url from "../../backend/func2url.json";

const AUTH_URL = func2url.auth;
const ORDERS_URL = func2url.orders;
const MATERIALS_URL = func2url.materials;

function headers(userId?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (userId) h["X-User-Id"] = userId;
  return h;
}

// ── AUTH ──────────────────────────────────────────

export async function apiLogin(phone: string) {
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ action: "login", phone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка входа");
  return data.user;
}

export async function apiRegister(form: {
  lastName: string;
  firstName: string;
  middleName: string;
  position: string;
  phone: string;
}) {
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ action: "register", ...form }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка регистрации");
  return data;
}

export async function apiGetOperators() {
  const res = await fetch(AUTH_URL, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка загрузки операторов");
  return data.operators as { id: string; name: string; position: string }[];
}

// ── ORDERS ────────────────────────────────────────

export async function apiGetOrders(params?: { status?: string; operator_id?: string }) {
  const qs = new URLSearchParams();
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  if (params?.operator_id) qs.set("operator_id", params.operator_id);
  const url = qs.toString() ? `${ORDERS_URL}?${qs}` : ORDERS_URL;
  const res = await fetch(url, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка загрузки заявок");
  return data.orders;
}

export async function apiCreateOrder(
  order: {
    client: string;
    material: string;
    thickness: number;
    dimensions: string;
    quantity: number;
    dueDate?: string;
    comment?: string;
  },
  userId: string
) {
  const res = await fetch(ORDERS_URL, {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify({ action: "create", ...order }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка создания заявки");
  return data;
}

export async function apiAssignOrder(orderId: string, operatorId: string, userId: string) {
  const res = await fetch(ORDERS_URL, {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify({ action: "assign", orderId, operatorId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка назначения");
  return data;
}

export async function apiUpdateOrderStatus(orderId: string, status: string, userId: string) {
  const res = await fetch(ORDERS_URL, {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify({ action: "update_status", orderId, status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка обновления статуса");
  return data;
}

// ── MATERIALS ─────────────────────────────────────

export async function apiLogMaterial(
  payload: { orderId: string; amount: number; unit: string; notes?: string },
  userId: string
) {
  const res = await fetch(MATERIALS_URL, {
    method: "POST",
    headers: headers(userId),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка фиксации расхода");
  return data;
}

export async function apiGetMaterialStats() {
  const res = await fetch(`${MATERIALS_URL}?action=stats`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка загрузки статистики");
  return data;
}

export async function apiGetMaterialLogs(orderId?: string) {
  const url = orderId ? `${MATERIALS_URL}?order_id=${orderId}` : MATERIALS_URL;
  const res = await fetch(url, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка загрузки логов");
  return data.logs;
}
