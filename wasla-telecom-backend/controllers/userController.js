import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Claim 10GB Gift & Save Personalization
 * POST /api/user/claim-gift
 * Protected Route
 */
export const claimGift = async (req, res) => {
    try {
        const userId = req.user.id; // From auth middleware

        // 1. Verify user exists and hasn't claimed yet
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { personalization: true }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.profileCompleted || user.personalization) {
            return res.status(400).json({ success: false, message: 'Gift already claimed and profile completed.' });
        }

        const data = req.body;

        // Parse Arrays and Strings into Prisma Booleans/Floats
        const notifyPrefs = data.notificationPrefs || [];
        const notifySms = notifyPrefs.includes('SMS');
        const notifyEmail = notifyPrefs.includes('Email');
        const notifyPush = notifyPrefs.includes('Push Notification');

        const monthlyCharges = parseFloat(data.monthlyCharges) || 0.0;

        // Run as a Transaction: Create Personalization AND Update User
        const transaction = await prisma.$transaction([
            // 1. Create Personalization Profile
            prisma.userPersonalization.create({
                data: {
                    userId: userId,
                    partner: data.partner || 'No',
                    dependents: data.dependents === 'Yes',
                    phoneService: data.phoneService === 'Yes',
                    multipleLines: data.multipleLines === 'Yes',
                    internetService: data.internetService || 'None',
                    onlineSecurity: !!data.onlineSecurity,
                    techSupport: !!data.techSupport,
                    paperlessBilling: !!data.paperlessBilling,
                    onlineBackup: !!data.onlineBackup,
                    deviceProtection: !!data.deviceProtection,
                    streamingTV: !!data.streamingTV,
                    streamingMovies: !!data.streamingMovies,
                    contractType: data.contractType || 'Month-to-Month',
                    paymentMethod: data.paymentMethod || 'Vodafone Cash',
                    monthlyCharges: monthlyCharges,
                    preferredPackage: data.preferredPackage || '',
                    avgConsumption: data.avgConsumption || 'Medium',
                    notifySms,
                    notifyEmail,
                    notifyPush,
                    preferredOffers: data.preferredOffers || '',
                    switchReason: data.switchReason || null,
                    privacyPolicyAgreed: !!data.privacyPolicy
                }
            }),
            // 2. Update User (10GB Gift + Profile Completed)
            prisma.user.update({
                where: { id: userId },
                data: {
                    dataBalanceGB: {
                        increment: 10
                    },
                    profileCompleted: true
                }
            })
        ]);

        res.json({
            success: true,
            message: 'Profile completed successfully! 10GB added.',
            user: transaction[1] // The updated user object
        });

    } catch (error) {
        console.error('Claim Gift Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error while processing gift' });
    }
};

/**
 * Subscribe to an Offer
 * POST /api/user/subscribe
 * Protected Route
 */
export const subscribeToOffer = async (req, res) => {
    try {
        const userId = req.user.id;
        const { offerId, amount, description, dataGB } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid offer amount' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.balance < parseFloat(amount)) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }

        const addedGB = parseInt(dataGB) || 0;
        const earnedPoints = parseInt(amount) || 0;

        const transaction = await prisma.$transaction([
            // 1. Deduct Balance, Add Data, Add Points
            prisma.user.update({
                where: { id: userId },
                data: {
                    balance: { decrement: parseFloat(amount) },
                    dataBalanceGB: { increment: addedGB },
                    points: { increment: earnedPoints }
                }
            }),
            // 2. Add Billing History Record
            prisma.billingHistory.create({
                data: {
                    userId,
                    amount: parseFloat(amount),
                    status: 'Success',
                    description: description || `Subscription: ${offerId}`,
                    dataGB: addedGB
                }
            }),
            // 3. Add Reward History Record
            prisma.reward.create({
                data: {
                    userId,
                    points: earnedPoints,
                    description: `Earned from ${offerId || 'Subscription'} purchase`
                }
            })
        ]);

        res.json({
            success: true,
            message: `Successfully subscribed to ${description || offerId}!`,
            user: transaction[0],
            receipt: transaction[1],
            reward: transaction[2]
        });

    } catch (error) {
        console.error('Subscription Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during subscription' });
    }
};

