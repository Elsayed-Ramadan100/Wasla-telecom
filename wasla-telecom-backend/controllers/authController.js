import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_wasla_jwt_key_123!@#';

/**
 * Register a new User
 * POST /api/auth/register
 */
export const registerUser = async (req, res) => {
    try {
        const { phone, name, email, password, gender, country, state, city } = req.body;

        // Basic validation
        if (!phone || !name || !password) {
            return res.status(400).json({ success: false, message: 'Phone, name, and password are required' });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { phone } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Phone number already registered' });
        }

        const region = `${city}, ${state}, ${country}`.replace(/(^, )|(, $)/g, '');
        const passwordHash = await bcrypt.hash(password, 10);

        // Create User
        const newUser = await prisma.user.create({
            data: {
                phone,
                name,
                email,
                passwordHash,
                gender,
                region,
                status: 'active'
            }
        });

        // Generate Token
        const token = jwt.sign({ id: newUser.id, phone: newUser.phone }, JWT_SECRET, { expiresIn: '7d' });

        // Build Response Payload matching frontend mock schema expectations
        const userData = {
            id: newUser.id,
            phone: newUser.phone,
            name: newUser.name,
            email: newUser.email,
            gender: newUser.gender,
            balance: newUser.balance,
            dataBalanceGB: newUser.dataBalanceGB,
            profileCompleted: newUser.profileCompleted,
            giftPaused: newUser.giftPaused,
            status: newUser.status
        };

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: userData
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Login User
 * POST /api/auth/login
 */
export const loginUser = async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ success: false, message: 'Phone and password are required' });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { phone },
            include: { personalization: true }
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (user.status === 'blocked') {
            return res.status(403).json({ success: false, message: 'Your account has been blocked by admin.' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate Token
        const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });

        // Build Response Payload matching frontend mock schema expectations
        const userData = {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            gender: user.gender,
            balance: user.balance,
            dataBalanceGB: user.dataBalanceGB,
            profileCompleted: user.profileCompleted,
            giftPaused: user.giftPaused,
            status: user.status
        };

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: userData
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Verify OTP
 * POST /api/auth/verify-otp
 */
export const verifyOTP = async (req, res) => {
    try {
        const { phone, otp, type } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
        }

        // Mock verification - In real world, check against Redis cache
        if (otp === '123456' || otp.length === 6) {
            res.json({ success: true, message: 'OTP Verified' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
