import express from 'express';
import { loginAdmin } from '../controllers/adminAuthController.js';
import { authenticateAdmin, requireOwner, requirePermission } from '../middleware/adminAuthMiddleware.js';
import {
    createStaff, getAllStaff, updateStaffPermissions, deleteStaff,
    getAllUsers, updateUserBypassOTP, purchaseOnBehalf, updateUserStatus, wipeUser
} from '../controllers/adminController.js';

const router = express.Router();

// ==========================================
// 1. AUTH ROUTES
// ==========================================
// POST /api/admin/auth/login
router.post('/auth/login', loginAdmin);

// ==========================================
// 2. STAFF MANAGEMENT (Owner Only Routes)
// ==========================================
// Apply authenticateAdmin and requireOwner to all staff management routes
router.post('/staff', authenticateAdmin, requireOwner, createStaff);
router.get('/staff', authenticateAdmin, requireOwner, getAllStaff);
router.put('/staff/:id', authenticateAdmin, requireOwner, updateStaffPermissions);
router.delete('/staff/:id', authenticateAdmin, requireOwner, deleteStaff);

// ==========================================
// 3. GLOBAL USER MANAGEMENT MATRIX
// ==========================================
// View all users (Requirement: canViewUsers)
router.get('/users', authenticateAdmin, requirePermission('canViewUsers'), getAllUsers);

// Edit User bypassing OTP (Requirement: canEditUsers)
router.put('/users/:id', authenticateAdmin, requirePermission('canEditUsers'), updateUserBypassOTP);

// Purchase on Behalf (Requirement: canManageBilling)
router.post('/users/:id/purchase', authenticateAdmin, requirePermission('canManageBilling'), purchaseOnBehalf);

// Block/Unblock Moderation (Requirement: canModerateUsers)
router.put('/users/:id/status', authenticateAdmin, requirePermission('canModerateUsers'), updateUserStatus);

// Delete User permanently (Requirement: canDeleteUsers)
router.delete('/users/:id', authenticateAdmin, requirePermission('canDeleteUsers'), wipeUser);

export default router;
