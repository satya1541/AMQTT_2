
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '18.60.135.247',
  user: 'satya',
  password: 'satya123',
  database: 'amqtt_db',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0
});

export { pool };
