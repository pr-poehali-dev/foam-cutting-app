"""
Авторизация и регистрация пользователей завода по резке поролона.
POST / + body.action=login — вход по номеру телефона
POST / + body.action=register — заявка на регистрацию
GET / — список операторов (для выбора при назначении)
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

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    # GET — вернуть список операторов
    if method == "GET":
        return get_operators()

    # POST — действие по action
    if method == "POST":
        action = body.get("action", "login")
        if action == "login":
            return login(body)
        if action == "register":
            return register(body)

    return {"statusCode": 404, "headers": CORS_HEADERS, "body": json.dumps({"error": "Not found"})}


def login(body: dict) -> dict:
    phone = (body.get("phone") or "").strip()
    if not phone:
        return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "Номер телефона обязателен"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, last_name, first_name, middle_name, phone, position, role FROM {SCHEMA}.users WHERE phone = %s AND is_active = true",
        (phone,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return {"statusCode": 401, "headers": CORS_HEADERS, "body": json.dumps({"error": "Пользователь не найден или не активен"})}

    user = {
        "id": str(row[0]),
        "name": f"{row[1]} {row[2]}" + (f" {row[3]}" if row[3] else ""),
        "phone": row[4],
        "position": row[5],
        "role": row[6],
    }
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"user": user})}


def register(body: dict) -> dict:
    last_name = (body.get("lastName") or "").strip()
    first_name = (body.get("firstName") or "").strip()
    middle_name = (body.get("middleName") or "").strip()
    position = (body.get("position") or "").strip()
    phone = (body.get("phone") or "").strip()

    if not all([last_name, first_name, position, phone]):
        return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "Заполните все обязательные поля"})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = %s", (phone,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return {"statusCode": 409, "headers": CORS_HEADERS, "body": json.dumps({"error": "Пользователь с таким телефоном уже существует"})}

    cur.execute(
        f"INSERT INTO {SCHEMA}.users (last_name, first_name, middle_name, phone, position, role, is_active) VALUES (%s, %s, %s, %s, %s, 'operator', false) RETURNING id",
        (last_name, first_name, middle_name or None, phone, position)
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return {"statusCode": 201, "headers": CORS_HEADERS, "body": json.dumps({"id": new_id, "message": "Заявка на регистрацию отправлена администратору"})}


def get_operators() -> dict:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, last_name, first_name, position FROM {SCHEMA}.users WHERE role = 'operator' AND is_active = true ORDER BY last_name"
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    operators = [{"id": str(r[0]), "name": f"{r[1]} {r[2]}", "position": r[3]} for r in rows]
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"operators": operators})}
