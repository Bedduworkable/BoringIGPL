// Input Sanitization and Validation Utilities
class DataSanitizer {
    constructor() {
        this.maxLengths = {
            name: 100,
            phone: 20,
            email: 254,
            address: 500,
            requirements: 1000,
            remarks: 1000
        };

        this.patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^[\+]?[\d\s\-\(\)]{7,20}$/,
            name: /^[a-zA-Z\s\.\-\']{1,100}$/,
            alphanumeric: /^[a-zA-Z0-9\s]{1,100}$/
        };
    }

    // Main sanitization method
    sanitize(input, type = 'text') {
        if (input === null || input === undefined) {
            return '';
        }

        // Convert to string
        let sanitized = String(input);

        // Basic XSS prevention
        sanitized = this.escapeHTML(sanitized);

        // Apply type-specific sanitization
        switch (type) {
            case 'name':
                sanitized = this.sanitizeName(sanitized);
                break;
            case 'email':
                sanitized = this.sanitizeEmail(sanitized);
                break;
            case 'phone':
                sanitized = this.sanitizePhone(sanitized);
                break;
            case 'text':
                sanitized = this.sanitizeText(sanitized);
                break;
            case 'multiline':
                sanitized = this.sanitizeMultiline(sanitized);
                break;
            case 'number':
                sanitized = this.sanitizeNumber(sanitized);
                break;
            default:
                sanitized = this.sanitizeText(sanitized);
        }

        return sanitized.trim();
    }

    // Escape HTML characters
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Remove HTML tags completely
    stripHTML(str) {
        const div = document.createElement('div');
        div.innerHTML = str;
        return div.textContent || div.innerText || '';
    }

