"""
Учёт расхода сырья при резке поролона.
POST / — зафиксировать расход сырья
GET /?order_id={id} — история расхода по заявке
GET /stats — общая статистика расходов
"""

import os
import json
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p7983100_foam_cutting_app")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
    "Content-Type": "application/json",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    user_id = (event.get("headers") or {}).get("X-User-Id")

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    if method == "GET":
        if qs.get("action") == "stats":
            return get_stats()
        return get_logs(qs)

    if method == "POST":
        return log_material(body, user_id)

    return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"error": "Not found"})}


def log_material(body: dict, user_id: str) -> dict:
    order_id = body.get("orderId")
    amount = body.get("amount")
    unit = body.get("unit", "кг")
    notes = body.get("notes", "")

    if not order_id or not amount:
        return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "orderId и amount обязательны"})}

    conn = get_conn()
    cur = conn.cursor()

    cur.execute(f"SELECT id FROM {SCHEMA}.orders WHERE id = %s", (int(order_id),))
    if not cur.fetchone():
        cur.close()
        conn.close()
        return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"error": "Заявка не найдена"})}

    cur.execute(f"""
        INSERT INTO {SCHEMA}.material_logs (order_id, operator_id, amount, unit, notes)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, logged_at
    """, (int(order_id), int(user_id) if user_id else 1, float(amount), unit, notes or None))

    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return {"statusCode": 201, "headers": CORS_HEADERS, "body": json.dumps({
        "id": row[0],
        "loggedAt": row[1].isoformat(),
        "message": f"Расход {amount} {unit} зафиксирован"
    })}


def get_logs(qs: dict) -> dict:
    order_id = qs.get("order_id")
    conn = get_conn()
    cur = conn.cursor()

    if order_id:
        cur.execute(f"""
            SELECT ml.id, ml.order_id, ml.amount, ml.unit, ml.notes, ml.logged_at,
                   u.last_name || ' ' || u.first_name as operator_name
            FROM {SCHEMA}.material_logs ml
            LEFT JOIN {SCHEMA}.users u ON ml.operator_id = u.id
            WHERE ml.order_id = %s
            ORDER BY ml.logged_at DESC
        """, (int(order_id),))
    else:
        cur.execute(f"""
            SELECT ml.id, ml.order_id, ml.amount, ml.unit, ml.notes, ml.logged_at,
                   u.last_name || ' ' || u.first_name as operator_name
            FROM {SCHEMA}.material_logs ml
            LEFT JOIN {SCHEMA}.users u ON ml.operator_id = u.id
            ORDER BY ml.logged_at DESC
            LIMIT 100
        """)

    rows = cur.fetchall()
    cur.close()
    conn.close()

    logs = [{
        "id": r[0], "orderId": r[1], "amount": float(r[2]),
        "unit": r[3], "notes": r[4],
        "loggedAt": r[5].isoformat() if r[5] else None,
        "operatorName": r[6],
    } for r in rows]

    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"logs": logs})}


def get_stats() -> dict:
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(f"""
        SELECT
            COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'done') as done_count,
            COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'in_progress') as active_count,
            COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'new') as new_count,
            COUNT(DISTINCT o.id) as total_count,
            COALESCE(SUM(ml.amount), 0) as total_material
        FROM {SCHEMA}.orders o
        LEFT JOIN {SCHEMA}.material_logs ml ON ml.order_id = o.id
    """)
    row = cur.fetchone()

    cur.execute(f"""
        SELECT o.id, o.number, o.client, COALESCE(SUM(ml.amount), 0) as used,
               u.last_name || ' ' || u.first_name as operator_name
        FROM {SCHEMA}.orders o
        LEFT JOIN {SCHEMA}.material_logs ml ON ml.order_id = o.id
        LEFT JOIN {SCHEMA}.users u ON o.assigned_to = u.id
        GROUP BY o.id, o.number, o.client, operator_name
        HAVING SUM(ml.amount) > 0
        ORDER BY used DESC
        LIMIT 10
    """)
    top_rows = cur.fetchall()
    cur.close()
    conn.close()

    top_orders = [{"id": r[0], "number": r[1], "client": r[2], "materialUsed": float(r[3]), "operatorName": r[4]} for r in top_rows]

    avg_per_order = round(float(row[4]) / max(row[0], 1), 1)

    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({
        "doneCount": row[0],
        "activeCount": row[1],
        "newCount": row[2],
        "totalCount": row[3],
        "totalMaterial": float(row[4]),
        "avgPerOrder": avg_per_order,
        "topOrders": top_orders,
    })}