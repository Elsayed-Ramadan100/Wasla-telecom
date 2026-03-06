import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ==========================================
// STAFF MANAGEMENT (Owner Only)
// ==========================================

export const createStaff = async (req, res) => {
    try {
        const { username, password, permissions = {} } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password required' });
        }

        const existingAdmin = await prisma.admin.findUnique({ where: { username } });
        if (existingAdmin) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newStaff = await prisma.admin.create({
            data: {
                username,
                passwordHash,
                role: 'staff',
                canViewUsers: !!permissions.canViewUsers,
                canEditUsers: !!permissions.canEditUsers,
                canManageBilling: !!permissions.canManageBilling,
                canModerateUsers: !!permissions.canModerateUsers,
                canDeleteUsers: !!permissions.canDeleteUsers,
                canManageOffers: !!permissions.canManageOffers
            },
            select: {
                id: true, username: true, role: true,
                canViewUsers: true, canEditUsers: true, canManageBilling: true, canModerateUsers: true, canDeleteUsers: true, canManageOffers: true
            }
        });

        res.status(201).json({ success: true, staff: newStaff });
    } catch (error) {
        console.error('Create Staff Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getAllStaff = async (req, res) => {
    try {
        const staff = await prisma.admin.findMany({
            where: { role: 'staff' },
            select: {
                id: true, username: true, role: true,
                canViewUsers: true, canEditUsers: true, canManageBilling: true, canModerateUsers: true, canDeleteUsers: true, canManageOffers: true
            }
        });
        res.json({ success: true, staff });
    } catch (error) {
        console.error('Get Staff Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const updateStaffPermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;

        const updatedStaff = await prisma.admin.update({
            where: { id },
            data: {
                canViewUsers: !!permissions.canViewUsers,
                canEditUsers: !!permissions.canEditUsers,
                canManageBilling: !!permissions.canManageBilling,
                canModerateUsers: !!permissions.canModerateUsers,
                canDeleteUsers: !!permissions.canDeleteUsers,
                canManageOffers: !!permissions.canManageOffers
            },
            select: {
                id: true, username: true, role: true,
                canViewUsers: true, canEditUsers: true, canManageBilling: true, canModerateUsers: true, canDeleteUsers: true, canManageOffers: true
            }
        });

        res.json({ success: true, staff: updatedStaff });
    } catch (error) {
        console.error('Update Staff Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.admin.delete({ where: { id } });
        res.json({ success: true, message: 'Staff member deleted' });
    } catch (error) {
        console.error('Delete Staff Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ==========================================
// GLOBAL USER MANAGEMENT
// ==========================================

export const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: { personalization: true }
        });
        res.json({ success: true, users });
    } catch (error) {
        console.error('Get All Users Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const updateUserBypassOTP = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, city, state, country, password } = req.body;

        const region = (city || state || country)
            ? `${city || ''}, ${state || ''}, ${country || ''}`.replace(/(^, )|(, $)/g, '').replace(/,\s*,/g, ',')
            : undefined;

        let passwordHash;
        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(region !== "undefined, undefined, undefined" && region !== undefined && { region }),
                ...(passwordHash && { passwordHash })
            }
        });

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const purchaseOnBehalf = async (req, res) => {
    try {
        const { id } = req.params;
        const { offerId } = req.body;

        const user = await prisma.user.findUnique({ where: { id } });
        const offer = await prisma.offer.findUnique({ where: { id: offerId } });

        if (!user || !offer) {
            return res.status(404).json({ success: false, message: 'User or Offer not found' });
        }

        if (user.balance < offer.price) {
            return res.status(400).json({ success: false, message: 'User has insufficient balance for this admin purchase' });
        }

        // Transaction
        await prisma.$transaction(async (tx) => {
            // Deduct cost and add resources
            await tx.user.update({
                where: { id },
                data: {
                    balance: { decrement: offer.price },
                    dataBalanceGB: { increment: offer.dataGB }
                }
            });

            // Log special admin audit debit
            await tx.billingHistory.create({
                data: {
                    userId: id,
                    amount: offer.price,
                    status: 'Paid',
                    description: `Admin Bypass Purchase: ${offer.name} (Billed via Admin Override)`,
                    dataGB: offer.dataGB
                }
            });
        });

        res.json({ success: true, message: `Successfully purchased ${offer.name} for user` });

    } catch (error) {
        console.error('Purchase On Behalf Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // active, blocked

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { status }
        });

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Moderate User Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const wipeUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Cascade will wipe history, tickets, etc.
        await prisma.user.delete({ where: { id } });
        res.json({ success: true, message: 'User and all associated data permanently wiped' });
    } catch (error) {
        console.error('Wipe User Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