/**
 * Recharge User Balance
 * POST /api/user/recharge
 * Protected Route
 */
export const rechargeBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, type, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid recharge amount' });
        }

        const transaction = await prisma.$transaction([
            // 1. Update Balance
            prisma.user.update({
                where: { id: userId },
                data: { balance: { increment: parseFloat(amount) } }
            }),
            // 2. Add Billing History Record
            prisma.billingHistory.create({
                data: {
                    userId,
                    amount: parseFloat(amount),
                    status: 'Success',
                    description: description || 'Vodafone Cash Recharge'
                }
            })
        ]);

        res.json({
            success: true,
            message: `Recharge of ${amount} EGP Successful!`,
            user: transaction[0],
            receipt: transaction[1]
        });

    } catch (error) {
        console.error('Recharge Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during recharge' });
    }
};

/**
 * Get Current User Profile
 * GET /api/user/profile
 * Protected Route
 */
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { personalization: true }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Strip password for security
        const { passwordHash, ...safeUser } = user;

        res.json({
            success: true,
            user: safeUser
        });

    } catch (error) {
        console.error('Fetch Profile Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error fetching profile', error: error.message });
    }
};

/**
 * Update Profile Settings
 * PUT /api/user/profile
 * Protected Route
 */
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, phone, giftPaused } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name: name !== undefined ? name : undefined,
                email: email !== undefined ? email : undefined,
                phone: phone !== undefined ? phone : undefined,
                giftPaused: giftPaused !== undefined ? giftPaused : undefined
            }
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Profile Update Error:', error);
        // Catch unique constraint violation for phone number
        if (error.code === 'P2002' && error.meta?.target?.includes('phone')) {
            return res.status(400).json({ success: false, message: 'Phone number already in use by another account' });
        }
        res.status(500).json({ success: false, message: 'Internal server error during profile update' });
    }
};

/**
 * Delete User Account completely
 * DELETE /api/user/profile
 * Protected Route
 */
export const deleteProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Prisma Delete automatically cascades depending on schema. 
        // We have `onDelete: Cascade` for Personalization, BillingHistory, SupportTicket, Reward.
        await prisma.user.delete({
            where: { id: userId }
        });

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Profile Deletion Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during profile deletion' });
    }
};

/**
 * Redeem Rewards Points
 * POST /api/user/redeem-points
 * Protected Route
 */
