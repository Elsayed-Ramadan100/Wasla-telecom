import express from 'express';
import { claimGift, rechargeBalance, getProfile, updateProfile, subscribeToOffer, deleteProfile, redeemPoints, getSubscriptions, cancelSubscription, getBillingHistory } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All user routes are protected
router.use(protect);

router.post('/claim-gift', claimGift);
router.post('/recharge', rechargeBalance);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.delete('/profile', deleteProfile);
router.post('/subscribe', subscribeToOffer);
router.post('/redeem-points', redeemPoints);
router.get('/subscriptions', getSubscriptions);
router.delete('/subscriptions/:id', cancelSubscription);
router.get('/billing-history', getBillingHistory);

export default router;
