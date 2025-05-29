// ===================================
// CONSOLIDATED REAL ESTATE CRM SCRIPT
// File: script.js
// Version: 3.0 (Consolidated)
// Purpose: All JavaScript functionality in one secure, optimized file
// ===================================

'use strict';

// ===================================
// SECTION 1: CONFIGURATION & CONSTANTS
// ===================================

// Firebase Configuration
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA0ENNDjS9E2Ph054G_3RZC3sR9J1uQ3Cs",
    authDomain: "igplcrm.firebaseapp.com",
    projectId: "igplcrm",
    storageBucket: "igplcrm.firebasestorage.app",
    messagingSenderId: "688904879234",
    appId: "1:688904879234:web:3dfae5fcd879ae9a74889b"
};

// Database Configuration
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
    CACHE_DURATION: 5 * 60 * 1000,
    MAX_CACHE_SIZE: 100
};

// Validation Configuration
const VALIDATION_CONFIG = {
    MAX_LENGTHS: {
        name: 100,
        phone: 20,
        email: 254,
        address: 500,
        requirements: 1000,
        remarks: 1000,
        general: 255
    },
    PATTERNS: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^[\+]?[\d\s\-\(\)]{7,20}$/,
        name: /^[a-zA-Z\s\.\-\']{1,100}$/,
        alphanumeric: /^[a-zA-Z0-9\s]{1,100}$/,
        url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
        slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    },
    SECURITY_PATTERNS: [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe/gi,
        /<object/gi,
        /<embed/gi,
        /eval\s*\(/gi,
        /expression\s*\(/gi,
        /<svg[^>]*>[\s\S]*?<\/svg>/gi,
        /data:text\/html/gi,
        /vbscript:/gi,
        /<!--[\s\S]*?-->/gi
    ],
    ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'p', 'br'],
    LEAD_OPTIONS: {
        status: ['newLead', 'contacted', 'interested', 'followup', 'visit', 'booked', 'closed', 'notinterested', 'dropped'],
        source: ['website', 'facebook', 'instagram', 'google', 'referral', 'walk-in', 'cold-call', 'other'],
        propertyType: ['apartment', 'villa', 'house', 'plot', 'commercial', 'office', 'warehouse', 'other'],
        budget: ['under-50L', '50L-1Cr', '1Cr-2Cr', '2Cr-5Cr', 'above-5Cr'],
        priority: ['high', 'medium', 'low']
    },
    USER_OPTIONS: {
        role: ['admin', 'master', 'user'],
        status: ['active', 'inactive']
    }
};

// Authentication Configuration
const AUTH_CONFIG = {
    SESSION: {
        TIMEOUT: 30 * 60 * 1000,
        CHECK_INTERVAL: 60 * 1000,
        STORAGE_KEY: 'crm_session',
        REFRESH_THRESHOLD: 5 * 60 * 1000
    },
    SECURITY: {
        MAX_FAILED_ATTEMPTS: 5,
        LOCKOUT_TIME: 15 * 60 * 1000,
        RATE_LIMIT_WINDOW: 60 * 1000,
        RAPID_CLICK_THRESHOLD: 50,
        RAPID_CLICK_WINDOW: 10 * 1000
    },
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
    UI_ELEMENTS: {
        admin: ['.admin-only'],
        master: ['.admin-only'],
        user: ['.admin-only', '.master-only']
    }
};

// UI Configuration
const UI_CONFIG = {
    MODAL: {
        ANIMATION_DURATION: 300,
        Z_INDEX_BASE: 10000,
        MAX_MODALS: 5,
        BACKDROP_BLUR: true,
        AUTO_FOCUS: true,
        TRAP_FOCUS: true
    },
    TOAST: {
        DEFAULT_DURATION: 4000,
        MAX_TOASTS: 5,
        POSITION: 'top-right',
        ANIMATION_DURATION: 300
    },
    LOADING: {
        GLOBAL_TARGET_ID: 'loading-screen',
        SPINNER_COLOR: '#6366f1'
    },
    FORM: {
        VALIDATION_DELAY: 300,
        AUTO_SAVE_DELAY: 2000,
        SHOW_PROGRESS: true
    },
    THEME: {
        PRIMARY_COLOR: '#6366f1',
        SUCCESS_COLOR: '#10b981',
        ERROR_COLOR: '#ef4444',
        WARNING_COLOR: '#f59e0b',
        INFO_COLOR: '#3b82f6'
    }
};

// ===================================
// SECTION 2: UTILITY CLASSES
// ===================================

/**
 * Data Utilities Class
 */
class DataUtils {
    static formatDate(date, options = {}) {
        if (!date) return 'N/A';
        const d = date.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date));
        if (isNaN(d.getTime())) return 'Invalid Date';

        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return d.toLocaleDateString('en-US', { ...defaultOptions, ...options });
    }

    static formatTimeAgo(date) {
        if (!date) return 'N/A';
        const d = date.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date));
        if (isNaN(d.getTime())) return 'Invalid Date';

        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;

        return d.toLocaleDateString();
    }

    static debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    static sanitizeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

/**
 * Form Validation Class
 */
class FormValidation {
    static validateEmail(email) {
        return VALIDATION_CONFIG.PATTERNS.email.test(email);
    }

    static validatePhone(phone) {
        return VALIDATION_CONFIG.PATTERNS.phone.test(phone);
    }

    static validateName(name) {
        return VALIDATION_CONFIG.PATTERNS.name.test(name);
    }

    static validateRequired(value) {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    }

    static validateLength(value, min = 0, max = Infinity) {
        const length = value ? value.toString().length : 0;
        return length >= min && length <= max;
    }

    static validateUrl(url) {
        return VALIDATION_CONFIG.PATTERNS.url.test(url);
    }

