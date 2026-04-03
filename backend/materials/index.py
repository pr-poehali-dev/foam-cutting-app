"""
Учёт расхода сырья при резке поролона.
GET /  — получить журнал расхода (?order_id= или ?operator_id=)
POST / — зафиксировать расход сырья
GET /stats — статистика расхода по операторам и заявкам
"""
import json
import os
import psycopg2

SCHEMA = "t_p7983100_foam_cutting_app"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    path = event.get("path", "/")

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET" and params.get("stats") == "1":
            # Stats: total material per operator, per order
            cur.execute(f"""
                SELECT
                    u.last_name || ' ' || u.first_name as operator,
                    COUNT(DISTINCT ml.order_id) as orders_count,
                    COALESCE(SUM(ml.amount), 0) as total_amount,
                    ml.unit
                FROM {SCHEMA}.material_logs ml
                JOIN {SCHEMA}.users u ON ml.operator_id = u.id
                GROUP BY u.id, u.last_name, u.first_name, ml.unit
                ORDER BY total_amount DESC
            """)
            rows = cur.fetchall()
            stats = [{"operator": r[0], "orders_count": r[1], "total_amount": float(r[2]), "unit": r[3]} for r in rows]

            cur.execute(f"""
                SELECT o.number, o.client, COALESCE(SUM(ml.amount), 0), ml.unit
                FROM {SCHEMA}.material_logs ml
                JOIN {SCHEMA}.orders o ON ml.order_id = o.id
                GROUP BY o.id, o.number, o.client, ml.unit
                ORDER BY SUM(ml.amount) DESC
            """)
            order_rows = cur.fetchall()
            order_stats = [{"number": r[0], "client": r[1], "total_amount": float(r[2]), "unit": r[3]} for r in order_rows]

            cur.execute(f"SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.material_logs")
            total = float(cur.fetchone()[0])

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "total_material": total,
                "by_operator": stats,
                "by_order": order_stats,
            })}

        if method == "GET":
            order_id = params.get("order_id")
            operator_id = params.get("operator_id")

            query = f"""
                SELECT ml.id, ml.order_id, o.number, ml.operator_id,
                       u.last_name || ' ' || u.first_name, ml.amount, ml.unit, ml.notes, ml.logged_at
                FROM {SCHEMA}.material_logs ml
                JOIN {SCHEMA}.orders o ON ml.order_id = o.id
                JOIN {SCHEMA}.users u ON ml.operator_id = u.id
            """
            conditions = []
            args = []
            if order_id:
                conditions.append("ml.order_id = %s")
                args.append(int(order_id))
            if operator_id:
                conditions.append("ml.operator_id = %s")
                args.append(int(operator_id))

            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            query += " ORDER BY ml.logged_at DESC"

            cur.execute(query, args)
            rows = cur.fetchall()
            logs = [{
                "id": str(r[0]),
                "order_id": str(r[1]),
                "order_number": r[2],
                "operator_id": str(r[3]),
                "operator_name": r[4],
                "amount": float(r[5]),
                "unit": r[6],
                "notes": r[7],
                "logged_at": str(r[8]),
            } for r in rows]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"logs": logs})}

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            required = ["order_id", "operator_id", "amount"]
            for f in required:
                if body.get(f) is None:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": f"Поле {f} обязательно"})}

            cur.execute(
                f"""INSERT INTO {SCHEMA}.material_logs (order_id, operator_id, amount, unit, notes)
                    VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                (body["order_id"], body["operator_id"], body["amount"],
                 body.get("unit", "кг"), body.get("notes"))
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"statusCode": 201, "headers": CORS, "body": json.dumps({"id": str(new_id), "success": True})}

    finally:
        conn.close()

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}