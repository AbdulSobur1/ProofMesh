import sqlite3
from pathlib import Path


def main() -> None:
    db_path = Path("dev.db")

    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS "User" (
              id TEXT NOT NULL PRIMARY KEY,
              username TEXT NOT NULL UNIQUE,
              passwordHash TEXT NOT NULL,
              createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS "Proof" (
              id TEXT NOT NULL PRIMARY KEY,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              link TEXT,
              score INTEGER NOT NULL,
              feedback TEXT,
              tags TEXT NOT NULL,
              txHash TEXT NOT NULL,
              createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              userId TEXT NOT NULL,
              FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE
            );
            """
        )
        conn.execute('CREATE INDEX IF NOT EXISTS Proof_userId_idx ON "Proof"(userId);')
        conn.execute('CREATE INDEX IF NOT EXISTS Proof_createdAt_idx ON "Proof"(createdAt);')
        conn.commit()
        print("sqlite initialized")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
