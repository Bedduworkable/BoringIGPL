/**
 * ===================================
 * ENHANCED AUTHENTICATION & AUTHORIZATION SYSTEM
 * File: auth-guard.js
 * Version: 2.0
 * Purpose: Comprehensive authentication, authorization, and security management
 * ===================================
 */

/**
 * Configuration constants for authentication system
 */
const AUTH_CONFIG = {
    // Session settings
    SESSION: {
        TIMEOUT: 30 * 60 * 1000, // 30 minutes
        CHECK_INTERVAL: 60 * 1000, // 1 minute
        STORAGE_KEY: 'crm_session',
        REFRESH_THRESHOLD: 5 * 60 * 1000 // 5 minutes before timeout
    },

    // Security settings
    SECURITY: {
        MAX_FAILED_ATTEMPTS: 5,
        LOCKOUT_TIME: 15 * 60 * 1000, // 15 minutes
        RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
        RAPID_CLICK_THRESHOLD: 50,
        RAPID_CLICK_WINDOW: 10 * 1000 // 10 seconds
    },

    // Role hierarchy and permissions
    ROLES: {
        HIERARCHY: ['user', 'master', 'admin'],
        PERMISSIONS: {
            admin: [
                'all', 'users:create', 'users:edit', 'users:delete', 'users:view',
                'leads:create', 'leads:edit', 'leads:delete', 'leads:view',
                'reports:view', 'settings:edit', 'system:admin', 'security:monitor'
            ],
            master: [
                'leads:own', 'leads:team', 'users:team', 'reports:read',
                'team:manage', 'leads:create', 'leads:edit', 'leads:view'
            ],
            user: [
                'leads:assigned', 'leads:created', 'profile:edit',
                'leads:view', 'leads:edit'
            ]
        }
    },

    // UI elements that should be hidden/shown based on roles
    UI_ELEMENTS: {
        admin: ['.admin-only'],
        master: ['.admin-only'],
        user: ['.admin-only', '.master-only']
    }
};

/**
 * Security Utilities Class
 * Handles security-related operations and monitoring
 */
class SecurityUtils {
    constructor() {
        this.incidents = [];
        this.rateLimits = new Map();
        this.securityMetrics = {
            totalIncidents: 0,
            blockedAttacks: 0,
            suspiciousActivity: 0
        };
    }

    /**
     * Enhanced input sanitization with security logging
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;

        const original = input;
        const sanitized = input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');

        if (original !== sanitized) {
            this.logSecurityIncident('input_sanitized', {
                original: original.slice(0, 100),
                sanitized: sanitized.slice(0, 100)
            });
        }

        return sanitized;
    }

    /**
     * Enhanced rate limiting with memory management
     */
    checkRateLimit(operation, maxAttempts = 5, windowMs = 60000) {
        const key = `${operation}_${Date.now()}`;
        const now = Date.now();

        // Clean old entries periodically
        if (this.rateLimits.size > 1000) {
            this._cleanRateLimits(windowMs);
        }

        // Count recent attempts
        const recentAttempts = Array.from(this.rateLimits.keys())
            .filter(k => k.startsWith(operation) && now - parseInt(k.split('_')[1]) < windowMs)
            .length;

        if (recentAttempts >= maxAttempts) {
            this.logSecurityIncident('rate_limit_exceeded', {
                operation,
                attempts: recentAttempts,
                maxAttempts,
                windowMs
            });
            return false;
        }

        this.rateLimits.set(key, true);
        return true;
    }

    /**
     * Advanced dangerous content detection
     */
    containsDangerousContent(str) {
        if (typeof str !== 'string') return false;

        const dangerousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe/gi,
            /<object/gi,
            /<embed/gi,
            /eval\s*\(/gi,
            /expression\s*\(/gi,
            /data:text\/html/gi,
            /vbscript:/gi,
            /<svg[^>]*onload/gi,
            //gi
        ];

        const isDangerous = dangerousPatterns.some(pattern => pattern.test(str));

        if (isDangerous) {
            this.logSecurityIncident('dangerous_content_detected', {
                content: str.slice(0, 200),
                patterns: dangerousPatterns.filter(p => p.test(str)).map(p => p.toString())
            });
        }

        return isDangerous;
    }

    /**
     * Generate cryptographically secure token
     */
    generateSecureToken(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const array = new Uint8Array(length);

        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(array);
            return Array.from(array, byte => chars[byte % chars.length]).join('');
        } else {
            // Fallback for older browsers
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }
    }

