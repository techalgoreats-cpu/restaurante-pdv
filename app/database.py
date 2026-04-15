"""
Módulo de acesso ao banco de dados SQLite.
Gerencia conexão, inicialização e queries.
"""
import sqlite3
import os

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database')
DB_PATH = os.path.join(DB_DIR, 'restaurante.db')
SCHEMA_PATH = os.path.join(DB_DIR, 'schema.sql')


def get_db():
    """Retorna conexão com o banco SQLite."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Inicializa o banco de dados com o schema."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = get_db()
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        conn.executescript(f.read())
    conn.close()


def query_db(query, args=(), one=False):
    """Executa query SELECT e retorna resultados como dicts."""
    conn = get_db()
    cur = conn.execute(query, args)
    rows = [dict(row) for row in cur.fetchall()]
    conn.close()
    if one:
        return rows[0] if rows else None
    return rows


def execute_db(query, args=()):
    """Executa query INSERT/UPDATE/DELETE e retorna lastrowid."""
    conn = get_db()
    cur = conn.execute(query, args)
    conn.commit()
    lastrowid = cur.lastrowid
    conn.close()
    return lastrowid


def execute_many_db(query, args_list):
    """Executa múltiplas queries."""
    conn = get_db()
    conn.executemany(query, args_list)
    conn.commit()
    conn.close()


def proximo_numero_pedido():
    """Retorna o próximo número de pedido do dia."""
    from datetime import date
    hoje = date.today().isoformat()
    result = query_db(
        "SELECT COALESCE(MAX(numero), 0) + 1 as proximo FROM pedidos WHERE date(data_hora) = ?",
        [hoje],
        one=True
    )
    return result['proximo'] if result else 1