export const redeemPoints = async (req, res) => {
    try {
        const userId = req.user.id;
        const { pointsToRedeem, type } = req.body;

        if (!pointsToRedeem || pointsToRedeem < 100) {
            return res.status(400).json({ success: false, message: 'Minimum 100 points required to redeem' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.points < pointsToRedeem) {
            return res.status(400).json({ success: false, message: 'Insufficient points' });
        }

        const valueEGP = (pointsToRedeem / 100) * 20;

        // Ensure atomic operations for financial logic
        const updatedUser = await prisma.$transaction(async (tx) => {
            // 1. Update User Balances
            const u = await tx.user.update({
                where: { id: userId },
                data: {
                    points: { decrement: pointsToRedeem },
                    balance: type === 'wallet' ? { increment: valueEGP } : undefined
                    // If 'vf-cash', we simulate a withdrawal, so balance doesn't increase, cash goes out
                }
            });

            // 2. Log Reward Deduction
            await tx.reward.create({
                data: {
                    userId,
                    points: -pointsToRedeem,
                    description: `Redeemed ${pointsToRedeem} points for ${valueEGP} EGP to ${type === 'wallet' ? 'Wallet Balance' : 'Vodafone Cash'}`
                }
            });

            // 3. Log Billing History (if Wallet, it's a top-up. If VF-Cash, it's a withdrawal)
            await tx.billingHistory.create({
                data: {
                    userId,
                    amount: valueEGP,
                    status: 'Success',
                    description: type === 'wallet' ? `Top-up from Rewards` : `Withdrawal via Rewards to VF Cash`
                }
            });

            return u;
        });

        res.json({
            success: true,
            message: `Successfully redeemed ${pointsToRedeem} points for ${valueEGP} EGP!`,
            user: updatedUser
        });

    } catch (error) {
        console.error('Redeem Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error while redeeming points' });
    }
};

/**
 * Get User Subscriptions
 * GET /api/user/subscriptions
 * Protected Route
 */
export const getSubscriptions = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const billingHistory = await prisma.billingHistory.findMany({
            where: {
                userId: userId,
                OR: [
                    { description: { contains: 'Subscription' } },
                    { description: { contains: 'Admin Bypass Purchase' } }
                ]
            },
            orderBy: {
                date: 'desc'
            }
        });

        let subscriptions = billingHistory.map(record => {
            const pkgName = record.description.replace('Subscription: ', '').replace('Admin Bypass Purchase: ', '');

            return {
                id: record.id,
                name: pkgName,
                amount: record.amount,
                date: record.date,
                status: record.status,
                type: 'purchase',
                totalGB: record.dataGB || 0  // Read authoritative value stored at purchase time
            };
        });

        if (user.profileCompleted) {
            subscriptions.unshift({
                id: 'welcome-gift',
                name: 'Welcome Gift (10GB)',
                amount: 0,
                date: user.updatedAt,
                status: user.giftPaused ? 'Paused' : 'Active',
                type: 'gift',
                isPaused: user.giftPaused,
                totalGB: 10
            });
        }

        res.json({
            success: true,
            subscriptions
        });

    } catch (error) {
        console.error('Get Subscriptions Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching subscriptions' });
    }
};

/**
 * Cancel a Subscription Package securely
 * DELETE /api/user/subscriptions/:id
 * Protected Route
 */
export const cancelSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        const recordId = req.params.id;

        // 1. Locate the authorized Billing Record
        const record = await prisma.billingHistory.findFirst({
            where: {
                id: recordId,
                userId: userId,
                OR: [
                    { description: { contains: 'Subscription' } },
                    { description: { contains: 'Admin Bypass Purchase' } }
                ]
            }
        });

        if (!record) {
            return res.status(404).json({ success: false, message: 'Active subscription not found' });
        }

        // 2. Read the authoritative GB value stored at purchase time — no string parsing needed
        const dataToDeduct = record.dataGB || 0;

        // 3. Atomically Remove Package and Strip Quota using Math.max safety
        const userState = await prisma.user.findUnique({ where: { id: userId } });
        const newBalanceGB = Math.max(0, (userState.dataBalanceGB || 0) - dataToDeduct);

        const result = await prisma.$transaction(async (tx) => {

            // Delete the historic purchase making it "Canceled" entirely
            await tx.billingHistory.delete({
                where: { id: record.id }
            });

            // Set the new precise stripped balance
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    dataBalanceGB: newBalanceGB
                }
            });

            return updatedUser;
        });

        res.json({
            success: true,
            message: `Package Canceled successfully. Deducted ${dataToDeduct}GB.`,
            user: result
        });

    } catch (error) {
        console.error('Cancel Subscription Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while canceling package',
            error: error.message
        });
    }
};

/**
 * Get Full Billing History (user-scoped)
 * GET /api/user/billing-history
 * Protected Route
 */
export const getBillingHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const history = await prisma.billingHistory.findMany({
            where: { userId },
            orderBy: { date: 'desc' }
        });

        res.json({ success: true, history });

    } catch (error) {
        console.error('Get Billing History Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error fetching billing history' });
    }
};
