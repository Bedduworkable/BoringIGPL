/**
 * ===================================
 * ENHANCED UI COMPONENTS & MODAL SYSTEM
 * File: ui-components.js
 * Version: 2.0
 * Purpose: Reusable UI components with accessibility and modern UX
 * ===================================
 */

/**
 * UI Component Configuration
 */
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

/**
 * Enhanced Modal Manager
 * Handles multiple modals with proper focus management and accessibility
 */
class ModalManager {
    constructor() {
        this.activeModals = new Map();
        this.modalCount = 0;
        this.focusStack = [];
        this.bodyScrollPosition = 0;

        // Bind methods
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.hideAll = this.hideAll.bind(this);

        // Initialize
        this._setupGlobalListeners();
    }

    /**
     * Show modal with enhanced options
     */
    show(options = {}) {
        try {
            const modalId = options.id || `modal_${++this.modalCount}`;

            if (this.activeModals.has(modalId)) {
                console.warn(`Modal ${modalId} is already active`);
                return this.activeModals.get(modalId);
            }

            // Prevent too many modals
            if (this.activeModals.size >= UI_CONFIG.MODAL.MAX_MODALS) {
                throw new Error('Maximum number of modals reached');
            }

            const modal = this._createModal(modalId, options);
            this.activeModals.set(modalId, modal);

            // Save current focus and scroll position
            if (this.activeModals.size === 1) {
                this._saveCurrentState();
            }

            // Show modal
            this._showModal(modal);

            return modal;
        } catch (error) {
            console.error('Failed to show modal:', error);
            throw error;
        }
    }

    /**
     * Hide specific modal
     */
    hide(modalId) {
        try {
            const modal = this.activeModals.get(modalId);
            if (!modal) {
                console.warn(`Modal ${modalId} not found`);
                return;
            }

            this._hideModal(modal);
            this.activeModals.delete(modalId);

            // Restore state if last modal
            if (this.activeModals.size === 0) {
                this._restoreState();
            }

            return true;
        } catch (error) {
            console.error('Failed to hide modal:', error);
            return false;
        }
    }

    /**
     * Hide all modals
     */
    hideAll() {
        const modalIds = Array.from(this.activeModals.keys());
        modalIds.forEach(id => this.hide(id));
    }

    /**
     * Get active modal count
     */
    getActiveCount() {
        return this.activeModals.size;
    }

    /**
     * Check if any modal is active
     */
    hasActiveModals() {
        return this.activeModals.size > 0;
    }

    // Private methods
    _createModal(modalId, options) {
        const modal = {
            id: modalId,
            element: null,
            options: {
                title: options.title || 'Modal',
                content: options.content || '',
                size: options.size || 'medium', // small, medium, large, full
                closable: options.closable !== false,
                backdrop: options.backdrop !== false,
                animation: options.animation !== false,
                focus: options.focus !== false,
                className: options.className || '',
                buttons: options.buttons || [],
                onShow: options.onShow || null,
                onHide: options.onHide || null,
                onSubmit: options.onSubmit || null
            },
            zIndex: UI_CONFIG.MODAL.Z_INDEX_BASE + this.activeModals.size,
            focusableElements: [],
            currentFocusIndex: 0
        };

        modal.element = this._buildModalElement(modal);
        return modal;
    }

    _buildModalElement(modal) {
        const { options, zIndex, id } = modal;

        // Create modal container
        const modalEl = document.createElement('div');
        modalEl.className = `modal modal-${options.size} ${options.className}`;
        modalEl.setAttribute('role', 'dialog');
        modalEl.setAttribute('aria-modal', 'true');
        modalEl.setAttribute('aria-labelledby', `${id}-title`);
        modalEl.setAttribute('data-modal-id', id);
        modalEl.style.zIndex = zIndex;

        // Create backdrop
        if (options.backdrop) {
            modalEl.style.background = 'rgba(0, 0, 0, 0.6)';
            if (UI_CONFIG.MODAL.BACKDROP_BLUR) {
                modalEl.style.backdropFilter = 'blur(8px)';
            }
        }

        // Create modal content
        const contentEl = document.createElement('div');
        contentEl.className = 'modal-content';

        // Header
        const headerEl = this._createModalHeader(modal);
        contentEl.appendChild(headerEl);

        // Body
        const bodyEl = this._createModalBody(modal);
        contentEl.appendChild(bodyEl);

        // Footer
        if (options.buttons.length > 0) {
            const footerEl = this._createModalFooter(modal);
            contentEl.appendChild(footerEl);
        }

        modalEl.appendChild(contentEl);

        // Setup event listeners
        this._setupModalListeners(modal);

        return modalEl;
    }

