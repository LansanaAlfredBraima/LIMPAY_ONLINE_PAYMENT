const db = require('../database');
const bcrypt = require('bcrypt');

const initDb = async () => {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student',
            faculty TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Fees/Products Table
        db.run(`CREATE TABLE IF NOT EXISTS fees (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            description TEXT,
            amount REAL NOT NULL,
            session TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Transactions Table
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            fee_id TEXT,
            amount REAL NOT NULL,
            status TEXT NOT NULL,
            description TEXT,
            card_last4 TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (fee_id) REFERENCES fees(id)
        )`);

        // User Fees (Tracking individual student fee status)
        db.run(`CREATE TABLE IF NOT EXISTS user_fees (
            user_id TEXT NOT NULL,
            fee_id TEXT NOT NULL,
            total_amount REAL NOT NULL,
            paid_amount REAL DEFAULT 0,
            balance REAL NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, fee_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (fee_id) REFERENCES fees(id)
        )`);

        console.log('Tables created successfully.');

        // Seed Admin User
        const adminPassword = 'admin123';
        const saltRounds = 10;

        bcrypt.hash(adminPassword, saltRounds, (err, hash) => {
            if (err) {
                console.error('Error hashing password:', err);
                return;
            }

            const adminUser = {
                id: 'admin',
                name: 'Admin User',
                email: 'admin@limpay.edu',
                password_hash: hash,
                role: 'admin',
                faculty: 'N/A'
            };

            db.run(`INSERT OR IGNORE INTO users (id, name, email, password_hash, role, faculty) 
                   VALUES (?, ?, ?, ?, ?, ?)`,
                [adminUser.id, adminUser.name, adminUser.email, adminUser.password_hash, adminUser.role, adminUser.faculty],
                (err) => {
                    if (err) console.error('Error seeding admin:', err.message);
                    else console.log('Admin user seeded.');
                });
        });

        // Seed Default Fees
        const defaultFees = [
            { id: 'fee_tuition_24', type: 'Tuition Fee', description: 'Annual Tuition Fee', amount: 1200, session: '2024/2025' },
            { id: 'fee_dept_24', type: 'Departmental Fee', description: 'Departmental Charges', amount: 50, session: '2024/2025' },
            { id: 'fee_accom_24', type: 'Accommodation Fee', description: 'Hostel Accommodation', amount: 500, session: '2024/2025' }
        ];

        const stmt = db.prepare(`INSERT OR IGNORE INTO fees (id, type, description, amount, session) VALUES (?, ?, ?, ?, ?)`);
        defaultFees.forEach(fee => {
            stmt.run(fee.id, fee.type, fee.description, fee.amount, fee.session);
        });
        stmt.finalize(() => {
            console.log('Default fees seeded.');
        });
    });
};

initDb();
