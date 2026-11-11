import os
import sqlite3

os.makedirs("data", exist_ok=True)
con = sqlite3.connect("data/demo.db")
con.executescript("""
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT, amount REAL, status TEXT, created TEXT);
INSERT INTO orders (customer, amount, status, created) VALUES
 ('Acme', 1200, 'paid', '2026-11-01'),
 ('Globex', 540, 'overdue', '2026-10-12'),
 ('Initech', 980, 'overdue', '2026-10-20'),
 ('Umbrella', 300, 'paid', '2026-11-05');
""")
con.commit()
con.close()
print("data/demo.db created")