    _createModalHeader(modal) {
        const headerEl = document.createElement('div');
        headerEl.className = 'modal-header';

        const titleEl = document.createElement('h2');
        titleEl.className = 'modal-title';
        titleEl.id = `${modal.id}-title`;
        titleEl.textContent = modal.options.title;

        headerEl.appendChild(titleEl);

        if (modal.options.closable) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'modal-close';
            closeBtn.setAttribute('aria-label', 'Close modal');
            closeBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            `;
            closeBtn.addEventListener('click', () => this.hide(modal.id));
            headerEl.appendChild(closeBtn);
        }

        return headerEl;
    }

    _createModalBody(modal) {
        const bodyEl = document.createElement('div');
        bodyEl.className = 'modal-body';
        bodyEl.id = `${modal.id}-content`;

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

        modal.options.buttons.forEach((button, index) => {
            const btnEl = document.createElement('button');
            btnEl.type = 'button';
            btnEl.className = `btn ${button.className || 'btn-secondary'}`;
            btnEl.textContent = button.text;
            btnEl.setAttribute('data-action', button.action || 'custom');

            if (button.primary) {
                btnEl.classList.add('btn-primary');
            }

            btnEl.addEventListener('click', (e) => {
                if (button.onClick) {
                    const result = button.onClick(e, modal);
                    if (result === false) return; // Prevent close
                }

                if (button.action === 'close' || button.action === 'cancel') {
                    this.hide(modal.id);
                } else if (button.action === 'submit' && modal.options.onSubmit) {
                    const formData = this._extractFormData(modal.element);
                    const result = modal.options.onSubmit(formData, modal);
                    if (result !== false) {
                        this.hide(modal.id);
                    }
                }
            });

            footerEl.appendChild(btnEl);
        });

        return footerEl;
    }

    _setupModalListeners(modal) {
        const { element, options } = modal;

        // Backdrop click
        if (options.backdrop && options.closable) {
            element.addEventListener('click', (e) => {
                if (e.target === element) {
                    this.hide(modal.id);
                }
            });
        }

        // Keyboard navigation
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && options.closable) {
                this.hide(modal.id);
            } else if (e.key === 'Tab') {
                this._handleTabNavigation(e, modal);
            }
        });
    }

    _showModal(modal) {
        const { element, options } = modal;

        // Add to DOM
        document.body.appendChild(element);

        // Initial styles for animation
        if (options.animation) {
            element.style.opacity = '0';
            element.querySelector('.modal-content').style.transform = 'translateY(30px) scale(0.95)';
        }

        // Trigger reflow
        element.offsetHeight;

        // Animate in
        if (options.animation) {
            element.style.transition = `opacity ${UI_CONFIG.MODAL.ANIMATION_DURATION}ms ease`;
            element.querySelector('.modal-content').style.transition = `transform ${UI_CONFIG.MODAL.ANIMATION_DURATION}ms ease`;

            requestAnimationFrame(() => {
                element.style.opacity = '1';
                element.querySelector('.modal-content').style.transform = 'translateY(0) scale(1)';
            });
        }

        // Setup focus management
        this._setupFocusManagement(modal);

        // Call onShow callback
        if (options.onShow) {
            setTimeout(() => options.onShow(modal), options.animation ? UI_CONFIG.MODAL.ANIMATION_DURATION : 0);
        }

        // Lock body scroll
        document.body.style.overflow = 'hidden';
    }

    _hideModal(modal) {
        const { element, options } = modal;

        if (options.animation) {
            element.style.opacity = '0';
            element.querySelector('.modal-content').style.transform = 'translateY(-30px) scale(0.95)';

            setTimeout(() => {
                if (element.parentNode) {
                    element.remove();
                }
            }, UI_CONFIG.MODAL.ANIMATION_DURATION);
        } else {
            element.remove();
        }

        // Call onHide callback
        if (options.onHide) {
            options.onHide(modal);
        }
    }

    _setupFocusManagement(modal) {
        const { element } = modal;

        // Find focusable elements
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ];

        modal.focusableElements = Array.from(
            element.querySelectorAll(focusableSelectors.join(', '))
        );

        // Focus first element
        if (UI_CONFIG.MODAL.AUTO_FOCUS && modal.focusableElements.length > 0) {
            setTimeout(() => {
                modal.focusableElements[0].focus();
            }, UI_CONFIG.MODAL.ANIMATION_DURATION);
        }
    }

    _handleTabNavigation(e, modal) {
        if (!UI_CONFIG.MODAL.TRAP_FOCUS || modal.focusableElements.length === 0) return;

        const firstElement = modal.focusableElements[0];
        const lastElement = modal.focusableElements[modal.focusableElements.length - 1];

        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    _saveCurrentState() {
        // Save focus
        this.focusStack.push(document.activeElement);

        // Save scroll position
        this.bodyScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    }

    _restoreState() {
        // Restore body scroll
        document.body.style.overflow = '';

        // Restore scroll position
        window.scrollTo(0, this.bodyScrollPosition);

        // Restore focus
        const previousFocus = this.focusStack.pop();
        if (previousFocus && previousFocus.focus) {
            setTimeout(() => previousFocus.focus(), 100);
        }
    }

    _extractFormData(element) {
        const formData = {};
        const inputs = element.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            const name = input.name || input.id;
            if (name) {
                if (input.type === 'checkbox') {
                    formData[name] = input.checked;
                } else if (input.type === 'radio') {
                    if (input.checked) {
                        formData[name] = input.value;
                    }
                } else {
                    formData[name] = input.value;
                }
            }
        });

        return formData;
    }

    _setupGlobalListeners() {
        // Handle browser back button
        window.addEventListener('popstate', () => {
            if (this.hasActiveModals()) {
                this.hideAll();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.activeModals.forEach(modal => {
                this._adjustModalPosition(modal);
            });
        });
    }

    _adjustModalPosition(modal) {
        // Adjust modal position on resize if needed
        const content = modal.element.querySelector('.modal-content');
        if (content) {
            const rect = content.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            if (rect.height > viewportHeight * 0.9) {
                content.style.maxHeight = `${viewportHeight * 0.9}px`;
                content.style.overflowY = 'auto';
            }
        }
    }
}

/**
 * Enhanced Toast Notification System
 * Manages multiple toast notifications with proper queuing
 */
class ToastManager {
    constructor() {
        this.toasts = new Map();
        this.toastCount = 0;
        this.container = null;

        this._createContainer();
    }

    /**
     * Show toast notification
     */
    show(message, type = 'info', options = {}) {
        try {
            const toastId = options.id || `toast_${++this.toastCount}`;

            if (this.toasts.has(toastId)) {
                this.hide(toastId);
            }

            // Limit number of toasts
            if (this.toasts.size >= UI_CONFIG.TOAST.MAX_TOASTS) {
                const oldestToast = this.toasts.keys().next().value;
                this.hide(oldestToast);
            }

            const toast = this._createToast(toastId, message, type, options);
            this.toasts.set(toastId, toast);

            this._showToast(toast);

            // Auto hide
            const duration = options.duration || UI_CONFIG.TOAST.DEFAULT_DURATION;
            if (duration > 0) {
                setTimeout(() => this.hide(toastId), duration);
            }

            return toastId;
        } catch (error) {
            console.error('Failed to show toast:', error);
            // Fallback to alert
            alert(message);
        }
    }

    /**
     * Hide specific toast
     */
    hide(toastId) {
        const toast = this.toasts.get(toastId);
        if (!toast) return;

        this._hideToast(toast);
        this.toasts.delete(toastId);
    }

    /**
     * Hide all toasts
     */
    hideAll() {
        const toastIds = Array.from(this.toasts.keys());
        toastIds.forEach(id => this.hide(id));
    }

    /**
     * Show different types of toasts
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', { ...options, duration: options.duration || 6000 });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    // Private methods
    _createContainer() {
        this.container = document.createElement('div');
        this.container.className = `toast-container toast-${UI_CONFIG.TOAST.POSITION}`;
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'false');
        document.body.appendChild(this.container);
    }

    _createToast(id, message, type, options) {
        const toast = {
            id,
            type,
            message,
            options,
            element: null
        };

        const element = document.createElement('div');
        element.className = `toast toast-${type} ${options.className || ''}`;
        element.setAttribute('role', 'alert');
        element.setAttribute('data-toast-id', id);

        const iconMap = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        element.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${iconMap[type] || iconMap.info}</div>
                <div class="toast-body">
                    ${options.title ? `<div class="toast-title">${this._sanitize(options.title)}</div>` : ''}
                    <div class="toast-message">${this._sanitize(message)}</div>
                </div>
                ${options.closable !== false ? `
                    <button class="toast-close" aria-label="Close notification">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `;

        // Add close handler
        const closeBtn = element.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide(id));
        }

        // Add click handler
        if (options.onClick) {
            element.style.cursor = 'pointer';
            element.addEventListener('click', (e) => {
                if (e.target !== closeBtn) {
                    options.onClick(toast);
                }
            });
        }

        toast.element = element;
        return toast;
    }

    _showToast(toast) {
        const { element } = toast;

        // Initial state
        element.style.opacity = '0';
        element.style.transform = 'translateX(100%)';

        this.container.appendChild(element);

        // Animate in
        requestAnimationFrame(() => {
            element.style.transition = `all ${UI_CONFIG.TOAST.ANIMATION_DURATION}ms ease`;
            element.style.opacity = '1';
            element.style.transform = 'translateX(0)';
        });
    }

    _hideToast(toast) {
        const { element } = toast;

        element.style.opacity = '0';
        element.style.transform = 'translateX(100%)';

        setTimeout(() => {
            if (element.parentNode) {
                element.remove();
            }
        }, UI_CONFIG.TOAST.ANIMATION_DURATION);
    }

    _sanitize(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
}

/**
 * Enhanced Form Builder
 * Creates dynamic forms with validation and auto-save
 */
class FormBuilder {
    constructor() {
        this.forms = new Map();
        this.validators = new Map();
    }

    /**
     * Create a form with enhanced features
     */
    create(containerId, config) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} not found`);
            }

            const form = this._buildForm(config);
            container.appendChild(form.element);

            this.forms.set(config.id || containerId, form);
            return form;
        } catch (error) {
            console.error('Failed to create form:', error);
            throw error;
        }
    }

    /**
     * Get form data
     */
    getData(formId) {
        const form = this.forms.get(formId);
        return form ? form.getData() : null;
    }

    /**
     * Set form data
     */
    setData(formId, data) {
        const form = this.forms.get(formId);
        if (form) {
            form.setData(data);
        }
    }

    /**
     * Validate form
     */
    validate(formId) {
        const form = this.forms.get(formId);
        return form ? form.validate() : { isValid: false, errors: {} };
    }

    // Private methods
    _buildForm(config) {
        const formElement = document.createElement('form');
        formElement.className = 'enhanced-form';
        formElement.setAttribute('novalidate', 'true');

        if (config.id) {
            formElement.id = config.id;
        }

        const form = {
            element: formElement,
            config,
            fields: new Map(),
            validators: new Map(),
            getData: () => this._getFormData(form),
            setData: (data) => this._setFormData(form, data),
            validate: () => this._validateForm(form)
        };

        // Build fields
        config.fields.forEach(fieldConfig => {
            const field = this._buildField(fieldConfig);
            form.fields.set(fieldConfig.name, field);
            formElement.appendChild(field.element);

            // Setup validation
            if (fieldConfig.validation) {
                this._setupFieldValidation(field, fieldConfig.validation);
            }
        });

        // Setup form-level validation
        if (config.validation) {
            form.validators = new Map(Object.entries(config.validation));
        }

        // Setup auto-save
        if (config.autoSave) {
            this._setupAutoSave(form, config.autoSave);
        }

        return form;
    }

    _buildField(config) {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-group';

        if (config.className) {
            wrapper.classList.add(config.className);
        }

        // Label
        if (config.label) {
            const label = document.createElement('label');
            label.textContent = config.label;
            label.setAttribute('for', config.name);
            if (config.required) {
                label.innerHTML += ' <span class="required">*</span>';
            }
            wrapper.appendChild(label);
        }

        // Input element
        let input;
        switch (config.type) {
            case 'select':
                input = this._buildSelect(config);
                break;
            case 'textarea':
                input = this._buildTextarea(config);
                break;
            case 'checkbox':
                input = this._buildCheckbox(config);
                break;
            case 'radio':
                input = this._buildRadio(config);
                break;
            default:
                input = this._buildInput(config);
        }

        wrapper.appendChild(input);

        // Help text
        if (config.help) {
            const help = document.createElement('div');
            help.className = 'field-help';
            help.textContent = config.help;
            wrapper.appendChild(help);
        }

        // Error container
        const errorContainer = document.createElement('div');
        errorContainer.className = 'field-error';
        errorContainer.style.display = 'none';
        wrapper.appendChild(errorContainer);

        return {
            element: wrapper,
            input,
            config,
            getValue: () => this._getFieldValue(input, config),
            setValue: (value) => this._setFieldValue(input, config, value),
            showError: (message) => this._showFieldError(wrapper, message),
            clearError: () => this._clearFieldError(wrapper)
        };
    }

    _buildInput(config) {
        const input = document.createElement('input');
        input.type = config.type || 'text';
        input.name = config.name;
        input.id = config.name;

        if (config.placeholder) input.placeholder = config.placeholder;
        if (config.required) input.required = true;
        if (config.disabled) input.disabled = true;
        if (config.readonly) input.readOnly = true;
        if (config.value !== undefined) input.value = config.value;

        return input;
    }

    _buildSelect(config) {
        const select = document.createElement('select');
        select.name = config.name;
        select.id = config.name;

        if (config.required) select.required = true;
        if (config.disabled) select.disabled = true;

        // Default option
        if (config.placeholder) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = config.placeholder;
            defaultOption.disabled = true;
            defaultOption.selected = true;
            select.appendChild(defaultOption);
        }

        // Options
        if (config.options) {
            config.options.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.label || option.value;
                if (option.selected) optionEl.selected = true;
                select.appendChild(optionEl);
            });
        }

        return select;
    }

    _buildTextarea(config) {
        const textarea = document.createElement('textarea');
        textarea.name = config.name;
        textarea.id = config.name;

        if (config.placeholder) textarea.placeholder = config.placeholder;
        if (config.required) textarea.required = true;
        if (config.disabled) textarea.disabled = true;
        if (config.readonly) textarea.readOnly = true;
        if (config.rows) textarea.rows = config.rows;
        if (config.value !== undefined) textarea.value = config.value;

        return textarea;
    }

    _buildCheckbox(config) {
        const wrapper = document.createElement('div');
        wrapper.className = 'checkbox-wrapper';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = config.name;
        input.id = config.name;
        input.value = config.value || 'on';

        if (config.checked) input.checked = true;
        if (config.disabled) input.disabled = true;

        const label = document.createElement('label');
        label.setAttribute('for', config.name);
        label.textContent = config.checkboxLabel || config.label || '';

        wrapper.appendChild(input);
        wrapper.appendChild(label);

        return wrapper;
    }

    _buildRadio(config) {
        const wrapper = document.createElement('div');
        wrapper.className = 'radio-group';

        if (config.options) {
            config.options.forEach((option, index) => {
                const radioWrapper = document.createElement('div');
                radioWrapper.className = 'radio-wrapper';

                const input = document.createElement('input');
                input.type = 'radio';
                input.name = config.name;
                input.id = `${config.name}_${index}`;
                input.value = option.value;

                if (option.checked) input.checked = true;
                if (config.disabled) input.disabled = true;

                const label = document.createElement('label');
                label.setAttribute('for', `${config.name}_${index}`);
                label.textContent = option.label || option.value;

                radioWrapper.appendChild(input);
                radioWrapper.appendChild(label);
                wrapper.appendChild(radioWrapper);
            });
        }

        return wrapper;
    }

    _getFieldValue(input, config) {
        switch (config.type) {
            case 'checkbox':
                return input.querySelector('input').checked;
            case 'radio':
                const checkedRadio = input.querySelector('input:checked');
                return checkedRadio ? checkedRadio.value : null;
            default:
                return input.value;
        }
    }

    _setFieldValue(input, config, value) {
        switch (config.type) {
            case 'checkbox':
                input.querySelector('input').checked = !!value;
                break;
            case 'radio':
                const radio = input.querySelector(`input[value="${value}"]`);
                if (radio) radio.checked = true;
                break;
            default:
                input.value = value || '';
        }
    }

    _showFieldError(wrapper, message) {
        const errorContainer = wrapper.querySelector('.field-error');
        const input = wrapper.querySelector('input, select, textarea');

        if (errorContainer && input) {
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
            wrapper.classList.add('has-error');
            input.classList.add('error');
        }
    }

    _clearFieldError(wrapper) {
        const errorContainer = wrapper.querySelector('.field-error');
        const input = wrapper.querySelector('input, select, textarea');

        if (errorContainer && input) {
            errorContainer.style.display = 'none';
            wrapper.classList.remove('has-error');
            input.classList.remove('error', 'success');
        }
    }

    _setupFieldValidation(field, validation) {
        const { input, config } = field;
        let validationTimeout;

        const validateField = () => {
            clearTimeout(validationTimeout);
            validationTimeout = setTimeout(() => {
                const value = field.getValue();
                const result = this._validateFieldValue(value, validation, config);

                if (result.isValid) {
                    field.clearError();
                    input.classList.add('success');
                } else {
                    field.showError(result.message);
                }
            }, UI_CONFIG.FORM.VALIDATION_DELAY);
        };

        // Add event listeners based on input type
        if (config.type === 'checkbox' || config.type === 'radio') {
            input.addEventListener('change', validateField);
        } else {
            input.addEventListener('input', validateField);
            input.addEventListener('blur', validateField);
        }
    }

    _validateFieldValue(value, validation, config) {
        // Required check
        if (validation.required && (!value || value.toString().trim() === '')) {
            return { isValid: false, message: validation.requiredMessage || 'This field is required' };
        }

        // Skip other validations if empty and not required
        if (!value || value.toString().trim() === '') {
            return { isValid: true };
        }

        // Length validation
        if (validation.minLength && value.length < validation.minLength) {
            return { isValid: false, message: `Minimum length is ${validation.minLength} characters` };
        }
        if (validation.maxLength && value.length > validation.maxLength) {
            return { isValid: false, message: `Maximum length is ${validation.maxLength} characters` };
        }

        // Pattern validation
        if (validation.pattern && !validation.pattern.test(value)) {
            return { isValid: false, message: validation.patternMessage || 'Invalid format' };
        }

        // Custom validation
        if (validation.custom && typeof validation.custom === 'function') {
            const result = validation.custom(value, config);
            if (result !== true) {
                return { isValid: false, message: result || 'Invalid value' };
            }
        }

        // Use sanitizer if available
        if (typeof window !== 'undefined' && window.sanitizer) {
            const sanitizerResult = window.sanitizer.validate(value, config.sanitizerType || 'text', validation.required);
            if (!sanitizerResult.valid) {
                return { isValid: false, message: sanitizerResult.message };
            }
        }

        return { isValid: true };
    }

    _getFormData(form) {
        const data = {};
        form.fields.forEach((field, name) => {
            data[name] = field.getValue();
        });
        return data;
    }

    _setFormData(form, data) {
        Object.entries(data).forEach(([name, value]) => {
            const field = form.fields.get(name);
            if (field) {
                field.setValue(value);
            }
        });
    }

    _validateForm(form) {
        const errors = {};
        let isValid = true;

        // Validate individual fields
        form.fields.forEach((field, name) => {
            const value = field.getValue();
            const validation = field.config.validation;

            if (validation) {
                const result = this._validateFieldValue(value, validation, field.config);
                if (!result.isValid) {
                    errors[name] = result.message;
                    isValid = false;
                    field.showError(result.message);
                } else {
                    field.clearError();
                }
            }
        });

        // Form-level validation
        if (isValid && form.validators.size > 0) {
            const formData = this._getFormData(form);

            form.validators.forEach((validator, name) => {
                if (typeof validator === 'function') {
                    const result = validator(formData);
                    if (result !== true) {
                        errors[name] = result || 'Validation failed';
                        isValid = false;
                    }
                }
            });
        }

        return { isValid, errors };
    }

    _setupAutoSave(form, autoSaveConfig) {
        let autoSaveTimeout;
        const saveData = () => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                const data = this._getFormData(form);
                if (autoSaveConfig.callback) {
                    autoSaveConfig.callback(data, form);
                }
            }, autoSaveConfig.delay || UI_CONFIG.FORM.AUTO_SAVE_DELAY);
        };

        form.fields.forEach(field => {
            field.input.addEventListener('input', saveData);
            field.input.addEventListener('change', saveData);
        });
    }
}

