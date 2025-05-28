// Simplified Authentication and Authorization Guard System
// This file provides additional utilities but main auth logic is in script.js

// Security utilities
const SecurityUtils = {
    // Log security incidents
    logSecurityIncident(type, details) {
        console.warn(`🚨 Security Incident: ${type}`, details);

        // Send to analytics/logging service if available
        if (typeof gtag !== 'undefined') {
            gtag('event', 'security_incident', {
                'event_category': 'security',
                'event_label': type,
                'value': 1
            });
        }
    },

    // Rate limiting for sensitive operations
    rateLimitStorage: {},

    checkRateLimit(operation, maxAttempts = 5, windowMs = 60000) {
        const key = `${operation}_${Date.now()}`;
        const now = Date.now();

        // Clean old attempts
        Object.keys(this.rateLimitStorage).forEach(k => {
            if (now - parseInt(k.split('_')[1]) > windowMs) {
                delete this.rateLimitStorage[k];
            }
        });

        // Count recent attempts
        const recentAttempts = Object.keys(this.rateLimitStorage)
            .filter(k => k.startsWith(operation) && now - parseInt(k.split('_')[1]) < windowMs)
            .length;

        if (recentAttempts >= maxAttempts) {
            this.logSecurityIncident('rate_limit_exceeded', { operation, attempts: recentAttempts });
            return false;
        }

        this.rateLimitStorage[key] = true;
        return true;
    },

    // Enhanced input sanitization
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;

        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    },

    // Check for dangerous content patterns
    containsDangerousContent(str) {
        const dangerousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe/gi,
            /<object/gi,
            /<embed/gi,
            /eval\s*\(/gi,
            /expression\s*\(/gi
        ];

        return dangerousPatterns.some(pattern => pattern.test(str));
    },

    // Generate secure session tokens
    generateSecureToken(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
};

// Permission system
const PermissionSystem = {
    permissions: {
        admin: [
            'all', 'users:create', 'users:edit', 'users:delete', 'users:view',
            'leads:create', 'leads:edit', 'leads:delete', 'leads:view',
            'reports:view', 'settings:edit', 'system:admin'
        ],
        master: [
            'leads:own', 'leads:team', 'users:team', 'reports:read',
            'team:manage', 'leads:create', 'leads:edit', 'leads:view'
        ],
        user: [
            'leads:assigned', 'leads:created', 'profile:edit',
            'leads:view', 'leads:edit'
        ]
    },

    hasPermission(userRole, permission) {
        if (!userRole || !this.permissions[userRole]) return false;

        const rolePermissions = this.permissions[userRole];
        return rolePermissions.includes('all') || rolePermissions.includes(permission);
    },

    canAccessLead(userRole, userId, lead) {
        if (!lead || !userId) return false;

        // Admin can access all leads
        if (userRole === 'admin') return true;

        // User can access leads they created or are assigned to
        if (lead.createdBy === userId || lead.assignedTo === userId) {
            return true;
        }

        // Master can access leads from their team (would need to check linkedMaster)
        if (userRole === 'master') {
            // This would require checking if the lead's assignedTo user has linkedMaster === userId
            return false; // Placeholder - implement based on your team structure
        }

        return false;
    }
};

// UI Helper functions
const UIHelpers = {
    showToast(message, type = 'info', duration = 3000) {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast-notification');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;

        const iconMap = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${iconMap[type] || 'ℹ'}</div>
                <div class="toast-message">${SecurityUtils.sanitizeInput(message)}</div>
            </div>
        `;

        document.body.appendChild(toast);
        toast.style.display = 'block';

        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    },

    showConfirmDialog(message, onConfirm, onCancel) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2>Confirm Action</h2>
                </div>
                <div class="modal-body">
                    <p>${SecurityUtils.sanitizeInput(message)}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirm-btn">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        const confirmBtn = modal.querySelector('#confirm-btn');
        const cancelBtn = modal.querySelector('#cancel-btn');

        confirmBtn.addEventListener('click', () => {
            modal.remove();
            if (onConfirm) onConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            modal.remove();
            if (onCancel) onCancel();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                if (onCancel) onCancel();
            }
        });
    },

    showLoadingSpinner(show = true) {
        let spinner = document.getElementById('global-loading-spinner');

        if (show) {
            if (!spinner) {
                spinner = document.createElement('div');
                spinner.id = 'global-loading-spinner';
                spinner.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10001;
                `;
                spinner.innerHTML = `
                    <div style="
                        width: 50px;
                        height: 50px;
                        border: 4px solid rgba(255,255,255,0.3);
                        border-top: 4px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    "></div>
                `;
                document.body.appendChild(spinner);
            }
            spinner.style.display = 'flex';
        } else {
            if (spinner) {
                spinner.style.display = 'none';
            }
        }
    }
};