    // Sanitize name fields
    sanitizeName(str) {
        return str
            .replace(/[<>\"'&]/g, '') // Remove dangerous characters
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .slice(0, this.maxLengths.name);
    }

    // Sanitize email
    sanitizeEmail(str) {
        return str
            .toLowerCase()
            .replace(/[<>\"'&\s]/g, '') // Remove dangerous characters and spaces
            .slice(0, this.maxLengths.email);
    }

    // Sanitize phone numbers
    sanitizePhone(str) {
        return str
            .replace(/[<>\"'&]/g, '') // Remove dangerous characters
            .replace(/[^\d\+\-\s\(\)]/g, '') // Keep only valid phone characters
            .slice(0, this.maxLengths.phone);
    }

    // Sanitize general text
    sanitizeText(str) {
        return str
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .slice(0, this.maxLengths.address);
    }

    // Sanitize multiline text (textarea content)
    sanitizeMultiline(str) {
        return str
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .replace(/\r\n/g, '\n') // Normalize line endings
            .slice(0, this.maxLengths.requirements);
    }

    // Sanitize numbers
    sanitizeNumber(str) {
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    }

    // Validate input based on type
    validate(input, type, required = false) {
        // Check if required field is empty
        if (required && (!input || input.trim() === '')) {
            return { valid: false, message: 'This field is required' };
        }

        // If not required and empty, it's valid
        if (!required && (!input || input.trim() === '')) {
            return { valid: true, message: '' };
        }

        const sanitized = this.sanitize(input, type);

        // Type-specific validation
        switch (type) {
            case 'name':
                return this.validateName(sanitized);
            case 'email':
                return this.validateEmail(sanitized);
            case 'phone':
                return this.validatePhone(sanitized);
            case 'text':
                return this.validateText(sanitized);
            case 'multiline':
                return this.validateMultiline(sanitized);
            default:
                return { valid: true, message: '' };
        }
    }

    // Validate name
    validateName(name) {
        if (name.length < 2) {
            return { valid: false, message: 'Name must be at least 2 characters' };
        }
        if (name.length > this.maxLengths.name) {
            return { valid: false, message: `Name must not exceed ${this.maxLengths.name} characters` };
        }
        if (!this.patterns.name.test(name)) {
            return { valid: false, message: 'Name contains invalid characters' };
        }
        return { valid: true, message: '' };
    }

    // Validate email
    validateEmail(email) {
        if (!this.patterns.email.test(email)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }
        if (email.length > this.maxLengths.email) {
            return { valid: false, message: `Email must not exceed ${this.maxLengths.email} characters` };
        }
        return { valid: true, message: '' };
    }

    // Validate phone
    validatePhone(phone) {
        if (phone.length < 7) {
            return { valid: false, message: 'Phone number must be at least 7 digits' };
        }
        if (phone.length > this.maxLengths.phone) {
            return { valid: false, message: `Phone number must not exceed ${this.maxLengths.phone} characters` };
        }
        if (!this.patterns.phone.test(phone)) {
            return { valid: false, message: 'Please enter a valid phone number' };
        }
        return { valid: true, message: '' };
    }

    // Validate general text
    validateText(text) {
        if (text.length > this.maxLengths.address) {
            return { valid: false, message: `Text must not exceed ${this.maxLengths.address} characters` };
        }
        return { valid: true, message: '' };
    }

    // Validate multiline text
    validateMultiline(text) {
        if (text.length > this.maxLengths.requirements) {
            return { valid: false, message: `Text must not exceed ${this.maxLengths.requirements} characters` };
        }
        return { valid: true, message: '' };
    }

    // Sanitize form data object
    sanitizeFormData(formData) {
        const sanitized = {};
        const fieldTypes = {
            name: 'name',
            email: 'email',
            phone: 'phone',
            altPhone: 'phone',
            location: 'text',
            requirements: 'multiline',
            remarks: 'multiline',
            // Add more field mappings as needed
        };

        for (const [key, value] of Object.entries(formData)) {
            const type = fieldTypes[key] || 'text';
            sanitized[key] = this.sanitize(value, type);
        }

        return sanitized;
    }

    // Validate entire form data object
    validateFormData(formData, requiredFields = []) {
        const errors = {};
        const fieldTypes = {
            name: 'name',
            email: 'email',
            phone: 'phone',
            altPhone: 'phone',
            location: 'text',
            requirements: 'multiline',
            remarks: 'multiline',
        };

        // Validate each field
        for (const [key, value] of Object.entries(formData)) {
            const type = fieldTypes[key] || 'text';
            const required = requiredFields.includes(key);
            const validation = this.validate(value, type, required);

            if (!validation.valid) {
                errors[key] = validation.message;
            }
        }

        return {
            valid: Object.keys(errors).length === 0,
            errors: errors
        };
    }

    // Clean and validate lead data specifically
    sanitizeLeadData(leadData) {
        const cleaned = {
            name: this.sanitize(leadData.name, 'name'),
            phone: this.sanitize(leadData.phone, 'phone'),
            email: this.sanitize(leadData.email, 'email'),
            altPhone: this.sanitize(leadData.altPhone, 'phone'),
            status: this.sanitizeSelect(leadData.status, [
                'newLead', 'contacted', 'interested', 'followup',
                'visit', 'booked', 'closed', 'notinterested', 'dropped'
            ]),
            source: this.sanitizeSelect(leadData.source, [
                'website', 'facebook', 'instagram', 'google',
                'referral', 'walk-in', 'cold-call', 'other'
            ]),
            propertyType: this.sanitizeSelect(leadData.propertyType, [
                'apartment', 'villa', 'house', 'plot',
                'commercial', 'office', 'warehouse', 'other'
            ]),
            budget: this.sanitizeSelect(leadData.budget, [
                'under-50L', '50L-1Cr', '1Cr-2Cr', '2Cr-5Cr', 'above-5Cr'
            ]),
            location: this.sanitize(leadData.location, 'text'),
            requirements: this.sanitize(leadData.requirements, 'multiline'),
            assignedTo: this.sanitizeUserId(leadData.assignedTo),
            priority: this.sanitizeSelect(leadData.priority, ['high', 'medium', 'low'])
        };

        // Remove empty values
        Object.keys(cleaned).forEach(key => {
            if (!cleaned[key] || cleaned[key] === '') {
                delete cleaned[key];
            }
        });

        return cleaned;
    }

    // Sanitize select field values
    sanitizeSelect(value, allowedValues) {
        if (!value || !allowedValues.includes(value)) {
            return '';
        }
        return value;
    }

    // Sanitize user ID (Firebase UID format)
    sanitizeUserId(userId) {
        if (!userId || typeof userId !== 'string') {
            return '';
        }
        // Firebase UIDs are alphanumeric with some special chars
        return userId.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 128);
    }

    // Display validation errors in UI
    displayValidationErrors(errors, formId = 'edit-lead-form') {
        // Clear existing errors
        this.clearValidationErrors(formId);

        // Display new errors
        Object.entries(errors).forEach(([fieldName, message]) => {
            const field = document.getElementById(`edit-lead-${fieldName}`) ||
                         document.getElementById(fieldName);

            if (field) {
                field.classList.add('error');

                // Create error message element
                const errorElement = document.createElement('div');
                errorElement.className = 'field-error';
                errorElement.textContent = message;
                errorElement.style.cssText = `
                    color: #ef4444;
                    font-size: 11px;
                    margin-top: 4px;
                    font-weight: 500;
                `;

                // Insert after the field
                field.parentNode.appendChild(errorElement);
            }
        });
    }

    // Clear validation errors from UI
    clearValidationErrors(formId = 'edit-lead-form') {
        const form = document.getElementById(formId);
        if (!form) return;

        // Remove error classes
        const errorFields = form.querySelectorAll('.error');
        errorFields.forEach(field => {
            field.classList.remove('error', 'success');
        });

        // Remove error messages
        const errorMessages = form.querySelectorAll('.field-error');
        errorMessages.forEach(msg => msg.remove());
    }

    // Mark field as valid in UI
    markFieldValid(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.remove('error');
            field.classList.add('success');

            // Remove any existing error message
            const errorMsg = field.parentNode.querySelector('.field-error');
            if (errorMsg) {
                errorMsg.remove();
            }
        }
    }

    // Real-time validation for form fields
    setupRealtimeValidation(formId = 'edit-lead-form') {
        const form = document.getElementById(formId);
        if (!form) return;

        const fieldTypes = {
            'edit-lead-name': 'name',
            'edit-lead-phone': 'phone',
            'edit-lead-email': 'email',
            'edit-lead-alt-phone': 'phone',
            'edit-lead-location': 'text',
            'edit-lead-requirements': 'multiline'
        };

        const requiredFields = ['edit-lead-name', 'edit-lead-phone'];

        Object.entries(fieldTypes).forEach(([fieldId, type]) => {
            const field = document.getElementById(fieldId);
            if (!field) return;

            // Debounced validation
            let timeout;
            field.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    const isRequired = requiredFields.includes(fieldId);
                    const validation = this.validate(field.value, type, isRequired);

                    if (validation.valid) {
                        this.markFieldValid(fieldId);
                    } else {
                        field.classList.add('error');
                        field.classList.remove('success');

                        // Show error message
                        let errorMsg = field.parentNode.querySelector('.field-error');
                        if (!errorMsg) {
                            errorMsg = document.createElement('div');
                            errorMsg.className = 'field-error';
                            errorMsg.style.cssText = `
                                color: #ef4444;
                                font-size: 11px;
                                margin-top: 4px;
                                font-weight: 500;
                            `;
                            field.parentNode.appendChild(errorMsg);
                        }
                        errorMsg.textContent = validation.message;
                    }
                }, 500);
            });
        });
    }

    // Sanitize display text (for showing user data safely)
    sanitizeDisplayText(text) {
        if (!text) return '';
        return this.escapeHTML(String(text));
    }

    // Create safe HTML for display
    createSafeHTML(template, data) {
        let safeHTML = template;

        Object.entries(data).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            const safeValue = this.sanitizeDisplayText(value);
            safeHTML = safeHTML.replace(new RegExp(placeholder, 'g'), safeValue);
        });

        return safeHTML;
    }

    // Check for potentially dangerous content
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
    }

    // Log security incidents
    logSecurityIncident(type, details) {
        console.warn(`🚨 Security Incident: ${type}`, details);

        // You can extend this to send to your logging service
        if (window.authGuard && window.authGuard.isAuthenticated()) {
            window.authGuard.logActivity('security_incident', {
                type: type,
                details: details,
                timestamp: new Date().toISOString()
            });
        }
    }
}

// Create global sanitizer instance
const sanitizer = new DataSanitizer();

// Export for use in other files
window.sanitizer = sanitizer;