    /**
     * Log security incidents with enhanced details
     */
    logSecurityIncident(type, details = {}) {
        const incident = {
            id: this.generateSecureToken(16),
            type,
            details,
            timestamp: new Date().toISOString(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
            url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
            sessionId: this._getCurrentSessionId(),
            severity: this._calculateSeverity(type)
        };

        this.incidents.push(incident);
        this.securityMetrics.totalIncidents++;

        // Keep only recent incidents (memory management)
        if (this.incidents.length > 500) {
            this.incidents = this.incidents.slice(-400);
        }

        // Log to console in development
        if (this._isDevelopment()) {
            console.warn(`🚨 Security Incident [${incident.severity}]:`, incident);
        }

        // Send to external logging if available
        if (typeof gtag !== 'undefined') {
            gtag('event', 'security_incident', {
                event_category: 'security',
                event_label: type,
                custom_parameter_severity: incident.severity
            });
        }
    }

    /**
     * Get security metrics and recent incidents
     */
    getSecurityReport() {
        const recent = this.incidents.filter(
            incident => Date.now() - new Date(incident.timestamp).getTime() < 24 * 60 * 60 * 1000
        );

        return {
            metrics: { ...this.securityMetrics },
            recentIncidents: recent.length,
            highSeverityIncidents: recent.filter(i => i.severity === 'high').length,
            topIncidentTypes: this._getTopIncidentTypes(recent),
            rateLimitStatus: {
                activeKeys: this.rateLimits.size,
                memoryUsage: this.rateLimits.size * 50 // rough estimate
            }
        };
    }

    // Private methods
    _cleanRateLimits(windowMs) {
        const now = Date.now();
        const keysToDelete = [];

        for (const [key] of this.rateLimits) {
            const timestamp = parseInt(key.split('_')[1]);
            if (now - timestamp > windowMs) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.rateLimits.delete(key));
    }

    _getCurrentSessionId() {
        try {
            const session = JSON.parse(localStorage.getItem(AUTH_CONFIG.SESSION.STORAGE_KEY) || '{}');
            return session.sessionId || 'unknown';
        } catch {
            return 'unknown';
        }
    }

    _calculateSeverity(type) {
        const highSeverityTypes = [
            'dangerous_content_detected', 'rate_limit_exceeded', 'session_hijack_attempt',
            'privilege_escalation', 'sql_injection_attempt', 'xss_attempt'
        ];

        const mediumSeverityTypes = [
            'failed_login', 'suspicious_activity', 'invalid_token', 'session_timeout'
        ];

        if (highSeverityTypes.includes(type)) return 'high';
        if (mediumSeverityTypes.includes(type)) return 'medium';
        return 'low';
    }

    _isDevelopment() {
        return typeof window !== 'undefined' &&
               (window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.includes('dev'));
    }

    _getTopIncidentTypes(incidents) {
        const counts = {};
        incidents.forEach(incident => {
            counts[incident.type] = (counts[incident.type] || 0) + 1;
        });

        return Object.entries(counts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([type, count]) => ({ type, count }));
    }
}

/**
 * Permission System Class
 * Handles role-based access control and permissions
 */
class PermissionSystem {
    constructor(config = AUTH_CONFIG.ROLES) {
        this.config = config;
    }

    /**
     * Check if user has specific permission
     */
    hasPermission(userRole, permission) {
        if (!userRole || !this.config.PERMISSIONS[userRole]) {
            return false;
        }

        const rolePermissions = this.config.PERMISSIONS[userRole];
        return rolePermissions.includes('all') || rolePermissions.includes(permission);
    }

    /**
     * Check if user has any of the specified permissions
     */
    hasAnyPermission(userRole, permissions) {
        return permissions.some(permission => this.hasPermission(userRole, permission));
    }

