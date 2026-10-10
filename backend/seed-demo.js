require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initializeDatabase } = require('./db');

const DEMO_PASSWORD = 'Demo@123';

const demoUsers = [
  { name: 'Aarav Mehta Demo User', email: 'aarav.demo@example.com', address: 'Andheri East, Mumbai', role: 'USER' },
  { name: 'Diya Sharma Demo User', email: 'diya.demo@example.com', address: 'Vashi, Navi Mumbai', role: 'USER' },
  { name: 'Ishaan Patel Demo User', email: 'ishaan.demo@example.com', address: 'Thane West, Thane', role: 'USER' },
  { name: 'Ananya Desai Demo User', email: 'ananya.demo@example.com', address: 'Baner, Pune', role: 'USER' },
  { name: 'Kabir Joshi Demo User', email: 'kabir.demo@example.com', address: 'Dadar, Mumbai', role: 'USER' },
  { name: 'Meera Nair Demo User', email: 'meera.demo@example.com', address: 'Powai, Mumbai', role: 'USER' },
  { name: 'Rohan Kulkarni Demo User', email: 'rohan.demo@example.com', address: 'Kharghar, Navi Mumbai', role: 'USER' },
  { name: 'Sana Khan Demo User', email: 'sana.demo@example.com', address: 'Kothrud, Pune', role: 'USER' },
  { name: 'Westside Store Demo Owner', email: 'owner.westside@example.com', address: 'Andheri West, Mumbai', role: 'OWNER' },
  { name: 'FreshMart Store Demo Owner', email: 'owner.freshmart@example.com', address: 'Vashi, Navi Mumbai', role: 'OWNER' },
  { name: 'TechHub Store Demo Owner', email: 'owner.techhub@example.com', address: 'Thane West, Thane', role: 'OWNER' },
];

const demoStores = [
  { name: 'Westside Fashion Store', email: 'westside.demo@example.com', address: 'Link Road, Andheri West, Mumbai', latitude: 19.13645, longitude: 72.83377, description: 'A fashion and lifestyle store offering everyday wear, workwear, seasonal collections, footwear, and accessories for a range of styles and budgets. Demo profile for testing store details and customer reviews.', ownerEmail: 'owner.westside@example.com' },
  { name: 'FreshMart Grocery Store', email: 'freshmart.demo@example.com', address: 'Sector 17, Vashi, Navi Mumbai', latitude: 19.07355, longitude: 72.99780, description: 'A neighbourhood grocery store for fresh produce, packaged foods, dairy, pantry staples, and daily household essentials. Demo profile for testing store details and customer reviews.', ownerEmail: 'owner.freshmart@example.com' },
  { name: 'TechHub Electronics Store', email: 'techhub.demo@example.com', address: 'Ghodbunder Road, Thane West', latitude: 19.25019, longitude: 72.98031, description: 'An electronics retailer featuring mobile accessories, computer peripherals, home tech, and everyday gadgets. Demo profile for testing store details and customer reviews.', ownerEmail: 'owner.techhub@example.com' },
  { name: 'Daily Needs Supermarket', email: 'dailyneeds.demo@example.com', address: 'Powai Plaza, Powai, Mumbai', latitude: 19.11764, longitude: 72.90604, description: 'A convenient supermarket with household essentials, snacks, beverages, packaged food, and personal-care products for daily shopping.', ownerEmail: 'owner.freshmart@example.com' },
  { name: 'City Books and Stationery', email: 'citybooks.demo@example.com', address: 'FC Road, Pune', latitude: 18.52043, longitude: 73.84171, description: 'A local book and stationery shop carrying notebooks, pens, art supplies, school materials, and books for students and readers.', ownerEmail: 'owner.westside@example.com' },
  { name: 'Green Basket Organic Store', email: 'greenbasket.demo@example.com', address: 'Baner Road, Pune', latitude: 18.55900, longitude: 73.78680, description: 'A speciality grocery store focused on organic pantry staples, natural products, grains, pulses, and selected fresh foods.', ownerEmail: 'owner.techhub@example.com' },
];

