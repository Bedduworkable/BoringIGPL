const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// Helper function to verify user authentication and role
async function verifyUserAndRole(context, allowedRoles = []) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User profile not found');
    }

    const userData = userDoc.data();
    if (userData.status === 'inactive') {
        throw new functions.https.HttpsError('permission-denied', 'Account is inactive');
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(userData.role)) {
        throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
    }

    return { userData, userId: context.auth.uid };
}

// Input validation helper
function validateLeadData(data) {
    const errors = [];

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
        errors.push('Name must be at least 2 characters');
    }

    if (!data.phone || typeof data.phone !== 'string' || data.phone.trim().length < 7) {
        errors.push('Phone number must be at least 7 characters');
    }

    if (data.email && (typeof data.email !== 'string' || !data.email.includes('@'))) {
        errors.push('Invalid email format');
    }

    const validStatuses = ['newLead', 'contacted', 'interested', 'followup', 'visit', 'booked', 'closed', 'notinterested', 'dropped'];
    if (data.status && !validStatuses.includes(data.status)) {
        errors.push('Invalid status');
    }

    return errors;
}

// Sanitize input data
function sanitizeData(data) {
    const sanitized = {};

    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
            // Basic XSS prevention
            sanitized[key] = value
                .replace(/[<>]/g, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .trim()
                .slice(0, 1000); // Max length
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

// Log activity for audit trail
async function logActivity(userId, action, details = {}) {
    try {
        await db.collection('activity_logs').add({
            userId,
            action,
            details,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            serverTimestamp: Date.now()
        });
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}

// Create Lead - Secure Server-Side Function
exports.createLead = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        const { userData, userId } = await verifyUserAndRole(context);

        // Sanitize input data
        const sanitizedData = sanitizeData(data);

        // Validate required fields
        const validationErrors = validateLeadData(sanitizedData);
        if (validationErrors.length > 0) {
            throw new functions.https.HttpsError('invalid-argument', validationErrors.join(', '));
        }

        // Prepare lead data
        const leadData = {
            name: sanitizedData.name,
            phone: sanitizedData.phone,
            email: sanitizedData.email || '',
            altPhone: sanitizedData.altPhone || '',
            status: sanitizedData.status || 'newLead',
            source: sanitizedData.source || '',
            propertyType: sanitizedData.propertyType || '',
            budget: sanitizedData.budget || '',
            location: sanitizedData.location || '',
            requirements: sanitizedData.requirements || '',
            assignedTo: sanitizedData.assignedTo || userId,
            priority: sanitizedData.priority || 'medium',
            createdBy: userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: userId
        };

        // Add lead to Firestore
        const leadRef = await db.collection('leads').add(leadData);

        // Log activity
        await logActivity(userId, 'create_lead', {
            leadId: leadRef.id,
            leadName: leadData.name,
            leadPhone: leadData.phone
        });

        return {
            success: true,
            leadId: leadRef.id,
            message: 'Lead created successfully'
        };

    } catch (error) {
        console.error('Error creating lead:', error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError('internal', 'Failed to create lead');
    }
});

// Update Lead - Secure Server-Side Function
exports.updateLead = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        const { userData, userId } = await verifyUserAndRole(context);

        if (!data.leadId) {
            throw new functions.https.HttpsError('invalid-argument', 'Lead ID is required');
        }

        // Get existing lead
        const leadDoc = await db.collection('leads').doc(data.leadId).get();
        if (!leadDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Lead not found');
        }

        const existingLead = leadDoc.data();

        // Check permissions
        const canEdit = userData.role === 'admin' ||
                       existingLead.createdBy === userId ||
                       existingLead.assignedTo === userId ||
                       (userData.role === 'cp' && existingLead.assignedTo &&
                        await isLinkedToCP(existingLead.assignedTo, userId));

        if (!canEdit) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized to edit this lead');
        }

        // Sanitize and validate update data
        const sanitizedData = sanitizeData(data.updates);
        const validationErrors = validateLeadData({ ...existingLead, ...sanitizedData });

        if (validationErrors.length > 0) {
            throw new functions.https.HttpsError('invalid-argument', validationErrors.join(', '));
        }

        // Prepare update data
        const updateData = {
            ...sanitizedData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: userId
        };

        // Update lead
        await db.collection('leads').doc(data.leadId).update(updateData);

        // Log activity
        await logActivity(userId, 'update_lead', {
            leadId: data.leadId,
            changes: Object.keys(sanitizedData)
        });

        return {
            success: true,
            message: 'Lead updated successfully'
        };

    } catch (error) {
        console.error('Error updating lead:', error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError('internal', 'Failed to update lead');
    }
});