    static validateField(field, value, rules = {}) {
        const errors = [];

        if (rules.required && !this.validateRequired(value)) {
            errors.push(`${field} is required`);
        }

        if (value && rules.email && !this.validateEmail(value)) {
            errors.push(`${field} must be a valid email`);
        }

        if (value && rules.phone && !this.validatePhone(value)) {
            errors.push(`${field} must be a valid phone number`);
        }

        if (value && rules.minLength && !this.validateLength(value, rules.minLength)) {
            errors.push(`${field} must be at least ${rules.minLength} characters`);
        }

        if (value && rules.maxLength && !this.validateLength(value, 0, rules.maxLength)) {
            errors.push(`${field} must be no more than ${rules.maxLength} characters`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

/**
 * Error Handler Class
 */
class ErrorHandler {
    constructor() {
        this.errors = [];
        this.securityUtils = null;
    }

    init(securityUtils) {
        this.securityUtils = securityUtils;
        this.setupGlobalErrorHandling();
    }

    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            this.logError(event.error, 'Global Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.logError(event.reason, 'Unhandled Promise Rejection');
        });
    }

    logError(error, context = '', details = {}) {
        const errorInfo = {
            message: error?.message || 'Unknown error',
            stack: error?.stack || '',
            context: context,
            details: details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.errors.push(errorInfo);

        // Keep only last 100 errors
        if (this.errors.length > 100) {
            this.errors.shift();
        }

        console.error('CRM Error:', errorInfo);

        if (this.securityUtils) {
            this.securityUtils.logSecurityIncident('application_error', errorInfo);
        }
    }

    getErrors() {
        return [...this.errors];
    }

    clearErrors() {
        this.errors = [];
    }
}

// ===================================
// SECTION 3: DATA SANITIZER
// ===================================

/**
 * Enhanced Data Sanitizer Class
 */
class DataSanitizer {
    constructor(config = VALIDATION_CONFIG) {
        this.config = config;
        this.securityLog = [];
        this.validationCache = new Map();
    }

    sanitize(input, type = 'text', options = {}) {
        try {
            if (input === null || input === undefined) {
                return options.defaultValue || '';
            }

            let sanitized = String(input).trim();
            const maxLength = options.maxLength || this.config.MAX_LENGTHS[type] || this.config.MAX_LENGTHS.general;

            if (sanitized.length > maxLength) {
                sanitized = sanitized.slice(0, maxLength);
                this._logSecurityEvent('length_truncation', { type, originalLength: input.length, truncatedLength: maxLength });
            }

            if (this._containsDangerousContent(sanitized)) {
                this._logSecurityEvent('dangerous_content_detected', { type, content: sanitized.slice(0, 100) });
                sanitized = this._removeDangerousContent(sanitized);
            }

            switch (type) {
                case 'name':
                    return this._sanitizeName(sanitized, options);
                case 'email':
                    return this._sanitizeEmail(sanitized, options);
                case 'phone':
                    return this._sanitizePhone(sanitized, options);
                case 'text':
                    return this._sanitizeText(sanitized, options);
                case 'multiline':
                    return this._sanitizeMultiline(sanitized, options);
                case 'number':
                    return this._sanitizeNumber(sanitized, options);
                case 'url':
                    return this._sanitizeUrl(sanitized, options);
                case 'html':
                    return this._sanitizeHtml(sanitized, options);
                case 'slug':
                    return this._sanitizeSlug(sanitized, options);
                default:
                    return this._sanitizeText(sanitized, options);
            }
        } catch (error) {
            this._logSecurityEvent('sanitization_error', { type, error: error.message });
            return options.defaultValue || '';
        }
    }

    validate(input, type, required = false, options = {}) {
        try {
            const cacheKey = `${type}_${required}_${JSON.stringify(options)}_${input}`;

            if (this.validationCache.has(cacheKey)) {
                return this.validationCache.get(cacheKey);
            }

            const isEmpty = !input || String(input).trim() === '';
            if (required && isEmpty) {
                const result = {
                    valid: false,
                    message: options.requiredMessage || 'This field is required',
                    code: 'REQUIRED_FIELD_EMPTY'
                };
                this.validationCache.set(cacheKey, result);
                return result;
            }

            if (!required && isEmpty) {
                const result = { valid: true, message: '', code: 'VALID_EMPTY' };
                this.validationCache.set(cacheKey, result);
                return result;
            }

            const sanitized = this.sanitize(input, type, options);
            let result;

            switch (type) {
                case 'name':
                    result = this._validateName(sanitized, options);
                    break;
                case 'email':
                    result = this._validateEmail(sanitized, options);
                    break;
                case 'phone':
                    result = this._validatePhone(sanitized, options);
                    break;
                case 'text':
                    result = this._validateText(sanitized, options);
                    break;
                case 'multiline':
                    result = this._validateMultiline(sanitized, options);
                    break;
                case 'number':
                    result = this._validateNumber(sanitized, options);
                    break;
                case 'url':
                    result = this._validateUrl(sanitized, options);
                    break;
                case 'select':
                    result = this._validateSelect(sanitized, options);
                    break;
                default:
                    result = this._validateText(sanitized, options);
            }

            this.validationCache.set(cacheKey, result);

            if (this.validationCache.size > 1000) {
                const firstKey = this.validationCache.keys().next().value;
                this.validationCache.delete(firstKey);
            }

            return result;
        } catch (error) {
            this._logSecurityEvent('validation_error', { type, error: error.message });
            return {
                valid: false,
                message: 'Validation error occurred',
                code: 'VALIDATION_ERROR'
            };
        }
    }

    validateFormData(formData, schema = {}) {
        const errors = {};
        const warnings = [];
        const sanitizedData = {};
        let isValid = true;

        try {
            for (const [fieldName, value] of Object.entries(formData)) {
                const fieldSchema = schema[fieldName] || {};
                const {
                    type = 'text',
                    required = false,
                    options = {}
                } = fieldSchema;

                const validation = this.validate(value, type, required, options);

                if (!validation.valid) {
                    errors[fieldName] = validation.message;
                    isValid = false;
                } else {
                    sanitizedData[fieldName] = this.sanitize(value, type, options);

                    if (validation.warning) {
                        warnings.push({
                            field: fieldName,
                            message: validation.warning
                        });
                    }
                }
            }

            return {
                isValid,
                errors,
                warnings,
                sanitizedData,
                summary: {
                    totalFields: Object.keys(formData).length,
                    validFields: Object.keys(sanitizedData).length,
                    errorCount: Object.keys(errors).length,
                    warningCount: warnings.length
                }
            };
        } catch (error) {
            this._logSecurityEvent('form_validation_error', { error: error.message });
            return {
                isValid: false,
                errors: { _form: 'Form validation failed' },
                warnings: [],
                sanitizedData: {},
                summary: { totalFields: 0, validFields: 0, errorCount: 1, warningCount: 0 }
            };
        }
    }

    sanitizeLeadData(leadData) {
        const schema = {
            name: { type: 'name', required: true },
            phone: { type: 'phone', required: true },
            email: { type: 'email', required: false },
            altPhone: { type: 'phone', required: false },
            status: { type: 'select', options: { validValues: this.config.LEAD_OPTIONS.status } },
            source: { type: 'select', options: { validValues: this.config.LEAD_OPTIONS.source } },
            propertyType: { type: 'select', options: { validValues: this.config.LEAD_OPTIONS.propertyType } },
            budget: { type: 'select', options: { validValues: this.config.LEAD_OPTIONS.budget } },
            location: { type: 'text', required: false },
            requirements: { type: 'multiline', required: false },
            assignedTo: { type: 'text', required: false },
            priority: { type: 'select', options: { validValues: this.config.LEAD_OPTIONS.priority } }
        };

        const result = this.validateFormData(leadData, schema);

        const cleanedData = {};
        for (const [key, value] of Object.entries(result.sanitizedData)) {
            if (value && value !== '') {
                cleanedData[key] = value;
            }
        }

        return {
            ...result,
            sanitizedData: cleanedData
        };
    }

    sanitizeUserData(userData) {
        const schema = {
            name: { type: 'name', required: true },
            email: { type: 'email', required: true },
            role: { type: 'select', options: { validValues: this.config.USER_OPTIONS.role } },
            status: { type: 'select', options: { validValues: this.config.USER_OPTIONS.status } },
            linkedMaster: { type: 'text', required: false }
        };

        return this.validateFormData(userData, schema);
    }

    // Private sanitization methods
    _sanitizeName(str, options = {}) {
        return str
            .replace(/[<>\"'&]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\.\-\']/g, '')
            .slice(0, options.maxLength || this.config.MAX_LENGTHS.name);
    }

    _sanitizeEmail(str, options = {}) {
        return str
            .toLowerCase()
            .replace(/[<>\"'&\s]/g, '')
            .slice(0, options.maxLength || this.config.MAX_LENGTHS.email);
    }

    _sanitizePhone(str, options = {}) {
        return str
            .replace(/[<>\"'&]/g, '')
            .replace(/[^\d\+\-\s\(\)]/g, '')
            .slice(0, options.maxLength || this.config.MAX_LENGTHS.phone);
    }

    _sanitizeText(str, options = {}) {
        return str
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .slice(0, options.maxLength || this.config.MAX_LENGTHS.general);
    }

    _sanitizeMultiline(str, options = {}) {
        return str
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/\r\n/g, '\n')
            .slice(0, options.maxLength || this.config.MAX_LENGTHS.requirements);
    }

    _sanitizeNumber(str, options = {}) {
        const num = parseFloat(str);
        if (isNaN(num)) {
            return options.defaultValue || 0;
        }
        const min = options.min || -Infinity;
        const max = options.max || Infinity;
        return Math.max(min, Math.min(max, num));
    }

    _sanitizeUrl(str, options = {}) {
        str = str.replace(/[<>\"']/g, '');
        if (str && !str.match(/^https?:\/\//)) {
            str = 'https://' + str;
        }
        return str.slice(0, options.maxLength || 2048);
    }

    _sanitizeHtml(str, options = {}) {
        const allowedTags = options.allowedTags || this.config.ALLOWED_TAGS;
        let sanitized = str;
        const tagRegex = /<\/?([a-zA-Z]+)(?:\s[^>]*)?>/g;
        sanitized = sanitized.replace(tagRegex, (match, tagName) => {
            if (allowedTags.includes(tagName.toLowerCase())) {
                return match;
            }
            return '';
        });
        return sanitized.slice(0, options.maxLength || this.config.MAX_LENGTHS.requirements);
    }

    _sanitizeSlug(str, options = {}) {
        return str
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, options.maxLength || 50);
    }

    // Private validation methods
    _validateName(name, options = {}) {
        if (name.length < (options.minLength || 2)) {
            return { valid: false, message: `Name must be at least ${options.minLength || 2} characters`, code: 'NAME_TOO_SHORT' };
        }
        if (!this.config.PATTERNS.name.test(name)) {
            return { valid: false, message: 'Name contains invalid characters', code: 'INVALID_NAME_CHARACTERS' };
        }
        return { valid: true, message: '', code: 'VALID' };
    }

    _validateEmail(email, options = {}) {
        if (!this.config.PATTERNS.email.test(email)) {
            return { valid: false, message: 'Please enter a valid email address', code: 'INVALID_EMAIL_FORMAT' };
        }
        if (options.blockDisposable && this._isDisposableEmail(email)) {
            return { valid: false, message: 'Disposable email addresses are not allowed', code: 'DISPOSABLE_EMAIL' };
        }
        return { valid: true, message: '', code: 'VALID' };
    }

    _validatePhone(phone, options = {}) {
        if (phone.length < (options.minLength || 7)) {
            return { valid: false, message: `Phone number must be at least ${options.minLength || 7} digits`, code: 'PHONE_TOO_SHORT' };
        }
        if (!this.config.PATTERNS.phone.test(phone)) {
            return { valid: false, message: 'Please enter a valid phone number', code: 'INVALID_PHONE_FORMAT' };
        }
        return { valid: true, message: '', code: 'VALID' };
    }

    _validateText(text, options = {}) {
        const maxLength = options.maxLength || this.config.MAX_LENGTHS.general;
        if (text.length > maxLength) {
            return { valid: false, message: `Text must not exceed ${maxLength} characters`, code: 'TEXT_TOO_LONG' };
        }
        return { valid: true, message: '', code: 'VALID' };
    }

    _validateMultiline(text, options = {}) {
        const maxLength = options.maxLength || this.config.MAX_LENGTHS.requirements;
        if (text.length > maxLength) {
            return { valid: false, message: `Text must not exceed ${maxLength} characters`, code: 'TEXT_TOO_LONG' };
        }
        return { valid: true, message: '', code: 'VALID' };
    }

    _validateNumber(num, options = {}) {
        if (isNaN(num)) {
            return { valid: false, message: 'Please enter a valid number', code: 'INVALID_NUMBER' };
        }
        if (options.min !== undefined && num < options.min) {
            return { valid: false, message: `Number must be at least ${options.min}`, code: 'NUMBER_TOO_SMALL' };
        }
        if (options.max !== undefined && num > options.max) {
            return { valid: false, message: `Number must not exceed ${options.max}`, code: 'NUMBER_TOO_LARGE' };
        }
        return { valid: true, message: '', code: 'VALID' };
    }

    _validateUrl(url, options = {}) {
        if (!this.config.PATTERNS.url.test(url)) {
            return { valid: false, message: 'Please enter a valid URL', code: 'INVALID_URL_FORMAT' };
        }
        return { valid: true, message: '', code: 'VALID' };
    }

    _validateSelect(value, options = {}) {
        const validValues = options.validValues || [];
        if (validValues.length > 0 && !validValues.includes(value)) {
            return { valid: false, message: 'Please select a valid option', code: 'INVALID_SELECT_VALUE' };
        }
        return { valid: true, message: '', code: 'VALID' };
    }

    // Security utilities
    _containsDangerousContent(str) {
        return this.config.SECURITY_PATTERNS.some(pattern => pattern.test(str));
    }

    _removeDangerousContent(str) {
        let cleaned = str;
        this.config.SECURITY_PATTERNS.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });
        return cleaned;
    }

    _isDisposableEmail(email) {
        const disposableDomains = [
            '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
            'mailinator.com', 'trashmail.com', 'yopmail.com'
        ];
        const domain = email.split('@')[1]?.toLowerCase();
        return disposableDomains.includes(domain);
    }

    _logSecurityEvent(type, details) {
        const event = {
            type,
            details,
            timestamp: new Date().toISOString(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server'
        };

        this.securityLog.push(event);

        if (this.securityLog.length > 100) {
            this.securityLog.shift();
        }

        if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
            console.warn('🚨 Security Event:', event);
        }
    }

    getSecurityLog() {
        return [...this.securityLog];
    }

    clearCache() {
        this.validationCache.clear();
    }

    getCacheStats() {
        return {
            size: this.validationCache.size,
            maxSize: 1000
        };
    }
}

// ===================================
// SECTION 4: SECURITY UTILITIES
// ===================================

/**
 * Security Utilities Class
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

    checkRateLimit(operation, maxAttempts = 5, windowMs = 60000) {
        const key = `${operation}_${Date.now()}`;
        const now = Date.now();

        if (this.rateLimits.size > 1000) {
            this._cleanRateLimits(windowMs);
        }

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
            /<svg[^>]*onload/gi
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

    generateSecureToken(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const array = new Uint8Array(length);

        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(array);
            return Array.from(array, byte => chars[byte % chars.length]).join('');
        } else {
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }
    }

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

        if (this.incidents.length > 500) {
            this.incidents = this.incidents.slice(-400);
        }

        if (this._isDevelopment()) {
            console.warn(`🚨 Security Incident [${incident.severity}]:`, incident);
        }

        if (typeof gtag !== 'undefined') {
            gtag('event', 'security_incident', {
                event_category: 'security',
                event_label: type,
                custom_parameter_severity: incident.severity
            });
        }
    }

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
                memoryUsage: this.rateLimits.size * 50
            }
        };
    }

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

// ===================================
// SECTION 5: PERMISSION SYSTEM
// ===================================

/**
 * Permission System Class
 */
class PermissionSystem {
    constructor(config = AUTH_CONFIG.ROLES) {
        this.config = config;
    }

    hasPermission(userRole, permission) {
        if (!userRole || !this.config.PERMISSIONS[userRole]) {
            return false;
        }

        const rolePermissions = this.config.PERMISSIONS[userRole];
        return rolePermissions.includes('all') || rolePermissions.includes(permission);
    }

    hasAnyPermission(userRole, permissions) {
        return permissions.some(permission => this.hasPermission(userRole, permission));
    }

    hasAllPermissions(userRole, permissions) {
        return permissions.every(permission => this.hasPermission(userRole, permission));
    }

    canAccessLead(userRole, userId, lead) {
        if (!lead || !userId) return false;

        if (userRole === 'admin') return true;

        if (lead.createdBy === userId || lead.assignedTo === userId) {
            return true;
        }

        if (userRole === 'master') {
            return this._isTeamMember(userId, lead.assignedTo);
        }

        return false;
    }

    getRoleLevel(role) {
        return this.config.HIERARCHY.indexOf(role);
    }

    hasHigherOrEqualRole(role1, role2) {
        return this.getRoleLevel(role1) >= this.getRoleLevel(role2);
    }

    _isTeamMember(masterId, userId) {
        return false;
    }
}

// ===================================
// SECTION 6: SESSION MANAGER
// ===================================

/**
 * Session Manager Class
 */
class SessionManager {
    constructor(config = AUTH_CONFIG.SESSION) {
        this.config = config;
        this.sessionTimer = null;
        this.warningTimer = null;
        this.activityListeners = [];
        this.securityUtils = new SecurityUtils();
    }

    createSession(userId, userData) {
        const sessionData = {
            userId,
            userData,
            sessionId: this.securityUtils.generateSecureToken(32),
            startTime: Date.now(),
            lastActivity: Date.now(),
            fingerprint: this._generateFingerprint(),
            ipAddress: null,
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
                userId: userId
            });
            throw new Error('Failed to create session');
        }
    }

    validateSession() {
        try {
            const sessionData = this._getSessionData();
            if (!sessionData) return null;

            const now = Date.now();
            const timeSinceActivity = now - sessionData.lastActivity;

            if (timeSinceActivity > this.config.TIMEOUT) {
                this.securityUtils.logSecurityIncident('session_expired', {
                    sessionId: sessionData.sessionId,
                    inactiveTime: timeSinceActivity
                });
                this.destroySession();
                return null;
            }

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

    refreshActivity() {
        const sessionData = this._getSessionData();
        if (sessionData) {
            sessionData.lastActivity = Date.now();
            localStorage.setItem(this.config.STORAGE_KEY, JSON.stringify(sessionData));
        }
    }

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

    getTimeUntilExpiry() {
        const sessionData = this._getSessionData();
        if (!sessionData) return 0;

        const timeSinceActivity = Date.now() - sessionData.lastActivity;
        return Math.max(0, this.config.TIMEOUT - timeSinceActivity);
    }

    isCloseToExpiry() {
        return this.getTimeUntilExpiry() < this.config.REFRESH_THRESHOLD;
    }

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
                { duration: 10000 }
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

// ===================================
// SECTION 7: UI COMPONENTS
// ===================================

/**
 * Enhanced Modal Manager
 */
class ModalManager {
    constructor() {
        this.activeModals = new Map();
        this.modalCount = 0;
        this.focusStack = [];
        this.bodyScrollPosition = 0;
        this._setupGlobalListeners();
    }

    show(options = {}) {
        try {
            const modalId = options.id || `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            if (this.activeModals.has(modalId)) {
                console.warn(`Modal ${modalId} is already active. Focusing it.`);
                this.activeModals.get(modalId).element.focus();
                return this.activeModals.get(modalId);
            }

            if (this.activeModals.size >= UI_CONFIG.MODAL.MAX_MODALS) {
                console.warn('Maximum number of modals reached. Closing oldest.');
                const oldestModalId = this.activeModals.keys().next().value;
                this.hide(oldestModalId);
            }

            const modal = this._createModal(modalId, options);
            this.activeModals.set(modalId, modal);

            if (this.activeModals.size === 1) {
                this._saveCurrentState();
                document.body.style.overflow = 'hidden';
            }

            document.body.appendChild(modal.element);
            this._animateModalIn(modal);

            if (options.onShow) {
                options.onShow(modal);
            }

            return modal;
        } catch (error) {
            console.error('Failed to show modal:', error);
            return null;
        }
    }

    hide(modalId) {
        const modal = this.activeModals.get(modalId);
        if (!modal) {
            return false;
        }

        this._animateModalOut(modal, () => {
            if (modal.element.parentNode) {
                modal.element.remove();
            }
            this.activeModals.delete(modalId);

            if (modal.options.onHide) {
                modal.options.onHide(modal);
            }

            if (this.activeModals.size === 0) {
                this._restoreState();
                document.body.style.overflow = '';
            } else {
                const remainingModals = Array.from(this.activeModals.values());
                if (remainingModals.length > 0) {
                    const topModal = remainingModals[remainingModals.length - 1];
                    this._setupFocusManagement(topModal);
                }
            }
        });
        return true;
    }

    hideAll() {
        Array.from(this.activeModals.keys()).forEach(id => this.hide(id));
    }

    getActiveCount() {
        return this.activeModals.size;
    }

    hasActiveModals() {
        return this.activeModals.size > 0;
    }

    _createModal(modalId, options) {
        const defaultOptions = {
            title: 'Modal',
            content: '',
            size: 'medium',
            closable: true,
            backdrop: true,
            animation: true,
            focus: true,
            className: '',
            buttons: [],
            onShow: null,
            onHide: null,
            onSubmit: null
        };

        const modal = {
            id: modalId,
            element: document.createElement('div'),
            options: { ...defaultOptions, ...options },
            zIndex: UI_CONFIG.MODAL.Z_INDEX_BASE + this.activeModals.size,
            focusableElements: [],
            currentFocusIndex: 0
        };

        modal.element.className = `modal modal-${modal.options.size} ${modal.options.className}`;
        modal.element.setAttribute('role', 'dialog');
        modal.element.setAttribute('aria-modal', 'true');
        modal.element.setAttribute('aria-labelledby', `${modalId}-title`);
        modal.element.setAttribute('data-modal-id', modalId);
        modal.element.style.zIndex = modal.zIndex;

        if (modal.options.backdrop) {
            modal.element.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
            if (UI_CONFIG.MODAL.BACKDROP_BLUR) {
                modal.element.style.backdropFilter = 'blur(8px)';
            }
        }

        const contentEl = document.createElement('div');
        contentEl.className = 'modal-content';

        contentEl.appendChild(this._createModalHeader(modal));
        contentEl.appendChild(this._createModalBody(modal));

        if (modal.options.buttons && modal.options.buttons.length > 0) {
            contentEl.appendChild(this._createModalFooter(modal));
        }

        modal.element.appendChild(contentEl);
        this._setupModalEventListeners(modal);
        return modal;
    }

    _createModalHeader(modal) {
        const headerEl = document.createElement('div');
        headerEl.className = 'modal-header';

        const titleEl = document.createElement('h2');
        titleEl.id = `${modal.id}-title`;
        titleEl.className = 'modal-title';
        titleEl.textContent = modal.options.title;
        headerEl.appendChild(titleEl);

        if (modal.options.closable) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'modal-close';
            closeBtn.setAttribute('aria-label', 'Close modal');
            closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            closeBtn.onclick = () => this.hide(modal.id);
            headerEl.appendChild(closeBtn);
        }
        return headerEl;
    }

    _createModalBody(modal) {
        const bodyEl = document.createElement('div');
        bodyEl.className = 'modal-body';
        if (typeof modal.options.content === 'string') {
            bodyEl.innerHTML = modal.options.content;
        } else if (modal.options.content instanceof HTMLElement) {
            bodyEl.appendChild(modal.options.content);
        }
        return bodyEl;
    }

    _createModalFooter(modal) {
        const footerEl = document.createElement('div');
        footerEl.className = 'modal-footer';
        modal.options.buttons.forEach(button => {
            const btnEl = document.createElement('button');
            btnEl.type = 'button';
            btnEl.className = `btn ${button.className || 'btn-secondary'}`;
            btnEl.textContent = button.text;
            if (button.action) btnEl.setAttribute('data-action', button.action);
            if (button.primary) btnEl.classList.add('btn-primary');

            btnEl.onclick = async (e) => {
                let shouldClose = true;
                if (button.onClick) {
                    const formData = this._extractFormData(modal.element.querySelector('form'));
                    const result = await button.onClick(formData, modal);
                    if (result === false) {
                        shouldClose = false;
                    }
                }
                if (shouldClose && (button.action === 'close' || button.action === 'cancel' || button.primary)) {
                    this.hide(modal.id);
                }
            };
            footerEl.appendChild(btnEl);
        });
        return footerEl;
    }

    _extractFormData(formElement) {
        if (!formElement) return {};
        const formData = {};
        const elements = formElement.elements;
        for (let i = 0; i < elements.length; i++) {
            const item = elements[i];
            if (item.name) {
                if (item.type === 'checkbox') {
                    formData[item.name] = item.checked;
                } else if (item.type === 'radio') {
                    if (item.checked) {
                        formData[item.name] = item.value;
                    }
                } else {
                    formData[item.name] = item.value;
                }
            }
        }
        return formData;
    }

    _animateModalIn(modal) {
        modal.element.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.element.style.opacity = '1';
            const modalContent = modal.element.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.transition = `transform ${UI_CONFIG.MODAL.ANIMATION_DURATION}ms ease-out, opacity ${UI_CONFIG.MODAL.ANIMATION_DURATION}ms ease-out`;
                modalContent.style.transform = 'translateY(0) scale(1)';
                modalContent.style.opacity = '1';
            }
        });
        this._setupFocusManagement(modal);
    }

    _animateModalOut(modal, callback) {
        modal.element.style.opacity = '0';
        const modalContent = modal.element.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.transition = `transform ${UI_CONFIG.MODAL.ANIMATION_DURATION}ms ease-in, opacity ${UI_CONFIG.MODAL.ANIMATION_DURATION}ms ease-in`;
            modalContent.style.transform = 'translateY(20px) scale(0.95)';
            modalContent.style.opacity = '0';
        }
        setTimeout(callback, UI_CONFIG.MODAL.ANIMATION_DURATION);
    }

    _setupModalEventListeners(modal) {
        modal.element.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.options.closable) {
                this.hide(modal.id);
            } else if (e.key === 'Tab') {
                this._handleTabNavigation(e, modal);
            }
        });
        modal.element.addEventListener('click', (e) => {
            if (e.target === modal.element && modal.options.closable && modal.options.backdrop) {
                this.hide(modal.id);
            }
        });
    }

    _setupFocusManagement(modal) {
        this.focusStack.push(document.activeElement);
        const focusable = modal.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        modal.focusableElements = Array.from(focusable).filter(el => !el.disabled && el.offsetParent !== null);

        if (modal.focusableElements.length > 0 && UI_CONFIG.MODAL.AUTO_FOCUS) {
            setTimeout(() => modal.focusableElements[0].focus(), 50);
        }
    }

    _handleTabNavigation(e, modal) {
        if (!UI_CONFIG.MODAL.TRAP_FOCUS || modal.focusableElements.length === 0) return;

        const firstFocusable = modal.focusableElements[0];
        const lastFocusable = modal.focusableElements[modal.focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    }

    _saveCurrentState() {
        this.bodyScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    }

    _restoreState() {
        window.scrollTo(0, this.bodyScrollPosition);
        const lastFocused = this.focusStack.pop();
        if (lastFocused && typeof lastFocused.focus === 'function') {
            setTimeout(() => lastFocused.focus(), 100);
        }
    }

    _setupGlobalListeners() {
        // Setup global listeners if needed
    }
}

/**
 * Toast Notification Manager
 */
class ToastManager {
    constructor() {
        this.toastContainer = null;
        this.activeToasts = new Map();
        this._createToastContainer();
    }

    _createToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = `toast-container toast-${UI_CONFIG.TOAST.POSITION}`;
        this.toastContainer.setAttribute('aria-live', 'polite');
        this.toastContainer.setAttribute('aria-atomic', 'false');

        Object.assign(this.toastContainer.style, {
            position: 'fixed',
            zIndex: (UI_CONFIG.MODAL.Z_INDEX_BASE + 100).toString(),
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '10px',
            maxWidth: '90%',
            boxSizing: 'border-box'
        });

        const position = UI_CONFIG.TOAST.POSITION;
        if (position.includes('top')) this.toastContainer.style.top = '20px';
        if (position.includes('bottom')) this.toastContainer.style.bottom = '20px';
        if (position.includes('right')) this.toastContainer.style.right = '20px';
        if (position.includes('left')) this.toastContainer.style.left = '20px';
        if (position.includes('center')) {
            this.toastContainer.style.left = '50%';
            this.toastContainer.style.transform = 'translateX(-50%)';
            if (position === 'top-center') this.toastContainer.style.top = '20px';
            if (position === 'bottom-center') this.toastContainer.style.bottom = '20px';
        }

        document.body.appendChild(this.toastContainer);
    }

    show(message, type = 'info', options = {}) {
        if (this.activeToasts.size >= UI_CONFIG.TOAST.MAX_TOASTS) {
            const oldestToastId = this.activeToasts.keys().next().value;
            this.hide(oldestToastId);
        }

        const toastId = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const duration = options.duration || UI_CONFIG.TOAST.DEFAULT_DURATION;

        const toastElement = document.createElement('div');
        toastElement.className = `toast-notification toast-${type} ${options.className || ''}`;
        toastElement.setAttribute('role', 'alert');
        toastElement.setAttribute('aria-live', 'assertive');

        toastElement.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    ${this._getIconSVG(type)}
                </div>
                <div class="toast-body">
                    ${options.title ? `<div class="toast-title">${this._sanitize(options.title)}</div>` : ''}
                    <div class="toast-message">${this._sanitize(message)}</div>
                </div>
                ${options.closable !== false ? '<button class="toast-close-btn" aria-label="Close notification">&times;</button>' : ''}
            </div>
        `;

        this.toastContainer.appendChild(toastElement);
        this.activeToasts.set(toastId, toastElement);

        toastElement.style.opacity = '0';
        if (UI_CONFIG.TOAST.POSITION.includes('right')) {
            toastElement.style.transform = 'translateX(100%)';
        } else if (UI_CONFIG.TOAST.POSITION.includes('left')) {
            toastElement.style.transform = 'translateX(-100%)';
        } else if (UI_CONFIG.TOAST.POSITION.includes('top')) {
            toastElement.style.transform = 'translateY(-100%)';
        } else if (UI_CONFIG.TOAST.POSITION.includes('bottom')) {
            toastElement.style.transform = 'translateY(100%)';
        }

        requestAnimationFrame(() => {
            toastElement.style.transition = `all ${UI_CONFIG.TOAST.ANIMATION_DURATION}ms ease-out`;
            toastElement.style.opacity = '1';
            toastElement.style.transform = 'translate(0,0)';
        });

        if (options.closable !== false) {
            toastElement.querySelector('.toast-close-btn').onclick = () => this.hide(toastId);
        }
        if (options.onClick) {
            toastElement.style.cursor = 'pointer';
            toastElement.addEventListener('click', (event) => {
                if (event.target.closest('.toast-close-btn') === null) {
                    options.onClick(toastId);
                    this.hide(toastId);
                }
            });
        }

        if (duration > 0) {
            setTimeout(() => this.hide(toastId), duration);
        }
        return toastId;
    }

    hide(toastId) {
        const toastElement = this.activeToasts.get(toastId);
        if (toastElement) {
            toastElement.style.opacity = '0';
            if (UI_CONFIG.TOAST.POSITION.includes('right')) {
                toastElement.style.transform = 'translateX(100%)';
            } else if (UI_CONFIG.TOAST.POSITION.includes('left')) {
                toastElement.style.transform = 'translateX(-100%)';
            } else if (UI_CONFIG.TOAST.POSITION.includes('top')) {
                toastElement.style.transform = 'translateY(-100%)';
            } else if (UI_CONFIG.TOAST.POSITION.includes('bottom')) {
                toastElement.style.transform = 'translateY(100%)';
            }

            setTimeout(() => {
                if (toastElement.parentNode) {
                    toastElement.remove();
                }
                this.activeToasts.delete(toastId);
            }, UI_CONFIG.TOAST.ANIMATION_DURATION);
        }
    }

    _getIconSVG(type) {
        switch (type) {
            case 'success': return `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
            case 'error': return `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
            case 'warning': return `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;
            case 'info':
            default: return `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;
        }
    }

    _sanitize(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
}

/**
 * Loading Indicator Manager
 */
class LoadingManager {
    constructor() {
        this.activeLoaders = new Map();
        this.globalLoaderElement = null;
    }

    show(target, options = {}) {
        const loaderId = `loader_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const message = options.message || 'Loading...';

        if (target === 'global' || (typeof target === 'string' && target === UI_CONFIG.LOADING.GLOBAL_TARGET_ID)) {
            if (!this.globalLoaderElement) {
                this.globalLoaderElement = document.getElementById(UI_CONFIG.LOADING.GLOBAL_TARGET_ID);
                if (!this.globalLoaderElement) {
                    this.globalLoaderElement = document.createElement('div');
                    this.globalLoaderElement.id = UI_CONFIG.LOADING.GLOBAL_TARGET_ID;
                    this.globalLoaderElement.className = 'loading-screen';
                    this.globalLoaderElement.innerHTML = `
                        <div class="loading-spinner"></div>
                        <p class="loading-message">${message}</p>
                    `;
                    document.body.appendChild(this.globalLoaderElement);
                }
            }
            this.globalLoaderElement.style.display = 'flex';
            this.globalLoaderElement.style.opacity = '1';
            const messageElement = this.globalLoaderElement.querySelector('.loading-message') || this.globalLoaderElement.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
            document.body.style.overflow = 'hidden';
            this.activeLoaders.set(loaderId, { type: 'global', element: this.globalLoaderElement });
            return loaderId;

        } else if (target instanceof HTMLElement) {
            const targetElement = target;
            const overlay = document.createElement('div');
            overlay.className = 'element-loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner-local"></div>
                ${options.message ? `<p class="loading-message-local">${options.message}</p>` : ''}
            `;
            if (window.getComputedStyle(targetElement).position === 'static') {
                targetElement.style.position = 'relative';
            }
            targetElement.appendChild(overlay);
            this.activeLoaders.set(loaderId, { type: 'element', element: overlay, targetElement: targetElement });
            return loaderId;

        } else if (typeof target === 'string') {
            const targetElement = document.getElementById(target);
            if (targetElement) {
                return this.show(targetElement, options);
            } else {
                console.warn(`Loading target element with ID '${target}' not found.`);
                return null;
            }
        }
        return null;
    }

    hide(id = 'global') {
        const loaderInfo = this.activeLoaders.get(id);
        if (loaderInfo) {
            if (loaderInfo.type === 'global') {
                loaderInfo.element.style.opacity = '0';
                setTimeout(() => {
                    loaderInfo.element.style.display = 'none';
                    if (this.activeLoaders.size === 1) {
                        document.body.style.overflow = '';
                    }
                }, UI_CONFIG.MODAL.ANIMATION_DURATION);
            } else if (loaderInfo.type === 'element') {
                loaderInfo.element.remove();
            }
            this.activeLoaders.delete(id);
        }
    }

    hideAll() {
        Array.from(this.activeLoaders.keys()).forEach(id => this.hide(id));
    }
}

/**
 * Confirmation Dialog Manager
 */
class ConfirmationManager {
    static async confirm(options = {}) {
        return new Promise((resolve) => {
            const modalId = `confirm-modal-${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            let resolvedByButton = false;

            const defaults = {
                title: 'Confirm Action',
                message: 'Are you sure you want to proceed?',
                confirmText: 'Confirm',
                cancelText: 'Cancel',
                type: 'info',
                size: 'small',
                closable: true,
                backdrop: true
            };
            const config = { ...defaults, ...options };

            let iconSVG = '';
            if (config.type === 'warning') iconSVG = `<svg class="confirm-icon warning" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L1 21h22L12 2zm0 16c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm1-4h-2v-4h2v4z"/></svg>`;
            else if (config.type === 'danger') iconSVG = `<svg class="confirm-icon danger" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
            else if (config.type === 'success') iconSVG = `<svg class="confirm-icon success" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
            else if (config.type === 'info' || config.type === 'primary') iconSVG = `<svg class="confirm-icon info" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;

            window.modalManager.show({
                id: modalId,
                title: config.title,
                size: config.size,
                closable: config.closable,
                backdrop: config.backdrop,
                content: `
                    <div class="confirmation-dialog-content">
                        ${iconSVG}
                        <p>${config.message}</p>
                        ${config.details ? `<div class="confirmation-details">${config.details}</div>` : ''}
                    </div>
                `,
                buttons: [
                    {
                        text: config.cancelText,
                        className: 'btn-secondary',
                        onClick: () => { resolvedByButton = true; resolve(false); }
                    },
                    {
                        text: config.confirmText,
                        className: `btn-${config.type === 'danger' ? 'danger' : (config.type === 'warning' ? 'warning' : 'primary')}`,
                        primary: true,
                        onClick: () => { resolvedByButton = true; resolve(true); }
                    }
                ],
                onHide: () => {
                    if (!resolvedByButton) {
                        resolve(false);
                    }
                }
            });
        });
    }

    static async confirmDelete(itemName = 'item') {
        return this.confirm({
            title: `Confirm Deletion`,
            message: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger',
            details: 'This action is permanent and cannot be reversed.'
        });
    }

    static async confirmSave() {
        return this.confirm({
            title: 'Save Changes?',
            message: 'Do you want to save your changes?',
            confirmText: 'Save',
            cancelText: 'Discard',
            type: 'primary',
            details: 'Your unsaved changes will be lost if you discard.'
        });
    }

    static async confirmDiscard() {
        return this.confirm({
            title: 'Discard Changes?',
            message: 'You have unsaved changes. Are you sure you want to discard them?',
            confirmText: 'Discard',
            cancelText: 'Keep Editing',
            type: 'warning',
            details: 'Any unsaved changes will be lost.'
        });
    }
}

/**
 * Enhanced UIHelpers Class
 */
class UIHelpers {
    static showModal(options) {
        return window.modalManager.show(options);
    }

    static hideModal(id) {
        return window.modalManager.hide(id);
    }

    static showToast(message, type, options) {
        return window.toastManager.show(message, type, options);
    }

    static success(message, options) {
        return window.toastManager.show(message, 'success', options);
    }

    static error(message, options) {
        return window.toastManager.show(message, 'error', { ...options, duration: options?.duration || 6000 });
    }

    static warning(message, options) {
        return window.toastManager.show(message, 'warning', options);
    }

    static info(message, options) {
        return window.toastManager.show(message, 'info', options);
    }

    static showLoading(target, options) {
        return window.loadingManager.show(target, options);
    }

    static hideLoading(id = null) {
        return window.loadingManager.hide(id);
    }

    static confirm(options) {
        return window.ConfirmationManager.confirm(options);
    }

    static confirmDelete(itemName) {
        return window.ConfirmationManager.confirmDelete(itemName);
    }

    static confirmSave() {
        return window.ConfirmationManager.confirmSave();
    }

    static confirmDiscard() {
        return window.ConfirmationManager.confirmDiscard();
    }
}

// ===================================
// SECTION 8: FIREBASE SERVICES
// ===================================

/**
 * Enhanced Firebase Database Manager
 */
class FirebaseManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.isInitialized = false;
        this.cache = new Map();
        this.retryQueue = [];
        this.securityUtils = null;

        this.metrics = {
            operations: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0,
            retries: 0
        };
    }

    async init() {
        try {
            console.log('🔥 Initializing Enhanced Firebase Manager...');

            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK not loaded');
            }

            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }

            this.auth = firebase.auth();
            this.db = firebase.firestore();

            this.db.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            });

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

            if (typeof window !== 'undefined' && window.securityUtils) {
                this.securityUtils = window.securityUtils;
            }

            this._setupConnectionMonitoring();
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

    async get(collection, docId = null, options = {}) {
        try {
            this._incrementMetric('operations');

            if (!this.isInitialized) {
                throw new Error('Firebase not initialized');
            }

            const cacheKey = `${collection}_${docId || 'all'}_${JSON.stringify(options)}`;

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
                const doc = await query.doc(docId).get();
                result = doc.exists ? { id: doc.id, ...doc.data() } : null;
            } else {
                query = this._applyFilters(query, options);
                query = this._applySort(query, options);
                query = this._applyPagination(query, options);

                const snapshot = await query.get();
                result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }

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

            if (this._isRetryableError(error) && options.retry !== false) {
                return this._retryOperation('get', [collection, docId, { ...options, retry: false }]);
            }

            throw error;
        }
    }

    async create(collection, data, options = {}) {
        try {
            this._incrementMetric('operations');

            if (!this.isInitialized) {
                throw new Error('Firebase not initialized');
            }

            const sanitizedData = await this._validateAndSanitizeData(collection, data, 'create');

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

    async update(collection, docId, data, options = {}) {
        try {
            this._incrementMetric('operations');

            if (!this.isInitialized) {
                throw new Error('Firebase not initialized');
            }

            const sanitizedData = await this._validateAndSanitizeData(collection, data, 'update');
            const docRef = this.db.collection(collection).doc(docId);

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
                const updateData = {
                    ...sanitizedData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: this._getCurrentUserId()
                };

                await docRef.update(updateData);
            }

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

    async delete(collection, docId, options = {}) {
        try {
            this._incrementMetric('operations');

            if (!this.isInitialized) {
                throw new Error('Firebase not initialized');
            }

            const docRef = this.db.collection(collection).doc(docId);

            if (options.softDelete) {
                await docRef.update({
                    deleted: true,
                    deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    deletedBy: this._getCurrentUserId()
                });
            } else {
                await docRef.delete();
            }

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

    getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.cache.size,
            cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
            retryQueue: this.retryQueue.length
        };
    }

    clearCache() {
        this.cache.clear();
        console.log('🗑️ Firebase cache cleared');
    }

    // Private helper methods
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
                        const sanitized = {};
                        for (const [key, value] of Object.entries(data)) {
                            sanitized[key] = window.sanitizer.sanitize(value, 'text');
                        }
                        return sanitized;
                }
            }

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
                this.retryQueue.unshift(operation);
                setTimeout(() => this._processRetryQueue(), DB_CONFIG.RETRY_DELAY * operation.attempts);
            } else {
                operation.reject(error);
            }
        }
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
        }, 60000);
    }

    _incrementMetric(metric) {
        this.metrics[metric] = (this.metrics[metric] || 0) + 1;
    }

    async _logActivity(action, details) {
        try {
           // if (typeof window !== 'undefined' && window.authGuard) {
           //   await window.authGuard.logActivity(action, details);
            //}
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
 * Database Operations Class
 */
class DatabaseOperations {
    constructor(firebaseManager) {
        this.fm = firebaseManager;
    }

    async getLeadsForUser(userId, role = 'user') {
        try {
            let filters = [];

            switch (role) {
                case 'admin':
                    break;
                case 'master':
                    const teamMembers = await this.getTeamMembers(userId);
                    const teamIds = [userId, ...teamMembers.map(m => m.id)];
                    filters.push({ field: 'assignedTo', operator: 'in', value: teamIds });
                    break;
                case 'user':
                default:
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
            let filters = [];
            if (role !== 'admin') {
                filters.push({ field: 'assignedTo', operator: '==', value: userId });
            }

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



            if (window.firebaseService && window.firebaseService.isInitialized) {
                // ... rest of the code
            }
        } catch (error) {
            console.error('Failed to log activity:', error);
        }
    }

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

        csvRows.push(headers.join(','));

        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                let cellValue = '';
                if (value === null || value === undefined) {
                    cellValue = '';
                } else if (typeof value === 'object') {
                    if (value.seconds) {
                        cellValue = new Date(value.seconds * 1000).toISOString();
                    } else {
                        cellValue = JSON.stringify(value);
                    }
                } else {
                    cellValue = String(value);
                }

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
 */
class RealtimeManager {
    constructor(firebaseManager) {
        this.fm = firebaseManager;
        this.listeners = new Map();
        this.connectionState = 'disconnected';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

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

    unsubscribe(collection, options = {}) {
        const listenerId = this._generateListenerId(collection, options);
        const listener = this.listeners.get(listenerId);

        if (listener) {
            listener.unsubscribe();
            this.listeners.delete(listenerId);
            console.log(`📡 Real-time listener removed for ${collection}`);
        }
    }

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

    _generateListenerId(collection, options) {
        return `${collection}_${JSON.stringify(options)}`;
    }

    _handleConnectionError(error) {
        this.connectionState = 'error';
        this.reconnectAttempts++;

        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
            const delay = Math.pow(2, this.reconnectAttempts) * 1000;
            console.log(`🔄 Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

            setTimeout(() => {
                this.connectionState = 'reconnecting';
            }, delay);
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.connectionState = 'failed';
        }
    }
}

/**
 * Firebase Cloud Functions Interface
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

            await this.manager.init();

            this.operations = new DatabaseOperations(this.manager);
            this.realtime = new RealtimeManager(this.manager);

            await this.cloudFunctions.init();

            this.isInitialized = true;
            console.log('✅ Firebase Service initialized successfully');

            return true;
        } catch (error) {
            console.error('❌ Firebase Service initialization failed:', error);
            throw error;
        }
    }

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
// SECTION 9: AUTHENTICATION GUARD
// ===================================

/**
 * Main Authentication Guard Class
 */
class AuthGuard {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.isInitialized = false;

        this.securityUtils = new SecurityUtils();
        this.permissionSystem = new PermissionSystem();
        this.sessionManager = new SessionManager();

        this.failedAttempts = 0;
        this.securityMonitors = [];
    }

    async init() {
        try {
            console.log('🔐 Initializing Enhanced Authentication System...');

            this._initializeSecurityMonitoring();

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
                        if (window.errorHandler) {
                            window.errorHandler.logError(error, 'AuthGuard Initialization Error');
                        }
                        resolve(false);
                    }
                });
            });
        } catch (error) {
            console.error('Failed to initialize auth system:', error);
            if (window.errorHandler) {
                window.errorHandler.logError(error, 'AuthGuard System Init Error');
            }
            return false;
        }
    }

    isAuthenticated() {
        return this.currentUser !== null && this.sessionManager.validateSession() !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getCurrentRole() {
        return this.userRole;
    }

    hasRole(role) {
        return this.userRole === role;
    }

    hasAnyRole(roles) {
        return roles.includes(this.userRole);
    }

    hasPermission(permission) {
        return this.permissionSystem.hasPermission(this.userRole, permission);
    }

    showAccessDenied(message = 'Access denied. Insufficient permissions.') {
        this.securityUtils.logSecurityIncident('access_denied', {
            requiredPermission: message,
            userRole: this.userRole,
            userId: this.currentUser?.uid
        });

        if (typeof window !== 'undefined' && window.UIHelpers) {
            window.UIHelpers.showToast(message, 'error', { duration: 5000 });
        }
    }

    redirectToLogin() {
        this._showLoginPage();
    }

    showDashboard() {
        this._showDashboardPage();
        this.applyRoleBasedUI();
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

        // PERMANENT FIX: Ensure loading screen is hidden
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    applyRoleBasedUI() {
        if (!this.isAuthenticated()) return;

        console.log('🎨 Applying role-based UI for:', this.userRole);

        // PERMANENT FIX: Show elements based on role
        if (this.userRole === 'admin') {
            // Show all admin elements
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = el.dataset.originalDisplay || 'block';
                el.classList.add('show');
            });

            // Show master elements for admin too
            document.querySelectorAll('.master-only').forEach(el => {
                el.style.display = el.dataset.originalDisplay || 'block';
                el.classList.add('show');
            });
        } else if (this.userRole === 'master') {
            // Show master elements
            document.querySelectorAll('.master-only').forEach(el => {
                el.style.display = el.dataset.originalDisplay || 'block';
                el.classList.add('show');
            });

            // Hide admin elements
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
                el.classList.remove('show');
            });
        } else {
            // Hide both admin and master elements for regular users
            document.querySelectorAll('.admin-only, .master-only').forEach(el => {
                el.style.display = 'none';
                el.classList.remove('show');
            });
        }

        // Show authenticated elements
        document.querySelectorAll('.authenticated-only').forEach(el => {
            el.style.display = el.dataset.originalDisplay || 'block';
        });

        this._updateUserInfoDisplay();
    }

    async signOut() {
        try {
            if (typeof firebase !== 'undefined') {
                await firebase.auth().signOut();
            }

            this.sessionManager.destroySession();
            this.currentUser = null;
            this.userRole = null;
            this.redirectToLogin();
            this._cleanupSecurityMonitors();

            console.log('👋 User signed out');
        } catch (error) {
            console.error('Sign out error:', error);
            if (window.errorHandler) {
                window.errorHandler.logError(error, 'AuthGuard SignOut Error');
            }
        }
    }

    handleSessionTimeout() {
        this.securityUtils.logSecurityIncident('session_timeout_handled', {
            userId: this.currentUser?.uid,
            role: this.userRole
        });

        if (typeof window !== 'undefined' && window.UIHelpers) {
            window.UIHelpers.showToast(
                'Your session has expired. You will be logged out shortly.',
                'warning',
                { duration: 6000 }
            );
        }

        setTimeout(() => {
            this.signOut();
        }, 2000);
    }

    async handleAuthError(error) {
        this.failedAttempts++;

        if (this.failedAttempts >= AUTH_CONFIG.SECURITY.MAX_FAILED_ATTEMPTS) {
            const lockoutTime = Date.now() + AUTH_CONFIG.SECURITY.LOCKOUT_TIME;
            localStorage.setItem('account_locked_until', lockoutTime.toString());

            this.securityUtils.logSecurityIncident('account_locked', {
                attempts: this.failedAttempts,
                lockoutUntil: new Date(lockoutTime).toISOString()
            });
        }

        this.securityUtils.logSecurityIncident('authentication_failed', {
            error: error.code,
            message: error.message,
            attempts: this.failedAttempts
        });
    }

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

            this.securityUtils.logSecurityIncident('user_activity', activityData);

            if (window.firebaseService && window.firebaseService.isInitialized) {
                if (window.activityLogger) {
                    await window.activityLogger.logActivity(action, details);
                } else {
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

            const userData = await this._loadUserData(user);

            const sessionData = this.sessionManager.validateSession();
            if (!sessionData || sessionData.userId !== user.uid) {
                this.sessionManager.createSession(user.uid, userData);
            }

            this.currentUser = { ...user, ...userData };
            this.userRole = userData.role || 'user';
            this.isInitialized = true;

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
            if (window.errorHandler) {
                window.errorHandler.logError(error, 'AuthGuard HandleUserAuthenticated Error');
            }
            throw error;
        }
    }

    _handleUserNotAuthenticated() {
        console.log('❌ User not authenticated');
        this.currentUser = null;
        this.userRole = null;
        this.isInitialized = true;
        this.sessionManager.destroySession();
        this._cleanupSecurityMonitors();
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

            if (userData.status === 'inactive' || userData.status === 'locked') {
                throw new Error(`Account is ${userData.status}`);
            }

            await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });

            return userData;
        } catch (error) {
            if (window.errorHandler) {
                window.errorHandler.logError(error, 'AuthGuard LoadUserData Error');
            }
            throw error;
        }
    }

