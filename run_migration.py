import psycopg2
import sys
import os

# Read SQL file
sql_file = r'supabase\migrations\20260113_add_analytics.sql'
if not os.path.exists(sql_file):
    print(f'[ERROR] File not found: {sql_file}')
    sys.exit(1)

with open(sql_file, 'r', encoding='utf-8') as f:
    sql_content = f.read()

# Connection info for wedding-mass-guide Supabase project
conn_params = {
    'host': 'aws-0-ap-northeast-1.pooler.supabase.com',
    'port': 6543,
    'database': 'postgres',
    'user': 'postgres.qxiuqztinabmdhclxsuz',
    'password': 'wservice1234!@'
}

try:
    print('[INFO] Connecting to Supabase...')
    conn = psycopg2.connect(**conn_params)
    conn.autocommit = True
    cursor = conn.cursor()

    print('[INFO] Executing migration: 20260113_add_analytics.sql')
    cursor.execute(sql_content)

    print('[SUCCESS] Migration executed successfully!')
    print('[INFO] Created:')
    print('  - mass_analytics table')
    print('  - track_mass_visit() function')
    print('  - RLS policies')

    cursor.close()
    conn.close()
except psycopg2.Error as e:
    print(f'[ERROR] Database error: {e}')
    sys.exit(1)
except Exception as e:
    print(f'[ERROR] {e}')
    sys.exit(1)
