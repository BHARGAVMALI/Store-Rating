const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { initializeDatabase, getDb } = require("./db");
const { authenticate, allowRoles } = require("./middleware");
const { validateName, validateAddress, validateEmail, validatePassword, validateRating } = require("./validation");

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || "development_secret_change_me";

function cleanUser(row) {
  return { id: row.id, name: row.name, email: row.email, address: row.address, role: row.role, createdAt: row.created_at };
}
function issueToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "8h" });
}
function badRequest(res, message) {
  return res.status(400).json({ message });
}
function validatePerson(body) {
  return validateName(body.name) || validateEmail(body.email) || validateAddress(body.address ?? "") ||
    validatePassword(body.password);
}
function parseOptionalCoordinate(value, min, max, label) {
  if (value === undefined || value === null || String(value).trim() === "") return { value: null };
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    return { error: `${label} must be between ${min} and ${max}.` };
  }
  return { value: number };
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", message: "Store Rating API is running." }));

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const error = validatePerson(req.body);
    if (error) return badRequest(res, error);
    const db = getDb();
    const [existing] = await db.execute("SELECT id FROM users WHERE email = ?", [req.body.email.trim().toLowerCase()]);
    if (existing.length) return res.status(409).json({ message: "An account with this email already exists." });
    const hash = await bcrypt.hash(req.body.password, 12);
    const [result] = await db.execute(
      "INSERT INTO users (name,email,password_hash,address,role) VALUES (?,?,?,?, 'USER')",
      [req.body.name.trim(), req.body.email.trim().toLowerCase(), hash, req.body.address.trim()]
    );
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [result.insertId]);
    const user = cleanUser(rows[0]);
    res.status(201).json({ token: issueToken(user), user });
  } catch (err) { next(err); }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) return badRequest(res, "Enter your email and password.");
    const [rows] = await getDb().execute("SELECT * FROM users WHERE email = ?", [email]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    const user = cleanUser(rows[0]);
    res.json({ token: issueToken(user), user });
  } catch (err) { next(err); }
});

app.get("/api/auth/me", authenticate, async (req, res, next) => {
  try {
    const [rows] = await getDb().execute("SELECT * FROM users WHERE id = ?", [req.user.id]);
    if (!rows.length) return res.status(401).json({ message: "Account not found." });
    res.json({ user: cleanUser(rows[0]) });
  } catch (err) { next(err); }
});

app.put("/api/auth/password", authenticate, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    const error = validatePassword(newPassword);
    if (error) return badRequest(res, error);
    const db = getDb();
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [req.user.id]);
    if (!rows.length || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, req.user.id]);
    res.json({ message: "Password updated successfully." });
  } catch (err) { next(err); }
});

app.get("/api/admin/stats", authenticate, allowRoles("ADMIN"), async (_req, res, next) => {
  try {
    const db = getDb();
    const [[users]] = await db.query("SELECT COUNT(*) AS total FROM users");
    const [[stores]] = await db.query("SELECT COUNT(*) AS total FROM stores");
    const [[ratings]] = await db.query("SELECT COUNT(*) AS total FROM ratings");
    res.json({ users: users.total, stores: stores.total, ratings: ratings.total });
  } catch (err) { next(err); }
});

app.get("/api/admin/users", authenticate, allowRoles("ADMIN"), async (req, res, next) => {
  try {
    const search = `%${String(req.query.search || "").trim()}%`;
    const role = String(req.query.role || "").trim().toUpperCase();
    let sql = "SELECT * FROM users WHERE (name LIKE ? OR email LIKE ? OR address LIKE ?)";
    const params = [search, search, search];
    if (["ADMIN", "USER", "OWNER"].includes(role)) { sql += " AND role = ?"; params.push(role); }
    sql += ` ORDER BY ${["name","email","address","role","created_at"].includes(req.query.sort) ? req.query.sort : "created_at"} ${req.query.order === "asc" ? "ASC" : "DESC"}`;
    const [rows] = await getDb().execute(sql, params);
    res.json({ users: rows.map(cleanUser) });
  } catch (err) { next(err); }
});

