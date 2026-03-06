import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_wasla_jwt_key_123!@#';

/**
 * Admin Login
 * POST /api/admin/auth/login
 */
export const loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        // Find Admin
        const admin = await prisma.admin.findUnique({
            where: { username }
        });

        if (!admin) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, admin.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate Token
        // Expose all crucial details in the JWT payload so middleware doesn't need to query the DB on every request.
        const tokenPayload = {
            id: admin.id,
            username: admin.username,
            role: admin.role,
            canViewUsers: admin.canViewUsers,
            canEditUsers: admin.canEditUsers,
            canManageBilling: admin.canManageBilling,
            canModerateUsers: admin.canModerateUsers,
            canDeleteUsers: admin.canDeleteUsers,
            canManageOffers: admin.canManageOffers
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

        res.json({
            success: true,
            message: 'Admin login successful',
            token,
            admin: tokenPayload
        });

    } catch (error) {
        console.error('Admin Login Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