// Each row corresponds to one demo user; values are ratings for stores in demoStores order.
const ratingMatrix = [
  [5, 4, 3, 4, 5, 4],
  [4, 5, 4, 5, 3, 5],
  [3, 4, 5, 3, 4, 4],
  [4, 3, 4, 4, 5, 5],
  [5, 4, 4, 3, 4, 3],
  [4, 5, 3, 5, 4, 4],
  [3, 4, 5, 4, 3, 5],
  [5, 3, 4, 4, 5, 4],
];

async function main() {
  const db = await initializeDatabase();
  const userIds = {};
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  for (const user of demoUsers) {
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [user.email]);
    if (existing.length) {
      userIds[user.email] = existing[0].id;
      // Existing accounts keep their current password and profile.
    } else {
      const [result] = await db.execute(
        'INSERT INTO users (name, email, password_hash, address, role) VALUES (?, ?, ?, ?, ?)',
        [user.name, user.email, passwordHash, user.address, user.role]
      );
      userIds[user.email] = result.insertId;
    }
  }

  const storeIds = [];
  for (const store of demoStores) {
    const ownerId = userIds[store.ownerEmail];
    const [existing] = await db.execute('SELECT id FROM stores WHERE email = ? LIMIT 1', [store.email]);
    if (existing.length) {
      storeIds.push(existing[0].id);
      await db.execute('UPDATE stores SET name = ?, address = ?, description = ?, latitude = ?, longitude = ?, owner_id = ? WHERE id = ?', [store.name, store.address, store.description, store.latitude, store.longitude, ownerId, existing[0].id]);
    } else {
      const [result] = await db.execute(
        'INSERT INTO stores (name, email, address, description, latitude, longitude, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [store.name, store.email, store.address, store.description, store.latitude, store.longitude, ownerId]
      );
      storeIds.push(result.insertId);
    }
  }

  for (let i = 0; i < 8; i++) {
    const userId = userIds[demoUsers[i].email];
    for (let j = 0; j < demoStores.length; j++) {
      await db.execute(
        `INSERT INTO ratings (user_id, store_id, rating, review_text) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), review_text = VALUES(review_text)`,
        [userId, storeIds[j], ratingMatrix[i][j], [
          'Friendly service and a good overall experience. The store was organised and easy to browse.',
          'Good selection for the price. Checkout was straightforward and staff were helpful.',
          'Decent experience overall. A few items could have clearer pricing, but the visit was fine.',
          'Convenient location and useful range of products. I would shop here again.',
          'Great value and a pleasant experience. I found what I needed without much trouble.'
        ][(i + j) % 5]]
      );
    }
  }

  const [[userCount]] = await db.query('SELECT COUNT(*) AS total FROM users');
  const [[storeCount]] = await db.query('SELECT COUNT(*) AS total FROM stores');
  const [[ratingCount]] = await db.query('SELECT COUNT(*) AS total FROM ratings');
  console.log('\nDemo data is ready. All data is fictional and for testing only.');
  console.log(`Users in database: ${userCount.total}`);
  console.log(`Stores in database: ${storeCount.total}`);
  console.log(`Ratings in database: ${ratingCount.total}`);
  console.log(`\nDemo password for newly created demo accounts: ${DEMO_PASSWORD}`);
  console.log('Normal user: aarav.demo@example.com');
  console.log('Store owner: owner.westside@example.com');
  console.log('Store owner: owner.freshmart@example.com');
  console.log('Store owner: owner.techhub@example.com');
  console.log('Existing accounts are not reset; if an email already existed, its current password is unchanged.');
  await db.end();
}

main().catch((error) => {
  console.error('Could not seed demo data:', error.message);
  process.exitCode = 1;
});
