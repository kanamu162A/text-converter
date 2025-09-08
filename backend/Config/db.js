import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,   // ✅ now it's a real string
  ssl: { rejectUnauthorized: false },
});

pool.connect((err, client, release) => {
  if (!err) {
    console.log("✅ Database Connected Successfully..");
    release();
  } else {
    console.error("❌ Fail to connect to database:", err.message);
  }
});

export default pool;
