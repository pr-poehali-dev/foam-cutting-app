"""
Список пользователей (операторов) для панели администратора.
GET / — список всех пользователей (с фильтром ?role=operator)
"""
import json
import os
import psycopg2

SCHEMA = "t_p7983100_foam_cutting_app"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    params = event.get("queryStringParameters") or {}
    role = params.get("role")

    conn = get_conn()
    cur = conn.cursor()

    query = f"""
        SELECT u.id, u.last_name, u.first_name, u.middle_name, u.phone, u.position, u.role,
               COUNT(o.id) FILTER (WHERE o.status = 'in_progress') as active_orders,
               COUNT(o.id) FILTER (WHERE o.status = 'done') as done_orders,
               COALESCE(SUM(ml.amount), 0) as total_material
        FROM {SCHEMA}.users u
        LEFT JOIN {SCHEMA}.orders o ON o.assigned_to = u.id
        LEFT JOIN {SCHEMA}.material_logs ml ON ml.operator_id = u.id
    """
    args = []
    if role:
        query += " WHERE u.role = %s"
        args.append(role)
    query += " GROUP BY u.id ORDER BY u.role, u.last_name"

    cur.execute(query, args)
    rows = cur.fetchall()
    conn.close()

    users = [{
        "id": str(r[0]),
        "name": f"{r[1]} {r[2]} {r[3] or ''}".strip(),
        "phone": r[4],
        "position": r[5],
        "role": r[6],
        "active_orders": r[7],
        "done_orders": r[8],
        "total_material": float(r[9]),
    } for r in rows]

    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"users": users})}
