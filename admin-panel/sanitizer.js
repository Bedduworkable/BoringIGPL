/**
 * ===================================
 * ENHANCED DATA SANITIZER & VALIDATOR
 * File: sanitizer.js
 * Version: 2.0
 * Purpose: Comprehensive input sanitization, validation, and security utilities
 * ===================================
 */

/**
 * Configuration constants for validation rules
 */
const VALIDATION_CONFIG = {
    // Field length limits
    MAX_LENGTHS: {
        name: 100,
        phone: 20,
        email: 254,
        address: 500,
        requirements: 1000,
        remarks: 1000,
        general: 255
    },

    // Validation patterns
    PATTERNS: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^[\+]?[\d\s\-\(\)]{7,20}$/,
        name: /^[a-zA-Z\s\.\-\']{1,100}$/,
        alphanumeric: /^[a-zA-Z0-9\s]{1,100}$/,
        url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
        slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    },

    // Dangerous content patterns
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

    // Allowed HTML tags for rich text (if needed)
    ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'p', 'br'],

    // Valid select field options
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

/**
 * Enhanced Data Sanitizer Class
 * Provides comprehensive input sanitization and validation
 */
class DataSanitizer {
    constructor(config = VALIDATION_CONFIG) {
        this.config = config;
        this.securityLog = [];
        this.validationCache = new Map();

        // Bind methods to preserve context
        this.sanitize = this.sanitize.bind(this);
        this.validate = this.validate.bind(this);
        this.validateFormData = this.validateFormData.bind(this);
    }

