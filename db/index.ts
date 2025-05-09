
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

export async function createUser(username: string, password: string) {
  const [result] = await pool.execute(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, password]
  );
  return result;
}

export async function saveMqttMessage(topic: string, payload: any, userId?: number) {
  const [result] = await pool.execute(
    'INSERT INTO mqtt_messages (topic, payload, user_id) VALUES (?, ?, ?)',
    [topic, JSON.stringify(payload), userId]
  );
  return result;
}

export async function createMqttRule(name: string, topic: string, condition: string, action: string, userId: number) {
  const [result] = await pool.execute(
    'INSERT INTO mqtt_rules (name, topic, `condition`, action, user_id) VALUES (?, ?, ?, ?, ?)',
    [name, topic, condition, action, userId]
  );
  return result;
}

export async function getMqttRules(userId: number) {
  const [rows] = await pool.execute(
    'SELECT * FROM mqtt_rules WHERE user_id = ?',
    [userId]
  );
  return rows;
}

export { pool };