    /**
     * Check if user has all specified permissions
     */
    hasAllPermissions(userRole, permissions) {
        return permissions.every(permission => this.hasPermission(userRole, permission));
    }

    /**
     * Check if user can access specific lead
     */
    canAccessLead(userRole, userId, lead) {
        if (!lead || !userId) return false;

        // Admin can access all leads
        if (userRole === 'admin') return true;

        // User can access leads they created or are assigned to
        if (lead.createdBy === userId || lead.assignedTo === userId) {
            return true;
        }

        // Master can access leads from their team
        if (userRole === 'master') {
            // This would require checking team relationships
            return this._isTeamMember(userId, lead.assignedTo);
        }

        return false;
    }

    /**
     * Get role hierarchy level (higher number = more privileges)
     */
    getRoleLevel(role) {
        return this.config.HIERARCHY.indexOf(role);
    }

    /**
     * Check if role1 has higher or equal privileges than role2
     */
    hasHigherOrEqualRole(role1, role2) {
        return this.getRoleLevel(role1) >= this.getRoleLevel(role2);
    }

    // Private method
    _isTeamMember(masterId, userId) {
        // This would need to be implemented based on your team structure
        // For now, return false as placeholder
        return false;
    }
}

/**
 * Session Manager Class
 * Handles session lifecycle and security
 */
class SessionManager {
    constructor(config = AUTH_CONFIG.SESSION) {
        this.config = config;
        this.sessionTimer = null;
        this.warningTimer = null;
        this.activityListeners = [];
        this.securityUtils = new SecurityUtils();
    }

    /**
     * Create new secure session
     */
    createSession(userId, userData) {
        const sessionData = {
            userId,
            userData,
            sessionId: this.securityUtils.generateSecureToken(32),
            startTime: Date.now(),
            lastActivity: Date.now(),
            fingerprint: this._generateFingerprint(),
            ipAddress: null, // Would be set by server
            userAgent: navigator.userAgent
        };

        try {
            localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(sessionData));
            this._startSessionMonitoring();
            this._setupActivityTracking();

            console.log('✅ Secure session created:', sessionData.sessionId);
            return sessionData;
        } catch (error) {
            this.securityUtils.logSecurityIncident('session_creation_failed', {
                error: error.message,
                userId: userId // Pass userId here for logging
            });
            throw new Error('Failed to create session');
        }
    }