// Form validation helpers
const FormValidation = {
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    validatePhone(phone) {
        const re = /^[\+]?[\d\s\-\(\)]{7,20}$/;
        return re.test(phone.replace(/\s/g, ''));
    },

    validateRequired(value) {
        return value && value.toString().trim().length > 0;
    },

    validateLength(value, min = 0, max = Infinity) {
        const length = value ? value.toString().length : 0;
        return length >= min && length <= max;
    },

    validateLeadData(data) {
        const errors = {};

        if (!this.validateRequired(data.name)) {
            errors.name = 'Name is required';
        } else if (!this.validateLength(data.name, 2, 100)) {
            errors.name = 'Name must be between 2 and 100 characters';
        }

        if (!this.validateRequired(data.phone)) {
            errors.phone = 'Phone number is required';
        } else if (!this.validatePhone(data.phone)) {
            errors.phone = 'Please enter a valid phone number';
        }

        if (data.email && !this.validateEmail(data.email)) {
            errors.email = 'Please enter a valid email address';
        }

        const validStatuses = ['newLead', 'contacted', 'interested', 'followup', 'visit', 'booked', 'closed', 'notinterested', 'dropped'];
        if (data.status && !validStatuses.includes(data.status)) {
            errors.status = 'Invalid status selected';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
};

// Data management utilities
const DataUtils = {
    // Safe JSON parsing
    safeJSONParse(str, defaultValue = null) {
        try {
            return JSON.parse(str);
        } catch (e) {
            SecurityUtils.logSecurityIncident('json_parse_error', { error: e.message });
            return defaultValue;
        }
    },

    // Format currency
    formatCurrency(amount, currency = 'INR') {
        if (isNaN(amount)) return '₹0';

        const formatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });

        return formatter.format(amount);
    },

    // Format date consistently
    formatDate(date, options = {}) {
        if (!date) return 'N/A';

        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        const formatOptions = { ...defaultOptions, ...options };

        try {
            return new Date(date).toLocaleDateString('en-US', formatOptions);
        } catch (e) {
            return 'Invalid Date';
        }
    },

    // Debounce function calls
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function calls
    throttle(func, limit) {
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
};

// Network utilities
const NetworkUtils = {
    // Generic API call wrapper
    async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000
        };

        const config = { ...defaultOptions, ...options };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout);

            const response = await fetch(endpoint, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            SecurityUtils.logSecurityIncident('api_call_error', {
                endpoint,
                error: error.message
            });
            throw error;
        }
    },

    // Check network connectivity
    isOnline() {
        return navigator.onLine;
    },

    // Wait for network connectivity
    waitForOnline() {
        return new Promise((resolve) => {
            if (this.isOnline()) {
                resolve();
            } else {
                const handler = () => {
                    window.removeEventListener('online', handler);
                    resolve();
                };
                window.addEventListener('online', handler);
            }
        });
    }
};

// Local storage utilities (with error handling)
const StorageUtils = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
            return false;
        }
    },

    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('Failed to read from localStorage:', e);
            return defaultValue;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn('Failed to remove from localStorage:', e);
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.warn('Failed to clear localStorage:', e);
            return false;
        }
    }
};

// Performance monitoring
const PerformanceUtils = {
    marks: {},

    startMark(name) {
        this.marks[name] = performance.now();
    },

    endMark(name) {
        if (this.marks[name]) {
            const duration = performance.now() - this.marks[name];
            console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
            delete this.marks[name];
            return duration;
        }
        return 0;
    },

    measurePageLoad() {
        if (performance.timing) {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`📊 Page load time: ${loadTime}ms`);
            return loadTime;
        }
        return 0;
    }
};

// Error handling and reporting
const ErrorHandler = {
    logError(error, context = '') {
        const errorInfo = {
            message: error.message || 'Unknown error',
            stack: error.stack || 'No stack trace',
            context: context,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        console.error('🚨 Application Error:', errorInfo);

        // Send to error tracking service if available
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exception', {
                'description': errorInfo.message,
                'fatal': false
            });
        }

        // Show user-friendly error message
        UIHelpers.showToast('An error occurred. Please try again.', 'error');
    },

    // Global error handler
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.logError(event.error || new Error(event.message), 'Global Error');
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.logError(event.reason || new Error('Unhandled Promise Rejection'), 'Promise Rejection');
        });
    }
};

// Initialize global error handling
ErrorHandler.setupGlobalErrorHandling();

// Export utilities globally
window.SecurityUtils = SecurityUtils;
window.PermissionSystem = PermissionSystem;
window.UIHelpers = UIHelpers;
window.FormValidation = FormValidation;
window.DataUtils = DataUtils;
window.NetworkUtils = NetworkUtils;
window.StorageUtils = StorageUtils;
window.PerformanceUtils = PerformanceUtils;
window.ErrorHandler = ErrorHandler;

// Start performance monitoring
PerformanceUtils.startMark('app_initialization');

console.log('✅ Auth Guard Utilities Loaded');
console.log('🔧 Available utilities:', Object.keys({
    SecurityUtils,
    PermissionSystem,
    UIHelpers,
    FormValidation,
    DataUtils,
    NetworkUtils,
    StorageUtils,
    PerformanceUtils,
    ErrorHandler
}));