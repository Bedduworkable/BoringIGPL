/**
 * ===================================
 * ENHANCED FIREBASE UTILITIES & DATABASE OPERATIONS
 * File: firebase-utils.js
 * Version: 2.0
 * Purpose: Centralized Firebase operations with enhanced security and error handling
 * ===================================
 */

/**
 * Firebase Configuration
 */
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA0ENNDjS9E2Ph054G_3RZC3sR9J1uQ3Cs",
    authDomain: "igplcrm.firebaseapp.com",
    projectId: "igplcrm",
    storageBucket: "igplcrm.firebasestorage.app",
    messagingSenderId: "688904879234",
    appId: "1:688904879234:web:3dfae5fcd879ae9a74889b"
};

/**
 * Database operation constants
 */
const DB_CONFIG = {
    COLLECTIONS: {
        USERS: 'users',
        LEADS: 'leads',
        ACTIVITY_LOGS: 'activity_logs',
        RATE_LIMITS: 'rate_limits',
        SECURITY_ALERTS: 'security_alerts',
        BACKUPS: 'backups',
        VALIDATION_ERRORS: 'validation_errors',
        DAILY_SUMMARIES: 'daily_summaries'
    },

    BATCH_SIZE: 500,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,

    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    MAX_CACHE_SIZE: 100
};

/**
 * Enhanced Firebase Database Manager
 * Provides secure, efficient database operations with caching and error handling
 */
class FirebaseManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.isInitialized = false;
        this.cache = new Map();
        this.retryQueue = [];
        this.securityUtils = null;

        // Performance metrics
        this.metrics = {
            operations: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0,
            retries: 0
        };

        // Bind methods
        this.init = this.init.bind(this);
        this.get = this.get.bind(this);
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    /**
     * Initialize Firebase with enhanced error handling
     */
    async init() {
        try {
            console.log('🔥 Initializing Enhanced Firebase Manager...');

            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK not loaded');
            }

            // Initialize Firebase app
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }

            // Initialize services
            this.auth = firebase.auth();
            this.db = firebase.firestore();

            // Configure Firestore settings
            this.db.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            });

            // Enable offline persistence
            try {
                await this.db.enablePersistence({ synchronizeTabs: true });
                console.log('💾 Offline persistence enabled');
            } catch (error) {
                if (error.code === 'failed-precondition') {
                    console.warn('Multiple tabs open, persistence only enabled in one tab');
                } else if (error.code === 'unimplemented') {
                    console.warn('Browser doesn\'t support persistence');
                }
            }

            // Initialize security utils reference
            if (typeof window !== 'undefined' && window.authGuard) {
                this.securityUtils = window.authGuard.securityUtils;
            }

            // Setup connection monitoring
            this._setupConnectionMonitoring();

            // Setup performance monitoring
            this._setupPerformanceMonitoring();

            this.isInitialized = true;
            console.log('✅ Firebase Manager initialized successfully');

            return true;
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            this._logError('firebase_init_error', error);
            throw error;
        }
    }

    /**
     * Enhanced document retrieval with caching
     */
    async get(collection, docId = null, options = {}) {
        try {
            this._incrementMetric('operations');

            if (!this.isInitialized) {
                throw new Error('Firebase not initialized');
            }

            const cacheKey = `${collection}_${docId || 'all'}_${JSON.stringify(options)}`;

            // Check cache first
            if (this._shouldUseCache(options) && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < DB_CONFIG.CACHE_DURATION) {
                    this._incrementMetric('cacheHits');
                    return cached.data;
                } else {
                    this.cache.delete(cacheKey);
                }
            }

            this._incrementMetric('cacheMisses');

            let query = this.db.collection(collection);
            let result;

            if (docId) {
                // Get single document
                const doc = await query.doc(docId).get();
                result = doc.exists ? { id: doc.id, ...doc.data() } : null;
            } else {
                // Get collection with filters
                query = this._applyFilters(query, options);
                query = this._applySort(query, options);
                query = this._applyPagination(query, options);

                const snapshot = await query.get();
                result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }

            // Cache the result
            if (this._shouldUseCache(options)) {
                this._cacheResult(cacheKey, result);
            }

            await this._logActivity('database_read', {
                collection,
                docId,
                resultCount: Array.isArray(result) ? result.length : (result ? 1 : 0)
            });

            return result;
        } catch (error) {
            this._incrementMetric('errors');
            console.error(`❌ Error getting data from ${collection}:`, error);
            this._logError('database_read_error', error, { collection, docId });

            // Attempt retry for transient errors
            if (this._isRetryableError(error) && options.retry !== false) {
                return this._retryOperation('get', [collection, docId, { ...options, retry: false }]);
            }

            throw error;
        }
    }

    /**
     * Enhanced document creation with validation
     */
    async create(collection, data, options = {}) {
        try {
            this._incrementMetric('operations');

            if (!this.isInitialized) {
                throw new Error('Firebase not initialized');
            }

            // Validate and sanitize data
            const sanitizedData = await this._validateAndSanitizeData(collection, data, 'create');

            // Add metadata
            const docData = {
                ...sanitizedData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: this._getCurrentUserId(),
                version: 1
            };

            let docRef;
            if (options.docId) {
                docRef = this.db.collection(collection).doc(options.docId);
                await docRef.set(docData);
            } else {
                docRef = await this.db.collection(collection).add(docData);
            }

            // Invalidate relevant cache entries
            this._invalidateCache(collection);

            await this._logActivity('database_create', {
                collection,
                docId: docRef.id,
                dataKeys: Object.keys(sanitizedData)
            });

            return docRef.id;
        } catch (error) {
            this._incrementMetric('errors');
            console.error(`❌ Error creating document in ${collection}:`, error);
            this._logError('database_create_error', error, { collection, data: Object.keys(data) });

            if (this._isRetryableError(error) && options.retry !== false) {
                return this._retryOperation('create', [collection, data, { ...options, retry: false }]);
            }

            throw error;
        }
    }

    /**
     * Enhanced document update with optimistic locking
     */
    async update(collection, docId, data, options = {}) {
        try {
            this._incrementMetric('operations');

            if (!this.isInitialized) {
                throw new Error('Firebase not initialized');
            }

            // Validate and sanitize data
            const sanitizedData = await this._validateAndSanitizeData(collection, data, 'update');

            const docRef = this.db.collection(collection).doc(docId);

            // Optimistic locking if version is provided
            if (options.expectedVersion) {
                await this.db.runTransaction(async (transaction) => {
                    const doc = await transaction.get(docRef);
                    if (!doc.exists) {
                        throw new Error('Document not found');
                    }

                    const currentVersion = doc.data().version || 1;
                    if (currentVersion !== options.expectedVersion) {
                        throw new Error('Document version mismatch - concurrent update detected');
                    }

                    const updateData = {
                        ...sanitizedData,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedBy: this._getCurrentUserId(),
                        version: currentVersion + 1
                    };

                    transaction.update(docRef, updateData);
                });
            } else {
                // Simple update
                const updateData = {
                    ...sanitizedData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: this._getCurrentUserId()
                };

                await docRef.update(updateData);
            }

            // Invalidate cache
            this._invalidateCache(collection, docId);

            await this._logActivity('database_update', {
                collection,
                docId,
                updateKeys: Object.keys(sanitizedData)
            });

            return true;
        } catch (error) {
            this._incrementMetric('errors');
            console.error(`❌ Error updating document ${docId} in ${collection}:`, error);
            this._logError('database_update_error', error, { collection, docId, data: Object.keys(data) });

            if (this._isRetryableError(error) && options.retry !== false) {
                return this._retryOperation('update', [collection, docId, data, { ...options, retry: false }]);
            }

            throw error;
        }
    }

    /**
     * Enhanced document deletion with soft delete option
     */
    async delete(collection, docId, options = {}) {
        try {
            this._incrementMetric('operations');

            if (!this.isInitialized) {
                throw new Error('Firebase not initialized');
            }

            const docRef = this.db.collection(collection).doc(docId);

            if (options.softDelete) {
                // Soft delete - mark as deleted
                await docRef.update({
                    deleted: true,
                    deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    deletedBy: this._getCurrentUserId()
                });
            } else {
                // Hard delete
                await docRef.delete();
            }

            // Invalidate cache
            this._invalidateCache(collection, docId);

            await this._logActivity('database_delete', {
                collection,
                docId,
                softDelete: !!options.softDelete
            });

            return true;
        } catch (error) {
            this._incrementMetric('errors');
            console.error(`❌ Error deleting document ${docId} from ${collection}:`, error);
            this._logError('database_delete_error', error, { collection, docId });

            if (this._isRetryableError(error) && options.retry !== false) {
                return this._retryOperation('delete', [collection, docId, { ...options, retry: false }]);
            }

            throw error;
        }
    }

    /**
     * Batch operations for multiple documents
     */
    async batchWrite(operations) {
        try {
            this._incrementMetric('operations');

            if (!this.isInitialized) {
                throw new Error('Firebase not initialized');
            }

            const batches = this._splitIntoBatches(operations, DB_CONFIG.BATCH_SIZE);
            const results = [];

            for (const batchOps of batches) {
                const batch = this.db.batch();

                for (const op of batchOps) {
                    const docRef = this.db.collection(op.collection).doc(op.docId);

                    switch (op.type) {
                        case 'create':
                        case 'set':
                            batch.set(docRef, {
                                ...op.data,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                createdBy: this._getCurrentUserId()
                            });
                            break;
                        case 'update':
                            batch.update(docRef, {
                                ...op.data,
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                updatedBy: this._getCurrentUserId()
                            });
                            break;
                        case 'delete':
                            batch.delete(docRef);
                            break;
                    }
                }

                await batch.commit();
                results.push(`Batch ${results.length + 1} completed`);
            }

            // Invalidate cache for all affected collections
            const affectedCollections = [...new Set(operations.map(op => op.collection))];
            affectedCollections.forEach(collection => this._invalidateCache(collection));

            await this._logActivity('database_batch_write', {
                operationCount: operations.length,
                batchCount: batches.length,
                collections: affectedCollections
            });

            return results;
        } catch (error) {
            this._incrementMetric('errors');
            console.error('❌ Error in batch write:', error);
            this._logError('database_batch_error', error, { operationCount: operations.length });
            throw error;
        }
    }

    /**
     * Real-time listener with automatic cleanup
     */
    createListener(collection, callback, options = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase not initialized');
            }

            let query = this.db.collection(collection);
            query = this._applyFilters(query, options);
            query = this._applySort(query, options);

            const unsubscribe = query.onSnapshot(
                (snapshot) => {
                    try {
                        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        callback(docs, null);
                    } catch (error) {
                        console.error('Error processing snapshot:', error);
                        callback(null, error);
                    }
                },
                (error) => {
                    console.error('Snapshot listener error:', error);
                    this._logError('database_listener_error', error, { collection });
                    callback(null, error);
                }
            );

            // Return enhanced unsubscribe function
            return () => {
                try {
                    unsubscribe();
                    console.log(`📱 Listener for ${collection} unsubscribed`);
                } catch (error) {
                    console.error('Error unsubscribing listener:', error);
                }
            };
        } catch (error) {
            console.error('❌ Error creating listener:', error);
            this._logError('database_listener_create_error', error, { collection });
            throw error;
        }
    }

    /**
     * Aggregate queries with caching
     */
    async aggregate(collection, aggregations, options = {}) {
        try {
            this._incrementMetric('operations');

            const cacheKey = `aggregate_${collection}_${JSON.stringify(aggregations)}_${JSON.stringify(options)}`;

            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < DB_CONFIG.CACHE_DURATION) {
                    this._incrementMetric('cacheHits');
                    return cached.data;
                }
            }

            let query = this.db.collection(collection);
            query = this._applyFilters(query, options);

            const snapshot = await query.get();
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const results = {};

            for (const [key, aggregation] of Object.entries(aggregations)) {
                switch (aggregation.type) {
                    case 'count':
                        results[key] = docs.length;
                        break;
                    case 'sum':
                        results[key] = docs.reduce((sum, doc) => sum + (doc[aggregation.field] || 0), 0);
                        break;
                    case 'avg':
                        const values = docs.map(doc => doc[aggregation.field] || 0);
                        results[key] = values.length ? values.reduce((a, b) => a + b) / values.length : 0;
                        break;
                    case 'min':
                        results[key] = Math.min(...docs.map(doc => doc[aggregation.field] || Infinity));
                        break;
                    case 'max':
                        results[key] = Math.max(...docs.map(doc => doc[aggregation.field] || -Infinity));
                        break;
                }
            }

            this._cacheResult(cacheKey, results);
            return results;
        } catch (error) {
            this._incrementMetric('errors');
            console.error('❌ Error in aggregation:', error);
            this._logError('database_aggregate_error', error, { collection });
            throw error;
        }
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.cache.size,
            cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
            retryQueue: this.retryQueue.length
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Firebase cache cleared');
    }

    // Private methods
    _applyFilters(query, options) {
        if (!options.filters) return query;

        for (const filter of options.filters) {
            switch (filter.operator) {
                case '==':
                    query = query.where(filter.field, '==', filter.value);
                    break;
                case '!=':
                    query = query.where(filter.field, '!=', filter.value);
                    break;
                case '>':
                    query = query.where(filter.field, '>', filter.value);
                    break;
                case '>=':
                    query = query.where(filter.field, '>=', filter.value);
                    break;
                case '<':
                    query = query.where(filter.field, '<', filter.value);
                    break;
                case '<=':
                    query = query.where(filter.field, '<=', filter.value);
                    break;
                case 'in':
                    query = query.where(filter.field, 'in', filter.value);
                    break;
                case 'array-contains':
                    query = query.where(filter.field, 'array-contains', filter.value);
                    break;
                case 'array-contains-any':
                    query = query.where(filter.field, 'array-contains-any', filter.value);
                    break;
            }
        }

        return query;
    }

    _applySort(query, options) {
        if (!options.orderBy) return query;

        for (const sort of options.orderBy) {
            query = query.orderBy(sort.field, sort.direction || 'asc');
        }

        return query;
    }

    _applyPagination(query, options) {
        if (options.limit) {
            query = query.limit(options.limit);
        }

        if (options.startAfter) {
            query = query.startAfter(options.startAfter);
        }

        if (options.startAt) {
            query = query.startAt(options.startAt);
        }

        return query;
    }

    async _validateAndSanitizeData(collection, data, operation) {
        try {
            // Use sanitizer if available
            if (typeof window !== 'undefined' && window.sanitizer) {
                switch (collection) {
                    case DB_CONFIG.COLLECTIONS.LEADS:
                        const leadResult = window.sanitizer.sanitizeLeadData(data);
                        if (!leadResult.isValid) {
                            throw new Error(`Lead validation failed: ${Object.values(leadResult.errors).join(', ')}`);
                        }
                        return leadResult.sanitizedData;

                    case DB_CONFIG.COLLECTIONS.USERS:
                        const userResult = window.sanitizer.sanitizeUserData(data);
                        if (!userResult.isValid) {
                            throw new Error(`User validation failed: ${Object.values(userResult.errors).join(', ')}`);
                        }
                        return userResult.sanitizedData;

                    default:
                        // Basic sanitization for other collections
                        const sanitized = {};
                        for (const [key, value] of Object.entries(data)) {
                            sanitized[key] = window.sanitizer.sanitize(value, 'text');
                        }
                        return sanitized;
                }
            }

            // Fallback sanitization
            return this._basicSanitization(data);
        } catch (error) {
            console.error('Data validation/sanitization failed:', error);
            throw error;
        }
    }

    _basicSanitization(data) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = value
                    .replace(/[<>]/g, '')
                    .replace(/javascript:/gi, '')
                    .trim()
                    .slice(0, 1000);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    _getCurrentUserId() {
        if (typeof window !== 'undefined' && window.authGuard) {
            return window.authGuard.getCurrentUser()?.uid || 'system';
        }
        return 'system';
    }

    _shouldUseCache(options) {
        return options.cache !== false && !options.realtime;
    }

    _cacheResult(key, data) {
        if (this.cache.size >= DB_CONFIG.MAX_CACHE_SIZE) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    _invalidateCache(collection, docId = null) {
        const keysToDelete = [];

        for (const key of this.cache.keys()) {
            if (key.startsWith(collection)) {
                if (!docId || key.includes(docId)) {
                    keysToDelete.push(key);
                }
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    _isRetryableError(error) {
        const retryableCodes = [
            'unavailable',
            'deadline-exceeded',
            'internal',
            'cancelled',
            'unknown'
        ];

        return retryableCodes.includes(error.code) ||
               error.message?.includes('network') ||
               error.message?.includes('timeout');
    }

    async _retryOperation(method, args) {
        return new Promise((resolve, reject) => {
            const operation = {
                method,
                args,
                attempts: 0,
                resolve,
                reject
            };

            this.retryQueue.push(operation);
            this._processRetryQueue();
        });
    }

    async _processRetryQueue() {
        if (this.retryQueue.length === 0) return;

        const operation = this.retryQueue.shift();
        operation.attempts++;

        if (operation.attempts > DB_CONFIG.RETRY_ATTEMPTS) {
            operation.reject(new Error('Max retry attempts exceeded'));
            return;
        }

        try {
            await new Promise(resolve => setTimeout(resolve, DB_CONFIG.RETRY_DELAY * operation.attempts));
            const result = await this[operation.method](...operation.args);
            operation.resolve(result);
            this._incrementMetric('retries');
        } catch (error) {
            if (this._isRetryableError(error)) {
                this.retryQueue.unshift(operation); // Put back at front
                setTimeout(() => this._processRetryQueue(), DB_CONFIG.RETRY_DELAY * operation.attempts);
            } else {
                operation.reject(error);
            }
        }
    }

    _splitIntoBatches(operations, batchSize) {
        const batches = [];
        for (let i = 0; i < operations.length; i += batchSize) {
            batches.push(operations.slice(i, i + batchSize));
        }
        return batches;
    }

    _setupConnectionMonitoring() {
        if (typeof window === 'undefined') return;

        let isOnline = navigator.onLine;

        const updateConnectionStatus = (online) => {
            if (online !== isOnline) {
                isOnline = online;
                console.log(`🌐 Connection status: ${online ? 'Online' : 'Offline'}`);

                if (this.securityUtils) {
                    this.securityUtils.logSecurityIncident('connection_status_change', {
                        online,
                        timestamp: Date.now()
                    });
                }
            }
        };

        window.addEventListener('online', () => updateConnectionStatus(true));
        window.addEventListener('offline', () => updateConnectionStatus(false));
    }

    _setupPerformanceMonitoring() {
        // Monitor operation performance
        setInterval(() => {
            const metrics = this.getMetrics();
            if (metrics.operations > 0) {
                console.log('📊 Firebase Performance:', {
                    operations: metrics.operations,
                    cacheHitRate: `${(metrics.cacheHitRate * 100).toFixed(1)}%`,
                    errors: metrics.errors,
                    retries: metrics.retries
                });
            }
        }, 60000); // Every minute
    }

    _incrementMetric(metric) {
        this.metrics[metric] = (this.metrics[metric] || 0) + 1;
    }

    async _logActivity(action, details) {
        try {
            if (typeof window !== 'undefined' && window.authGuard) {
                await window.authGuard.logActivity(action, details);
            }
        } catch (error) {
            console.error('Failed to log activity:', error);
        }
    }

    _logError(type, error, context = {}) {
        console.error(`Database Error [${type}]:`, error, context);

        if (this.securityUtils) {
            this.securityUtils.logSecurityIncident(type, {
                error: error.message,
                code: error.code,
                context
            });
        }
    }
}

/**
 * Specialized Database Operations
 * Higher-level operations for specific business logic
 */
class DatabaseOperations {
    constructor(firebaseManager) {
        this.fm = firebaseManager;
    }

    // Lead Operations
    async getLeadsForUser(userId, role = 'user') {
        try {
            let filters = [];

            switch (role) {
                case 'admin':
                    // Admin sees all leads
                    break;
                case 'master':
                    // Master sees team leads - would need team member IDs
                    const teamMembers = await this.getTeamMembers(userId);
                    const teamIds = [userId, ...teamMembers.map(m => m.id)];
                    filters.push({ field: 'assignedTo', operator: 'in', value: teamIds });
                    break;
                case 'user':
                default:
                    // User sees only assigned leads
                    filters.push({ field: 'assignedTo', operator: '==', value: userId });
                    break;
            }

            return await this.fm.get(DB_CONFIG.COLLECTIONS.LEADS, null, {
                filters,
                orderBy: [{ field: 'createdAt', direction: 'desc' }]
            });
        } catch (error) {
            console.error('Error getting leads for user:', error);
            throw error;
        }
    }

    async getTeamMembers(masterId) {
        return await this.fm.get(DB_CONFIG.COLLECTIONS.USERS, null, {
            filters: [{ field: 'linkedMaster', operator: '==', value: masterId }]
        });
    }

    async getUserStats(userId, role) {
        try {
            const aggregations = {
                totalLeads: { type: 'count' },
                activeLeads: { type: 'count' }, // Would need custom filter
                completedLeads: { type: 'count' } // Would need custom filter
            };

            let filters = [];
            if (role !== 'admin') {
                filters.push({ field: 'assignedTo', operator: '==', value: userId });
            }

            // This is simplified - in practice you'd need separate queries for different statuses
            const leads = await this.fm.get(DB_CONFIG.COLLECTIONS.LEADS, null, { filters });

            return {
                totalLeads: leads.length,
                activeLeads: leads.filter(lead => !['closed', 'dropped'].includes(lead.status)).length,
                completedLeads: leads.filter(lead => ['closed', 'booked'].includes(lead.status)).length
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    }

    // Activity Logging
    async logActivity(action, details = {}) {
        try {
            const activityData = {
                action,
                details,
                userId: this._getCurrentUserId(),
                userRole: this._getCurrentUserRole(),
                timestamp: Date.now(),
                sessionId: this._getSessionId(),
                ipAddress: await this._getClientIP(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
            };

            await this.fm.create(DB_CONFIG.COLLECTIONS.ACTIVITY_LOGS, activityData);
        } catch (error) {
            console.error('Failed to log activity:', error);
        }
    }

    // Security Operations
    async createSecurityAlert(type, severity, details) {
        try {
            const alertData = {
                type,
                severity,
                details,
                userId: this._getCurrentUserId(),
                resolved: false,
                createdAt: Date.now()
            };

            return await this.fm.create(DB_CONFIG.COLLECTIONS.SECURITY_ALERTS, alertData);
        } catch (error) {
            console.error('Failed to create security alert:', error);
            throw error;
        }
    }

    async getSecurityAlerts(options = {}) {
        const filters = [
            { field: 'resolved', operator: '==', value: false }
        ];

        if (options.severity) {
            filters.push({ field: 'severity', operator: '==', value: options.severity });
        }

        return await this.fm.get(DB_CONFIG.COLLECTIONS.SECURITY_ALERTS, null, {
            filters,
            orderBy: [{ field: 'createdAt', direction: 'desc' }],
            limit: options.limit || 50
        });
    }

    // Backup Operations
    async createBackup(collection, description) {
        try {
            const data = await this.fm.get(collection);

            const backupData = {
                collection,
                description,
                data,
                timestamp: Date.now(),
                createdBy: this._getCurrentUserId(),
                size: JSON.stringify(data).length
            };

            return await this.fm.create(DB_CONFIG.COLLECTIONS.BACKUPS, backupData);
        } catch (error) {
            console.error('Failed to create backup:', error);
            throw error;
        }
    }

    async getRecentBackups(limit = 10) {
        return await this.fm.get(DB_CONFIG.COLLECTIONS.BACKUPS, null, {
            orderBy: [{ field: 'timestamp', direction: 'desc' }],
            limit
        });
    }

    // Data Export
    async exportData(collection, format = 'json', options = {}) {
        try {
            const data = await this.fm.get(collection, null, options);

            let exportData;
            switch (format) {
                case 'csv':
                    exportData = this._convertToCSV(data);
                    break;
                case 'json':
                default:
                    exportData = JSON.stringify(data, null, 2);
                    break;
            }

            // Log export activity
            await this.logActivity('data_export', {
                collection,
                format,
                recordCount: data.length,
                size: exportData.length
            });

            return {
                data: exportData,
                filename: `${collection}_export_${new Date().toISOString().split('T')[0]}.${format}`,
                mimeType: format === 'csv' ? 'text/csv' : 'application/json'
            };
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }

    // Utility Methods
    _getCurrentUserId() {
        if (typeof window !== 'undefined' && window.authGuard) {
            return window.authGuard.getCurrentUser()?.uid || 'anonymous';
        }
        return 'system';
    }

    _getCurrentUserRole() {
        if (typeof window !== 'undefined' && window.authGuard) {
            return window.authGuard.getCurrentRole() || 'unknown';
        }
        return 'system';
    }

    _getSessionId() {
        try {
            const session = JSON.parse(localStorage.getItem('crm_session') || '{}');
            return session.sessionId || 'no-session';
        } catch {
            return 'no-session';
        }
    }

    async _getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return 'unknown';
        }
    }

    _convertToCSV(data) {
        if (!data || data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [];

        // Add headers
        csvRows.push(headers.join(','));

        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                // Handle complex objects and arrays
                let cellValue = '';
                if (value === null || value === undefined) {
                    cellValue = '';
                } else if (typeof value === 'object') {
                    if (value.seconds) { // Firestore timestamp
                        cellValue = new Date(value.seconds * 1000).toISOString();
                    } else {
                        cellValue = JSON.stringify(value);
                    }
                } else {
                    cellValue = String(value);
                }

                // Escape quotes and wrap in quotes if contains comma
                const escaped = cellValue.replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            });
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    }
}

/**
 * Real-time Data Sync Manager
 * Manages real-time updates and synchronization
 */
class RealtimeManager {
    constructor(firebaseManager) {
        this.fm = firebaseManager;
        this.listeners = new Map();
        this.connectionState = 'disconnected';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    /**
     * Subscribe to real-time updates for a collection
     */
    subscribe(collection, callback, options = {}) {
        try {
            const listenerId = this._generateListenerId(collection, options);

            if (this.listeners.has(listenerId)) {
                console.warn(`Listener ${listenerId} already exists`);
                return this.listeners.get(listenerId).unsubscribe;
            }

            const unsubscribe = this.fm.createListener(collection, (data, error) => {
                if (error) {
                    console.error(`Real-time error for ${collection}:`, error);
                    this._handleConnectionError(error);
                    callback(null, error);
                } else {
                    this.connectionState = 'connected';
                    this.reconnectAttempts = 0;
                    callback(data, null);
                }
            }, options);

            this.listeners.set(listenerId, {
                collection,
                options,
                callback,
                unsubscribe,
                createdAt: Date.now()
            });

            console.log(`📡 Real-time listener created for ${collection}`);
            return unsubscribe;
        } catch (error) {
            console.error('Failed to create real-time subscription:', error);
            throw error;
        }
    }

    /**
     * Unsubscribe from real-time updates
     */
    unsubscribe(collection, options = {}) {
        const listenerId = this._generateListenerId(collection, options);
        const listener = this.listeners.get(listenerId);

        if (listener) {
            listener.unsubscribe();
            this.listeners.delete(listenerId);
            console.log(`📡 Real-time listener removed for ${collection}`);
        }
    }

    /**
     * Unsubscribe from all listeners
     */
    unsubscribeAll() {
        for (const [listenerId, listener] of this.listeners) {
            try {
                listener.unsubscribe();
            } catch (error) {
                console.error(`Error unsubscribing listener ${listenerId}:`, error);
            }
        }
        this.listeners.clear();
        console.log('📡 All real-time listeners removed');
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            state: this.connectionState,
            reconnectAttempts: this.reconnectAttempts,
            activeListeners: this.listeners.size,
            listeners: Array.from(this.listeners.entries()).map(([id, listener]) => ({
                id,
                collection: listener.collection,
                createdAt: listener.createdAt,
                age: Date.now() - listener.createdAt
            }))
        };
    }

    // Private methods
    _generateListenerId(collection, options) {
        return `${collection}_${JSON.stringify(options)}`;
    }

    _handleConnectionError(error) {
        this.connectionState = 'error';
        this.reconnectAttempts++;

        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
            const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
            console.log(`🔄 Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

            setTimeout(() => {
                this.connectionState = 'reconnecting';
                // The listeners will automatically reconnect when Firebase reconnects
            }, delay);
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.connectionState = 'failed';
        }
    }
}

/**
 * Firebase Cloud Functions Interface
 * Handles calls to Firebase Cloud Functions
 */
class CloudFunctions {
    constructor() {
        this.functions = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            if (typeof firebase !== 'undefined' && firebase.functions) {
                this.functions = firebase.functions();
                this.isInitialized = true;
                console.log('☁️ Cloud Functions initialized');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to initialize Cloud Functions:', error);
            return false;
        }
    }

    async call(functionName, data = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Cloud Functions not initialized');
            }

            const callable = this.functions.httpsCallable(functionName);
            const result = await callable(data);

            console.log(`☁️ Cloud function ${functionName} executed successfully`);
            return result.data;
        } catch (error) {
            console.error(`❌ Cloud function ${functionName} failed:`, error);
            throw error;
        }
    }

    // Specific function calls
    async createLead(leadData) {
        return await this.call('createLead', leadData);
    }

    async updateLead(leadId, updates) {
        return await this.call('updateLead', { leadId, updates });
    }

    async deleteLead(leadId) {
        return await this.call('deleteLead', { leadId });
    }

    async getUserStats(userId) {
        return await this.call('getUserStats', { userId });
    }

    async exportUserData(userId) {
        return await this.call('exportUserData', { userId });
    }

    async checkRateLimit(operation, maxAttempts, windowMs) {
        return await this.call('checkRateLimit', { operation, maxAttempts, windowMs });
    }
}

/**
 * Main Firebase Service
 * Coordinates all Firebase operations
 */
class FirebaseService {
    constructor() {
        this.manager = new FirebaseManager();
        this.operations = null;
        this.realtime = null;
        this.cloudFunctions = new CloudFunctions();
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('🚀 Initializing Firebase Service...');

            // Initialize Firebase Manager
            await this.manager.init();

            // Initialize subsystems
            this.operations = new DatabaseOperations(this.manager);
            this.realtime = new RealtimeManager(this.manager);

            // Initialize Cloud Functions (optional)
            await this.cloudFunctions.init();

            this.isInitialized = true;
            console.log('✅ Firebase Service initialized successfully');

            return true;
        } catch (error) {
            console.error('❌ Firebase Service initialization failed:', error);
            throw error;
        }
    }

    // Expose all functionality through a single interface
    get db() {
        return this.manager;
    }

    get ops() {
        return this.operations;
    }

    get rt() {
        return this.realtime;
    }

    get cf() {
        return this.cloudFunctions;
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            manager: this.manager.isInitialized,
            cloudFunctions: this.cloudFunctions.isInitialized,
            metrics: this.manager.getMetrics(),
            realtime: this.realtime.getConnectionStatus()
        };
    }
}

// ===================================
// GLOBAL INSTANCES AND INITIALIZATION
// ===================================

// Create global Firebase service instance
const firebaseService = new FirebaseService();

// Legacy compatibility - expose individual components
let db, auth;

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
    const initFirebase = async () => {
        try {
            await firebaseService.init();

            // Set up legacy compatibility
            db = firebaseService.db.db;
            auth = firebaseService.db.auth;

            // Make services globally available
            window.firebaseService = firebaseService;
            window.db = db;
            window.auth = auth;

            console.log('🔥 Firebase utilities ready for use');

            // Dispatch ready event
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('firebaseReady', {
                    detail: { service: firebaseService }
                }));
            }
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);

            // Dispatch error event
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('firebaseError', {
                    detail: { error }
                }));
            }
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFirebase);
    } else {
        initFirebase();
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = {
        FirebaseService,
        FirebaseManager,
        DatabaseOperations,
        RealtimeManager,
        CloudFunctions,
        FIREBASE_CONFIG,
        DB_CONFIG
    };
} else if (typeof window !== 'undefined') {
    // Browser
    window.FirebaseService = FirebaseService;
    window.FirebaseManager = FirebaseManager;
    window.DatabaseOperations = DatabaseOperations;
    window.RealtimeManager = RealtimeManager;
    window.CloudFunctions = CloudFunctions;
    window.FIREBASE_CONFIG = FIREBASE_CONFIG;
    window.DB_CONFIG = DB_CONFIG;
}

// Utility function for backward compatibility
async function logActivity(action, details = {}) {
    try {
        if (firebaseService.isInitialized) {
            await firebaseService.ops.logActivity(action, details);
        } else {
            console.warn('Firebase service not initialized, activity not logged:', action);
        }
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}

// Make logActivity globally available
if (typeof window !== 'undefined') {
    window.logActivity = logActivity;
}

console.log('🔥 Enhanced Firebase Utilities v2.0 Loaded');
console.log('📊 Features: Caching, retry logic, real-time sync, cloud functions, security logging');