/**
 * Loading Manager
 * Handles loading states and progress indicators
 */
class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
        this.globalSpinner = null;
    }

    /**
     * Show loading state
     */
    show(target, options = {}) {
        const loadingId = options.id || this._generateId();

        if (typeof target === 'string') {
            // Global loading
            this._showGlobalLoading(loadingId, target, options);
        } else if (target instanceof HTMLElement) {
            // Element-specific loading
            this._showElementLoading(target, loadingId, options);
        }

        this.loadingStates.set(loadingId, { target, options, startTime: Date.now() });
        return loadingId;
    }

    /**
     * Hide loading state
     */
    hide(loadingId) {
        const state = this.loadingStates.get(loadingId);
        if (!state) return;

        if (typeof state.target === 'string') {
            this._hideGlobalLoading();
        } else {
            this._hideElementLoading(state.target);
        }

        this.loadingStates.delete(loadingId);
    }

    /**
     * Hide all loading states
     */
    hideAll() {
        const loadingIds = Array.from(this.loadingStates.keys());
        loadingIds.forEach(id => this.hide(id));
    }

    // Private methods
    _showGlobalLoading(id, message, options) {
        if (this.globalSpinner) {
            this._hideGlobalLoading();
        }

        this.globalSpinner = document.createElement('div');
        this.globalSpinner.className = 'global-loading-overlay';
        this.globalSpinner.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
                ${options.progress ? '<div class="loading-progress"><div class="progress-bar"></div></div>' : ''}
            </div>
        `;

        document.body.appendChild(this.globalSpinner);
        document.body.style.overflow = 'hidden';

        // Animate in
        requestAnimationFrame(() => {
            this.globalSpinner.style.opacity = '1';
        });
    }

    _hideGlobalLoading() {
        if (this.globalSpinner) {
            this.globalSpinner.style.opacity = '0';
            setTimeout(() => {
                if (this.globalSpinner && this.globalSpinner.parentNode) {
                    this.globalSpinner.remove();
                    this.globalSpinner = null;
                    document.body.style.overflow = '';
                }
            }, 300);
        }
    }

    _showElementLoading(element, id, options) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'element-loading-overlay';
        loadingOverlay.setAttribute('data-loading-id', id);
        loadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            ${options.message ? `<div class="loading-message">${options.message}</div>` : ''}
        `;

        // Make element relative if not already positioned
        const computedStyle = window.getComputedStyle(element);
        if (computedStyle.position === 'static') {
            element.style.position = 'relative';
        }

        element.appendChild(loadingOverlay);
    }

    _hideElementLoading(element) {
        const overlay = element.querySelector('.element-loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    _generateId() {
        return `loading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Update progress for global loading
     */
    updateProgress(percentage) {
        if (this.globalSpinner) {
            const progressBar = this.globalSpinner.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
            }
        }
    }
}

/**
 * Confirmation Dialog Manager
 * Handles confirmation dialogs with better UX
 */
class ConfirmationManager {
    /**
     * Show confirmation dialog
     */
    static async confirm(options = {}) {
        return new Promise((resolve) => {
            const modal = modalManager.show({
                title: options.title || 'Confirm Action',
                content: `
                    <div class="confirmation-content">
                        ${options.icon ? `<div class="confirmation-icon ${options.type || 'warning'}">${options.icon}</div>` : ''}
                        <div class="confirmation-message">
                            ${options.message || 'Are you sure you want to proceed?'}
                        </div>
                        ${options.details ? `<div class="confirmation-details">${options.details}</div>` : ''}
                    </div>
                `,
                size: 'small',
                buttons: [
                    {
                        text: options.cancelText || 'Cancel',
                        className: 'btn-secondary',
                        action: 'cancel',
                        onClick: () => resolve(false)
                    },
                    {
                        text: options.confirmText || 'Confirm',
                        className: `btn-${options.type || 'danger'}`,
                        action: 'confirm',
                        primary: true,
                        onClick: () => resolve(true)
                    }
                ],
                onHide: () => resolve(false)
            });
        });
    }

    /**
     * Show delete confirmation
     */
    static async confirmDelete(itemName = 'item') {
        return this.confirm({
            title: 'Delete Item',
            message: `Are you sure you want to delete "${itemName}"?`,
            details: 'This action cannot be undone.',
            icon: '🗑️',
            type: 'danger',
            confirmText: 'Delete',
            cancelText: 'Cancel'
        });
    }

    /**
     * Show save confirmation
     */
    static async confirmSave() {
        return this.confirm({
            title: 'Save Changes',
            message: 'Do you want to save your changes?',
            icon: '💾',
            type: 'primary',
            confirmText: 'Save',
            cancelText: 'Don\'t Save'
        });
    }

    /**
     * Show discard confirmation
     */
    static async confirmDiscard() {
        return this.confirm({
            title: 'Discard Changes',
            message: 'You have unsaved changes. Are you sure you want to discard them?',
            details: 'Any unsaved changes will be lost.',
            icon: '⚠️',
            type: 'warning',
            confirmText: 'Discard',
            cancelText: 'Keep Editing'
        });
    }
}

// ===================================
// SPECIALIZED UI COMPONENTS
// ===================================

/**
 * Enhanced Data Table Component
 */
class DataTable {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            columns: options.columns || [],
            data: options.data || [],
            sortable: options.sortable !== false,
            filterable: options.filterable !== false,
            paginated: options.paginated !== false,
            pageSize: options.pageSize || 25,
            selectable: options.selectable || false,
            actions: options.actions || [],
            emptyMessage: options.emptyMessage || 'No data available',
            loadingMessage: options.loadingMessage || 'Loading...',
            ...options
        };

        this.currentPage = 1;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filters = {};
        this.selectedRows = new Set();

        this._init();
    }

    _init() {
        this.container.className = 'data-table-container';
        this._render();
    }

    _render() {
        this.container.innerHTML = `
            <div class="table-header">
                <div class="table-title">${this.options.title || ''}</div>
                <div class="table-controls">
                    ${this.options.filterable ? this._renderSearchBox() : ''}
                    ${this.options.actions.length ? this._renderActions() : ''}
                </div>
            </div>
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        ${this._renderHeaders()}
                    </thead>
                    <tbody>
                        ${this._renderRows()}
                    </tbody>
                </table>
            </div>
            ${this.options.paginated ? this._renderPagination() : ''}
        `;

        this._attachEventListeners();
    }

    _renderSearchBox() {
        return `
            <div class="search-box">
                <input type="text" placeholder="Search..." class="table-search">
                <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                </svg>
            </div>
        `;
    }

    _renderActions() {
        return this.options.actions.map(action => `
            <button class="btn ${action.className || 'btn-secondary'}" data-action="${action.name}">
                ${action.icon || ''} ${action.label}
            </button>
        `).join('');
    }

    _renderHeaders() {
        let headers = '';

        if (this.options.selectable) {
            headers += `
                <th class="select-column">
                    <input type="checkbox" class="select-all">
                </th>
            `;
        }

        headers += this.options.columns.map(column => `
            <th class="${column.sortable !== false && this.options.sortable ? 'sortable' : ''}"
                data-column="${column.key}">
                ${column.label}
                ${column.sortable !== false && this.options.sortable ? '<span class="sort-indicator"></span>' : ''}
            </th>
        `).join('');

        if (this.options.rowActions && this.options.rowActions.length > 0) {
            headers += '<th class="actions-column">Actions</th>';
        }

        return `<tr>${headers}</tr>`;
    }

    _renderRows() {
        const filteredData = this._getFilteredData();
        const paginatedData = this.options.paginated ?
            this._getPaginatedData(filteredData) : filteredData;

        if (paginatedData.length === 0) {
            const colSpan = this._getColumnCount();
            return `<tr><td colspan="${colSpan}" class="empty-message">${this.options.emptyMessage}</td></tr>`;
        }

        return paginatedData.map((row, index) => {
            const rowId = row.id || index;
            let rowHtml = '';

            if (this.options.selectable) {
                rowHtml += `
                    <td class="select-column">
                        <input type="checkbox" class="select-row" data-row-id="${rowId}">
                    </td>
                `;
            }

            rowHtml += this.options.columns.map(column => `
                <td class="column-${column.key}">
                    ${this._formatCellValue(row[column.key], column)}
                </td>
            `).join('');

            if (this.options.rowActions && this.options.rowActions.length > 0) {
                rowHtml += `
                    <td class="actions-column">
                        ${this._renderRowActions(row, rowId)}
                    </td>
                `;
            }

            return `<tr data-row-id="${rowId}">${rowHtml}</tr>`;
        }).join('');
    }

    _renderRowActions(row, rowId) {
        return this.options.rowActions.map(action => `
            <button class="action-btn ${action.className || ''}"
                    data-action="${action.name}"
                    data-row-id="${rowId}"
                    title="${action.title || action.label}">
                ${action.icon || action.label}
            </button>
        `).join('');
    }

    _renderPagination() {
        const filteredData = this._getFilteredData();
        const totalPages = Math.ceil(filteredData.length / this.options.pageSize);

        if (totalPages <= 1) return '';

        return `
            <div class="table-pagination">
                <div class="pagination-info">
                    Showing ${((this.currentPage - 1) * this.options.pageSize) + 1} to
                    ${Math.min(this.currentPage * this.options.pageSize, filteredData.length)}
                    of ${filteredData.length} entries
                </div>
                <div class="pagination-controls">
                    <button class="btn btn-sm" ${this.currentPage === 1 ? 'disabled' : ''} data-page="prev">
                        Previous
                    </button>
                    ${this._renderPageNumbers(totalPages)}
                    <button class="btn btn-sm" ${this.currentPage === totalPages ? 'disabled' : ''} data-page="next">
                        Next
                    </button>
                </div>
            </div>
        `;
    }

    _renderPageNumbers(totalPages) {
        const maxVisible = 5;
        const startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        const endPage = Math.min(totalPages, startPage + maxVisible - 1);

        let pageNumbers = '';

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers += `
                <button class="btn btn-sm ${i === this.currentPage ? 'active' : ''}"
                        data-page="${i}">
                    ${i}
                </button>
            `;
        }

        return pageNumbers;
    }

    _formatCellValue(value, column) {
        if (column.formatter && typeof column.formatter === 'function') {
            return column.formatter(value);
        }

        if (value === null || value === undefined) {
            return '';
        }

        return String(value);
    }

    _getFilteredData() {
        let filtered = [...this.options.data];

        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(row => {
                return this.options.columns.some(column => {
                    const value = row[column.key];
                    return value && String(value).toLowerCase().includes(this.searchTerm.toLowerCase());
                });
            });
        }

        // Apply column filters
        Object.entries(this.filters).forEach(([column, filterValue]) => {
            if (filterValue) {
                filtered = filtered.filter(row => {
                    const value = row[column];
                    return value && String(value).toLowerCase().includes(filterValue.toLowerCase());
                });
            }
        });

        // Apply sorting
        if (this.sortColumn) {
            filtered.sort((a, b) => {
                const aValue = a[this.sortColumn];
                const bValue = b[this.sortColumn];

                let comparison = 0;
                if (aValue < bValue) comparison = -1;
                if (aValue > bValue) comparison = 1;

                return this.sortDirection === 'desc' ? -comparison : comparison;
            });
        }

        return filtered;
    }

    _getPaginatedData(data) {
        const startIndex = (this.currentPage - 1) * this.options.pageSize;
        const endIndex = startIndex + this.options.pageSize;
        return data.slice(startIndex, endIndex);
    }

    _getColumnCount() {
        let count = this.options.columns.length;
        if (this.options.selectable) count++;
        if (this.options.rowActions && this.options.rowActions.length > 0) count++;
        return count;
    }

    _attachEventListeners() {
        // Search
        const searchInput = this.container.querySelector('.table-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this._render();
            });
        }

        // Sorting
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.sortable')) {
                const column = e.target.closest('.sortable').dataset.column;
                this._handleSort(column);
            }
        });

        // Selection
        this.container.addEventListener('change', (e) => {
            if (e.target.classList.contains('select-all')) {
                this._handleSelectAll(e.target.checked);
            } else if (e.target.classList.contains('select-row')) {
                this._handleRowSelect(e.target.dataset.rowId, e.target.checked);
            }
        });

        // Actions
        this.container.addEventListener('click', (e) => {
            if (e.target.dataset.action) {
                this._handleAction(e.target.dataset.action, e.target.dataset.rowId);
            }
        });

        // Pagination
        this.container.addEventListener('click', (e) => {
            if (e.target.dataset.page) {
                this._handlePageChange(e.target.dataset.page);
            }
        });
    }

    _handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this._render();
    }

    _handleSelectAll(checked) {
        const checkboxes = this.container.querySelectorAll('.select-row');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            this._handleRowSelect(checkbox.dataset.rowId, checked);
        });
    }

    _handleRowSelect(rowId, checked) {
        if (checked) {
            this.selectedRows.add(rowId);
        } else {
            this.selectedRows.delete(rowId);
        }

        if (this.options.onSelectionChange) {
            this.options.onSelectionChange(Array.from(this.selectedRows));
        }
    }

    _handleAction(actionName, rowId) {
        const action = [...this.options.actions, ...(this.options.rowActions || [])]
            .find(a => a.name === actionName);

        if (action && action.onClick) {
            const rowData = rowId ? this.options.data.find(row => row.id == rowId) : null;
            action.onClick(rowData, Array.from(this.selectedRows));
        }
    }

    _handlePageChange(page) {
        const filteredData = this._getFilteredData();
        const totalPages = Math.ceil(filteredData.length / this.options.pageSize);

        switch (page) {
            case 'prev':
                if (this.currentPage > 1) this.currentPage--;
                break;
            case 'next':
                if (this.currentPage < totalPages) this.currentPage++;
                break;
            default:
                this.currentPage = parseInt(page);
        }

        this._render();
    }

    // Public methods
    setData(data) {
        this.options.data = data;
        this.currentPage = 1;
        this.selectedRows.clear();
        this._render();
    }

    addRow(row) {
        this.options.data.push(row);
        this._render();
    }

    removeRow(rowId) {
        this.options.data = this.options.data.filter(row => row.id != rowId);
        this.selectedRows.delete(rowId);
        this._render();
    }

    updateRow(rowId, newData) {
        const index = this.options.data.findIndex(row => row.id == rowId);
        if (index !== -1) {
            this.options.data[index] = { ...this.options.data[index], ...newData };
            this._render();
        }
    }

    getSelectedRows() {
        return Array.from(this.selectedRows);
    }

    clearSelection() {
        this.selectedRows.clear();
        this._render();
    }
}

// ===================================
// GLOBAL INSTANCES AND INITIALIZATION
// ===================================

// Create global instances
const modalManager = new ModalManager();
const toastManager = new ToastManager();
const formBuilder = new FormBuilder();
const loadingManager = new LoadingManager();

// Enhanced UIHelpers that integrates with new components
class EnhancedUIHelpers extends UIHelpers {
    static showModal(options) {
        return modalManager.show(options);
    }

    static hideModal(id) {
        return modalManager.hide(id);
    }

    static showToast(message, type, options) {
        return toastManager.show(message, type, options);
    }

    static success(message, options) {
        return toastManager.success(message, options);
    }

    static error(message, options) {
        return toastManager.error(message, options);
    }

    static warning(message, options) {
        return toastManager.warning(message, options);
    }

    static info(message, options) {
        return toastManager.info(message, options);
    }

    static showLoading(target, options) {
        return loadingManager.show(target, options);
    }

    static hideLoading(id) {
        return loadingManager.hide(id);
    }

    static confirm(options) {
        return ConfirmationManager.confirm(options);
    }

    static confirmDelete(itemName) {
        return ConfirmationManager.confirmDelete(itemName);
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = {
        ModalManager,
        ToastManager,
        FormBuilder,
        LoadingManager,
        ConfirmationManager,
        DataTable,
        EnhancedUIHelpers,
        UI_CONFIG
    };
} else if (typeof window !== 'undefined') {
    // Browser
    window.modalManager = modalManager;
    window.toastManager = toastManager;
    window.formBuilder = formBuilder;
    window.loadingManager = loadingManager;
    window.ConfirmationManager = ConfirmationManager;
    window.DataTable = DataTable;
    window.UIHelpers = EnhancedUIHelpers;
    window.UI_CONFIG = UI_CONFIG;

    // Backward compatibility
    window.showToast = (message, type, duration) => toastManager.show(message, type, { duration });
    window.showConfirmDialog = (message, onConfirm, onCancel) => {
        return ConfirmationManager.confirm({ message }).then(result => {
            if (result && onConfirm) onConfirm();
            if (!result && onCancel) onCancel();
            return result;
        });
    };
}

console.log('✅ Enhanced UI Components v2.0 Loaded');
console.log('🎨 Features: Modal system, toast notifications, form builder, data tables, loading states');