    /**
     * Validate existing session
     */
    validateSession() {
        try {
            const sessionData = this._getSessionData();
            if (!sessionData) return null;

            const now = Date.now();
            const timeSinceActivity = now - sessionData.lastActivity;

            // Check if session expired
            if (timeSinceActivity > this.config.TIMEOUT) {
                this.securityUtils.logSecurityIncident('session_expired', {
                    sessionId: sessionData.sessionId,
                    inactiveTime: timeSinceActivity
                });
                this.destroySession();
                return null;
            }

            // Check for session hijacking
            const currentFingerprint = this._generateFingerprint();
            if (sessionData.fingerprint !== currentFingerprint) {
                this.securityUtils.logSecurityIncident('session_hijack_attempt', {
                    sessionId: sessionData.sessionId,
                    originalFingerprint: sessionData.fingerprint,
                    currentFingerprint
                });
                this.destroySession();
                return null;
            }

            // Update last activity
            sessionData.lastActivity = now;
            localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(sessionData));

            return sessionData;
        } catch (error) {
            this.securityUtils.logSecurityIncident('session_validation_error', {
                error: error.message
            });
            this.destroySession();
            return null;
        }
    }

    /**
     * Refresh session activity
     */
    refreshActivity() {
        const sessionData = this._getSessionData();
        if (sessionData) {
            sessionData.lastActivity = Date.now();
            localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(sessionData));
        }
    }

    /**
     * Destroy session securely
     */
    destroySession() {
        try {
            const sessionData = this._getSessionData();
            if (sessionData) {
                this.securityUtils.logSecurityIncident('session_destroyed', {
                    sessionId: sessionData.sessionId,
                    duration: Date.now() - sessionData.startTime
                });
            }

            localStorage.removeItem(this.config.STORAGE_KEY);
            this._stopSessionMonitoring();
            this._cleanupActivityTracking();

            console.log('🗑️ Session destroyed');
        } catch (error) {
            console.error('Error destroying session:', error);
        }
    }

    /**
     * Get time until session expires
     */
    getTimeUntilExpiry() {
        const sessionData = this._getSessionData();
        if (!sessionData) return 0;

        const timeSinceActivity = Date.now() - sessionData.lastActivity;
        return Math.max(0, this.config.TIMEOUT - timeSinceActivity);
    }

    /**
     * Check if session is close to expiring
     */
    isCloseToExpiry() {
        return this.getTimeUntilExpiry() < this.config.REFRESH_THRESHOLD;
    }

    // Private methods
    _getSessionData() {
        try {
            const data = localStorage.getItem(this.config.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }

    _generateFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Fingerprint', 2, 2);

        return btoa(JSON.stringify({
            canvas: canvas.toDataURL(),
            screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack
        }));
    }

    _startSessionMonitoring() {
        if (this.sessionTimer) clearInterval(this.sessionTimer);

        this.sessionTimer = setInterval(() => {
            const sessionData = this.validateSession();
            if (!sessionData) {
                this._handleSessionTimeout();
                return;
            }

            // Show warning if close to expiry
            if (this.isCloseToExpiry() && !this.warningTimer) {
                this._showExpiryWarning();
            }
        }, this.config.CHECK_INTERVAL);
    }

    _stopSessionMonitoring() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
    }

    _setupActivityTracking() {
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        const throttledRefresh = this._throttle(() => this.refreshActivity(), 5000);

        activityEvents.forEach(event => {
            document.addEventListener(event, throttledRefresh, { passive: true });
            this.activityListeners.push({ event, handler: throttledRefresh });
        });
    }

    _cleanupActivityTracking() {
        this.activityListeners.forEach(({ event, handler }) => {
            document.removeEventListener(event, handler);
        });
        this.activityListeners = [];
    }

    _handleSessionTimeout() {
        this._stopSessionMonitoring();

        if (typeof window !== 'undefined' && window.authGuard) {
            window.authGuard.handleSessionTimeout();
        }
    }

    _showExpiryWarning() {
        const timeLeft = Math.ceil(this.getTimeUntilExpiry() / 1000 / 60);

        if (typeof window !== 'undefined' && window.UIHelpers) {
            window.UIHelpers.showToast(
                `Your session will expire in ${timeLeft} minutes. Click anywhere to extend.`,
                'warning',
                10000
            );
        }

        this.warningTimer = setTimeout(() => {
            this.warningTimer = null;
        }, 60000);
    }

    _throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

/**
 * Main Authentication Guard Class
 * Coordinates authentication, authorization, and security
 */
class AuthGuard {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.isInitialized = false;

        // Initialize subsystems
        this.securityUtils = new SecurityUtils();
        this.permissionSystem = new PermissionSystem();
        this.sessionManager = new SessionManager();

        // Security monitoring
        this.failedAttempts = 0;
        this.securityMonitors = [];

