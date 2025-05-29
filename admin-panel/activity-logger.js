// ===================================
// ENHANCED ACTIVITY LOGGER & MONITORING
// File: activity-logger.js
// Purpose: Centralized activity logging, real-time streams, and basic monitoring
// ===================================

/**
 * Manages all activity logging and provides methods for monitoring and reporting.
 */
class ActivityLogger {
    /**
     * @param {FirebaseService} firebaseService - Instance of the centralized FirebaseService.
     */
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
        this.db = this.firebaseService.db.db; // Access Firestore instance
        this.logStreamListeners = new Map(); // Store real-time listeners

        // Bind methods
        this.logActivity = this.logActivity.bind(this);
        this.loadActivityDashboard = this.loadActivityDashboard.bind(this);
        this.getRecentActivities = this.getRecentActivities.bind(this);
        this.subscribeToActivityStream = this.subscribeToActivityStream.bind(this);
        this.unsubscribeFromActivityStream = this.unsubscribeFromActivityStream.bind(this);
    }

    /**
     * Logs an activity event to Firestore.
     * This is the primary method for recording user and system actions.
     * @param {string} action - The action performed (e.g., 'login_success', 'create_lead').
     * @param {Object} details - Additional details about the action.
     * @returns {Promise<string>} The ID of the created activity log document.
     */
    async logActivity(action, details = {}) {
        try {
            // Ensure authGuard is available for user context
            const userId = authGuard.getCurrentUser()?.uid || 'anonymous';
            const userRole = authGuard.getCurrentRole() || 'unknown';
            const sessionId = authGuard.sessionManager.validateSession()?.sessionId || 'no-session';
            const ipAddress = await authGuard.getClientIP(); // Use authGuard's IP fetching
            const userAgent = navigator.userAgent || 'Unknown';

            const activityData = {
                action,
                details: { ...details, userAgent, ipAddress }, // Add common details
                userId,
                userRole,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                clientTimestamp: Date.now(), // Client-side timestamp for ordering during outages
                sessionId,
            };

            const docId = await this.firebaseService.db.create(DB_CONFIG.COLLECTIONS.ACTIVITY_LOGS, activityData);

            console.log(`📝 Activity Logged: ${action} by ${userId}`);
            return docId;
        } catch (error) {
            console.error('❌ Failed to log activity:', error);
            // Log security incident if activity logging itself fails
            authGuard.securityUtils.logSecurityIncident('activity_log_failed', {
                action,
                error: error.message,
                details: details.action
            });
            throw error; // Re-throw to indicate failure
        }
    }

    /**
     * Loads the Activity Dashboard section.
     * This method will render the UI for activity monitoring and analytics.
     * @returns {Promise<void>}
     */
    async loadActivityDashboard() {
        if (!authGuard.hasPermission('reports:view')) { // Or specific 'security:monitor'
            authGuard.showAccessDenied('You do not have permission to view activity logs.');
            return;
        }

        console.log('📊 Loading Activity Dashboard...');
        UIHelpers.showLoading('Loading Activity Dashboard...');

        const targetSection = document.getElementById('reports-section');
        if (!targetSection) {
            UIHelpers.error('Reports section not found.');
            return;
        }

        targetSection.innerHTML = `
            <div class="activity-dashboard-panel">
                <div class="panel-header">
                    <div class="panel-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                        </svg>
                        Activity & Security Logs
                    </div>
                    <div class="panel-controls">
                        <button class="enhanced-btn enhanced-btn-secondary" id="refresh-logs-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23,4 23,10 17,10"/>
                                <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10"/>
                            </svg>
                            Refresh
                        </button>
                        <div class="enhanced-search-box">
                            <input type="text" id="activity-search" placeholder="Search activity..." onkeyup="activityLogger.searchActivities(this.value)">
                            <div class="search-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="11" cy="11" r="8"/>
                                    <path d="M21 21l-4.35-4.35"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="activity-metrics-grid">
                    <div class="enhanced-stat-card">
                        <div class="enhanced-stat-header">
                            <div class="enhanced-stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                            </div>
                        </div>
                        <div class="enhanced-stat-number" id="total-logs">0</div>
                        <div class="enhanced-stat-label">Total Logs (24h)</div>
                    </div>
                    <div class="enhanced-stat-card">
                        <div class="enhanced-stat-header">
                            <div class="enhanced-stat-icon" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            </div>
                        </div>
                        <div class="enhanced-stat-number" id="security-incidents">0</div>
                        <div class="enhanced-stat-label">Security Incidents</div>
                    </div>
                    <div class="enhanced-stat-card">
                        <div class="enhanced-stat-header">
                            <div class="enhanced-stat-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                        </div>
                        <div class="enhanced-stat-number" id="successful-logins">0</div>
                        <div class="enhanced-stat-label">Successful Logins (24h)</div>
                    </div>
                </div>

                <div class="activity-table-container data-table-container">
                    <div class="table-header">
                        <h3>Recent Logs</h3>
                        <div class="activity-filters">
                            <button class="premium-filter-btn active" data-filter="all" onclick="activityLogger.filterLogs('all')">All</button>
                            <button class="premium-filter-btn" data-filter="security" onclick="activityLogger.filterLogs('security')">Security</button>
                            <button class="premium-filter-btn" data-filter="user_actions" onclick="activityLogger.filterLogs('user_actions')">User Actions</button>
                        </div>
                    </div>
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Action</th>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Details</th>
                                    <th>IP Address</th>
                                    <th>Session ID</th>
                                </tr>
                            </thead>
                            <tbody id="activity-logs-table-body">
                                <tr><td colspan="7" class="loading-row">Loading activity logs...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        this._setupActivityDashboardListeners();
        await this.populateActivityDashboard(); // Fetch and display initial data

        UIHelpers.hideLoading();
    }

    /**
     * Sets up event listeners for the activity dashboard.
     * @private
     */
    _setupActivityDashboardListeners() {
        document.getElementById('refresh-logs-btn')?.addEventListener('click', () => this.populateActivityDashboard());
    }

    /**
     * Fetches and populates the activity dashboard with data.
     * @returns {Promise<void>}
     */
    async populateActivityDashboard() {
        UIHelpers.showLoading('Fetching logs...');
        try {
            // Fetch logs for the last 24 hours
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const logs = await this.firebaseService.db.get(DB_CONFIG.COLLECTIONS.ACTIVITY_LOGS, null, {
                filters: [{ field: 'timestamp', operator: '>', value: twentyFourHoursAgo }],
                orderBy: [{ field: 'timestamp', direction: 'desc' }],
                limit: 200 // Fetch a reasonable number for display
            });
            this.allLogs = logs; // Store for client-side filtering/searching

            // Update metrics
            document.getElementById('total-logs').textContent = logs.length.toString();
            document.getElementById('security-incidents').textContent = logs.filter(log =>
                log.action.includes('security_') || log.action.includes('_failed') || log.action.includes('suspicious_')
            ).length.toString();
            document.getElementById('successful-logins').textContent = logs.filter(log =>
                log.action === 'login_success'
            ).length.toString();

            this._renderLogsTable(logs); // Render initial table content
        } catch (error) {
            console.error('❌ Error populating activity dashboard:', error);
            UIHelpers.error('Failed to load activity dashboard data.');
        } finally {
            UIHelpers.hideLoading();
        }
    }

    /**
     * Renders activity logs into the table.
     * @param {Array<Object>} logs - Array of activity log objects.
     * @private
     */
    _renderLogsTable(logs) {
        const tableBody = document.getElementById('activity-logs-table-body');
        if (!tableBody) return;

        if (logs.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">No activity logs found.</td></tr>';
            return;
        }

        tableBody.innerHTML = logs.map(log => {
            const timestamp = log.timestamp ? (log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp)) : new Date(0);
            const formattedTimestamp = DataUtils.formatDate(timestamp, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const details = JSON.stringify(log.details || {}); // Display raw details for now

            return `
                <tr>
                    <td>${formattedTimestamp}</td>
                    <td>${sanitizer.sanitize(log.action, 'text')}</td>
                    <td>${sanitizer.sanitize(log.userId, 'text')}</td>
                    <td>${sanitizer.sanitize(log.userRole || 'unknown', 'text')}</td>
                    <td title="${sanitizer.sanitize(details, 'text')}">${sanitizer.sanitize(details.substring(0, 50) + '...', 'text')}</td>
                    <td>${sanitizer.sanitize(log.details?.ipAddress || 'N/A', 'text')}</td>
                    <td>${sanitizer.sanitize(log.sessionId || 'N/A', 'text')}</td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Filters logs displayed in the table based on activity type.
     * @param {'all' | 'security' | 'user_actions'} filterType - The type of logs to filter by.
     */
    filterLogs(filterType) {
        const currentLogs = this.allLogs || [];
        let filtered = [];

        const filterButtons = document.querySelectorAll('.activity-filters .premium-filter-btn');
        filterButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.activity-filters [data-filter="${filterType}"]`)?.classList.add('active');

        switch (filterType) {
            case 'security':
                filtered = currentLogs.filter(log =>
                    log.action.includes('security_') || log.action.includes('_failed') || log.action.includes('suspicious_') ||
                    log.action.includes('auth_error') || log.action.includes('session_') || log.action.includes('password_reset_failed')
                );
                break;
            case 'user_actions':
                filtered = currentLogs.filter(log =>
                    !log.action.includes('security_') && !log.action.includes('_failed') && !log.action.includes('suspicious_') &&
                    log.action !== 'auth_error' && !log.action.includes('session_') && log.action !== 'password_reset_failed' &&
                    log.userId !== 'anonymous' && log.userId !== 'system' // Exclude system/anonymous logs
                );
                break;
            case 'all':
            default:
                filtered = currentLogs;
                break;
        }

        this._renderLogsTable(filtered);
    }

    /**
     * Searches through the displayed activity logs.
     * @param {string} searchTerm - The search term.
     */
    searchActivities(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const logsToSearch = this.allLogs || [];

        const filteredLogs = logsToSearch.filter(log => {
            const logString = `${log.action} ${log.userId} ${log.userRole} ${JSON.stringify(log.details)}`.toLowerCase();
            return logString.includes(term);
        });

        this._renderLogsTable(filteredLogs);
    }

    /**
     * Retrieves recent activity logs.
     * @param {number} limit - Maximum number of logs to retrieve.
     * @returns {Promise<Array<Object>>} Array of recent activity logs.
     */
    async getRecentActivities(limit = 10) {
        // This method can be used by other parts of the application (e.g., dashboard overview)
        // It fetches directly from Firestore.
        try {
            const logs = await this.firebaseService.db.get(DB_CONFIG.COLLECTIONS.ACTIVITY_LOGS, null, {
                orderBy: [{ field: 'timestamp', direction: 'desc' }],
                limit: limit
            });
            return logs;
        } catch (error) {
            console.error('❌ Error getting recent activities:', error);
            return [];
        }
    }

    /**
     * Subscribes to a real-time activity stream using Firestore listeners.
     * @param {Function} callback - Callback function to receive updates (data, error).
     * @param {Object} [options={}] - Options for filtering and ordering the stream.
     * @returns {Function} An unsubscribe function to stop the listener.
     */
    subscribeToActivityStream(callback, options = {}) {
        const listenerId = JSON.stringify(options); // Simple ID for now
        if (this.logStreamListeners.has(listenerId)) {
            console.warn('Already subscribed to this activity stream.');
            return this.logStreamListeners.get(listenerId);
        }

        // Use firebaseService.rt (RealtimeManager) for real-time capabilities
        const unsubscribe = this.firebaseService.rt.subscribe(
            DB_CONFIG.COLLECTIONS.ACTIVITY_LOGS,
            callback,
            {
                orderBy: [{ field: 'timestamp', direction: 'desc' }],
                limit: options.limit || 50,
                filters: options.filters,
                realtime: true // Explicitly request real-time updates
            }
        );

        this.logStreamListeners.set(listenerId, unsubscribe);
        console.log(`📡 Subscribed to activity stream with ID: ${listenerId}`);
        return unsubscribe;
    }

    /**
     * Unsubscribes from a real-time activity stream.
     * @param {Function} unsubscribeFunction - The function returned by `subscribeToActivityStream`.
     * @param {Object} [options={}] - The same options used during subscription to identify the listener.
     */
    unsubscribeFromActivityStream(unsubscribeFunction, options = {}) {
        const listenerId = JSON.stringify(options);
        if (this.logStreamListeners.has(listenerId)) {
            unsubscribeFunction();
            this.logStreamListeners.delete(listenerId);
            console.log(`📡 Unsubscribed from activity stream with ID: ${listenerId}`);
        } else {
            console.warn('No matching activity stream subscription found.');
        }
    }
}

// ===================================
// GLOBAL ACTIVITY LOGGER INSTANCE
// ===================================

// Ensure firebaseService is initialized before instantiating ActivityLogger
let activityLoggerInstance;
if (window.firebaseService) {
    activityLoggerInstance = new ActivityLogger(window.firebaseService);
} else {
    // Fallback or deferred initialization if firebaseService is not immediately available
    console.warn('FirebaseService not yet available, deferring ActivityLogger instantiation.');
    document.addEventListener('firebaseReady', (event) => {
        activityLoggerInstance = new ActivityLogger(event.detail.service);
        window.activityLogger = activityLoggerInstance; // Make it globally accessible
        console.log('✅ ActivityLogger instantiated after firebaseReady event.');
    });
}

// Export for global access
window.activityLogger = activityLoggerInstance;

// Override the global logActivity function with the new instance's method
// This ensures all existing `logActivity` calls use the new centralized logger.
if (window.logActivity) {
    const originalGlobalLogActivity = window.logActivity; // Keep a reference if needed
    window.logActivity = async (action, details) => {
        if (activityLoggerInstance) {
            return await activityLoggerInstance.logActivity(action, details);
        } else {
            console.warn('ActivityLogger not fully initialized, falling back to original logActivity.');
            return originalGlobalLogActivity(action, details);
        }
    };
} else {
    window.logActivity = async (action, details) => {
        if (activityLoggerInstance) {
            return await activityLoggerInstance.logActivity(action, details);
        } else {
            console.warn('ActivityLogger not available, cannot log activity:', action, details);
            return null;
        }
    };
}


console.log('✅ Enhanced Activity Logger Loaded');
console.log('🔧 Available functions for ActivityLogger: logActivity(), loadActivityDashboard(), getRecentActivities(), subscribeToActivityStream(), unsubscribeFromActivityStream()');