app.post("/api/admin/users", authenticate, allowRoles("ADMIN"), async (req, res, next) => {
  try {
    const error = validatePerson(req.body);
    if (error) return badRequest(res, error);
    const role = String(req.body.role || "USER").toUpperCase();
    if (!["ADMIN", "USER", "OWNER"].includes(role)) return badRequest(res, "Choose a valid role.");
    const db = getDb();
    const [existing] = await db.execute("SELECT id FROM users WHERE email = ?", [req.body.email.trim().toLowerCase()]);
    if (existing.length) return res.status(409).json({ message: "An account with this email already exists." });
    const hash = await bcrypt.hash(req.body.password, 12);
    const [result] = await db.execute("INSERT INTO users (name,email,password_hash,address,role) VALUES (?,?,?,?,?)",
      [req.body.name.trim(), req.body.email.trim().toLowerCase(), hash, req.body.address.trim(), role]);
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [result.insertId]);
    res.status(201).json({ user: cleanUser(rows[0]) });
  } catch (err) { next(err); }
});

app.get("/api/admin/stores", authenticate, allowRoles("ADMIN"), async (req, res, next) => {
  try {
    const search = `%${String(req.query.search || "").trim()}%`;
    const sort = ["name","email","address","avg_rating"].includes(req.query.sort) ? req.query.sort : "name";
    const order = req.query.order === "desc" ? "DESC" : "ASC";
    const [rows] = await getDb().execute(`
      SELECT s.id,s.name,s.email,s.address,s.description,s.latitude,s.longitude,s.owner_id,
        COALESCE(ROUND(AVG(r.rating),2),0) AS avg_rating, COUNT(r.id) AS rating_count
      FROM stores s LEFT JOIN ratings r ON r.store_id=s.id
      WHERE s.name LIKE ? OR s.email LIKE ? OR s.address LIKE ?
      GROUP BY s.id ORDER BY ${sort} ${order}`, [search, search, search]);
    res.json({ stores: rows });
  } catch (err) { next(err); }
});

app.post("/api/admin/stores", authenticate, allowRoles("ADMIN"), async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const address = String(req.body.address || "").trim();
    const description = String(req.body.description || "").trim();
    const ownerEmail = String(req.body.ownerEmail || "").trim().toLowerCase();
    if (name.length < 2 || name.length > 100) return badRequest(res, "Store name must be 2–100 characters.");
    if (validateEmail(email)) return badRequest(res, "Enter a valid store email.");
    if (validateAddress(address)) return badRequest(res, "Address must be 400 characters or fewer.");
    if (description.length > 3000) return badRequest(res, "Store description must be 3000 characters or fewer.");
    const latitude = parseOptionalCoordinate(req.body.latitude, -90, 90, "Latitude");
    if (latitude.error) return badRequest(res, latitude.error);
    const longitude = parseOptionalCoordinate(req.body.longitude, -180, 180, "Longitude");
    if (longitude.error) return badRequest(res, longitude.error);
    let ownerId = null;
    if (ownerEmail) {
      const [owners] = await getDb().execute("SELECT id FROM users WHERE email=? AND role='OWNER'", [ownerEmail]);
      if (!owners.length) return badRequest(res, "No store-owner account found for that email. Create an OWNER user first.");
      ownerId = owners[0].id;
    }
    const [result] = await getDb().execute(
      "INSERT INTO stores (name,email,address,description,latitude,longitude,owner_id) VALUES (?,?,?,?,?,?,?)",
      [name, email, address, description || null, latitude.value, longitude.value, ownerId]
    );
    res.status(201).json({ message: "Store created successfully.", id: result.insertId });
  } catch (err) { next(err); }
});

app.get("/api/stores", authenticate, async (req, res, next) => {
  try {
    const search = `%${String(req.query.search || "").trim()}%`;
    const [rows] = await getDb().execute(`
      SELECT s.id,s.name,s.email,s.address,s.description,s.latitude,s.longitude,s.owner_id,
        COALESCE(ROUND(AVG(allr.rating),2),0) AS avg_rating,
        COUNT(allr.id) AS rating_count, mine.rating AS my_rating
      FROM stores s
      LEFT JOIN ratings allr ON allr.store_id=s.id
      LEFT JOIN ratings mine ON mine.store_id=s.id AND mine.user_id=?
      WHERE s.name LIKE ? OR s.address LIKE ?
      GROUP BY s.id,mine.rating ORDER BY s.name ASC`, [req.user.id, search, search]);
    res.json({ stores: rows });
  } catch (err) { next(err); }
});

