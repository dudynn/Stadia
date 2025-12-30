import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { types } = pg;
types.setTypeParser(1082, (val) => val);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