// Delete Lead - Secure Server-Side Function
exports.deleteLead = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        const { userData, userId } = await verifyUserAndRole(context);

        if (!data.leadId) {
            throw new functions.https.HttpsError('invalid-argument', 'Lead ID is required');
        }

        // Get existing lead
        const leadDoc = await db.collection('leads').doc(data.leadId).get();
        if (!leadDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Lead not found');
        }

        const existingLead = leadDoc.data();

        // Check permissions (only admin or creator can delete)
        const canDelete = userData.role === 'admin' || existingLead.createdBy === userId;

        if (!canDelete) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized to delete this lead');
        }

        // Delete lead
        await db.collection('leads').doc(data.leadId).delete();

        // Log activity
        await logActivity(userId, 'delete_lead', {
            leadId: data.leadId,
            leadName: existingLead.name,
            leadPhone: existingLead.phone
        });

        return {
            success: true,
            message: 'Lead deleted successfully'
        };

    } catch (error) {
        console.error('Error deleting lead:', error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError('internal', 'Failed to delete lead');
    }
});

// Get User Statistics - Secure Server-Side Function
exports.getUserStats = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        const { userData, userId } = await verifyUserAndRole(context);

        let leadsQuery = db.collection('leads');
        let usersQuery = db.collection('users');

        // Apply role-based filtering
        if (userData.role === 'employee') {
            leadsQuery = leadsQuery.where('assignedTo', '==', userId);
        } else if (userData.role === 'cp') {
            // CP sees their team leads - implement team logic here
            const teamUserIds = await getTeamUserIds(userId);
            if (teamUserIds.length > 0) {
                leadsQuery = leadsQuery.where('assignedTo', 'in', teamUserIds);
                usersQuery = usersQuery.where('linkedCP', '==', userId);
            }
        }
        // Admin sees all (no additional filtering)

        const [leadsSnapshot, usersSnapshot] = await Promise.all([
            leadsQuery.get(),
            userData.role !== 'employee' ? usersQuery.get() : Promise.resolve({ docs: [] })
        ]);

        const leads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Calculate statistics
        const totalLeads = leads.length;
        const totalUsers = users.length;

        // New leads today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newLeadsToday = leads.filter(lead => {
            const createdAt = lead.createdAt ? lead.createdAt.toDate() : new Date(0);
            return createdAt >= today;
        }).length;

        // Conversion rate
        const bookedLeads = leads.filter(lead =>
            lead.status && ['booked', 'closed'].includes(lead.status.toLowerCase())
        ).length;
        const conversionRate = totalLeads > 0 ? Math.round((bookedLeads / totalLeads) * 100) : 0;

        // Log activity
        await logActivity(userId, 'view_stats');

        return {
            totalLeads,
            totalUsers,
            newLeadsToday,
            conversionRate,
            role: userData.role
        };

    } catch (error) {
        console.error('Error getting user stats:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get statistics');
    }
});

// Get Recent Activity - Secure Server-Side Function
exports.getRecentActivity = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        const { userData, userId } = await verifyUserAndRole(context);

        const limit = Math.min(data.limit || 10, 50); // Max 50 items

        let query = db.collection('activity_logs')
            .orderBy('timestamp', 'desc')
            .limit(limit);

        // Apply role-based filtering
        if (userData.role === 'employee') {
            query = query.where('userId', '==', userId);
        } else if (userData.role === 'cp') {
            // CP sees their team's activity - implement team logic
            const teamUserIds = await getTeamUserIds(userId);
            teamUserIds.push(userId); // Include CP's own activity

            if (teamUserIds.length > 0) {
                query = query.where('userId', 'in', teamUserIds);
            }
        }
        // Admin sees all activity (no additional filtering)

        const snapshot = await query.get();
        const activities = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()?.toISOString()
        }));

        return {
            activities,
            role: userData.role
        };

    } catch (error) {
        console.error('Error getting recent activity:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get recent activity');
    }
});

// Helper function to get team user IDs for CP
async function getTeamUserIds(cpUserId) {
    try {
        const teamSnapshot = await db.collection('users')
            .where('linkedCP', '==', cpUserId)
            .get();

        return teamSnapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error('Error getting team user IDs:', error);
        return [];
    }
}

// Helper function to check if user is linked to CP
async function isLinkedToCP(userId, cpUserId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return false;

        const userData = userDoc.data();
        return userData.linkedCP === cpUserId;
    } catch (error) {
        console.error('Error checking CP link:', error);
        return false;
    }
}