app.get("/api/stores/:id", authenticate, async (req, res, next) => {
  try {
    const storeId = Number(req.params.id);
    if (!Number.isInteger(storeId) || storeId < 1) return badRequest(res, "Invalid store.");
    const db = getDb();
    const [stores] = await db.execute(`
      SELECT s.id, s.name, s.email, s.address, s.description, s.latitude, s.longitude, s.owner_id,
        COALESCE(ROUND(AVG(r.rating), 2), 0) AS avg_rating,
        COUNT(r.id) AS rating_count
      FROM stores s LEFT JOIN ratings r ON r.store_id = s.id
      WHERE s.id = ? GROUP BY s.id`, [storeId]);
    if (!stores.length) return res.status(404).json({ message: "Store not found." });
    const [reviews] = await db.execute(`
      SELECT r.id, r.rating, r.review_text, r.created_at, r.updated_at,
        u.name AS user_name, IF(r.user_id = ?, 1, 0) AS is_mine
      FROM ratings r JOIN users u ON u.id = r.user_id
      WHERE r.store_id = ? ORDER BY r.updated_at DESC`, [req.user.id, storeId]);
    res.json({ store: stores[0], reviews });
  } catch (err) { next(err); }
});

app.put("/api/stores/:id/rating", authenticate, allowRoles("USER"), async (req, res, next) => {
  try {
    const error = validateRating(req.body.rating);
    if (error) return badRequest(res, error);
    const storeId = Number(req.params.id);
    if (!Number.isInteger(storeId) || storeId < 1) return badRequest(res, "Invalid store.");
    const [stores] = await getDb().execute("SELECT id FROM stores WHERE id=?", [storeId]);
    if (!stores.length) return res.status(404).json({ message: "Store not found." });
    const reviewText = String(req.body.reviewText || "").trim().slice(0, 1000);
    await getDb().execute(`INSERT INTO ratings (user_id,store_id,rating,review_text) VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE rating=VALUES(rating), review_text=VALUES(review_text)`,
      [req.user.id, storeId, Number(req.body.rating), reviewText || null]);
    res.json({ message: "Rating saved successfully." });
  } catch (err) { next(err); }
});

app.get("/api/owner/dashboard", authenticate, allowRoles("OWNER"), async (req, res, next) => {
  try {
    const db = getDb();
    const [stores] = await db.execute(`
      SELECT s.id,s.name,s.email,s.address,COALESCE(ROUND(AVG(r.rating),2),0) AS avg_rating,COUNT(r.id) AS rating_count
      FROM stores s LEFT JOIN ratings r ON r.store_id=s.id WHERE s.owner_id=? GROUP BY s.id`, [req.user.id]);
    const [ratings] = await db.execute(`
      SELECT r.id,r.rating,r.updated_at,u.name AS user_name,u.email AS user_email,s.name AS store_name
      FROM ratings r JOIN users u ON u.id=r.user_id JOIN stores s ON s.id=r.store_id
      WHERE s.owner_id=? ORDER BY r.updated_at DESC`, [req.user.id]);
    res.json({ stores, ratings });
  } catch (err) { next(err); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "That email is already in use." });
  if (err.code === "ER_NO_SUCH_TABLE" || err.code === "ECONNREFUSED" || err.code === "ER_ACCESS_DENIED_ERROR") {
    return res.status(500).json({ message: "Database connection problem. Check that MySQL Server is running and backend/.env has the correct credentials." });
  }
  res.status(500).json({ message: "Something went wrong on the server." });
});

async function start() {
  try {
    const db = await initializeDatabase();
    console.log("Connected to MySQL and database tables are ready.");
    const adminEmail = String(process.env.ADMIN_EMAIL || "admin@storerating.local").toLowerCase();
    const [admins] = await db.execute("SELECT id FROM users WHERE email=?", [adminEmail]);
    if (!admins.length) {
      const password = process.env.ADMIN_PASSWORD || "Admin@123";
      const hash = await bcrypt.hash(password, 12);
      await db.execute("INSERT INTO users (name,email,password_hash,address,role) VALUES (?,?,?,?, 'ADMIN')", [
        process.env.ADMIN_NAME || "System Administrator", adminEmail, hash, "System administration account"
      ]);
      console.log(`Initial admin created: ${adminEmail}`);
      console.log("Change the initial admin password after your first login.");
    }
    app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error("Could not start backend:", err.message);
    console.error("Check MySQL Server is installed/running and backend/.env credentials are correct.");
    process.exit(1);
  }
}
start();
