import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var __mariaPool: mysql.Pool | undefined;
}

export function getPool(): mysql.Pool {
  if (!global.__mariaPool) {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    if (!DB_HOST || !DB_USER || !DB_NAME) {
      throw new Error(
        "MariaDB is not configured. Set DB_HOST, DB_USER, DB_PASSWORD and DB_NAME in .env.local.",
      );
    }
    global.__mariaPool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT ? Number(DB_PORT) : 3306,
      user: DB_USER,
      password: DB_PASSWORD || "",
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return global.__mariaPool;
}

export function screenshotTable(): string {
  const t = (process.env.DB_SCREENSHOT_TABLE || "data").trim();
  if (!/^[A-Za-z0-9_]+$/.test(t)) {
    throw new Error(`Invalid DB_SCREENSHOT_TABLE: ${t}`);
  }
  return t;
}
