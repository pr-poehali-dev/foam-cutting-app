"""
Управление заявками на резку поролона.
GET / — список заявок (фильтр по статусу, оператору)
POST / — создать заявку (только admin)
PUT /{id}/assign — назначить оператора (только admin)
PUT /{id}/status — изменить статус
GET /{id} — детали заявки
"""

import os
import json
import psycopg2
from datetime import date

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p7983100_foam_cutting_app")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    "Content-Type": "application/json",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def json_serial(obj):
    if isinstance(obj, date):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    qs = event.get("queryStringParameters") or {}
    user_id = event.get("headers", {}).get("X-User-Id")

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    # PUT /{id}/assign
    if method == "PUT" and "/assign" in path:
        order_id = path.rstrip("/assign").split("/")[-2] if path.endswith("/assign") else path.split("/")[-2]
        parts = [p for p in path.split("/") if p]
        if len(parts) >= 2:
            order_id = parts[-2]
        return assign_order(order_id, body, user_id)

    # PUT /{id}/status
    if method == "PUT" and "/status" in path:
        parts = [p for p in path.split("/") if p]
        if len(parts) >= 2:
            order_id = parts[-2]
        return update_status(order_id, body, user_id)

    # GET /{id} or PUT /{id}
    parts = [p for p in path.split("/") if p]
    if len(parts) >= 1 and parts[-1].isdigit():
        order_id = parts[-1]
        if method == "GET":
            return get_order(order_id)

    # GET / — list
    if method == "GET":
        return list_orders(qs, user_id)

    # POST / — create
    if method == "POST":
        return create_order(body, user_id)

    return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"error": "Not found"})}


def list_orders(qs: dict, user_id: str) -> dict:
    conn = get_conn()
    cur = conn.cursor()

    conditions = ["1=1"]
    params = []

    status_filter = qs.get("status")
    if status_filter and status_filter != "all":
        conditions.append("o.status = %s")
        params.append(status_filter)

    operator_filter = qs.get("operator_id")
    if operator_filter:
        conditions.append("o.assigned_to = %s")
        params.append(int(operator_filter))

    where = " AND ".join(conditions)

    cur.execute(f"""
        SELECT o.id, o.number, o.client, o.material, o.thickness, o.dimensions,
               o.quantity, o.status, o.assigned_to,
               u.last_name || ' ' || u.first_name as assigned_name,
               o.due_date, o.comment, o.created_at,
               COALESCE(SUM(ml.amount), 0) as material_used
        FROM {SCHEMA}.orders o
        LEFT JOIN {SCHEMA}.users u ON o.assigned_to = u.id
        LEFT JOIN {SCHEMA}.material_logs ml ON ml.order_id = o.id
        WHERE {where}
        GROUP BY o.id, o.number, o.client, o.material, o.thickness, o.dimensions,
                 o.quantity, o.status, o.assigned_to, assigned_name, o.due_date, o.comment, o.created_at
        ORDER BY o.created_at DESC
    """, params)

    rows = cur.fetchall()
    cur.close()
    conn.close()

    orders = []
    for r in rows:
        orders.append({
            "id": str(r[0]),
            "number": r[1],
            "client": r[2],
            "material": r[3],
            "thickness": r[4],
            "dimensions": r[5],
            "quantity": r[6],
            "status": r[7],
            "assignedTo": str(r[8]) if r[8] else None,
            "assignedName": r[9],
            "dueDate": r[10].isoformat() if r[10] else None,
            "comment": r[11],
            "createdAt": r[12].isoformat() if r[12] else None,
            "materialUsed": float(r[13]),
        })

    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"orders": orders})}


def get_order(order_id: str) -> dict:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"""
        SELECT o.id, o.number, o.client, o.material, o.thickness, o.dimensions,
               o.quantity, o.status, o.assigned_to,
               u.last_name || ' ' || u.first_name as assigned_name,
               o.due_date, o.comment, o.created_at,
               COALESCE(SUM(ml.amount), 0) as material_used
        FROM {SCHEMA}.orders o
        LEFT JOIN {SCHEMA}.users u ON o.assigned_to = u.id
        LEFT JOIN {SCHEMA}.material_logs ml ON ml.order_id = o.id
        WHERE o.id = %s
        GROUP BY o.id, o.number, o.client, o.material, o.thickness, o.dimensions,
                 o.quantity, o.status, o.assigned_to, assigned_name, o.due_date, o.comment, o.created_at
    """, (int(order_id),))
    r = cur.fetchone()
    cur.close()
    conn.close()

    if not r:
        return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"error": "Заявка не найдена"})}

    order = {
        "id": str(r[0]), "number": r[1], "client": r[2], "material": r[3],
        "thickness": r[4], "dimensions": r[5], "quantity": r[6], "status": r[7],
        "assignedTo": str(r[8]) if r[8] else None, "assignedName": r[9],
        "dueDate": r[10].isoformat() if r[10] else None, "comment": r[11],
        "createdAt": r[12].isoformat() if r[12] else None, "materialUsed": float(r[13]),
    }
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"order": order})}


def create_order(body: dict, user_id: str) -> dict:
    required = ["client", "material", "thickness", "dimensions", "quantity"]
    for field in required:
        if not body.get(field):
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": f"Поле {field} обязательно"})}

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.orders")
    count = cur.fetchone()[0]
    number = f"ЗК-2024-{count + 1:03d}"

    cur.execute(f"""
        INSERT INTO {SCHEMA}.orders (number, client, material, thickness, dimensions, quantity, due_date, comment, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, number
    """, (
        number, body["client"], body["material"], int(body["thickness"]),
        body["dimensions"], int(body["quantity"]),
        body.get("dueDate") or None, body.get("comment") or None,
        int(user_id) if user_id else None
    ))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return {"statusCode": 201, "headers": CORS_HEADERS, "body": json.dumps({"id": str(row[0]), "number": row[1]})}


def assign_order(order_id: str, body: dict, user_id: str) -> dict:
    operator_id = body.get("operatorId")
    if not operator_id:
        return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "operatorId обязателен"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"""
        UPDATE {SCHEMA}.orders SET assigned_to = %s, status = 'in_progress', updated_at = now()
        WHERE id = %s
        RETURNING id
    """, (int(operator_id), int(order_id)))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not row:
        return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"error": "Заявка не найдена"})}

    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"success": True})}


def update_status(order_id: str, body: dict, user_id: str) -> dict:
    status = body.get("status")
    allowed = ["new", "in_progress", "done", "paused"]
    if status not in allowed:
        return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "Недопустимый статус"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"""
        UPDATE {SCHEMA}.orders SET status = %s, updated_at = now()
        WHERE id = %s
        RETURNING id
    """, (status, int(order_id)))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not row:
        return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"error": "Заявка не найдена"})}

    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"success": True})}
