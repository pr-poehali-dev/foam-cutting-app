import func2url from "../backend/func2url.json";

const AUTH_URL = func2url.auth;
const ORDERS_URL = func2url.orders;
const MATERIALS_URL = func2url.materials;
const USERS_URL = func2url.users;

async function get(url: string, params?: Record<string, string>) {
  const u = new URL(url);
  if (params) Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const res = await fetch(u.toString());
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (typeof data === "string") return { ok: res.ok, status: res.status, data: JSON.parse(data) };
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: res.ok, status: res.status, data: {} };
  }
}

async function post(url: string, body: unknown, params?: Record<string, string>) {
  const u = new URL(url);
  if (params) Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const res = await fetch(u.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (typeof data === "string") return { ok: res.ok, status: res.status, data: JSON.parse(data) };
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: res.ok, status: res.status, data: {} };
  }
}

async function put(url: string, body: unknown, params?: Record<string, string>) {
  const u = new URL(url);
  if (params) Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const res = await fetch(u.toString(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (typeof data === "string") return { ok: res.ok, status: res.status, data: JSON.parse(data) };
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: res.ok, status: res.status, data: {} };
  }
}

// Auth
export const authApi = {
  login: (phone: string) => get(AUTH_URL, { phone }),
  register: (data: { last_name: string; first_name: string; middle_name?: string; phone: string; position: string }) =>
    post(AUTH_URL, data),
};

// Orders
export const ordersApi = {
  getAll: (params?: { operator_id?: string; status?: string }) =>
    get(ORDERS_URL, params as Record<string, string>),
  create: (data: {
    client: string; material: string; thickness: number;
    dimensions: string; quantity: number; due_date?: string;
    comment?: string; created_by: string;
  }) => post(ORDERS_URL, data),
  update: (id: string, data: { status?: string; assigned_to?: string | null }) =>
    put(ORDERS_URL, data, { id }),
};

// Materials
export const materialsApi = {
  getLogs: (params?: { order_id?: string; operator_id?: string }) =>
    get(MATERIALS_URL, params as Record<string, string>),
  getStats: () => get(MATERIALS_URL, { stats: "1" }),
  log: (data: { order_id: string; operator_id: string; amount: number; unit?: string; notes?: string }) =>
    post(MATERIALS_URL, data),
};

// Users
export const usersApi = {
  getAll: (role?: string) => get(USERS_URL, role ? { role } : undefined),
};
