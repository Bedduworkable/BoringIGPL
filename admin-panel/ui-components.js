/**
 * ===================================
 * ENHANCED UI COMPONENTS & MODAL SYSTEM
 * File: ui-components.js
 * Version: 2.0 (Refactored)
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
        POSITION: 'top-right', // e.g., top-right, bottom-left
        ANIMATION_DURATION: 300
    },

    LOADING: {
        GLOBAL_TARGET_ID: 'loading-screen', // Assumes an element with this ID exists for global loading
        SPINNER_COLOR: '#6366f1' // Primary color from theme
    },

    FORM: {
        VALIDATION_DELAY: 300,
        AUTO_SAVE_DELAY: 2000,
        SHOW_PROGRESS: true
    },

    THEME: {
        PRIMARY_COLOR: '#6366f1', // From styles.css
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
            const modalId = options.id || `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            if (this.activeModals.has(modalId)) {
                console.warn(`Modal ${modalId} is already active. Focusing it.`);
                this.activeModals.get(modalId).element.focus();
                return this.activeModals.get(modalId);
            }

            // Prevent too many modals
            if (this.activeModals.size >= UI_CONFIG.MODAL.MAX_MODALS) {
                console.warn('Maximum number of modals reached. Closing oldest.');
                const oldestModalId = this.activeModals.keys().next().value;
                this.hide(oldestModalId); // Close oldest modal
            }

            const modal = this._createModal(modalId, options);
            this.activeModals.set(modalId, modal);

            // Save current focus and scroll position
            if (this.activeModals.size === 1) {
                this._saveCurrentState();
                document.body.style.overflow = 'hidden'; // Prevent body scroll when modal is open
            }

            document.body.appendChild(modal.element);
            this._animateModalIn(modal);

            if (options.onShow) {
                options.onShow(modal);
            }

            return modal;
        } catch (error) {
            console.error('Failed to show modal:', error);
            // Optionally, show a toast error via the global toastManager if it exists
            if (window.toastManager) {
                window.toastManager.show(`Error showing modal: ${error.message}`, 'error');
            }
            return null;
        }
    }

    /**
     * Hide specific modal
     */
    hide(modalId) {
        const modal = this.activeModals.get(modalId);
        if (!modal) {
            // console.warn(`Modal ${modalId} not found or already hidden.`);
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
                document.body.style.overflow = ''; // Restore body scroll
            } else {
                // Focus the next modal in stack if any
                const remainingModals = Array.from(this.activeModals.values());
                if (remainingModals.length > 0) {
                    const topModal = remainingModals[remainingModals.length - 1];
                    this._setupFocusManagement(topModal); // Re-focus the next active modal
                }
            }
        });
        return true;
    }

    /**
     * Hide all modals
     */
    hideAll() {
        // Iterate over a copy of keys to avoid issues with map modification during iteration
        Array.from(this.activeModals.keys()).forEach(id => this.hide(id));
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

    /**
     * Private: Creates the modal object and its main DOM element.
     * @param {string} modalId
     * @param {Object} options
     * @returns {Object} The modal object containing id, element, options, zIndex etc.
     * @private
     */
    _createModal(modalId, options) {
        // Define default options within the method or use a global config for better merging
        const defaultOptions = {
            title: 'Modal',
            content: '',
            size: 'medium', // small, medium, large, full
            closable: true,
            backdrop: true, // Whether to show backdrop and close on click
            animation: true, // Whether to animate in/out
            focus: true, // Whether to auto-focus first element and trap focus
            className: '', // Custom class for the modal container
            buttons: [], // Array of button configs { text, className, action ('close', 'submit'), primary, onClick }
            onShow: null, // Callback when modal is shown (receives modal object)
            onHide: null, // Callback when modal is hidden (receives modal object)
            onSubmit: null // Callback for 'submit' action button (receives formData, modal object)
        };

        const modal = {
            id: modalId,
            element: document.createElement('div'), // Create the main modal container element
            options: { ...defaultOptions, ...options }, // Merge defaults with provided options
            zIndex: UI_CONFIG.MODAL.Z_INDEX_BASE + this.activeModals.size,
            focusableElements: [], // To store elements that can be focused
            currentFocusIndex: 0 // For keyboard navigation (not fully used in this snippet)
        };

        // Apply classes and attributes to the main modal element
        modal.element.className = `modal modal-${modal.options.size} ${modal.options.className}`;
        modal.element.setAttribute('role', 'dialog');
        modal.element.setAttribute('aria-modal', 'true');
        modal.element.setAttribute('aria-labelledby', `${modalId}-title`);
        modal.element.setAttribute('data-modal-id', modalId);
        modal.element.style.zIndex = modal.zIndex; // Set dynamic z-index

        // Handle backdrop styling
        if (modal.options.backdrop) {
            modal.element.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'; // Fallback color
            if (UI_CONFIG.MODAL.BACKDROP_BLUR) {
                modal.element.style.backdropFilter = 'blur(8px)';
            }
        }

        // Create inner content structure
        const contentEl = document.createElement('div');
        contentEl.className = 'modal-content';

        contentEl.appendChild(this._createModalHeader(modal));
        contentEl.appendChild(this._createModalBody(modal));

        // Add footer if buttons are provided
        if (modal.options.buttons && modal.options.buttons.length > 0) {
            contentEl.appendChild(this._createModalFooter(modal));
        }

        modal.element.appendChild(contentEl);
        this._setupModalEventListeners(modal); // Attach event listeners
        return modal;
    }

    /**
     * Private: Creates the modal header section.
     * @param {Object} modal
     * @returns {HTMLElement}
     * @private
     */
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
            // Using a simple SVG for the close icon
            closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            closeBtn.onclick = () => this.hide(modal.id); // Call hide method on click
            headerEl.appendChild(closeBtn);
        }
        return headerEl;
    }

    /**
     * Private: Creates the modal body section.
     * @param {Object} modal
     * @returns {HTMLElement}
     * @private
     */
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

    /**
     * Private: Creates the modal footer with action buttons.
     * @param {Object} modal
     * @returns {HTMLElement}
     * @private
     */
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
                    // Pass form data if available, and the modal object itself
                    const formData = this._extractFormData(modal.element.querySelector('form'));
                    const result = await button.onClick(formData, modal); // Await async onClick handlers
                    if (result === false) { // Explicitly check for false to prevent closing
                        shouldClose = false;
                    }
                }
                // Automatically hide for 'close', 'cancel', or 'primary' buttons unless onClick returned false
                if (shouldClose && (button.action === 'close' || button.action === 'cancel' || button.primary)) {
                    this.hide(modal.id);
                }
            };
            footerEl.appendChild(btnEl);
        });
        return footerEl;
    }

    /**
     * Private: Extracts form data from an HTML form element.
     * @param {HTMLFormElement} formElement
     * @returns {Object} Key-value pairs of form data.
     * @private
     */
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

    /**
     * Private: Handles animations for showing the modal.
     * @param {Object} modal
     * @private
     */
    _animateModalIn(modal) {
        modal.element.style.display = 'flex'; // Make sure it's flex for centering
        requestAnimationFrame(() => {
            modal.element.style.opacity = '1';
            const modalContent = modal.element.querySelector('.modal-content');
            if (modalContent) {
                // Apply transition property only when animating
                modalContent.style.transition = `transform ${UI_CONFIG.MODAL.ANIMATION_DURATION}ms ease-out, opacity ${UI_CONFIG.MODAL.ANIMATION_DURATION}ms ease-out`;
                modalContent.style.transform = 'translateY(0) scale(1)';
                modalContent.style.opacity = '1';
            }
        });
        this._setupFocusManagement(modal); // Set up focus after animation starts
    }

    /**
     * Private: Handles animations for hiding the modal.
     * @param {Object} modal
     * @param {Function} callback - Function to call after animation completes.
     * @private
     */
    _animateModalOut(modal, callback) {
        modal.element.style.opacity = '0';
        const modalContent = modal.element.querySelector('.modal-content');
        if (modalContent) {
            // Apply transition property only when animating
            modalContent.style.transition = `transform ${UI_CONFIG.MODAL.ANIMATION_DURATION}ms ease-in, opacity ${UI_CONFIG.MODAL.ANIMATION_DURATION}ms ease-in`;
            modalContent.style.transform = 'translateY(20px) scale(0.95)';
            modalContent.style.opacity = '0';
        }
        setTimeout(callback, UI_CONFIG.MODAL.ANIMATION_DURATION);
    }

    /**
     * Private: Sets up event listeners for the modal (keyboard, backdrop click).
     * @param {Object} modal
     * @private
     */
    _setupModalEventListeners(modal) {
        // Keyboard navigation
        modal.element.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.options.closable) {
                this.hide(modal.id);
            } else if (e.key === 'Tab') {
                this._handleTabNavigation(e, modal);
            }
        });
        // Click on backdrop to close
        modal.element.addEventListener('click', (e) => {
            if (e.target === modal.element && modal.options.closable && modal.options.backdrop) {
                this.hide(modal.id);
            }
        });
    }

    /**
     * Private: Manages focus trapping within the modal.
     * @param {Object} modal
     * @private
     */
    _setupFocusManagement(modal) {
        // Save currently focused element to restore it later
        this.focusStack.push(document.activeElement);
        // Find all focusable elements within the modal
        const focusable = modal.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        // Filter out disabled elements or those not currently visible/offset
        modal.focusableElements = Array.from(focusable).filter(el => !el.disabled && el.offsetParent !== null);

        // Auto-focus the first focusable element
        if (modal.focusableElements.length > 0 && UI_CONFIG.MODAL.AUTO_FOCUS) {
            setTimeout(() => modal.focusableElements[0].focus(), 50); // Small delay to ensure modal is rendered
        }
    }

    /**
     * Private: Handles Tab key navigation to trap focus within the modal.
     * @param {KeyboardEvent} e
     * @param {Object} modal
     * @private
     */
    _handleTabNavigation(e, modal) {
        if (!UI_CONFIG.MODAL.TRAP_FOCUS || modal.focusableElements.length === 0) return;

        const firstFocusable = modal.focusableElements[0];
        const lastFocusable = modal.focusableElements[modal.focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else { // Tab
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    }

    /**
     * Private: Saves the current scroll position of the body.
     * @private
     */
    _saveCurrentState() {
        this.bodyScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        // More complex state saving (e.g., body classes) could be added here
    }

    /**
     * Private: Restores the previous scroll position and focus after modal is closed.
     * @private
     */
    _restoreState() {
        window.scrollTo(0, this.bodyScrollPosition);
        const lastFocused = this.focusStack.pop();
        if (lastFocused && typeof lastFocused.focus === 'function') {
            setTimeout(() => lastFocused.focus(), 100); // Small delay for smoother transition
        }
    }

    /**
     * Private: Sets up global event listeners (e.g., for browser history changes).
     * @private
     */
    _setupGlobalListeners() {
        // Example: Listen for browser back button for modals (if using history API for modals)
        // window.addEventListener('popstate', () => {
        //     if (this.hasActiveModals()) {
        //         this.hideAll();
        //     }
        // });
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

    /**
     * Private: Creates the main container for toast notifications.
     * @private
     */
    _createToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = `toast-container toast-${UI_CONFIG.TOAST.POSITION}`;
        this.toastContainer.setAttribute('aria-live', 'polite'); // Announce changes to screen readers
        this.toastContainer.setAttribute('aria-atomic', 'false'); // Announce each toast as a whole

        // Basic positioning styles (can be overridden by CSS)
        Object.assign(this.toastContainer.style, {
            position: 'fixed',
            zIndex: (UI_CONFIG.MODAL.Z_INDEX_BASE + 100).toString(), // Ensure toasts are above modals
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '10px',
            maxWidth: '90%', // Prevent toasts from being too wide on small screens
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

    /**
     * Shows a toast notification.
     * @param {string} message - The message to display.
     * @param {'info'|'success'|'error'|'warning'} type - The type of toast.
     * @param {Object} options - Additional options (duration, closable, title, onClick).
     * @returns {string} The ID of the toast.
     */
    show(message, type = 'info', options = {}) {
        // If max toasts reached, hide the oldest one
        if (this.activeToasts.size >= UI_CONFIG.TOAST.MAX_TOASTS) {
            const oldestToastId = this.activeToasts.keys().next().value;
            this.hide(oldestToastId);
        }

        const toastId = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const duration = options.duration || UI_CONFIG.TOAST.DEFAULT_DURATION;

        const toastElement = document.createElement('div');
        toastElement.className = `toast-notification toast-${type} ${options.className || ''}`; // Uses styles from styles.css
        toastElement.setAttribute('role', 'alert');
        toastElement.setAttribute('aria-live', 'assertive'); // Announce to screen readers

        // Basic structure, should match styles.css for proper display
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

        // Add to container and store
        this.toastContainer.appendChild(toastElement);
        this.activeToasts.set(toastId, toastElement);

        // Animate in
        toastElement.style.opacity = '0';
        // Initial transform based on position for slide-in effect
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
            toastElement.style.transform = 'translate(0,0)'; // Slide to original position
        });

        // Event listeners
        if (options.closable !== false) {
            toastElement.querySelector('.toast-close-btn').onclick = () => this.hide(toastId);
        }
        if (options.onClick) {
            toastElement.style.cursor = 'pointer';
            toastElement.addEventListener('click', () => {
                // Ensure click on close button doesn't trigger onClick
                if (event.target.closest('.toast-close-btn') === null) {
                    options.onClick(toastId);
                    this.hide(toastId); // Hide after click
                }
            });
        }


        // Auto-hide if duration is set
        if (duration > 0) {
            setTimeout(() => this.hide(toastId), duration);
        }
        return toastId;
    }

    /**
     * Hides a specific toast notification.
     * @param {string} toastId - The ID of the toast to hide.
     */
    hide(toastId) {
        const toastElement = this.activeToasts.get(toastId);
        if (toastElement) {
            // Animate out
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

    /**
     * Private: Returns SVG string for toast icons.
     * @param {string} type - Toast type.
     * @returns {string} SVG string.
     * @private
     */
    _getIconSVG(type) {
        // Using simple Material Design Icons SVGs (requires proper CSS for color)
        switch (type) {
            case 'success': return `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
            case 'error': return `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
            case 'warning': return `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`;
            case 'info':
            default: return `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;
        }
    }

    /**
     * Private: Sanitizes HTML content for display (basic XSS prevention).
     * For full security, server-side sanitization or a robust client-side library like DOMPurify is recommended.
     * @param {string} html - The HTML string to sanitize.
     * @returns {string} Sanitized HTML string.
     * @private
     */
    _sanitize(html) {
        const div = document.createElement('div');
        div.textContent = html; // Converts HTML to plain text, escaping HTML entities
        return div.innerHTML;
    }
}


/**
 * Loading Indicator Manager
 */
class LoadingManager {
    constructor() {
        this.activeLoaders = new Map();
        this.globalLoaderElement = null; // Reference to the global loading screen element
    }

    /**
     * Shows a loading indicator.
     * @param {HTMLElement|string} target - The HTML element to overlay, or 'global' for full-screen loader.
     * @param {Object} [options={}] - Options for the loader (message, progress).
     * @returns {string} The ID of the loader instance.
     */
    show(target, options = {}) {
        const loaderId = `loader_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const message = options.message || 'Loading...';

        if (target === 'global' || (typeof target === 'string' && target === UI_CONFIG.LOADING.GLOBAL_TARGET_ID)) {
            // Handle global loading screen
            if (!this.globalLoaderElement) {
                this.globalLoaderElement = document.getElementById(UI_CONFIG.LOADING.GLOBAL_TARGET_ID);
                if (!this.globalLoaderElement) {
                    // If global loading screen element doesn't exist, create it
                    this.globalLoaderElement = document.createElement('div');
                    this.globalLoaderElement.id = UI_CONFIG.LOADING.GLOBAL_TARGET_ID;
                    this.globalLoaderElement.className = 'loading-screen'; // Apply CSS class
                    this.globalLoaderElement.innerHTML = `
                        <div class="loading-spinner"></div>
                        <p class="loading-message">${message}</p>
                    `;
                    document.body.appendChild(this.globalLoaderElement);
                }
            }
            this.globalLoaderElement.style.display = 'flex'; // Make it visible
            this.globalLoaderElement.style.opacity = '1'; // Ensure opacity is set for animation
            this.globalLoaderElement.querySelector('.loading-message').textContent = message; // Update message
            document.body.style.overflow = 'hidden'; // Prevent scrolling
            this.activeLoaders.set(loaderId, { type: 'global', element: this.globalLoaderElement });
            return loaderId;

        } else if (target instanceof HTMLElement) {
            // Handle element-specific loading overlay
            const targetElement = target;
            const overlay = document.createElement('div');
            overlay.className = 'element-loading-overlay'; // Apply CSS class for overlay
            overlay.innerHTML = `
                <div class="loading-spinner-local"></div>
                ${options.message ? `<p class="loading-message-local">${options.message}</p>` : ''}
            `;
            // Ensure target element is relatively positioned for overlay to work
            if (window.getComputedStyle(targetElement).position === 'static') {
                targetElement.style.position = 'relative';
            }
            targetElement.appendChild(overlay);
            this.activeLoaders.set(loaderId, { type: 'element', element: overlay, targetElement: targetElement });
            return loaderId;

        } else if (typeof target === 'string') {
            // Handle target by ID for element-specific loading
            const targetElement = document.getElementById(target);
            if (targetElement) {
                return this.show(targetElement, options); // Recursive call for HTMLElement branch
            } else {
                console.warn(`Loading target element with ID '${target}' not found.`);
                return null;
            }
        }
        return null;
    }

    /**
     * Hides a specific loading indicator or the global one.
     * @param {string} [id='global'] - The ID of the loader to hide, or 'global'.
     */
    hide(id = 'global') {
        const loaderInfo = this.activeLoaders.get(id);
        if (loaderInfo) {
            if (loaderInfo.type === 'global') {
                // Animate global loader out
                loaderInfo.element.style.opacity = '0';
                setTimeout(() => {
                    loaderInfo.element.style.display = 'none';
                    if (this.activeLoaders.size === 1) { // If this is the last global loader, restore body scroll
                        document.body.style.overflow = '';
                    }
                }, UI_CONFIG.MODAL.ANIMATION_DURATION); // Use modal duration for smooth fade
            } else if (loaderInfo.type === 'element') {
                loaderInfo.element.remove();
                // Optionally reset targetElement's position if it was set by this loader (more complex to track)
            }
            this.activeLoaders.delete(id);
        }
    }

    /**
     * Hides all active loading indicators.
     */
    hideAll() {
        // Iterate over a copy of keys to avoid issues with map modification during iteration
        Array.from(this.activeLoaders.keys()).forEach(id => this.hide(id));
    }
}

/**
 * Confirmation Dialog Manager
 * Provides a static interface for showing confirmation prompts.
 */
class ConfirmationManager {
    /**
     * Shows a generic confirmation dialog.
     * @param {Object} [options={}] - Configuration options for the dialog.
     * @returns {Promise<boolean>} Resolves with true if confirmed, false if cancelled/closed.
     */
    static async confirm(options = {}) {
        return new Promise((resolve) => {
            const modalId = `confirm-modal-${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            let resolvedByButton = false; // Flag to track if a button resolved the promise

            const defaults = {
                title: 'Confirm Action',
                message: 'Are you sure you want to proceed?',
                confirmText: 'Confirm',
                cancelText: 'Cancel',
                type: 'info', // info, warning, danger, success, primary (affects button style)
                size: 'small',
                closable: true, // Allow closing via escape/backdrop
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
                        primary: true, // Make this button primary for default focus/styling
                        onClick: () => { resolvedByButton = true; resolve(true); }
                    }
                ],
                onHide: () => {
                    // If the modal is hidden without a button click, it means it was cancelled (e.g., by Escape key or backdrop click)
                    if (!resolvedByButton) {
                        resolve(false);
                    }
                }
            });
        });
    }

    /**
     * Shows a confirmation dialog for a delete action.
     * @param {string} itemName - The name of the item being deleted.
     * @returns {Promise<boolean>}
     */
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

    /**
     * Shows a confirmation dialog for saving changes.
     * @returns {Promise<boolean>}
     */
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

    /**
     * Shows a confirmation dialog for discarding changes.
     * @returns {Promise<boolean>}
     */
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
 * Form Builder (Placeholder)
 * For dynamically creating forms based on schemas
 */
class FormBuilder {
    constructor() {
        // Initialization
        this.forms = new Map(); // To keep track of instantiated forms
        this.formValidationMap = new Map(); // To store validation schemas per form
    }

    /**
     * Creates a dynamic form based on a given schema.
     * @param {string} containerId - The ID of the HTML element where the form will be rendered.
     * @param {Object} formSchema - The schema defining the form fields and validation.
     * @returns {HTMLFormElement | null} The created HTML form element, or null if container not found.
     */
    create(containerId, formSchema) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Form container with ID '${containerId}' not found.`);
            return null;
        }

        const formElement = document.createElement('form');
        formElement.id = formSchema.id || `form_${Date.now()}`;
        formElement.className = `dynamic-form ${formSchema.className || ''}`;
        formElement.setAttribute('novalidate', ''); // Disable native browser validation

        formSchema.fields.forEach(fieldConfig => {
            const formGroup = this._createFormField(fieldConfig);
            if (formGroup) {
                formElement.appendChild(formGroup);
            }
        });

        // Add a submit button if not explicitly handled in schema
        if (!formSchema.hideSubmitButton) {
            const submitBtn = document.createElement('button');
            submitBtn.type = 'submit';
            submitBtn.className = 'btn btn-primary form-submit-btn';
            submitBtn.textContent = formSchema.submitText || 'Submit';
            formElement.appendChild(submitBtn);
        }

        container.appendChild(formElement);
        this.forms.set(formElement.id, formElement);
        this.formValidationMap.set(formElement.id, formSchema.validation || {});

        this._setupFormEventListeners(formElement.id, formSchema);

        return formElement;
    }

    /**
     * Private: Creates a single form field based on configuration.
     * @param {Object} fieldConfig
     * @returns {HTMLElement|null} The form group element.
     * @private
     */
    _createFormField(fieldConfig) {
        const wrapper = document.createElement('div');
        wrapper.className = `form-group ${fieldConfig.className || ''}`;
        if (fieldConfig.fullWidth) wrapper.classList.add('full-width');

        // Label
        if (fieldConfig.label) {
            const label = document.createElement('label');
            label.setAttribute('for', fieldConfig.name);
            label.textContent = fieldConfig.label;
            if (fieldConfig.required) {
                label.innerHTML += ' <span class="required">*</span>';
            }
            wrapper.appendChild(label);
        }

        // Input element (input, textarea, select)
        let inputElement;
        switch (fieldConfig.type) {
            case 'textarea':
                inputElement = document.createElement('textarea');
                inputElement.rows = fieldConfig.rows || 3;
                break;
            case 'select':
                inputElement = document.createElement('select');
                if (fieldConfig.placeholder) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = fieldConfig.placeholder;
                    option.disabled = true;
                    option.selected = true;
                    inputElement.appendChild(option);
                }
                fieldConfig.options?.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label || opt.value;
                    inputElement.appendChild(option);
                });
                break;
            case 'checkbox':
                // Special handling for checkbox as it's often label-wrapped
                const checkboxWrapper = document.createElement('div');
                checkboxWrapper.className = 'checkbox-wrapper';
                inputElement = document.createElement('input');
                inputElement.type = 'checkbox';
                if (fieldConfig.checked) inputElement.checked = true;
                checkboxWrapper.appendChild(inputElement);
                const checkboxLabel = document.createElement('label');
                checkboxLabel.setAttribute('for', fieldConfig.name);
                checkboxLabel.textContent = fieldConfig.checkboxLabel || fieldConfig.label;
                checkboxWrapper.appendChild(checkboxLabel);
                wrapper.appendChild(checkboxWrapper); // Append wrapper directly, not inputElement
                break;
            default:
                inputElement = document.createElement('input');
                inputElement.type = fieldConfig.type || 'text';
        }

        if (inputElement && fieldConfig.type !== 'checkbox') { // Checkbox handled above
            inputElement.id = fieldConfig.name;
            inputElement.name = fieldConfig.name;
            if (fieldConfig.value !== undefined) inputElement.value = fieldConfig.value;
            if (fieldConfig.placeholder) inputElement.placeholder = fieldConfig.placeholder;
            if (fieldConfig.required) inputElement.required = true;
            if (fieldConfig.readOnly) inputElement.readOnly = true;
            if (fieldConfig.disabled) inputElement.disabled = true;
            wrapper.appendChild(inputElement);
        }

        // Help text
        if (fieldConfig.helpText) {
            const help = document.createElement('div');
            help.className = 'field-help-text';
            help.textContent = fieldConfig.helpText;
            wrapper.appendChild(help);
        }

        // Error message container
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error-message'; // Style this class
        errorDiv.style.display = 'none';
        wrapper.appendChild(errorDiv);

        return wrapper;
    }

    /**
     * Private: Sets up event listeners for form validation and submission.
     * @param {string} formId
     * @param {Object} formSchema
     * @private
     */
    _setupFormEventListeners(formId, formSchema) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Real-time validation
        form.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('input', DataUtils.debounce(() => this.validateField(formId, input.name), UI_CONFIG.FORM.VALIDATION_DELAY));
            input.addEventListener('blur', () => this.validateField(formId, input.name));
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const validationResult = this.validateForm(formId);
            if (validationResult.isValid) {
                if (formSchema.onSubmit) {
                    // Assuming onSubmit is an async function
                    await formSchema.onSubmit(this.getFormData(formId));
                }
            } else {
                UIHelpers.warning('Please correct the errors in the form.');
            }
        });
    }

    /**
     * Gets all current data from a form.
     * @param {string} formId
     * @returns {Object} Form data.
     */
    getFormData(formId) {
        const form = this.forms.get(formId);
        if (!form) return {};
        const formData = {};
        const elements = form.elements;
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

    /**
     * Sets form data.
     * @param {string} formId
     * @param {Object} data
     */
    setFormData(formId, data) {
        const form = this.forms.get(formId);
        if (!form) return;
        Object.keys(data).forEach(key => {
            const element = form.elements[key];
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = data[key];
                } else if (element.type === 'radio') {
                    const radioBtn = form.querySelector(`input[name="${key}"][value="${data[key]}"]`);
                    if (radioBtn) radioBtn.checked = true;
                } else {
                    element.value = data[key];
                }
            }
        });
    }

    /**
     * Validates a specific field in a form.
     * @param {string} formId
     * @param {string} fieldName
     * @returns {Object} Validation result { isValid: boolean, message: string }.
     */
    validateField(formId, fieldName) {
        const form = this.forms.get(formId);
        if (!form) return { isValid: false, message: 'Form not found.' };

        const fieldElement = form.elements[fieldName];
        if (!fieldElement) return { isValid: true }; // Field not found in schema

        const fieldConfig = this.formValidationMap.get(formId)?.[fieldName] || {};
        const value = fieldElement.value;

        // Use global sanitizer for validation
        const validationResult = window.sanitizer.validate(value, fieldConfig.type || 'text', fieldConfig.required, fieldConfig.options);

        const formGroup = fieldElement.closest('.form-group');
        const errorDiv = formGroup?.querySelector('.field-error-message');

        if (validationResult.valid) {
            formGroup?.classList.remove('has-error');
            fieldElement.classList.remove('error');
            fieldElement.classList.add('success');
            if (errorDiv) errorDiv.style.display = 'none';
        } else {
            formGroup?.classList.add('has-error');
            fieldElement.classList.add('error');
            fieldElement.classList.remove('success');
            if (errorDiv) {
                errorDiv.textContent = validationResult.message;
                errorDiv.style.display = 'block';
            }
        }
        return validationResult;
    }

    /**
     * Validates an entire form.
     * @param {string} formId
     * @returns {Object} Overall validation result { isValid: boolean, errors: Object }.
     */
    validateForm(formId) {
        const form = this.forms.get(formId);
        if (!form) return { isValid: false, errors: { _form: 'Form not found.' } };

        const errors = {};
        let overallIsValid = true;

        const fieldElements = form.querySelectorAll('input, select, textarea');
        fieldElements.forEach(fieldElement => {
            const fieldName = fieldElement.name;
            const validationResult = this.validateField(formId, fieldName);
            if (!validationResult.isValid) {
                errors[fieldName] = validationResult.message;
                overallIsValid = false;
            }
        });

        return { isValid: overallIsValid, errors: errors };
    }
}


// Base UIHelpers class (needs to be defined before EnhancedUIHelpers extends it)
class UIHelpers {
    // Static methods for simple common tasks, or as a base for EnhancedUIHelpers
    static _sanitize(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
}


// Enhanced UIHelpers that integrates with the new component managers
class EnhancedUIHelpers extends UIHelpers {
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
        return window.toastManager.show(message, 'error', { ...options, duration: options.duration || 6000 });
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
// GLOBAL INSTANCES AND EXPORTS
// ===================================

// Create global instances
// These instances are the singletons that other scripts (like auth-guard.js, script.js) will reference.
window.modalManager = new ModalManager();
window.toastManager = new ToastManager();
window.loadingManager = new LoadingManager();
window.ConfirmationManager = ConfirmationManager; // Static class, but assign for consistency
window.formBuilder = new FormBuilder();

// Export the EnhancedUIHelpers as the main UIHelpers global
window.UIHelpers = EnhancedUIHelpers;

console.log('✅ UI Components (Modal, Toast, Loading, Confirm, Form) Loaded and Initialized');

// The UIHelpers.initManagers() in auth-guard.js should no longer be strictly necessary
// as window.modalManager etc. are now assigned immediately, but keeping it doesn't hurt.