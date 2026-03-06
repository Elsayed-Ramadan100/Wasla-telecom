// import_localstorage_to_db.js
// Usage: Create a 'dump.json' with { users: [...], offers: [...] } extracted from LocalStorage
// Run: node import_localstorage_to_db.js

const fs = require('fs');
// const mongoose = require('mongoose'); // Uncomment for Mongo
// const { Client } = require('pg'); // Uncomment for Postgres
const bcrypt = require('bcryptjs'); // Needed for password hashing

const DATA_FILE = './wasla_dump.json';

async function migrate() {
    console.log('Starting Migration...');

    if (!fs.existsSync(DATA_FILE)) {
        console.error('Error: Dump file not found.');
        return;
    }

    const rawData = fs.readFileSync(DATA_FILE);
    const data = JSON.parse(rawData);
    
    // 1. Migrate Users
    console.log(`Found ${data.users.length} users.`);
    for (const u of data.users) {
        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(u.password, salt);

        // Prepare DB Record
        const dbUser = {
            name: u.name,
            phone: u.phone,
            email: u.email,
            password_hash: passwordHash,
            balance: u.balance,
            data_balance_gb: u.dataBalanceGB,
            joined_date: new Date(u.joinedDate),
            status: u.status || 'active',
            role: 'user' // Default
        };

        // TODO: Insert into DB
        // await User.create(dbUser); 
        console.log(`Migrated User: ${u.phone}`);
    }

    // 2. Migrate Offers
    console.log(`Found ${data.offers.length} offers.`);
    for (const o of data.offers) {
        const dbOffer = {
            id: o.id,
            name: o.name,
            price: o.price,
            data_gb: o.data || o.dataGB,
            validity_days: o.validityDays || 30
        };
        
        // await Offer.create(dbOffer);
        console.log(`Migrated Offer: ${o.name}`);
    }

    console.log('Migration Complete.');
}

migrate();