        // Bind methods
        this.init = this.init.bind(this);
        this.signOut = this.signOut.bind(this);
        this.handleSessionTimeout = this.handleSessionTimeout.bind(this); // Ensure this is bound
    }

    /**
     * Initializes authentication system
     */
    async init() {
        try {
            console.log('🔐 Initializing Enhanced Authentication System...');

            this._initializeSecurityMonitoring(); // Setup dev tools, clicks etc.

            return new Promise((resolve) => {
                if (typeof firebase === 'undefined') {
                    console.error('Firebase not available');
                    resolve(false);
                    return;
                }

                firebase.auth().onAuthStateChanged(async (user) => {
                    try {
                        if (user) {
                            await this._handleUserAuthenticated(user);
                            resolve(true);
                        } else {
                            this._handleUserNotAuthenticated();
                            resolve(false);
                        }
                    } catch (error) {
                        console.error('Authentication error during init:', error);
                        // Use window.ErrorHandler as it's globally exposed by ui-components.js
                        if (window.ErrorHandler) {
                            window.ErrorHandler.logError(error, 'AuthGuard Initialization Error');
                        } else {
                            console.error('ErrorHandler not available to log security incident.');
                        }
                        resolve(false);
                    }
                });
            });
        } catch (error) {
            console.error('Failed to initialize auth system:', error);
            // Use window.ErrorHandler as it's globally exposed by ui-components.js
            if (window.ErrorHandler) {
                window.ErrorHandler.logError(error, 'AuthGuard System Init Error');
            } else {
                console.error('ErrorHandler not available to log security incident.');
            }
            return false;
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null && this.sessionManager.validateSession() !== null;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get current user role
     */
    getCurrentRole() {
        return this.userRole;
    }

    /**
     * Check if user has specific role
     */
    hasRole(role) {
        return this.userRole === role;
    }

    /**
     * Check if user has any of the specified roles
     */
    hasAnyRole(roles) {
        return roles.includes(this.userRole);
    }

    /**
     * Check if user has permission
     */
    hasPermission(permission) {
        return this.permissionSystem.hasPermission(this.userRole, permission);
    }

    /**
     * Show access denied message
     */
    showAccessDenied(message = 'Access denied. Insufficient permissions.') {
        this.securityUtils.logSecurityIncident('access_denied', {
            requiredPermission: message,
            userRole: this.userRole,
            userId: this.currentUser?.uid
        });

        // Use the global UIHelpers
        if (typeof window !== 'undefined' && window.UIHelpers) {
            window.UIHelpers.showToast(message, 'error', 5000);
        }
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        this._showLoginPage();
    }

    /**
     * Show dashboard
     */
    showDashboard() {
        this._showDashboardPage();
        this.applyRoleBasedUI();
    }

    /**
     * Apply role-based UI restrictions
     */
    applyRoleBasedUI() {
        if (!this.isAuthenticated()) return;

        console.log('🎨 Applying role-based UI for:', this.userRole);

        // Hide elements based on role
        const elementsToHide = AUTH_CONFIG.UI_ELEMENTS[this.userRole] || [];
        elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = 'none';
                el.setAttribute('data-hidden-by-role', this.userRole);
            });
        });

        // Show role-specific elements
        const roleSelectors = [`.${this.userRole}-only`, '.authenticated-only'];
        roleSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (!el.hasAttribute('data-hidden-by-role')) {
                    el.style.display = el.dataset.originalDisplay || 'block'; // Restore original display or default to 'block'
                }
            });
        });

        // Update user info display
        this._updateUserInfoDisplay();
    }

    /**
     * Sign out user
     */
    async signOut() {
        try {
            if (typeof firebase !== 'undefined') {
                await firebase.auth().signOut();
            }

            this.sessionManager.destroySession();
            this.currentUser = null;
            this.userRole = null;
            this.redirectToLogin();
            this._cleanupSecurityMonitors(); // Clean up security monitors on logout

            console.log('👋 User signed out');
        } catch (error) {
            console.error('Sign out error:', error);
            // Use window.ErrorHandler
            if (window.ErrorHandler) {
                window.ErrorHandler.logError(error, 'AuthGuard SignOut Error');
            } else {
                console.error('ErrorHandler not available to log security incident.');
            }
        }
    }

    /**
     * Handle session timeout
     */
    handleSessionTimeout() {
        this.securityUtils.logSecurityIncident('session_timeout_handled', {
            userId: this.currentUser?.uid,
            role: this.userRole
        });

        // Use the global UIHelpers
        if (typeof window !== 'undefined' && window.UIHelpers) {
            window.UIHelpers.showToast(
                `Your session will expire in ${timeLeft} minutes. Click anywhere to extend.`, // Fix: 'timeLeft' is not defined here
                'warning',
                6000
            );
        }

        setTimeout(() => {
            this.signOut();
        }, 2000);
    }

    /**
     * Log security activity
     */
    async logActivity(action, details = {}) {
        try {
            const activityData = {
                action,
                details,
                userId: this.currentUser?.uid,
                userRole: this.userRole,
                timestamp: Date.now(),
                sessionId: this.sessionManager._getSessionData()?.sessionId
            };

            // Log to security utils
            this.securityUtils.logSecurityIncident('user_activity', activityData);

            // Log to external system if available (Firebase, analytics, etc.)
            // The global logActivity is now handled by activity-logger.js, which this class relies on.
            // If ActivityLogger is also used for internal logActivity, this specific part might need adjustment.
            // For now, assume this is for client-side security logging that might go to Firestore directly.
            // If firebaseService is available and initialized, use it to log directly to Firestore.
            if (window.firebaseService && window.firebaseService.isInitialized) {
                // Ensure the ActivityLogger instance is ready and use its logActivity method
                if (window.activityLogger) {
                    await window.activityLogger.logActivity(action, details);
                } else {
                     // Fallback if ActivityLogger instantiation in its file failed for some reason
                    await window.firebaseService.db.create(DB_CONFIG.COLLECTIONS.ACTIVITY_LOGS, {
                        action: action,
                        details: details,
                        userId: this.currentUser?.uid || 'system',
                        userRole: this.userRole || 'unknown',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        sessionId: this.sessionManager._getSessionData()?.sessionId
                    });
                }
            }

        } catch (error) {
            console.error('Failed to log activity:', error);
        }
    }

    /**
     * Get security report
     */
    getSecurityReport() {
        return {
            ...this.securityUtils.getSecurityReport(),
            sessionInfo: {
                isActive: this.isAuthenticated(),
                timeUntilExpiry: this.sessionManager.getTimeUntilExpiry(),
                isCloseToExpiry: this.sessionManager.isCloseToExpiry()
            },
            userInfo: {
                role: this.userRole,
                userId: this.currentUser?.uid,
                email: this.currentUser?.email
            }
        };
    }

    /**
     * Fetches client IP address.
     * @returns {Promise<string>} Client IP address or 'unknown'.
     */
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    // Private methods
    async _handleUserAuthenticated(user) {
        try {
            console.log('👤 User authenticated:', user.email);

            // Load user data from Firestore
            const userData = await this._loadUserData(user);

            // Create/validate session
            const sessionData = this.sessionManager.validateSession();
            if (!sessionData || sessionData.userId !== user.uid) {
                this.sessionManager.createSession(user.uid, userData);
            }

            this.currentUser = { ...user, ...userData };
            this.userRole = userData.role || 'user';
            this.isInitialized = true;

            // Log activity (using direct firebaseService call here to avoid circular dependency with global logActivity)
            if (window.firebaseService && window.firebaseService.isInitialized) {
                await window.firebaseService.db.create(DB_CONFIG.COLLECTIONS.ACTIVITY_LOGS, {
                    action: 'login_success',
                    details: { method: 'firebase_auth', userAgent: navigator.userAgent, ipAddress: await this.getClientIP() },
                    userId: this.currentUser.uid,
                    userRole: this.userRole,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    sessionId: this.sessionManager._getSessionData()?.sessionId
                });
            } else {
                console.warn('FirebaseService not ready for login_success activity logging.');
            }


            console.log('✅ Authentication complete for:', this.userRole);
        } catch (error) {
            console.error('Error handling authenticated user:', error);
            // Use window.ErrorHandler
            if (window.ErrorHandler) {
                window.ErrorHandler.logError(error, 'AuthGuard HandleUserAuthenticated Error');
            } else {
                console.error('ErrorHandler not available to log security incident.');
            }
            throw error; // Re-throw to propagate the error
        }
    }

    _handleUserNotAuthenticated() {
        console.log('❌ User not authenticated');
        this.currentUser = null;
        this.userRole = null;
        this.isInitialized = true;
        this.sessionManager.destroySession();
        this._cleanupSecurityMonitors(); // Ensure cleanup on logout
    }

    async _loadUserData(user) {
        try {
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                throw new Error('Firestore not available');
            }

            const userDoc = await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .get();

            if (!userDoc.exists) {
                // Create new user document
                const newUserData = {
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    role: 'user',
                    status: 'active',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                };

                await firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .set(newUserData);

                return newUserData;
            }

            const userData = userDoc.data();

            // Validate user status
            if (userData.status === 'inactive' || userData.status === 'locked') {
                throw new Error(`Account is ${userData.status}`);
            }

            // Update last login
            await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });

            return userData;
        } catch (error) {
            // Use window.ErrorHandler
            if (window.ErrorHandler) {
                window.ErrorHandler.logError(error, 'AuthGuard LoadUserData Error');
            } else {
                console.error('ErrorHandler not available to log security incident.');
            }
            throw error;
        }
    }

    _initializeSecurityMonitoring() {
        // Monitor for rapid clicking (potential bot activity)
        let clickCount = 0;
        let clickTimer = null;

        const clickHandler = () => {
            clickCount++;

            if (clickTimer) clearTimeout(clickTimer);

            clickTimer = setTimeout(() => {
                if (clickCount > AUTH_CONFIG.SECURITY.RAPID_CLICK_THRESHOLD) {
                    this.securityUtils.logSecurityIncident('rapid_clicking_detected', {
                        clickCount,
                        timeWindow: AUTH_CONFIG.SECURITY.RAPID_CLICK_WINDOW
                    });
                }
                clickCount = 0;
            }, AUTH_CONFIG.SECURITY.RAPID_CLICK_WINDOW);
        };

        document.addEventListener('click', clickHandler, { passive: true });
        this.securityMonitors.push({ event: 'click', handler: clickHandler });

        // Monitor for developer tools
        this._monitorDevTools();

        // Monitor for page visibility changes
        this._monitorPageVisibility();

        // Monitor for suspicious keyboard activity
        this._monitorKeyboardActivity();
    }

    _monitorDevTools() {
        let devtools = false;
        const threshold = 160;

        const checkDevTools = () => {
            if (window.outerHeight - window.innerHeight > threshold ||
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools) {
                    devtools = true;
                    this.securityUtils.logSecurityIncident('devtools_opened', {
                        outerDimensions: `${window.outerWidth}x${window.outerHeight}`,
                        innerDimensions: `${window.innerWidth}x${window.innerHeight}`,
                        threshold
                    });
                }
            } else {
                devtools = false;
            }
        };

        const devToolsTimer = setInterval(checkDevTools, 1000);
        this.securityMonitors.push({ timer: devToolsTimer });
    }

    _monitorPageVisibility() {
        let hiddenTime = null;

        const visibilityHandler = () => {
            if (document.hidden) {
                hiddenTime = Date.now();
            } else if (hiddenTime) {
                const timeHidden = Date.now() - hiddenTime;

                // If page was hidden for more than 5 minutes, log it
                if (timeHidden > 5 * 60 * 1000) {
                    this.securityUtils.logSecurityIncident('long_page_hidden', {
                        hiddenDuration: timeHidden,
                        returnTime: new Date().toISOString()
                    });
                }
                hiddenTime = null;
            }
        };

        document.addEventListener('visibilitychange', visibilityHandler);
        this.securityMonitors.push({ event: 'visibilitychange', handler: visibilityHandler });
    }

    _monitorKeyboardActivity() {
        let keySequence = [];
        const suspiciousSequences = [
            ['F12'], // Dev tools
            ['Control', 'Shift', 'I'], // Dev tools (common)
            ['Control', 'Shift', 'J'], // Console (common)
            ['Control', 'U'], // View source
            ['F5', 'F5', 'F5'], // Rapid refresh (not exact keys, but sequence of F5)
        ];

        const keyHandler = (event) => {
            const key = event.key;
            const modifiers = [];

            if (event.ctrlKey) modifiers.push('Control');
            if (event.shiftKey) modifiers.push('Shift');
            if (event.altKey) modifiers.push('Alt');
            if (event.metaKey) modifiers.push('Meta'); // Command key on Mac

            const keyCombo = [...modifiers, key].join('+');
            keySequence.push(keyCombo);

            // Keep only last 10 keys
            if (keySequence.length > 10) {
                keySequence.shift();
            }

            // Check for suspicious sequences
            suspiciousSequences.forEach(sequence => {
                if (this._matchesSequence(keySequence, sequence)) {
                    this.securityUtils.logSecurityIncident('suspicious_key_sequence', {
                        sequence: sequence.join('+'),
                        fullSequence: keySequence.slice(-5)
                    });
                }
            });
        };

        document.addEventListener('keydown', keyHandler);
        this.securityMonitors.push({ event: 'keydown', handler: keyHandler });
    }

    _matchesSequence(haystack, needle) {
        if (needle.length > haystack.length) return false;

        for (let i = 0; i <= haystack.length - needle.length; i++) {
            let matches = true;
            for (let j = 0; j < needle.length; j++) {
                if (haystack[i + j] !== needle[j]) {
                    matches = false;
                    break;
                }
            }
            if (matches) return true;
        }
        return false;
    }

    _showLoginPage() {
        const loginPage = document.getElementById('login-page');
        const dashboardPage = document.getElementById('dashboard-page');

        if (loginPage) {
            loginPage.style.display = 'flex';
        }
        if (dashboardPage) {
            dashboardPage.style.display = 'none';
        }
    }

    _showDashboardPage() {
        const loginPage = document.getElementById('login-page');
        const dashboardPage = document.getElementById('dashboard-page');

        if (loginPage) {
            loginPage.style.display = 'none';
        }
        if (dashboardPage) {
            dashboardPage.style.display = 'block';
        }
    }

    _updateUserInfoDisplay() {
        const userNameEl = document.getElementById('user-name');
        const userEmailEl = document.getElementById('user-email');
        const userRoleEl = document.getElementById('user-role');

        if (userNameEl && this.currentUser) {
            userNameEl.textContent = this.currentUser.name || this.currentUser.displayName || 'User';
        }
        if (userEmailEl && this.currentUser) {
            userEmailEl.textContent = this.currentUser.email || '';
        }
        if (userRoleEl && this.userRole) {
            userRoleEl.textContent = this.userRole.toUpperCase();
            userRoleEl.className = `user-role ${this.userRole}`; // Apply role class for styling
        }
    }

    /**
     * Cleanup security monitors
     */
    _cleanupSecurityMonitors() {
        this.securityMonitors.forEach(monitor => {
            if (monitor.event && monitor.handler) {
                document.removeEventListener(monitor.event, monitor.handler);
            }
            if (monitor.timer) {
                clearInterval(monitor.timer);
            }
        });
        this.securityMonitors = [];
    }
}

