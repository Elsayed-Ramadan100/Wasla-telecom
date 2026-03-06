-- SQL Schema Definition for Wasla Telecom
-- compatible with PostgreSQL / MySQL

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL, -- Stored as plain in frontend, hashed here
    gender VARCHAR(20),
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    balance DECIMAL(10, 2) DEFAULT 0.00,
    data_balance_gb DECIMAL(10, 2) DEFAULT 0.00,
    data_used_gb DECIMAL(10, 2) DEFAULT 0.00,
    joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active', -- active, blocked
    role VARCHAR(20) DEFAULT 'user', -- user, admin
    -- New Fields from Signup
    partner VARCHAR(10),
    dependents VARCHAR(10),
    phone_service VARCHAR(10),
    multiple_lines VARCHAR(10),
    internet_service VARCHAR(50),
    contract_type VARCHAR(50),
    payment_method VARCHAR(50),
    monthly_charges DECIMAL(10,2),
    preferred_package VARCHAR(100),
    avg_consumption VARCHAR(20),
    gift_paused BOOLEAN DEFAULT FALSE,
    privacy_policy_agreed BOOLEAN DEFAULT TRUE
);

CREATE TABLE offers (
    id VARCHAR(50) PRIMARY KEY, -- Using string ID from frontend
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    data_gb VARCHAR(50), -- e.g "20GB" or number
    validity_days INT DEFAULT 30,
    offer_type VARCHAR(50), -- bundle, addon
    description TEXT
);

CREATE TABLE billing_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id), -- Assuming we migrate string IDs to INT or change type
    amount DECIMAL(10, 2) NOT NULL,
    transaction_type VARCHAR(50), -- Recharge, Subscription
    status VARCHAR(50), -- Success, Failed
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE active_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    offer_id VARCHAR(50) REFERENCES offers(id),
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP
);
