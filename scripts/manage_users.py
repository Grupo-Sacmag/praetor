#!/usr/bin/env python3
"""
manage_users.py - Gestor de usuarios / administradores para Praetor / Actualitodo
Compatible con MongoDB, bcrypt (12 rondas) y autenticación JWT de la aplicación web.

Requisitos:
    pip install pymongo bcrypt

Uso interactivo:
    python manage_users.py

Uso directo por argumentos:
    python manage_users.py add <usuario> <contraseña> [--uri <mongo_uri>] [--db <nombre_db>]
    python manage_users.py list [--uri <mongo_uri>] [--db <nombre_db>]
    python manage_users.py delete <usuario> [--uri <mongo_uri>] [--db <nombre_db>]
"""

import sys
import os
import argparse
import getpass
from datetime import datetime

# Intentar cargar variables desde .env si existe
def load_env_file():
    env_vars = {}
    base_dir = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else os.getcwd()
    candidates = [
        ".env",
        "../.env",
        os.path.join(base_dir, ".env"),
        os.path.join(base_dir, "..", ".env"),
    ]
    for candidate in candidates:
        if os.path.isfile(candidate):
            with open(candidate, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        env_vars[k.strip()] = v.strip().strip('"').strip("'")
            break
    return env_vars

ENV_VARS = load_env_file()

def check_dependencies():
    missing = []
    try:
        import pymongo
    except ImportError:
        missing.append("pymongo")
    try:
        import bcrypt
    except ImportError:
        missing.append("bcrypt")

    if missing:
        print("\n[!] Faltan dependencias de Python necesarias para ejecutar este script.")
        print("    Instálalas ejecutando:")
        print(f"    pip install {' '.join(missing)}\n")
        sys.exit(1)

def get_db_connection(mongo_uri=None, db_name=None, mongo_user=None, mongo_pass=None, auth_source=None):
    import pymongo

    # Prioridad: argumento CLI -> variable de entorno real -> archivo .env -> valor por defecto del VPS
    default_uri = ENV_VARS.get("MONGO_URI", "mongodb://213.218.240.167:27018")
    uri = mongo_uri or os.getenv("MONGO_URI") or default_uri

    # Base de datos: preferir MONGO_DB del .env, o 'actualizaciones', o 'envarchdb'
    default_db = ENV_VARS.get("MONGO_DB", "actualizaciones")
    database = db_name or os.getenv("MONGO_DB") or default_db

    admins_col = ENV_VARS.get("ADMINS_COLLECTION", "admins")

    # Si se pasaron credenciales explícitas o se encuentran en el entorno
    user = mongo_user or os.getenv("MONGO_USER") or ENV_VARS.get("MONGO_USER")
    password = mongo_pass or os.getenv("MONGO_PASSWORD") or ENV_VARS.get("MONGO_PASSWORD")
    auth_src = auth_source or os.getenv("MONGO_AUTH_SOURCE") or ENV_VARS.get("MONGO_AUTH_SOURCE", "admin")

    client_kwargs = {
        "serverSelectionTimeoutMS": 5000,
    }
    if user and password:
        client_kwargs["username"] = user
        client_kwargs["password"] = password
        client_kwargs["authSource"] = auth_src

    print(f"[-] Conectando a MongoDB: {uri.split('@')[-1] if '@' in uri else uri}")
    if user:
        print(f"[-] Autenticación con usuario MongoDB: '{user}' (authSource: '{auth_src}')")
    print(f"[-] Base de datos: {database} | Colección: {admins_col}")

    try:
        client = pymongo.MongoClient(uri, **client_kwargs)
        # Test de conexión
        client.admin.command('ping')
        db = client[database]
        col = db[admins_col]
        # Asegurar índice único en username
        col.create_index("username", unique=True)
        return client, col
    except pymongo.errors.OperationFailure as e:
        if e.code == 13 or "requires authentication" in str(e).lower() or "authentication failed" in str(e).lower():
            print(f"\n[ERROR DE AUTENTICACIÓN MONGO] {e.details.get('errmsg', e)}")
            print("\nEl servidor MongoDB en el VPS requiere credenciales de acceso.")
            print("Puedes proporcionarlas de las siguientes formas:")
            print("  1. En la URI:")
            print(f"     --uri \"mongodb://<mongo_user>:<mongo_pass>@{uri.replace('mongodb://', '')}/{database}?authSource=admin\"")
            print("  2. Con argumentos:")
            print(f"     --mongo-user <usuario> --mongo-pass <password> --auth-source admin")
            print("  3. En tu archivo .env:")
            print("     MONGO_URI=mongodb://<usuario>:<password>@213.218.240.167:27018/actualizaciones?authSource=admin\n")
        else:
            print(f"\n[ERROR] Operación rechazada por MongoDB: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] No se pudo conectar a MongoDB: {e}")
        print("Verifica que el puerto y host sean accesibles y si la base de datos requiere usuario/contraseña.\n")
        sys.exit(1)

def hash_password(password: str) -> str:
    import bcrypt
    # Generar hash bcrypt con 12 rondas de salt (igual que bcryptjs en el backend)
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def add_user(col, username, password=None):
    username = username.strip()
    if not username:
        print("[ERROR] El nombre de usuario no puede estar vacío.")
        return False

    if not password:
        while True:
            password = getpass.getpass("Ingresa la contraseña (mínimo 10 caracteres): ")
            if len(password) < 10:
                print("[!] La contraseña debe tener al menos 10 caracteres.")
                continue
            confirm = getpass.getpass("Confirma la contraseña: ")
            if password != confirm:
                print("[!] Las contraseñas no coinciden. Intenta de nuevo.\n")
                continue
            break
    else:
        if len(password) < 10:
            print("[!] Advertencia: La contraseña tiene menos de 10 caracteres (recomendado >= 10).")

    print(f"[-] Hasheando contraseña con bcrypt (12 rondas)...")
    password_hash = hash_password(password)

    now = datetime.utcnow()
    res = col.update_one(
        {"username": username},
        {
            "$set": {
                "passwordHash": password_hash,
                "updatedAt": now
            },
            "$setOnInsert": {
                "createdAt": now
            }
        },
        upsert=True
    )

    if res.upserted_id:
        print(f"\n[OK] Usuario '{username}' creado exitosamente en la base de datos.")
    else:
        print(f"\n[OK] Contraseña del usuario '{username}' actualizada exitosamente.")
    return True

def list_users(col):
    print("\n--- Usuarios Administradores Registrados ---")
    users = list(col.find({}, {"username": 1, "createdAt": 1, "updatedAt": 1}))
    if not users:
        print("(No hay usuarios registrados en la colección)")
    else:
        for i, u in enumerate(users, start=1):
            created = u.get("createdAt", "N/A")
            print(f" {i}. Usuario: {u.get('username')} (Creado: {created})")
    print("-------------------------------------------\n")

def delete_user(col, username):
    res = col.delete_one({"username": username})
    if res.deleted_count > 0:
        print(f"\n[OK] Usuario '{username}' eliminado correctamente.")
    else:
        print(f"\n[!] No se encontró ningún usuario con el nombre '{username}'.")

def interactive_menu(col):
    while True:
        print("\n=============================================")
        print("   GESTIÓN DE USUARIOS - PRAETOR / VPS       ")
        print("=============================================")
        print("1. Crear / Modificar usuario")
        print("2. Listar usuarios")
        print("3. Eliminar usuario")
        print("4. Salir")
        choice = input("Selecciona una opción [1-4]: ").strip()

        if choice == "1":
            user = input("\nNombre de usuario: ").strip()
            if user:
                add_user(col, user)
        elif choice == "2":
            list_users(col)
        elif choice == "3":
            user = input("\nNombre del usuario a eliminar: ").strip()
            confirm = input(f"¿Estás seguro de eliminar a '{user}'? (s/N): ").strip().lower()
            if confirm in ["s", "si", "y", "yes"]:
                delete_user(col, user)
            else:
                print("Operación cancelada.")
        elif choice == "4":
            print("Saliendo...")
            break
        else:
            print("Opción inválida.")

def main():
    check_dependencies()

    parser = argparse.ArgumentParser(description="Gestor de usuarios en consola para Praetor.")
    subparsers = parser.add_subparsers(dest="command", help="Comandos disponibles")

    # Comando 'add'
    parser_add = subparsers.add_parser("add", help="Crear o actualizar contraseña de usuario")
    parser_add.add_argument("username", help="Nombre de usuario")
    parser_add.add_argument("password", nargs="?", default=None, help="Contraseña (opcional, si no se especifica se pide oculta)")

    # Comando 'list'
    parser_list = subparsers.add_parser("list", help="Listar usuarios registrados")

    # Comando 'delete'
    parser_del = subparsers.add_parser("delete", help="Eliminar usuario")
    parser_del.add_argument("username", help="Nombre de usuario a eliminar")

    # Opciones de conexión globales
    for p in [parser, parser_add, parser_list, parser_del]:
        p.add_argument("--uri", default=None, help="URI de conexión a MongoDB (ej: mongodb://213.218.240.167:27018)")
        p.add_argument("--db", default=None, help="Nombre de la base de datos (ej: actualizaciones o envarchdb)")
        p.add_argument("--mongo-user", default=None, help="Usuario para autenticarse en MongoDB")
        p.add_argument("--mongo-pass", default=None, help="Contraseña para autenticarse en MongoDB")
        p.add_argument("--auth-source", default=None, help="Base de datos de autenticación de MongoDB (por defecto: admin)")

    args = parser.parse_args()

    client, col = get_db_connection(
        mongo_uri=args.uri,
        db_name=args.db,
        mongo_user=args.mongo_user,
        mongo_pass=args.mongo_pass,
        auth_source=args.auth_source
    )

    try:
        if args.command == "add":
            add_user(col, args.username, args.password)
        elif args.command == "list":
            list_users(col)
        elif args.command == "delete":
            delete_user(col, args.username)
        else:
            # Modo interactivo
            interactive_menu(col)
    finally:
        client.close()

if __name__ == "__main__":
    main()