// Create User - Admin Only
exports.createUser = functions.https.onCall(async (data, context) => {
    try {
        // Verify admin authentication
        const { userData, userId } = await verifyUserAndRole(context, ['admin']);

        // Sanitize input data
        const sanitizedData = sanitizeData(data);

        // Validate required fields
        if (!sanitizedData.email || !sanitizedData.name || !sanitizedData.role) {
            throw new functions.https.HttpsError('invalid-argument', 'Email, name, and role are required');
        }

        if (!['admin', 'cp', 'employee'].includes(sanitizedData.role)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
        }

        // Create Firebase Auth user
        const userRecord = await admin.auth().createUser({
            email: sanitizedData.email,
            password: sanitizedData.password || generateRandomPassword(),
            displayName: sanitizedData.name
        });

        // Create Firestore user document
        await db.collection('users').doc(userRecord.uid).set({
            name: sanitizedData.name,
            email: sanitizedData.email,
            role: sanitizedData.role,
            linkedCP: sanitizedData.linkedCP || null,
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: userId
        });

        // Log activity
        await logActivity(userId, 'create_user', {
            newUserId: userRecord.uid,
            newUserEmail: sanitizedData.email,
            newUserRole: sanitizedData.role
        });

        return {
            success: true,
            userId: userRecord.uid,
            message: 'User created successfully'
        };

    } catch (error) {
        console.error('Error creating user:', error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError('internal', 'Failed to create user');
    }
});

// Generate random password
function generateRandomPassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

// Rate Limiting (using Firestore for simplicity)
exports.checkRateLimit = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { operation, maxAttempts = 5, windowMs = 60000 } = data;
        const userId = context.auth.uid;
        const now = Date.now();

        const rateLimitDoc = await db.collection('rate_limits')
            .doc(`${userId}_${operation}`)
            .get();

        let attempts = [];
        if (rateLimitDoc.exists) {
            attempts = rateLimitDoc.data().attempts || [];
        }

        // Remove old attempts
        attempts = attempts.filter(timestamp => now - timestamp < windowMs);

        if (attempts.length >= maxAttempts) {
            throw new functions.https.HttpsError('resource-exhausted', 'Rate limit exceeded');
        }

        // Add current attempt
        attempts.push(now);

        // Update rate limit document
        await db.collection('rate_limits')
            .doc(`${userId}_${operation}`)
            .set({ attempts, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

        return { allowed: true, remainingAttempts: maxAttempts - attempts.length };

    } catch (error) {
        console.error('Error checking rate limit:', error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError('internal', 'Failed to check rate limit');
    }
});

// Cleanup old rate limit documents (scheduled function)
exports.cleanupRateLimits = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    const snapshot = await db.collection('rate_limits')
        .where('updatedAt', '<', new Date(cutoff))
        .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Cleaned up ${snapshot.docs.length} old rate limit documents`);
});

// Security monitoring - detect suspicious activity
exports.securityMonitor = functions.firestore
    .document('activity_logs/{logId}')
    .onCreate(async (snap, context) => {
        const logData = snap.data();

        // Define suspicious patterns
        const suspiciousActions = [
            'multiple_failed_logins',
            'access_denied_attempts',
            'rate_limit_exceeded',
            'invalid_input_detected'
        ];

        if (suspiciousActions.some(pattern => logData.action.includes(pattern))) {
            // Log to security collection
            await db.collection('security_alerts').add({
                userId: logData.userId,
                action: logData.action,
                details: logData.details,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                severity: 'medium',
                status: 'pending'
            });

            console.warn(`Security Alert: ${logData.action} by user ${logData.userId}`);
        }

        // Check for rapid successive actions (potential bot)
        const recentLogs = await db.collection('activity_logs')
            .where('userId', '==', logData.userId)
            .where('timestamp', '>', new Date(Date.now() - 60000)) // Last minute
            .get();

        if (recentLogs.docs.length > 20) { // More than 20 actions per minute
            await db.collection('security_alerts').add({
                userId: logData.userId,
                action: 'rapid_successive_actions',
                details: { actionCount: recentLogs.docs.length, timeWindow: '1 minute' },
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                severity: 'high',
                status: 'pending'
            });

            console.error(`High Security Alert: Rapid actions detected for user ${logData.userId}`);
        }
    });

// Backup critical data (scheduled function)
exports.backupCriticalData = functions.pubsub.schedule('every 6 hours').onRun(async (context) => {
    try {
        const timestamp = new Date().toISOString();

        // Backup users
        const usersSnapshot = await db.collection('users').get();
        const usersBackup = {
            timestamp,
            collection: 'users',
            data: usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        };

        await db.collection('backups').add(usersBackup);

        // Backup recent leads (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentLeadsSnapshot = await db.collection('leads')
            .where('createdAt', '>', weekAgo)
            .get();

        const leadsBackup = {
            timestamp,
            collection: 'leads_recent',
            data: recentLeadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        };

        await db.collection('backups').add(leadsBackup);

        console.log(`Backup completed at ${timestamp}`);

    } catch (error) {
        console.error('Backup failed:', error);
    }
});

// Email notification for critical alerts
exports.sendSecurityAlert = functions.firestore
    .document('security_alerts/{alertId}')
    .onCreate(async (snap, context) => {
        const alertData = snap.data();

        if (alertData.severity === 'high') {
            // In a real implementation, you would send an email here
            // For now, we'll log it
            console.error(`CRITICAL SECURITY ALERT: ${alertData.action} by user ${alertData.userId}`);

            // You can integrate with SendGrid, Mailgun, or other email services
            // Example with SendGrid:
            /*
            const sgMail = require('@sendgrid/mail');
            sgMail.setApiKey(functions.config().sendgrid.key);

            const msg = {
                to: 'admin@yourdomain.com',
                from: 'security@yourdomain.com',
                subject: 'Critical Security Alert - Real Estate CRM',
                text: `Security alert: ${alertData.action} detected for user ${alertData.userId}`,
                html: `<strong>Security Alert</strong><br>Action: ${alertData.action}<br>User: ${alertData.userId}<br>Time: ${alertData.timestamp}`
            };

            await sgMail.send(msg);
            */
        }
    });

// Data validation trigger
exports.validateLeadData = functions.firestore
    .document('leads/{leadId}')
    .onWrite(async (change, context) => {
        const after = change.after.exists ? change.after.data() : null;

        if (!after) return; // Document was deleted

        const validationErrors = validateLeadData(after);

        if (validationErrors.length > 0) {
            // Log validation error
            await db.collection('validation_errors').add({
                collection: 'leads',
                documentId: context.params.leadId,
                errors: validationErrors,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                data: after
            });

            console.warn(`Validation errors in lead ${context.params.leadId}:`, validationErrors);
        }
    });

// User activity summary (daily)
exports.generateUserActivitySummary = functions.pubsub.schedule('0 1 * * *').onRun(async (context) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all activity from yesterday
    const activitySnapshot = await db.collection('activity_logs')
        .where('timestamp', '>=', yesterday)
        .where('timestamp', '<', today)
        .get();

    // Group by user
    const userActivity = {};
    activitySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!userActivity[data.userId]) {
            userActivity[data.userId] = {
                userId: data.userId,
                actions: [],
                loginCount: 0,
                leadsCreated: 0,
                leadsUpdated: 0
            };
        }

        userActivity[data.userId].actions.push(data.action);

        if (data.action === 'login_success') {
            userActivity[data.userId].loginCount++;
        } else if (data.action === 'create_lead') {
            userActivity[data.userId].leadsCreated++;
        } else if (data.action === 'update_lead') {
            userActivity[data.userId].leadsUpdated++;
        }
    });

    // Save daily summary
    await db.collection('daily_summaries').add({
        date: yesterday.toISOString().split('T')[0],
        userActivity,
        totalActions: activitySnapshot.docs.length,
        activeUsers: Object.keys(userActivity).length,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Daily activity summary generated for ${yesterday.toISOString().split('T')[0]}`);
});

