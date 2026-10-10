const mysql = require("mysql2/promise");
require("dotenv").config();

const databaseName = process.env.DB_NAME || "store_rating_db";
const identifier = databaseName.replace(/[^a-zA-Z0-9_]/g, "");

const serverPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 5
});

let pool;

async function initializeDatabase() {
  await serverPool.query(`CREATE DATABASE IF NOT EXISTS \`${identifier}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: identifier,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(60) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      address VARCHAR(400) NOT NULL DEFAULT '',
      role ENUM('ADMIN','USER','OWNER') NOT NULL DEFAULT 'USER',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      address VARCHAR(400) NOT NULL,
      description TEXT NULL,
      latitude DECIMAL(10,8) NULL,
      longitude DECIMAL(11,8) NULL,
      owner_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_stores_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ratings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      store_id INT NOT NULL,
      rating TINYINT NOT NULL,
      review_text TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_store_rating (user_id, store_id),
      CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5),
      CONSTRAINT fk_ratings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_ratings_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  // Safe migrations for databases created by an older version of this app.
  const [storeColumns] = await pool.query("SHOW COLUMNS FROM stores LIKE 'description'");
  if (!storeColumns.length) await pool.query('ALTER TABLE stores ADD COLUMN description TEXT NULL AFTER address');
  const [latitudeColumns] = await pool.query("SHOW COLUMNS FROM stores LIKE 'latitude'");
  if (!latitudeColumns.length) await pool.query('ALTER TABLE stores ADD COLUMN latitude DECIMAL(10,8) NULL AFTER description');
  const [longitudeColumns] = await pool.query("SHOW COLUMNS FROM stores LIKE 'longitude'");
  if (!longitudeColumns.length) await pool.query('ALTER TABLE stores ADD COLUMN longitude DECIMAL(11,8) NULL AFTER latitude');
  const [ratingColumns] = await pool.query("SHOW COLUMNS FROM ratings LIKE 'review_text'");
  if (!ratingColumns.length) await pool.query('ALTER TABLE ratings ADD COLUMN review_text TEXT NULL AFTER rating');

  return pool;
}

function getDb() {
  if (!pool) throw new Error("Database has not been initialized yet.");
  return pool;
}

module.exports = { initializeDatabase, getDb };