    /**
     * Primary sanitization method with enhanced security
     * @param {*} input - Input to sanitize
     * @param {string} type - Type of sanitization to apply
     * @param {Object} options - Additional options
     * @returns {string} Sanitized input
     */
    sanitize(input, type = 'text', options = {}) {
        try {
            if (input === null || input === undefined) {
                return options.defaultValue || '';
            }

            // Convert to string and trim
            let sanitized = String(input).trim();

            // Apply length limits early
            const maxLength = options.maxLength || this.config.MAX_LENGTHS[type] || this.config.MAX_LENGTHS.general;
            if (sanitized.length > maxLength) {
                sanitized = sanitized.slice(0, maxLength);
                this._logSecurityEvent('length_truncation', { type, originalLength: input.length, truncatedLength: maxLength });
            }

            // Check for dangerous content first
            if (this._containsDangerousContent(sanitized)) {
                this._logSecurityEvent('dangerous_content_detected', { type, content: sanitized.slice(0, 100) });
                sanitized = this._removeDangerousContent(sanitized);
            }

            // Apply type-specific sanitization
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

    /**
     * Enhanced validation with caching and detailed error reporting
     * @param {*} input - Input to validate
     * @param {string} type - Type of validation
     * @param {boolean} required - Whether field is required
     * @param {Object} options - Additional validation options
     * @returns {Object} Validation result
     */
    validate(input, type, required = false, options = {}) {
        try {
            // Create cache key
            const cacheKey = `${type}_${required}_${JSON.stringify(options)}_${input}`;

            // Check cache first (for performance)
            if (this.validationCache.has(cacheKey)) {
                return this.validationCache.get(cacheKey);
            }

            // Basic required field check
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

            // If not required and empty, it's valid
            if (!required && isEmpty) {
                const result = { valid: true, message: '', code: 'VALID_EMPTY' };
                this.validationCache.set(cacheKey, result);
                return result;
            }

            // Sanitize first
            const sanitized = this.sanitize(input, type, options);

            // Apply type-specific validation
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

            // Cache result
            this.validationCache.set(cacheKey, result);

            // Clean cache if it gets too large
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

    /**
     * Validate entire form data with comprehensive error reporting
     * @param {Object} formData - Form data to validate
     * @param {Object} schema - Validation schema
     * @returns {Object} Validation results
     */
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

                // Validate field
                const validation = this.validate(value, type, required, options);

                if (!validation.valid) {
                    errors[fieldName] = validation.message;
                    isValid = false;
                } else {
                    // Store sanitized value
                    sanitizedData[fieldName] = this.sanitize(value, type, options);

                    // Check for warnings
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

    /**
     * Specialized lead data sanitization and validation
     * @param {Object} leadData - Lead data to process
     * @returns {Object} Processed lead data
     */
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

        // Remove empty values from sanitized data
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

    /**
     * Specialized user data sanitization and validation
     * @param {Object} userData - User data to process
     * @returns {Object} Processed user data
     */
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

    // ===================================
    // PRIVATE SANITIZATION METHODS
    // ===================================

    _sanitizeName(str, options = {}) {
        return str
            .replace(/[<>\"'&]/g, '') // Remove dangerous characters
            .replace(/\s+/g, ' ') // Normalize spaces
            .replace(/[^\w\s\.\-\']/g, '') // Keep only valid name characters
            .slice(0, options.maxLength || this.config.MAX_LENGTHS.name);
    }

    _sanitizeEmail(str, options = {}) {
        return str
            .toLowerCase()
            .replace(/[<>\"'&\s]/g, '') // Remove dangerous characters and spaces
            .slice(0, options.maxLength || this.config.MAX_LENGTHS.email);
    }

    _sanitizePhone(str, options = {}) {
        return str
            .replace(/[<>\"'&]/g, '') // Remove dangerous characters
            .replace(/[^\d\+\-\s\(\)]/g, '') // Keep only valid phone characters
            .slice(0, options.maxLength || this.config.MAX_LENGTHS.phone);
    }

    _sanitizeText(str, options = {}) {
        return str
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .slice(0, options.maxLength || this.config.MAX_LENGTHS.general);
    }

    _sanitizeMultiline(str, options = {}) {
        return str
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .replace(/\r\n/g, '\n') // Normalize line endings
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
        // Basic URL sanitization
        str = str.replace(/[<>\"']/g, '');

        // Ensure protocol
        if (str && !str.match(/^https?:\/\//)) {
            str = 'https://' + str;
        }

        return str.slice(0, options.maxLength || 2048);
    }

    _sanitizeHtml(str, options = {}) {
        const allowedTags = options.allowedTags || this.config.ALLOWED_TAGS;

        // Simple HTML sanitization (in production, use a proper library like DOMPurify)
        let sanitized = str;

        // Remove all tags except allowed ones
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
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
            .slice(0, options.maxLength || 50);
    }

    // ===================================
    // PRIVATE VALIDATION METHODS
    // ===================================

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

        // Check for disposable email domains if provided
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

    // ===================================
    // SECURITY UTILITIES
    // ===================================

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
        // List of common disposable email domains
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

        // Keep only last 100 events
        if (this.securityLog.length > 100) {
            this.securityLog.shift();
        }

        // Log to console in development
        if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
            console.warn('🚨 Security Event:', event);
        }

        // Send to external logging service if available
        if (typeof window !== 'undefined' && window.authGuard?.logSecureActivity) {
            window.authGuard.logSecureActivity('security_sanitizer_event', event);
        }
    }

    // ===================================
    // UI INTEGRATION METHODS
    // ===================================

    /**
     * Display validation errors in UI
     * @param {Object} errors - Validation errors
     * @param {string} formId - Form ID to display errors in
     */
    displayValidationErrors(errors, formId = 'form') {
        this.clearValidationErrors(formId);

        Object.entries(errors).forEach(([fieldName, message]) => {
            const field = document.getElementById(fieldName) ||
                         document.getElementById(`${formId}-${fieldName}`) ||
                         document.querySelector(`[name="${fieldName}"]`);

            if (field) {
                this._showFieldError(field, message);
            }
        });
    }

    /**
     * Clear validation errors from UI
     * @param {string} formId - Form ID to clear errors from
     */
    clearValidationErrors(formId = 'form') {
        const form = document.getElementById(formId);
        if (!form) return;

        // Remove error classes and messages
        const errorFields = form.querySelectorAll('.error, .success');
        errorFields.forEach(field => {
            field.classList.remove('error', 'success');
        });

        const errorMessages = form.querySelectorAll('.field-error');
        errorMessages.forEach(msg => msg.remove());
    }

    /**
     * Setup real-time validation for form
     * @param {string} formId - Form ID to setup validation for
     * @param {Object} schema - Validation schema
     */
    setupRealtimeValidation(formId, schema = {}) {
        const form = document.getElementById(formId);
        if (!form) return;

        const fields = form.querySelectorAll('input, select, textarea');

        fields.forEach(field => {
            const fieldName = field.name || field.id;
            const fieldSchema = schema[fieldName] || { type: 'text', required: field.hasAttribute('required') };

            // Debounced validation
            let timeout;
            const validateField = () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    const validation = this.validate(field.value, fieldSchema.type, fieldSchema.required, fieldSchema.options);

                    if (validation.valid) {
                        this._markFieldValid(field);
                    } else {
                        this._showFieldError(field, validation.message);
                    }
                }, 300);
            };

            field.addEventListener('input', validateField);
            field.addEventListener('blur', validateField);
        });
    }

    _showFieldError(field, message) {
        const formGroup = field.closest('.form-group, .enhanced-form-group, .input-group');
        if (!formGroup) return;

        field.classList.add('error');
        field.classList.remove('success');

        let errorElement = formGroup.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            errorElement.style.cssText = `
                color: #ef4444;
                font-size: 12px;
                margin-top: 4px;
                font-weight: 500;
                display: block;
            `;
            formGroup.appendChild(errorElement);
        }

        errorElement.textContent = message;
    }

    _markFieldValid(field) {
        const formGroup = field.closest('.form-group, .enhanced-form-group, .input-group');
        if (!formGroup) return;

        field.classList.remove('error');
        field.classList.add('success');

        const errorElement = formGroup.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    // ===================================
    // UTILITY METHODS
    // ===================================

    /**
     * Get security log for monitoring
     * @returns {Array} Security events log
     */
    getSecurityLog() {
        return [...this.securityLog];
    }

    /**
     * Clear validation cache
     */
    clearCache() {
        this.validationCache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.validationCache.size,
            maxSize: 1000
        };
    }

    /**
     * Create safe HTML for display (legacy compatibility)
     * @param {string} template - HTML template
     * @param {Object} data - Data to inject
     * @returns {string} Safe HTML
     */
    createSafeHTML(template, data) {
        let safeHTML = template;

        Object.entries(data).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            const safeValue = this.sanitize(value, 'text');
            safeHTML = safeHTML.replace(new RegExp(placeholder, 'g'), safeValue);
        });

        return safeHTML;
    }
}

// ===================================
// GLOBAL INSTANCE AND EXPORTS
// ===================================

// Create global sanitizer instance
const sanitizer = new DataSanitizer();

// Legacy function for backward compatibility
function sanitizeDisplayText(text) {
    return sanitizer.sanitize(text, 'text');
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = { DataSanitizer, sanitizer, VALIDATION_CONFIG };
} else if (typeof window !== 'undefined') {
    // Browser
    window.sanitizer = sanitizer;
    window.DataSanitizer = DataSanitizer;
    window.VALIDATION_CONFIG = VALIDATION_CONFIG;
    window.sanitizeDisplayText = sanitizeDisplayText;
}

console.log('✅ Enhanced Data Sanitizer v2.0 Loaded');
console.log('🔧 Features: Advanced validation, caching, security logging, real-time UI integration');