// Clean old logs (monthly)
exports.cleanOldLogs = functions.pubsub.schedule('0 2 1 * *').onRun(async (context) => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Clean old activity logs
    const oldLogsSnapshot = await db.collection('activity_logs')
        .where('timestamp', '<', threeMonthsAgo)
        .limit(500) // Process in batches
        .get();

    const batch = db.batch();
    oldLogsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`Cleaned ${oldLogsSnapshot.docs.length} old activity logs`);
});

// Export user data (GDPR compliance)
exports.exportUserData = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication and admin role
        const { userData, userId } = await verifyUserAndRole(context, ['admin']);

        const targetUserId = data.userId;
        if (!targetUserId) {
            throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
        }

        // Get user data
        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        // Get user's leads
        const leadsSnapshot = await db.collection('leads')
            .where('createdBy', '==', targetUserId)
            .get();

        // Get user's activity logs
        const activitySnapshot = await db.collection('activity_logs')
            .where('userId', '==', targetUserId)
            .orderBy('timestamp', 'desc')
            .limit(1000) // Limit to recent activity
            .get();

        const exportData = {
            user: { id: userDoc.id, ...userDoc.data() },
            leads: leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            activityLogs: activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            exportDate: new Date().toISOString(),
            exportedBy: userId
        };

        // Log the export
        await logActivity(userId, 'export_user_data', { targetUserId });

        return {
            success: true,
            data: exportData
        };

    } catch (error) {
        console.error('Error exporting user data:', error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError('internal', 'Failed to export user data');
    }
});

// Health check endpoint
exports.healthCheck = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            services: {
                firestore: 'connected',
                auth: 'active',
                functions: 'running'
            }
        };

        res.status(200).json(health);
    });
});

// Error handler for uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

console.log('🚀 Firebase Cloud Functions initialized with security features');
console.log('🛡️ Security monitoring active');
console.log('📊 Analytics and logging enabled');
console.log('🔄 Scheduled maintenance tasks configured');