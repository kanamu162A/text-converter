import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Supabase URL
  ssl: {
    rejectUnauthorized: false, // required for Supabase
  },
});

pool.connect((err, client, release) => {
  if (!err) {
    console.log("✅ Database Connected Successfully..");
    release();
  } else {
    console.error("❌ Fail to connect to database:", err);
  }
});

export default pool;