    _initializeSecurityMonitoring() {
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

        this._monitorDevTools();
        this._monitorPageVisibility();
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
            ['F12'],
            ['Control', 'Shift', 'I'],
            ['Control', 'Shift', 'J'],
            ['Control', 'U']
        ];

        const keyHandler = (event) => {
            const key = event.key;
            const modifiers = [];

            if (event.ctrlKey) modifiers.push('Control');
            if (event.shiftKey) modifiers.push('Shift');
            if (event.altKey) modifiers.push('Alt');
            if (event.metaKey) modifiers.push('Meta');

            const keyCombo = [...modifiers, key].join('+');
            keySequence.push(keyCombo);

            if (keySequence.length > 10) {
                keySequence.shift();
            }

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
                        userRoleEl.className = `user-role ${this.userRole}`;
                    }
                }

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
            // SECTION 10: ACTIVITY LOGGER
            // ===================================

            /**
             * Activity Logger Class
             */
            class ActivityLogger {
                constructor(firebaseService) {
                    this.firebaseService = firebaseService;
                    this.db = this.firebaseService.db.db;
                    this.logStreamListeners = new Map();
                    this.allLogs = [];
                }

                async logActivity(action, details = {}) {
                    try {
                        const userId = window.authGuard?.getCurrentUser()?.uid || 'anonymous';
                        const userRole = window.authGuard?.getCurrentRole() || 'unknown';
                        const sessionId = window.authGuard?.sessionManager?.validateSession()?.sessionId || 'no-session';
                        const ipAddress = await this._getClientIP();
                        const userAgent = navigator.userAgent || 'Unknown';

                        const activityData = {
                            action,
                            details: { ...details, userAgent, ipAddress },
                            userId,
                            userRole,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            clientTimestamp: Date.now(),
                            sessionId,
                        };

                        const docId = await this.firebaseService.db.create(DB_CONFIG.COLLECTIONS.ACTIVITY_LOGS, activityData);
                        console.log(`📝 Activity Logged: ${action} by ${userId}`);
                        return docId;
                    } catch (error) {
                        console.error('❌ Failed to log activity:', error);
                        if (window.authGuard?.securityUtils) {
                            window.authGuard.securityUtils.logSecurityIncident('activity_log_failed', {
                                action,
                                error: error.message,
                                details: details.action
                            });
                        }
                        throw error;
                    }
                }

                async loadActivityDashboard() {
                    if (!window.authGuard?.hasPermission('reports:view')) {
                        window.authGuard?.showAccessDenied('You do not have permission to view activity logs.');
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
                                </div>
                            </div>
                            <div class="activity-table-container data-table-container">
                                <div class="table-wrapper">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Timestamp</th>
                                                <th>Action</th>
                                                <th>User</th>
                                                <th>Role</th>
                                                <th>Details</th>
                                            </tr>
                                        </thead>
                                        <tbody id="activity-logs-table-body">
                                            <tr><td colspan="5" class="loading-row">Loading activity logs...</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `;

                    document.getElementById('refresh-logs-btn')?.addEventListener('click', () => this.populateActivityDashboard());
                    await this.populateActivityDashboard();
                    UIHelpers.hideLoading();
                }

                async populateActivityDashboard() {
                    UIHelpers.showLoading('Fetching logs...');
                    try {
                        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                        const logs = await this.firebaseService.db.get(DB_CONFIG.COLLECTIONS.ACTIVITY_LOGS, null, {
                            filters: [{ field: 'timestamp', operator: '>', value: twentyFourHoursAgo }],
                            orderBy: [{ field: 'timestamp', direction: 'desc' }],
                            limit: 200
                        });
                        this.allLogs = logs;
                        this._renderLogsTable(logs);
                    } catch (error) {
                        console.error('❌ Error populating activity dashboard:', error);
                        UIHelpers.error('Failed to load activity dashboard data.');
                    } finally {
                        UIHelpers.hideLoading();
                    }
                }

                _renderLogsTable(logs) {
                    const tableBody = document.getElementById('activity-logs-table-body');
                    if (!tableBody) return;

                    if (logs.length === 0) {
                        tableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No activity logs found.</td></tr>';
                        return;
                    }

                    tableBody.innerHTML = logs.map(log => {
                        const timestamp = log.timestamp ? (log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp)) : new Date(0);
                        const formattedTimestamp = DataUtils.formatDate(timestamp, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        const details = JSON.stringify(log.details || {});

                        return `
                            <tr>
                                <td>${formattedTimestamp}</td>
                                <td>${window.sanitizer?.sanitize(log.action, 'text') || log.action}</td>
                                <td>${window.sanitizer?.sanitize(log.userId, 'text') || log.userId}</td>
                                <td>${window.sanitizer?.sanitize(log.userRole || 'unknown', 'text') || log.userRole}</td>
                                <td title="${window.sanitizer?.sanitize(details, 'text') || details}">${(window.sanitizer?.sanitize(details.substring(0, 50) + '...', 'text') || details.substring(0, 50) + '...')}</td>
                            </tr>
                        `;
                    }).join('');
                }

                async getRecentActivities(limit = 10) {
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

                async _getClientIP() {
                    try {
                        const response = await fetch('https://api.ipify.org?format=json');
                        const data = await response.json();
                        return data.ip;
                    } catch (error) {
                        return 'unknown';
                    }
                }
            }

            // ===================================
            // SECTION 11: ADMIN MANAGER
            // ===================================

            /**
             * Master Manager Class
             */
            class MasterManager {
                constructor(firebaseService) {
                    this.firebaseService = firebaseService;
                    this.db = this.firebaseService.db.db;
                    this.auth = this.firebaseService.db.auth;
                    this.allMasters = [];
                    this.allUsers = [];
                }

                async loadManagementPanel() {
                    if (!window.authGuard?.hasRole('admin')) {
                        window.authGuard?.showAccessDenied('Only admins can manage masters');
                        return;
                    }

                    console.log('🔧 Loading Master Management Panel...');
                    UIHelpers.showLoading('Loading Masters...');

                    try {
                        const [usersSnapshot, leadsSnapshot] = await Promise.all([
                            this.firebaseService.db.get(DB_CONFIG.COLLECTIONS.USERS),
                            this.firebaseService.db.get(DB_CONFIG.COLLECTIONS.LEADS)
                        ]);

                        this.allUsers = usersSnapshot;
                        this.allMasters = usersSnapshot.filter(user => user.role === 'master');

                        const mastersWithStats = await this._calculateMasterStats(this.allMasters, this.allUsers, leadsSnapshot);

                        this._renderMasterManagementPanel(mastersWithStats);
                        console.log('✅ Master Management Panel loaded.');

                    } catch (error) {
                        console.error('❌ Error loading master management:', error);
                        UIHelpers.error('Failed to load master management panel: ' + error.message);
                    } finally {
                        UIHelpers.hideLoading();
                    }
                }

                _renderMasterManagementPanel(masters) {
                    const targetSection = document.getElementById('users-section');
                    if (!targetSection) return;

                    targetSection.innerHTML = `
                        <div class="section-header">
                            <h2>Master Management</h2>
                            <p>Manage your master users and their teams</p>
                        </div>

                        <div class="masters-management-container">
                            <div class="panel-header">
                                <div class="panel-controls">
                                    <button class="btn btn-primary" id="add-master-btn">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"/>
                                            <line x1="5" y1="12" x2="19" y2="12"/>
                                        </svg>
                                        Add Master
                                    </button>
                                </div>
                            </div>

                            <div class="masters-grid">
                                ${masters.length > 0 ? masters.map(master => this._renderMasterCard(master)).join('') : '<div class="empty-state"><h3>No Masters Found</h3><p>Click "Add Master" to create your first master user.</p></div>'}
                            </div>
                        </div>
                    `;

                    // Re-attach event listeners
                    document.getElementById('add-master-btn')?.addEventListener('click', () => this.showCreateMasterModal());
                }

                _renderMasterCard(master) {
                    const statusClass = master.status === 'active' ? 'success' : 'danger';
                    const lastActiveText = master.lastActive ? DataUtils.formatTimeAgo(master.lastActive) : 'Never logged in';

                    return `
                        <div class="master-card" data-master-id="${master.id}" onclick="window.adminManager?.masterManager?.viewMasterDetails('${master.id}')">
                            <div class="master-header">
                                <div class="master-avatar">
                                    ${(master.name || master.email || 'M').charAt(0).toUpperCase()}
                                </div>
                                <div class="master-info">
                                    <h3>${window.sanitizer?.sanitize(master.name || 'Unnamed Master', 'text') || master.name || 'Unnamed Master'}</h3>
                                    <p>${window.sanitizer?.sanitize(master.email, 'email') || master.email}</p>
                                    <div class="master-badge">Master</div>
                                </div>
                            </div>

                            <div class="master-stats">
                                <div class="stat-item">
                                    <div class="stat-number">${master.teamCount || 0}</div>
                                    <div class="stat-label">Team Size</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-number">${master.activeLeads || 0}</div>
                                    <div class="stat-label">Active Leads</div>
                                </div>
                            </div>

                            <div class="master-footer">
                                <div class="status-info">
                                    <span class="status-badge ${statusClass}">
                                        ${master.status === 'active' ? 'Active' : 'Inactive'}
                                    </span>
                                    <small>Last active: ${lastActiveText}</small>
                                </div>
                                <div class="master-actions" onclick="event.stopPropagation()">
                                    <button class="action-btn edit" onclick="window.adminManager?.masterManager?.editMaster('${master.id}')">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                        Edit
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }

                async _calculateMasterStats(masters, allUsers, allLeads) {
                    return masters.map(master => {
                        const teamMembers = allUsers.filter(user => user.linkedMaster === master.id);
                        const teamMemberIds = teamMembers.map(member => member.id);
                        teamMemberIds.push(master.id);

                        const masterLeads = allLeads.filter(lead =>
                            teamMemberIds.includes(lead.assignedTo) ||
                            teamMemberIds.includes(lead.createdBy)
                        );

                        const activeLeads = masterLeads.filter(lead =>
                            !['closed', 'dropped', 'notinterested'].includes(lead.status?.toLowerCase())
                        ).length;

                        return {
                            ...master,
                            teamCount: teamMembers.length,
                            teamMembers: teamMembers,
                            totalLeads: masterLeads.length,
                            activeLeads: activeLeads,
                            lastActive: master.lastLogin ? new Date(master.lastLogin.seconds * 1000) : null
                        };
                    });
                }

                showCreateMasterModal() {
                    UIHelpers.showModal({
                        title: 'Create New Master',
                        content: `
                            <form id="create-master-form" class="enhanced-form">
                                <div class="enhanced-form-section">
                                    <div class="enhanced-form-grid">
                                        <div class="enhanced-form-group">
                                            <label>Full Name *</label>
                                            <input type="text" id="create-master-name" required>
                                        </div>
                                        <div class="enhanced-form-group">
                                            <label>Email Address *</label>
                                            <input type="email" id="create-master-email" required>
                                        </div>
                                        <div class="enhanced-form-group">
                                            <label>Initial Password *</label>
                                            <input type="password" id="create-master-password" required>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        `,
                        size: 'medium',
                        buttons: [
                            {
                                text: 'Cancel',
                                className: 'btn-secondary',
                                action: 'cancel'
                            },
                            {
                                text: 'Create Master',
                                className: 'btn-primary',
                                action: 'submit',
                                primary: true,
                                onClick: async (formData, modal) => {
                                    const success = await this.createMaster(formData);
                                    return success;
                                }
                            }
                        ]
                    });
                }

                async createMaster(formData) {
                    UIHelpers.showLoading('Creating master...');
                    try {
                        const name = formData['create-master-name']?.trim();
                        const email = formData['create-master-email']?.trim();
                        const password = formData['create-master-password'];

                        if (!name || !email || !password) {
                            UIHelpers.warning('All fields are required.');
                            return false;
                        }

                        const result = await this.firebaseService.cf.call('createUser', {
                            email: window.sanitizer?.sanitize(email, 'email') || email,
                            password: password,
                            name: window.sanitizer?.sanitize(name, 'name') || name,
                            role: 'master'
                        });

                        if (result.success) {
                            await window.activityLogger?.logActivity('create_master', {
                                newMasterId: result.userId,
                                newMasterEmail: email
                            });
                            UIHelpers.success('Master created successfully!');
                            await this.loadManagementPanel();
                            return true;
                        } else {
                            UIHelpers.error('Failed to create master: ' + (result.message || 'Unknown error'));
                            return false;
                        }
                    } catch (error) {
                        console.error('❌ Error creating master:', error);
                        UIHelpers.error('Error creating master: ' + error.message);
                        return false;
                    } finally {
                        UIHelpers.hideLoading();
                    }
                }

                /**
                 * View Master Details with Users and Leads
                 */
                async viewMasterDetails(masterId) {
                    try {
                        console.log('📋 Loading master details for:', masterId);

                        // Show loading in the section instead of global
                        const targetSection = document.getElementById('users-section');
                        if (targetSection) {
                            targetSection.innerHTML = `
                                <div class="loading-state">
                                    <div class="loading-spinner"></div>
                                    <p>Loading master details...</p>
                                </div>
                            `;
                        }

                        // Get master data with error handling
                        let master;
                        try {
                            master = await this.firebaseService.db.get('users', masterId);
                            console.log('✅ Master loaded:', master);
                        } catch (error) {
                            console.error('❌ Error loading master:', error);
                            throw new Error('Could not load master data');
                        }

                        if (!master) {
                            throw new Error('Master not found');
                        }

                        // Get team members with error handling
                        let teamMembers = [];
                        try {
                            teamMembers = await this.firebaseService.db.get('users', null, {
                                filters: [{ field: 'linkedMaster', operator: '==', value: masterId }]
                            });
                            console.log('✅ Team members loaded:', teamMembers.length);
                        } catch (error) {
                            console.error('❌ Error loading team members:', error);
                            teamMembers = []; // Continue with empty team
                        }

                        // Get leads with error handling
                        let leads = [];
                        try {
                            const teamUserIds = [masterId, ...teamMembers.map(member => member.id)];

                            // If teamUserIds is large, we might hit Firestore 'in' limit (10 items)
                            if (teamUserIds.length <= 10) {
                                leads = await this.firebaseService.db.get('leads', null, {
                                    filters: [{ field: 'assignedTo', operator: 'in', value: teamUserIds }]
                                });
                            } else {
                                // If more than 10 users, get leads for master only
                                leads = await this.firebaseService.db.get('leads', null, {
                                    filters: [{ field: 'assignedTo', operator: '==', value: masterId }]
                                });
                            }
                            console.log('✅ Leads loaded:', leads.length);
                        } catch (error) {
                            console.error('❌ Error loading leads:', error);
                            leads = []; // Continue with empty leads
                        }

                        // Render the view
                        this._renderMasterDetailView(master, teamMembers, leads);
                        console.log('✅ Master detail view completed');

                    } catch (error) {
                        console.error('❌ Error in viewMasterDetails:', error);

                        // Show error in the section
                        const targetSection = document.getElementById('users-section');
                        if (targetSection) {
                            targetSection.innerHTML = `
                                <div class="error-state">
                                    <div class="error-icon">⚠️</div>
                                    <h3>Error Loading Master Details</h3>
                                    <p>${error.message}</p>
                                    <button class="btn btn-primary" onclick="window.adminManager?.masterManager?.loadManagementPanel()">
                                        Back to Masters
                                    </button>
                                </div>
                            `;
                        }
                    }
                }

                /**
                 * Render Master Detail View
                 */
                _renderMasterDetailView(master, teamMembers, leads) {
                    const targetSection = document.getElementById('users-section');
                    if (!targetSection) return;

                    // Calculate statistics
                    const masterStats = this._calculateMasterDetailStats(master, teamMembers, leads);

                    targetSection.innerHTML = `
                        <div class="master-detail-container">
                            <!-- Header with Back Button -->
                            <div class="master-detail-header">
                                <button class="back-btn" onclick="window.adminManager?.masterManager?.loadManagementPanel()">
                                    <span class="back-icon">←</span>
                                    Back to Masters
                                </button>
                                <div class="master-detail-title">
                                    <h1>${this._sanitize(master.name || 'Unnamed Master')}</h1>
                                    <p>Master Details & Team Overview</p>
                                </div>
                            </div>

                            <!-- Master Info Card -->
                            <div class="master-info-card">
                                <div class="master-profile">
                                    <div class="master-avatar-large">
                                        ${(master.name || master.email || 'M').charAt(0).toUpperCase()}
                                    </div>
                                    <div class="master-profile-info">
                                        <h2>${this._sanitize(master.name || 'Unnamed Master')}</h2>
                                        <p class="master-email">${this._sanitize(master.email)}</p>
                                        <div class="master-badges">
                                            <span class="role-badge master">Master</span>
                                            <span class="status-badge ${master.status === 'active' ? 'status-active' : 'status-inactive'}">
                                                ${master.status === 'active' ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div class="master-meta">
                                            <div class="meta-item">
                                                <span class="meta-label">Joined:</span>
                                                <span class="meta-value">${master.createdAt ? DataUtils.formatDate(master.createdAt) : 'Unknown'}</span>
                                            </div>
                                            <div class="meta-item">
                                                <span class="meta-label">Last Login:</span>
                                                <span class="meta-value">${master.lastLogin ? DataUtils.formatTimeAgo(master.lastLogin) : 'Never'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Stats Overview -->
                                <div class="master-stats-overview">
                                    <div class="stat-item">
                                        <div class="stat-icon">👥</div>
                                        <div class="stat-content">
                                            <div class="stat-number">${masterStats.totalUsers}</div>
                                            <div class="stat-label">Team Members</div>
                                        </div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-icon">📋</div>
                                        <div class="stat-content">
                                            <div class="stat-number">${masterStats.totalLeads}</div>
                                            <div class="stat-label">Total Leads</div>
                                        </div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-icon">✅</div>
                                        <div class="stat-content">
                                            <div class="stat-number">${masterStats.activeLeads}</div>
                                            <div class="stat-label">Active Leads</div>
                                        </div>
                                    </div>
                                    <div class="stat-item">
                                        <div class="stat-icon">🎯</div>
                                        <div class="stat-content">
                                            <div class="stat-number">${masterStats.conversionRate}%</div>
                                            <div class="stat-label">Conversion</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Team Members Section -->
                            <div class="team-section">
                                <div class="section-header">
                                    <h2>Team Members (${teamMembers.length})</h2>
                                    <button class="btn btn-primary" onclick="window.adminManager?.masterManager?.addTeamMember('${master.id}')">
                                        <span>👤</span>
                                        Add Team Member
                                    </button>
                                </div>
                                <div class="team-members-grid">
                                    ${teamMembers.length > 0 ? teamMembers.map(member => this._renderTeamMemberCard(member, leads)).join('') : this._renderEmptyTeamState()}
                                </div>
                            </div>

                            <!-- Leads Overview Section -->
                            <div class="leads-section">
                                <div class="section-header">
                                    <h2>Team Leads Overview (${leads.length})</h2>
                                    <div class="leads-filters">
                                        <select id="user-filter" onchange="window.adminManager?.masterManager?.filterLeadsByUser(this.value)">
                                            <option value="all">All Team Members</option>
                                            <option value="${master.id}">${master.name} (Master)</option>
                                            ${teamMembers.map(member => `<option value="${member.id}">${member.name}</option>`).join('')}
                                        </select>
                                        <select id="status-filter" onchange="window.adminManager?.masterManager?.filterLeadsByStatus(this.value)">
                                            <option value="all">All Statuses</option>
                                            <option value="newLead">New Leads</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="interested">Interested</option>
                                            <option value="booked">Booked</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="leads-table-container">
                                    <table class="leads-table">
                                        <thead>
                                            <tr>
                                                <th>Lead Name</th>
                                                <th>Phone</th>
                                                <th>Status</th>
                                                <th>Assigned To</th>
                                                <th>Source</th>
                                                <th>Created</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="master-leads-table">
                                            ${this._renderLeadsTableRows(leads, [...teamMembers, master])}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `;

                    // Store data for filtering
                    this.currentMasterData = {
                        master,
                        teamMembers,
                        leads,
                        allUsers: [...teamMembers, master]
                    };
                }

                /**
                 * Render Team Member Card
                 */
                _renderTeamMemberCard(member, leads) {
                    const memberLeads = leads.filter(lead => lead.assignedTo === member.id);
                    const activeLeads = memberLeads.filter(lead => !['closed', 'dropped', 'notinterested'].includes(lead.status?.toLowerCase()));

                    return `
                        <div class="team-member-card">
                            <div class="member-header">
                                <div class="member-avatar">
                                    ${(member.name || member.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div class="member-info">
                                    <h3>${this._sanitize(member.name || 'Unnamed User')}</h3>
                                    <p>${this._sanitize(member.email)}</p>
                                    <span class="role-badge user">User</span>
                                </div>
                            </div>
                            <div class="member-stats">
                                <div class="member-stat">
                                    <span class="stat-number">${memberLeads.length}</span>
                                    <span class="stat-label">Total Leads</span>
                                </div>
                                <div class="member-stat">
                                    <span class="stat-number">${activeLeads.length}</span>
                                    <span class="stat-label">Active</span>
                                </div>
                            </div>
                            <div class="member-actions">
                                <button class="action-btn view" onclick="window.adminManager?.masterManager?.viewUserLeads('${member.id}')">
                                    <span>👁️</span>
                                    View Leads
                                </button>
                                <button class="action-btn edit" onclick="window.adminManager?.masterManager?.editTeamMember('${member.id}')">
                                    <span>✏️</span>
                                    Edit
                                </button>
                            </div>
                        </div>
                    `;
                }

                /**
                 * Render Leads Table Rows
                 */
                _renderLeadsTableRows(leads, users) {
                    if (leads.length === 0) {
                        return '<tr><td colspan="7" class="empty-cell">No leads found for this team</td></tr>';
                    }

                    return leads.map(lead => {
                        const assignedUser = users.find(user => user.id === lead.assignedTo);
                        const createdDate = lead.createdAt ? DataUtils.formatDate(lead.createdAt) : 'Unknown';

                        return `
                            <tr data-lead-id="${lead.id}" data-user-id="${lead.assignedTo}" data-status="${lead.status}">
                                <td>
                                    <div class="lead-name">
                                        <strong>${this._sanitize(lead.name || 'Unnamed Lead')}</strong>
                                    </div>
                                </td>
                                <td>${this._sanitize(lead.phone || 'No phone')}</td>
                                <td>
                                    <span class="status-badge status-${lead.status || 'new'}">
                                        ${this._getStatusText(lead.status)}
                                    </span>
                                </td>
                                <td>
                                    <div class="assigned-user">
                                        <span class="user-avatar-small">
                                            ${(assignedUser?.name || assignedUser?.email || 'U').charAt(0).toUpperCase()}
                                        </span>
                                        ${this._sanitize(assignedUser?.name || 'Unknown User')}
                                    </div>
                                </td>
                                <td>${this._sanitize(lead.source || 'Unknown')}</td>
                                <td>${createdDate}</td>
                                <td>
                                    <div class="lead-actions">
                                        <button class="action-btn view" onclick="window.leadManager?.viewLead('${lead.id}')">
                                            <span>👁️</span>
                                        </button>
                                        <button class="action-btn edit" onclick="window.leadManager?.editLead('${lead.id}')">
                                            <span>✏️</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }

                /**
                 * Calculate Master Detail Statistics
                 */
                _calculateMasterDetailStats(master, teamMembers, leads) {
                    const totalUsers = teamMembers.length;
                    const totalLeads = leads.length;
                    const activeLeads = leads.filter(lead => !['closed', 'dropped', 'notinterested'].includes(lead.status?.toLowerCase())).length;
                    const closedLeads = leads.filter(lead => ['closed', 'booked'].includes(lead.status?.toLowerCase())).length;
                    const conversionRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;

                    return {
                        totalUsers,
                        totalLeads,
                        activeLeads,
                        closedLeads,
                        conversionRate
                    };
                }

                /**
                 * Filter leads by user
                 */
                filterLeadsByUser(userId) {
                    if (!this.currentMasterData) return;

                    const rows = document.querySelectorAll('#master-leads-table tr');
                    rows.forEach(row => {
                        const rowUserId = row.getAttribute('data-user-id');
                        if (userId === 'all' || rowUserId === userId) {
                            row.style.display = '';
                        } else {
                            row.style.display = 'none';
                        }
                    });
                }

                /**
                 * Filter leads by status
                 */
                filterLeadsByStatus(status) {
                    if (!this.currentMasterData) return;

                    const rows = document.querySelectorAll('#master-leads-table tr');
                    rows.forEach(row => {
                        const rowStatus = row.getAttribute('data-status');
                        if (status === 'all' || rowStatus === status) {
                            row.style.display = '';
                        } else {
                            row.style.display = 'none';
                        }
                    });
                }

                /**
                 * Render Empty Team State
                 */
                _renderEmptyTeamState() {
                    return `
                        <div class="empty-team-state">
                            <div class="empty-icon">👥</div>
                            <h3>No Team Members</h3>
                            <p>This master doesn't have any team members yet.</p>
                            <button class="btn btn-primary" onclick="window.adminManager?.masterManager?.addTeamMember()">
                                Add Team Member
                            </button>
                        </div>
                    `;
                }

                /**
                 * Get Status Text
                 */
                _getStatusText(status) {
                    const statusMap = {
                        'newLead': 'New Lead',
                        'contacted': 'Contacted',
                        'interested': 'Interested',
                        'followup': 'Follow Up',
                        'visit': 'Visit',
                        'booked': 'Booked',
                        'closed': 'Closed',
                        'notinterested': 'Not Interested',
                        'dropped': 'Dropped'
                    };
                    return statusMap[status] || 'New Lead';
                }

                /**
                 * Sanitize text for display
                 */
                _sanitize(text) {
                    if (!text) return '';
                    return text.toString().replace(/[<>]/g, '');
                }

                async editMaster(masterId) {
                    console.log('Edit master:', masterId);
                    // Implementation would go here
                }
            }

            /**
             * Admin Manager Class
             */
            class AdminManager {
                constructor() {
                    this.firebaseService = null;
                    this.db = null;
                    this.masterManager = null;
                }

                init(firebaseService) {
                    this.firebaseService = firebaseService;
                    this.db = this.firebaseService.db.db;
                    this.masterManager = new MasterManager(this.firebaseService);
                    console.log('✅ AdminManager initialized with FirebaseService.');
                }

                async loadMasterManagementPanel() {
                    if (!this.masterManager) {
                        console.error('MasterManager is not initialized.');
                        UIHelpers.error('Admin functions are not ready. Please refresh.');
                        return;
                    }
                    await this.masterManager.loadManagementPanel();
                }
            }

            // ===================================
            // SECTION 12: LEAD MANAGER
            // ===================================

            /**
             * Lead Manager Class
             */
            class LeadManager {
                constructor(firebaseService) {
                    this.firebaseService = firebaseService;
                    this.leads = [];
                    this.filteredLeads = [];
                    this.currentFilters = {};

                    this.fetchLeads = this.fetchLeads.bind(this);
                    this.renderLeads = this.renderLeads.bind(this);
                    this.addLead = this.addLead.bind(this);
                    this.updateLead = this.updateLead.bind(this);
                    this.deleteLead = this.deleteLead.bind(this);
                }

                async fetchLeads() {
                    try {
                        const user = window.authGuard?.getCurrentUser();
                        const role = window.authGuard?.getCurrentRole();

                        if (!user) {
                            throw new Error('User not authenticated');
                        }

                        const leads = await this.firebaseService.ops.getLeadsForUser(user.uid, role);
                        this.leads = leads;
                        this.filteredLeads = [...leads];
                        return leads;
                    } catch (error) {
                        console.error('❌ Error fetching leads:', error);
                        UIHelpers.error('Failed to fetch leads: ' + error.message);
                        return [];
                    }
                }

                renderLeads(containerId = 'leads-table-body') {
                    const container = document.getElementById(containerId);
                    if (!container) {
                        console.error(`Container ${containerId} not found`);
                        return;
                    }

                    if (this.filteredLeads.length === 0) {
                        container.innerHTML = '<tr><td colspan="6" class="loading-row">No leads found</td></tr>';
                        return;
                    }

                    container.innerHTML = this.filteredLeads.map(lead => this._renderLeadRow(lead)).join('');
                }

                _renderLeadRow(lead) {
                    const createdDate = lead.createdAt ? DataUtils.formatDate(lead.createdAt.toDate ? lead.createdAt.toDate() : lead.createdAt) : 'N/A';
                    const statusClass = this._getStatusClass(lead.status);
                    const statusText = this._getStatusText(lead.status);

                    return `
                        <tr data-lead-id="${lead.id}">
                            <td><strong>${window.sanitizer?.sanitize(lead.name || 'Unnamed Lead', 'text') || lead.name || 'Unnamed Lead'}</strong></td>
                            <td>${window.sanitizer?.sanitize(lead.phone || 'No phone', 'text') || lead.phone || 'No phone'}</td>
                            <td>
                                <span class="status-badge ${statusClass}">
                                    ${statusText}
                                </span>
                            </td>
                            <td>${window.sanitizer?.sanitize(lead.source || 'Unknown', 'text') || lead.source || 'Unknown'}</td>
                            <td>${createdDate}</td>
                            <td>
                                <button class="action-btn view" onclick="window.leadManager?.viewLead('${lead.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                    View
                                </button>
                                <button class="action-btn edit" onclick="window.leadManager?.editLead('${lead.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                    Edit
                                </button>
                            </td>
                        </tr>
                    `;
                }

                async addLead(leadData) {
                    try {
                        UIHelpers.showLoading('Adding lead...');

                        const sanitizedData = window.sanitizer?.sanitizeLeadData(leadData);
                        if (sanitizedData && !sanitizedData.isValid) {
                            UIHelpers.error('Validation failed: ' + Object.values(sanitizedData.errors).join(', '));
                            return false;
                        }

                        const dataToSave = sanitizedData?.sanitizedData || leadData;
                        const leadId = await this.firebaseService.db.create(DB_CONFIG.COLLECTIONS.LEADS, {
                            ...dataToSave,
                            createdBy: window.authGuard?.getCurrentUser()?.uid,
                            assignedTo: dataToSave.assignedTo || window.authGuard?.getCurrentUser()?.uid
                        });

                        await window.activityLogger?.logActivity('create_lead', {
                            leadId: leadId,
                            leadName: dataToSave.name
                        });

                        UIHelpers.success('Lead added successfully!');
                        await this.fetchLeads();
                        this.renderLeads();
                        return true;
                    } catch (error) {
                        console.error('❌ Error adding lead:', error);
                        UIHelpers.error('Failed to add lead: ' + error.message);
                        return false;
                    } finally {
                        UIHelpers.hideLoading();
                    }
                }

                async updateLead(leadId, leadData) {
                    try {
                        UIHelpers.showLoading('Updating lead...');

                        const sanitizedData = window.sanitizer?.sanitizeLeadData(leadData);
                        if (sanitizedData && !sanitizedData.isValid) {
                            UIHelpers.error('Validation failed: ' + Object.values(sanitizedData.errors).join(', '));
                            return false;
                        }

                        const dataToSave = sanitizedData?.sanitizedData || leadData;
                        await this.firebaseService.db.update(DB_CONFIG.COLLECTIONS.LEADS, leadId, dataToSave);

                        await window.activityLogger?.logActivity('update_lead', {
                            leadId: leadId,
                            changes: Object.keys(dataToSave)
                        });

                        UIHelpers.success('Lead updated successfully!');
                        await this.fetchLeads();
                        this.renderLeads();
                        return true;
                    } catch (error) {
                        console.error('❌ Error updating lead:', error);
                        UIHelpers.error('Failed to update lead: ' + error.message);
                        return false;
                    } finally {
                        UIHelpers.hideLoading();
                    }
                }

                async deleteLead(leadId) {
                    try {
                        const confirmed = await UIHelpers.confirmDelete('this lead');
                        if (!confirmed) return false;

                        UIHelpers.showLoading('Deleting lead...');

                        await this.firebaseService.db.delete(DB_CONFIG.COLLECTIONS.LEADS, leadId);

                        await window.activityLogger?.logActivity('delete_lead', {
                            leadId: leadId
                        });

                        UIHelpers.success('Lead deleted successfully!');
                        await this.fetchLeads();
                        this.renderLeads();
                        return true;
                    } catch (error) {
                        console.error('❌ Error deleting lead:', error);
                        UIHelpers.error('Failed to delete lead: ' + error.message);
                        return false;
                    } finally {
                        UIHelpers.hideLoading();
                    }
                }

                async viewLead(leadId) {
                    const lead = this.leads.find(l => l.id === leadId);
                    if (!lead) {
                        UIHelpers.error('Lead not found');
                        return;
                    }

                    UIHelpers.showModal({
                        title: `Lead Details - ${lead.name}`,
                        content: this._generateLeadDetailsHTML(lead),
                        size: 'large',
                        buttons: [
                            {
                                text: 'Close',
                                className: 'btn-secondary',
                                action: 'close'
                            },
                            {
                                text: 'Edit Lead',
                                className: 'btn-primary',
                                onClick: () => {
                                    this.editLead(leadId);
                                }
                            }
                        ]
                    });
                }

                async editLead(leadId) {
                    const lead = this.leads.find(l => l.id === leadId);
                    if (!lead) {
                        UIHelpers.error('Lead not found');
                        return;
                    }

                    UIHelpers.showModal({
                        title: `Edit Lead - ${lead.name}`,
                        content: this._generateLeadFormHTML(lead),
                        size: 'large',
                        buttons: [
                            {
                                text: 'Cancel',
                                className: 'btn-secondary',
                                action: 'cancel'
                            },
                            {
                                text: 'Save Changes',
                                className: 'btn-primary',
                                primary: true,
                                onClick: async (formData) => {
                                    const success = await this.updateLead(leadId, formData);
                                    return success;
                                }
                            }
                        ]
                    });
                }

                _generateLeadDetailsHTML(lead) {
                    return `
                        <div class="lead-details-container">
                            <div class="lead-section">
                                <h3>Contact Information</h3>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <label>Name:</label>
                                        <span>${window.sanitizer?.sanitize(lead.name || 'N/A', 'text') || lead.name || 'N/A'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Phone:</label>
                                        <span>${window.sanitizer?.sanitize(lead.phone || 'N/A', 'text') || lead.phone || 'N/A'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Email:</label>
                                        <span>${window.sanitizer?.sanitize(lead.email || 'N/A', 'email') || lead.email || 'N/A'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Status:</label>
                                        <span class="status-badge ${this._getStatusClass(lead.status)}">${this._getStatusText(lead.status)}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="lead-section">
                                <h3>Lead Information</h3>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <label>Source:</label>
                                        <span>${window.sanitizer?.sanitize(lead.source || 'N/A', 'text') || lead.source || 'N/A'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Property Type:</label>
                                        <span>${window.sanitizer?.sanitize(lead.propertyType || 'N/A', 'text') || lead.propertyType || 'N/A'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Budget:</label>
                                        <span>${window.sanitizer?.sanitize(lead.budget || 'N/A', 'text') || lead.budget || 'N/A'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Location:</label>
                                        <span>${window.sanitizer?.sanitize(lead.location || 'N/A', 'text') || lead.location || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            ${lead.requirements ? `
                            <div class="lead-section">
                                <h3>Requirements</h3>
                                <p>${window.sanitizer?.sanitize(lead.requirements, 'multiline') || lead.requirements}</p>
                            </div>
                            ` : ''}
                        </div>
                    `;
                }

                _generateLeadFormHTML(lead = {}) {
                    return `
                        <form id="lead-form" class="lead-form">
                            <div class="form-section">
                                <div class="section-title">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                        <circle cx="9" cy="7" r="4"/>
                                    </svg>
                                    Contact Information
                                </div>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Name *</label>
                                        <input type="text" name="name" value="${lead.name || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Phone *</label>
                                        <input type="tel" name="phone" value="${lead.phone || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Email</label>
                                        <input type="email" name="email" value="${lead.email || ''}">
                                    </div>
                                    <div class="form-group">
                                        <label>Alternate Phone</label>
                                        <input type="tel" name="altPhone" value="${lead.altPhone || ''}">
                                    </div>
                                </div>
                            </div>
                            <div class="form-section">
                                <div class="section-title">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M3 9.5L12 4l9 5.5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11z"/>
                                    </svg>
                                    Lead Details
                                </div>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Status</label>
                                        <select name="status">
                                            ${VALIDATION_CONFIG.LEAD_OPTIONS.status.map(status =>
                                                `<option value="${status}" ${lead.status === status ? 'selected' : ''}>${this._getStatusText(status)}</option>`
                                            ).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Source</label>
                                        <select name="source">
                                            <option value="">Select Source</option>
                                            ${VALIDATION_CONFIG.LEAD_OPTIONS.source.map(source =>
                                                `<option value="${source}" ${lead.source === source ? 'selected' : ''}>${source}</option>`
                                            ).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Property Type</label>
                                        <select name="propertyType">
                                            <option value="">Select Property Type</option>
                                            ${VALIDATION_CONFIG.LEAD_OPTIONS.propertyType.map(type =>
                                                `<option value="${type}" ${lead.propertyType === type ? 'selected' : ''}>${type}</option>`
                                            ).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Budget</label>
                                        <select name="budget">
                                            <option value="">Select Budget</option>
                                            ${VALIDATION_CONFIG.LEAD_OPTIONS.budget.map(budget =>
                                                `<option value="${budget}" ${lead.budget === budget ? 'selected' : ''}>${budget}</option>`
                                            ).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Priority</label>
                                        <select name="priority">
                                            ${VALIDATION_CONFIG.LEAD_OPTIONS.priority.map(priority =>
                                                `<option value="${priority}" ${lead.priority === priority ? 'selected' : ''}>${priority}</option>`
                                            ).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Location</label>
                                        <input type="text" name="location" value="${lead.location || ''}">
                                    </div>
                                </div>
                            </div>
                            <div class="form-section">
                                <div class="section-title">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    </svg>
                                    Additional Information
                                </div>
                                <div class="form-group full-width">
                                    <label>Requirements</label>
                                    <textarea name="requirements" rows="4">${lead.requirements || ''}</textarea>
                                </div>
                            </div>
                        </form>
                    `;
                }

                _getStatusClass(status) {
                    const statusMap = {
                        'newLead': 'status-new',
                        'contacted': 'status-contacted',
                        'interested': 'status-interested',
                        'followup': 'status-followup',
                        'visit': 'status-visit',
                        'booked': 'status-booked',
                        'closed': 'status-closed',
                        'notinterested': 'status-notinterested',
                        'dropped': 'status-dropped'
                    };
                    return statusMap[status] || 'status-new';
                }

                _getStatusText(status) {
                    const statusTextMap = {
                        'newLead': 'New Lead',
                        'contacted': 'Contacted',
                        'interested': 'Interested',
                        'followup': 'Follow Up',
                        'visit': 'Visit Scheduled',
                        'booked': 'Booked',
                        'closed': 'Closed',
                        'notinterested': 'Not Interested',
                        'dropped': 'Dropped'
                    };
                    return statusTextMap[status] || 'New Lead';
                }

                filterLeads(filters) {
                    this.currentFilters = filters;
                    this.filteredLeads = this.leads.filter(lead => {
                        return Object.entries(filters).every(([key, value]) => {
                            if (!value) return true;
                            return lead[key] && lead[key].toString().toLowerCase().includes(value.toLowerCase());
                        });
                    });
                    this.renderLeads();
                }

                searchLeads(searchTerm) {
                    if (!searchTerm) {
                        this.filteredLeads = [...this.leads];
                    } else {
                        const term = searchTerm.toLowerCase();
                        this.filteredLeads = this.leads.filter(lead =>
                            (lead.name && lead.name.toLowerCase().includes(term)) ||
                            (lead.phone && lead.phone.includes(term)) ||
                            (lead.email && lead.email.toLowerCase().includes(term)) ||
                            (lead.location && lead.location.toLowerCase().includes(term))
                        );
                    }
                    this.renderLeads();
                }
            }

            // ===================================
            // SECTION 13: CRM APPLICATION MAIN CLASS
            // ===================================

            /**
             * Main CRM Application Class
             */
            /**
             * Main CRM Application Class
             */
            class CRMApplication {
                constructor() {
                    this.isInitialized = false;
                    this.currentSection = 'overview';
                    this.services = {};
                    this.managers = {};

                    // Bind methods
                    this.init = this.init.bind(this);
                    this.loadDashboardData = this.loadDashboardData.bind(this);
                    this.switchSection = this.switchSection.bind(this);
                }

                /**
                 * Initialize the CRM Application
                 */
                async init() {
                    try {
                        console.log('🚀 Initializing CRM Application...');
                        UIHelpers.showLoading('global', { message: 'Initializing CRM Application...' });

                        // Initialize core services
                        await this._initializeServices();

                        // Initialize managers
                        this._initializeManagers();

                        // Setup UI event listeners
                        this._setupEventListeners();

                        // Setup navigation
                        this._setupNavigation();

                        // Initialize authentication
                        const isAuthenticated = await window.authGuard.init();

                        if (isAuthenticated) {
                            window.authGuard.showDashboard();
                            await this.loadDashboardData();
                        } else {
                            window.authGuard.redirectToLogin();
                            this._setupLoginForm();
                        }

                        this.isInitialized = true;
                        console.log('✅ CRM Application initialized successfully');

                    } catch (error) {
                        console.error('❌ Failed to initialize CRM Application:', error);
                        UIHelpers.error('Failed to initialize application: ' + error.message);
                        window.errorHandler?.logError(error, 'CRM Application Initialization');
                    } finally {
                        UIHelpers.hideLoading('global');

                        // Ensure loading screen is hidden
                        const loadingScreen = document.getElementById('loading-screen');
                        if (loadingScreen) {
                            loadingScreen.style.display = 'none';
                        }
                    }
                }

                /**
                 * Initialize core services
                 */
                async _initializeServices() {
                    // Initialize Firebase Service
                    this.services.firebase = new FirebaseService();
                    await this.services.firebase.init();

                    // Make services globally available
                    window.firebaseService = this.services.firebase;

                    // Initialize Activity Logger
                    if (window.firebaseService.isInitialized) {
                        window.activityLogger = new ActivityLogger(this.services.firebase);
                    }

                    console.log('✅ Core services initialized');
                }

                /**
                 * Initialize application managers
                 */
                _initializeManagers() {
                    // Initialize Lead Manager
                    this.managers.lead = new LeadManager(this.services.firebase);
                    window.leadManager = this.managers.lead;

                    // Initialize Admin Manager
                    this.managers.admin = new AdminManager();
                    this.managers.admin.init(this.services.firebase);
                    window.adminManager = this.managers.admin;

                    console.log('✅ Application managers initialized');
                }

                /**
                 * Setup global event listeners
                 */
                _setupEventListeners() {
                    // Logout button
                    document.getElementById('logout-btn')?.addEventListener('click', async () => {
                        await window.authGuard.signOut();
                    });

                    // Search functionality
                    document.getElementById('leads-search')?.addEventListener('input',
                        DataUtils.debounce((e) => {
                            this.managers.lead.searchLeads(e.target.value);
                        }, 300)
                    );

                    // Refresh button
                    document.addEventListener('click', (e) => {
                        if (e.target.closest('.refresh-btn')) {
                            this.loadDashboardData();
                        }
                    });

                    console.log('✅ Event listeners setup complete');
                }

                /**
                 * Setup navigation system
                 */
                _setupNavigation() {
                    const navItems = document.querySelectorAll('.nav-item');
                    navItems.forEach(item => {
                        item.addEventListener('click', () => {
                            const section = item.getAttribute('data-section');
                            if (section) {
                                this.switchSection(section);
                            }
                        });
                    });

                    console.log('✅ Navigation setup complete');
                }

                /**
                 * Setup login form
                 */
                _setupLoginForm() {
                    const loginForm = document.getElementById('login-form');
                    const togglePasswordBtn = document.getElementById('toggle-password');
                    const passwordInput = document.getElementById('password');

                    // Toggle password visibility
                    togglePasswordBtn?.addEventListener('click', () => {
                        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                        passwordInput.setAttribute('type', type);

                        const icon = type === 'password' ?
                            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' :
                            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
                        togglePasswordBtn.innerHTML = icon;
                    });

                    // Login form submission
                    loginForm?.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        await this._handleLogin(e);
                    });

                    console.log('✅ Login form setup complete');
                }

                /**
                 * Handle login form submission
                 */
                async _handleLogin(e) {
                    const formData = new FormData(e.target);
                    const email = formData.get('email');
                    const password = formData.get('password');
                    const errorDiv = document.getElementById('error-message');
                    const loginBtn = document.getElementById('login-btn');
                    const btnText = loginBtn.querySelector('.btn-text');
                    const btnSpinner = loginBtn.querySelector('.btn-spinner');

                    try {
                        // Show loading state
                        loginBtn.disabled = true;
                        btnText.style.display = 'none';
                        btnSpinner.style.display = 'block';
                        errorDiv.style.display = 'none';

                        // Validate inputs
                        if (!email || !password) {
                            throw new Error('Please enter both email and password');
                        }

                        if (!FormValidation.validateEmail(email)) {
                            throw new Error('Please enter a valid email address');
                        }

                        // Attempt login
                        await firebase.auth().signInWithEmailAndPassword(email, password);

                        // Success - AuthGuard will handle the rest
                        console.log('✅ Login successful');

                    } catch (error) {
                        console.error('❌ Login failed:', error);

                        let errorMessage = 'Login failed. Please try again.';
                        if (error.code === 'auth/user-not-found') {
                            errorMessage = 'No account found with this email address.';
                        } else if (error.code === 'auth/wrong-password') {
                            errorMessage = 'Incorrect password. Please try again.';
                        } else if (error.code === 'auth/too-many-requests') {
                            errorMessage = 'Too many failed attempts. Please try again later.';
                        } else if (error.message) {
                            errorMessage = error.message;
                        }

                        errorDiv.textContent = errorMessage;
                        errorDiv.style.display = 'block';

                        // Log failed attempt
                        await window.authGuard?.handleAuthError(error);

                    } finally {
                        // Reset button state
                        loginBtn.disabled = false;
                        btnText.style.display = 'inline';
                        btnSpinner.style.display = 'none';
                    }
                }

                /**
                 * Load dashboard data
                 */
                /**
                 * Load dashboard data
                 */
                async loadDashboardData() {
                    console.log('📊 Loading dashboard data...');

                    try {
                        const user = window.authGuard?.getCurrentUser();
                        const role = window.authGuard?.getCurrentRole();

                        if (!user) {
                            console.warn('User not authenticated, skipping dashboard load');
                            return;
                        }

                        // Show loading for specific elements instead of global
                        this._showDashboardLoading(true);

                        // Load data with error handling for each section
                        await Promise.allSettled([
                            this._safeLoadLeads(),
                            this._safeLoadStatistics(),
                            this._safeLoadRecentActivity()
                        ]);

                        console.log('✅ Dashboard data loaded successfully');

                    } catch (error) {
                        console.error('❌ Error loading dashboard data:', error);
                        // Don't show error toast for dashboard loads, just log it
                    } finally {
                        // Always hide loading
                        this._showDashboardLoading(false);
                    }
                }

                /**
                 * Show/hide dashboard loading state
                 */
                _showDashboardLoading(show) {
                    const elements = [
                        document.getElementById('total-leads'),
                        document.getElementById('active-leads'),
                        document.getElementById('pending-followups'),
                        document.getElementById('overdue-tasks'),
                        document.getElementById('activity-list'),
                        document.getElementById('leads-table-body')
                    ];

                    elements.forEach(el => {
                        if (el) {
                            if (show) {
                                el.innerHTML = '<div class="loading-text">Loading...</div>';
                            }
                        }
                    });
                }

                /**
                 * Safely load leads data
                 */
                async _safeLoadLeads() {
                    try {
                        if (this.managers.lead) {
                            await this.managers.lead.fetchLeads();
                            this.managers.lead.renderLeads();
                        }
                    } catch (error) {
                        console.error('Error loading leads:', error);
                        // Set fallback content
                        const tbody = document.getElementById('leads-table-body');
                        if (tbody) {
                            tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Unable to load leads</td></tr>';
                        }
                    }
                }

                /**
                 * Safely load statistics
                 */
                async _safeLoadStatistics() {
                    try {
                        const user = window.authGuard?.getCurrentUser();
                        const role = window.authGuard?.getCurrentRole();

                        if (!user || !this.services.firebase?.ops) {
                            throw new Error('Services not available');
                        }

                        const stats = await this.services.firebase.ops.getUserStats(user.uid, role);

                        // Update stat cards with fallback values
                        document.getElementById('total-leads').textContent = stats.totalLeads || 0;
                        document.getElementById('active-leads').textContent = stats.activeLeads || 0;
                        document.getElementById('pending-followups').textContent = stats.pendingFollowups || 0;
                        document.getElementById('overdue-tasks').textContent = stats.completedLeads || 0;

                    } catch (error) {
                        console.error('Error loading statistics:', error);
                        // Set fallback values
                        document.getElementById('total-leads').textContent = '0';
                        document.getElementById('active-leads').textContent = '0';
                        document.getElementById('pending-followups').textContent = '0';
                        document.getElementById('overdue-tasks').textContent = '0';
                    }
                }

                /**
                 * Safely load recent activity
                 */
                async _safeLoadRecentActivity() {
                    try {
                        const activities = await window.activityLogger?.getRecentActivities(5) || [];
                        const activityList = document.getElementById('activity-list');

                        if (!activityList) return;

                        if (activities.length === 0) {
                            activityList.innerHTML = `
                                <div class="activity-item">
                                    <div class="activity-icon">📝</div>
                                    <div class="activity-content">
                                        <div class="activity-text">No recent activity</div>
                                        <div class="activity-time">Start by creating some leads</div>
                                    </div>
                                </div>
                            `;
                            return;
                        }

                        activityList.innerHTML = activities.map(activity => `
                            <div class="activity-item">
                                <div class="activity-icon">📝</div>
                                <div class="activity-content">
                                    <div class="activity-text">${this._getActivityDescription(activity.action)}</div>
                                    <div class="activity-time">${DataUtils.formatTimeAgo(activity.timestamp)}</div>
                                </div>
                            </div>
                        `).join('');

                    } catch (error) {
                        console.error('Error loading recent activity:', error);
                        const activityList = document.getElementById('activity-list');
                        if (activityList) {
                            activityList.innerHTML = `
                                <div class="activity-item">
                                    <div class="activity-icon">⚠️</div>
                                    <div class="activity-content">
                                        <div class="activity-text">Unable to load recent activity</div>
                                        <div class="activity-time">Please try refreshing</div>
                                    </div>
                                </div>
                            `;
                        }
                    }
                }

                /**
                 * Load dashboard statistics
                 */
                async _loadStatistics() {
                    try {
                        const user = window.authGuard?.getCurrentUser();
                        const role = window.authGuard?.getCurrentRole();

                        if (!user) return;

                        const stats = await this.services.firebase.ops.getUserStats(user.uid, role);

                        // Update stat cards
                        document.getElementById('total-leads').textContent = stats.totalLeads || 0;
                        document.getElementById('active-leads').textContent = stats.activeLeads || 0;
                        document.getElementById('pending-followups').textContent = stats.pendingFollowups || 0;
                        document.getElementById('overdue-tasks').textContent = stats.overdueTasks || 0;

                        // Update trends (simplified)
                        document.getElementById('total-leads-trend').innerHTML = `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
                            </svg>
                            ${stats.totalLeads > 0 ? 'Growing' : 'No Data'}
                        `;

                    } catch (error) {
                        console.error('❌ Error loading statistics:', error);
                    }
                }

                /**
                 * Load recent activity
                 */
                async _loadRecentActivity() {
                    try {
                        const activities = await window.activityLogger?.getRecentActivities(5) || [];
                        const activityList = document.getElementById('activity-list');

                        if (!activityList) return;

                        if (activities.length === 0) {
                            activityList.innerHTML = '<div class="no-data">No recent activity</div>';
                            return;
                        }

                        activityList.innerHTML = activities.map(activity => `
                            <div class="premium-activity-item">
                                <div class="activity-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                </div>
                                <div class="activity-content">
                                    <p>${this._getActivityDescription(activity.action)}</p>
                                    <small>${DataUtils.formatTimeAgo(activity.timestamp)}</small>
                                </div>
                            </div>
                        `).join('');

                    } catch (error) {
                        console.error('❌ Error loading recent activity:', error);
                    }
                }

                /**
                 * Get human-readable activity description
                 */
                _getActivityDescription(action) {
                    const descriptions = {
                        'login_success': 'Logged into the system',
                        'create_lead': 'Created a new lead',
                        'update_lead': 'Updated a lead',
                        'delete_lead': 'Deleted a lead',
                        'create_master': 'Created a new master user',
                        'update_master': 'Updated master user',
                        'view_reports': 'Viewed reports',
                        'export_data': 'Exported data'
                    };
                    return descriptions[action] || action.replace(/_/g, ' ');
                }

                /**
                 * Switch between dashboard sections
                 */
                switchSection(sectionName) {
                    try {
                        // Update navigation
                        document.querySelectorAll('.nav-item').forEach(item => {
                            item.classList.remove('active');
                            if (item.getAttribute('data-section') === sectionName) {
                                item.classList.add('active');
                            }
                        });

                        // Hide all sections
                        document.querySelectorAll('.content-section').forEach(section => {
                            section.classList.remove('active');
                        });

                        // Show target section
                        const targetSection = document.getElementById(`${sectionName}-section`);
                        if (targetSection) {
                            targetSection.classList.add('active');
                            this.currentSection = sectionName;

                            // Load section-specific data
                            this._loadSectionData(sectionName);
                        }

                        console.log(`✅ Switched to section: ${sectionName}`);

                    } catch (error) {
                        console.error('❌ Error switching section:', error);
                        UIHelpers.error('Failed to switch section: ' + error.message);
                    }
                }

                /**
                 * Load section-specific data
                 */
                /**
                 * Load section-specific data
                 */
                async _loadSectionData(sectionName) {
                    console.log(`Loading data for section: ${sectionName}`);

                    try {
                        switch (sectionName) {
                            case 'overview':
                                // Don't await this, let it load in background
                                this.loadDashboardData().catch(err =>
                                    console.error('Background dashboard load failed:', err)
                                );
                                break;
                            case 'leads':
                                if (this.managers.lead) {
                                    await this.managers.lead.fetchLeads();
                                    this.managers.lead.renderLeads();
                                }
                                break;
                            case 'users':
                                if (window.authGuard?.hasRole('admin')) {
                                    await this.managers.admin.loadMasterManagementPanel();
                                }
                                break;
                            case 'reports':
                                if (window.authGuard?.hasPermission('reports:view')) {
                                    await window.activityLogger?.loadActivityDashboard();
                                }
                                break;
                            default:
                                console.log(`No specific data loading for section: ${sectionName}`);
                        }
                    } catch (error) {
                        console.error(`Error loading data for section ${sectionName}:`, error);
                        // Don't show user-facing errors for section loads
                    }
                }

                /**
                 * Get status text for leads
                 */
                getStatusText(status) {
                    return this.managers.lead._getStatusText(status);
                }
            }

            // ===================================
            // SECTION 14: GLOBAL INSTANCES & INITIALIZATION
            // ===================================

            // Create global instances
            window.DataUtils = DataUtils;
            window.FormValidation = FormValidation;
            window.errorHandler = new ErrorHandler();
            window.sanitizer = new DataSanitizer();
            window.securityUtils = new SecurityUtils();
            window.authGuard = new AuthGuard();

            // Initialize UI managers BEFORE CRM app
            window.modalManager = new ModalManager();
            window.toastManager = new ToastManager();
            window.loadingManager = new LoadingManager();
            window.ConfirmationManager = ConfirmationManager;

            // Initialize error handler with security utils
            window.errorHandler.init(window.securityUtils);

            // Create main CRM application instance
            window.crmApp = new CRMApplication();

            // Legacy global function for activity logging
            async function logActivity(action, details = {}) {
                try {
                    if (window.activityLogger) {
                        return await window.activityLogger.logActivity(action, details);
                    } else if (window.firebaseService?.isInitialized) {
                        return await window.firebaseService.ops.logActivity(action, details);
                    } else {
                        console.warn('Activity logger not available:', action, details);
                        return null;
                    }
                } catch (error) {
                    console.error('Failed to log activity:', error);
                }
            }

            window.logActivity = logActivity;

            // ===================================
            // SECTION 15: APPLICATION STARTUP
            // ===================================

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initializeApplication);
            } else {
                initializeApplication();
            }

            /**
             * Initialize the application
             */
            async function initializeApplication() {
                try {
                    console.log('🚀 Starting CRM Application...');

                    // Show security indicator
                    const securityBadge = document.getElementById('security-badge');
                    if (securityBadge) {
                        securityBadge.style.display = 'flex';
                    }

                    // Initialize the main CRM application
                    await window.crmApp.init();

                    console.log('✅ CRM Application started successfully');

                } catch (error) {
                    console.error('❌ Failed to start CRM Application:', error);

                    // Show error to user
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'startup-error';
                    errorDiv.innerHTML = `
                        <div style="
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            background: white;
                            padding: 40px;
                            border-radius: 12px;
                            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                            text-align: center;
                            z-index: 10000;
                        ">
                            <h2 style="color: #ef4444; margin-bottom: 16px;">Application Error</h2>
                            <p style="color: #6b7280; margin-bottom: 24px;">Failed to start the CRM application.</p>
                            <button onclick="location.reload()" style="
                                background: #6366f1;
                                color: white;
                                border: none;
                                padding: 12px 24px;
                                border-radius: 8px;
                                cursor: pointer;
                            ">Reload Page</button>
                        </div>
                    `;
                    document.body.appendChild(errorDiv);
                } finally {
                    // PERMANENT FIX: Always hide loading screen
                    const loadingScreen = document.getElementById('loading-screen');
                    if (loadingScreen) {
                        loadingScreen.style.display = 'none';
                    }
                }
            }

            // Debug helpers (only in development)
            if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
                window.DEBUG = {
                    crmApp: window.crmApp,
                    authGuard: window.authGuard,
                    firebaseService: window.firebaseService,
                    leadManager: window.leadManager,
                    adminManager: window.adminManager,
                    activityLogger: window.activityLogger,

                    // Helper functions
                    login: (email, password) => firebase.auth().signInWithEmailAndPassword(email, password),
                    logout: () => window.authGuard.signOut(),
                    getUser: () => window.authGuard.getCurrentUser(),
                    getRole: () => window.authGuard.getCurrentRole(),
                    loadDashboard: () => window.crmApp.loadDashboardData(),
                    switchTo: (section) => window.crmApp.switchSection(section)
                };

                console.log('🔧 Debug helpers available at window.DEBUG');
            }

            console.log('✅ Real Estate CRM - Complete Application Loaded');
            console.log('🔧 Version: 3.0 (Consolidated)');
            console.log('🛡️ Security: Enhanced monitoring and validation active');
            console.log('📱 UI: Modern component system with accessibility');
            console.log('🔥 Firebase: Advanced caching and real-time sync');
            console.log('📊 Features: Lead management, user management, activity logging, reports');