// ===================================
// GLOBAL INSTANCES AND INITIALIZATION
// ===================================

// Create global instances
const authGuard = new AuthGuard();
const securityUtils = new SecurityUtils(); // This instance is used by ErrorHandler and other modules
const permissionSystem = new PermissionSystem();

// ErrorHandler.init(securityUtils); // THIS CALL IS MOVED TO script.js CRMApplication.init()
// ^^^^^^^^^^^ THIS IS THE LINE THAT WAS REMOVED FROM GLOBAL SCOPE IN PREVIOUS STEP ^^^^^^^^^^^

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = {
        AuthGuard,
        SecurityUtils,
        PermissionSystem,
        SessionManager,
        FormValidation, // Now correctly defined and exposed from ui-components.js
        DataUtils,      // Now correctly defined and exposed from ui-components.js
        ErrorHandler,   // Now correctly defined and exposed from ui-components.js
        AUTH_CONFIG
    };
} else if (typeof window !== 'undefined') {
    // Browser
    window.authGuard = authGuard;
    window.SecurityUtils = securityUtils; // Expose SecurityUtils globally
    window.PermissionSystem = permissionSystem;
    // window.UIHelpers is no longer assigned here. It will be assigned by ui-components.js
    window.FormValidation = FormValidation; // Expose FormValidation globally
    window.DataUtils = DataUtils; // Expose DataUtils globally
    window.ErrorHandler = ErrorHandler; // Expose ErrorHandler globally
    window.AUTH_CONFIG = AUTH_CONFIG;

    // The UIHelpers.initManagers() call is no longer needed here as ui-components.js handles its own global setup.
    // auth-guard.js's methods will directly use window.UIHelpers which will be set by ui-components.js.
}

console.log('🔐 Enhanced Authentication System Loaded');
console.log('🛡️ Features: Advanced security monitoring, session management, role-based access control');    