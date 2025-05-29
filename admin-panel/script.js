// ===================================
// ENHANCED CORE SCRIPT WITH NEW FEATURES
// File: script.js
// Location: /admin-panel/script.js
// Purpose: Enhanced core functionality with professional features
// ===================================

/**
 * Main CRM Application Class
 * Manages overall application state, routing, and integration of modules.
 */
class CRMApplication {
    constructor() {
        /** @type {Map<string, any>} */
        this.state = new Map();
        this.initialized = false;

        /** @type {boolean} */
        this.isLoading = false;

        // Global data stores (will ideally be managed through data services)
        /** @type {Array<Object>} */
        this.allLeads = [];
        /** @type {Array<Object>} */
        this.allUsers = [];
        /** @type {Array<Object>} */
        this.allMasters = [];

        /** @type {string | null} */
        this.selectedMasterId = null;
        /** @type {string | null} */
        this.selectedUserId = null;
        /** @type {string} */
        this.currentView = 'overview'; // Default view
        /** @type {Array<{type: string, id: string | null}>} */
        this.currentViewStack = [];

        // Managers (will be initialized after dependencies are ready)
        /** @type {AdminManager | null} */
        this.adminManager = null;
        /** @type {ActivityLogger | null} */
        this.activityLogger = null;

        // Bind methods
        this.init = this.init.bind(this);
        this.handleLogin = this.handleLogin.bind(this);
        this.showSection = this.showSection.bind(this);
        this.loadDashboardData = this.loadDashboardData.bind(this);
        this.loadOverviewStats = this.loadOverviewStats.bind(this);
        this.loadRecentActivity = this.loadRecentActivity.bind(this);
        this.loadMastersView = this.loadMastersView.bind(this);
        this.loadMastersData = this.loadMastersData.bind(this);
        this.selectMaster = this.selectMaster.bind(this);
        this.loadMasterTeam = this.loadMasterTeam.bind(this);
        this.selectUser = this.selectUser.bind(this);
        this.loadUserLeads = this.loadUserLeads.bind(this);
        this.loadUserLeadsDirectly = this.loadUserLeadsDirectly.bind(this);
        this.loadUserLeadsDirectData = this.loadUserLeadsDirectData.bind(this);
        this.viewLead = this.viewLead.bind(this);
        this.editLead = this.editLead.bind(this);
        this.deleteLead = this.deleteLead.bind(this);
        this.showLeadModal = this.showLeadModal.bind(this);
        this.saveLeadChanges = this.saveLeadChanges.bind(this);
        this.deleteLeadFromDatabase = this.deleteLeadFromDatabase.bind(this);
        this.searchMasters = this.searchMasters.bind(this);
        this.filterUserLeads = this.filterUserLeads.bind(this);
        this.filterUserLeadsDirectly = this.filterUserLeadsDirectly.bind(this);
        this.setLoginLoading = this.setLoginLoading.bind(this);
        // Methods for UI interaction that might be passed to UIHelpers.showModal
        this.closeLeadModal = this.closeLeadModal.bind(this);
        this.validateLeadField = this.validateLeadField.bind(this);
        this.setupLeadFormValidation = this.setupLeadFormValidation.bind(this);

        this.loginBtn = document.getElementById('login-btn');
        this.loadingScreen = document.getElementById('loading-screen');
        this.loginPage = document.getElementById('login-page');
        this.dashboardPage = document.getElementById('dashboard-page');
        this.loginForm = document.getElementById('login-form');
    }

    /**
     * Initializes the CRM application, waits for all dependencies.
     * @returns {Promise<void>}
     */
    async init() {
        console.log('🚀 CRM Application Initializing...');
        UIHelpers.showLoading('Initializing CRM...'); // Show global loading

        try {
            // Wait for all external scripts and their global instances to be ready
            await this.waitForDependencies();
            console.log('✅ All external dependencies loaded.');

            // Initialize core services after dependencies are ready
            // authGuard.init() handles firebase.auth() and user data loading
            await authGuard.init();
            console.log('✅ AuthGuard initialized.');

            // Initialize AdminManager and ActivityLogger instances
            // They need firebaseService to be ready, which waitForDependencies ensures.
            this.adminManager = new AdminManager();
            this.adminManager.init(window.firebaseService); // Pass the shared service
            console.log('✅ AdminManager initialized.');

            // activityLogger is instantiated globally in its own file and sets window.activityLogger.
            // We just need to ensure it's available here.
            this.activityLogger = window.activityLogger;
            if (!this.activityLogger) {
                 console.error('ActivityLogger global instance not found!');
                 // Fallback if ActivityLogger instantiation in its file failed for some reason
                 // This shouldn't happen if activity-logger.js executed correctly.
            } else {
                console.log('✅ ActivityLogger available.');
            }


            this.setupEventListeners();

            if (authGuard.isAuthenticated()) {
                console.log('✅ User authenticated, loading dashboard');
                authGuard.showDashboard();
                await this.loadDashboardData();
                UIHelpers.showToast('Welcome back! Login successful.', 'success');
            } else {
                console.log('❌ User not authenticated, showing login page');
                authGuard.redirectToLogin();
            }

        } catch (error) {
            console.error('❌ CRM Application initialization error:', error);
            UIHelpers.error('Failed to initialize application: ' + error.message);
            // Ensure UI is reverted to login state on critical init error
            authGuard.redirectToLogin();
        } finally {
            UIHelpers.hideLoading(); // Hide global loading
            this.initialized = true;
        }
    }

    /**
     * Waits for all necessary global dependencies (Firebase, AuthGuard, UI components) to be ready.
     * @returns {Promise<void>}
     */
    async waitForDependencies() {
        return new Promise(resolve => {
            const checkDeps = () => {
                // Check if all essential global objects are available and initialized
                if (window.firebaseService?.isInitialized &&
                    window.authGuard && // Check if authGuard object exists
                    window.UIHelpers && // Check if UIHelpers class exists
                    window.UIHelpers.modalManager && // Check if UIHelpers' internal managers are initialized
                    window.UIHelpers.toastManager &&
                    window.UIHelpers.loadingManager &&
                    window.UIHelpers.formBuilder &&
                    window.sanitizer && // Check if sanitizer object exists
                    window.FormValidation && // Check if FormValidation class exists
                    window.SecurityUtils && // Check if SecurityUtils object exists
                    window.logActivity // Check if global logActivity function exists (from firebase-utils or activity-logger)
                ) {
                    resolve();
                } else {
                    setTimeout(checkDeps, 100); // Re-check after a short delay
                }
            };
            checkDeps();
        });
    }

    /**
     * Sets up all global event listeners for the application.
     */
    setupEventListeners() {
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', this.handleLogin);
        }

        // Navigation with security logging
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                console.log('📋 Navigation clicked:', section);

                // Log navigation for security via global logActivity function
                await logActivity('navigate_to_section', { section: section });

                await this.showSection(section);

                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                const confirmed = await UIHelpers.confirm({
                    title: 'Confirm Logout',
                    message: 'Are you sure you want to logout? Any unsaved changes will be lost.',
                    confirmText: 'Logout',
                    cancelText: 'Cancel',
                    type: 'warning'
                });

                if (confirmed) {
                    await authGuard.signOut();
                }
            });
        }

        // Password toggle
        const togglePassword = document.getElementById('toggle-password');
        const passwordInput = document.getElementById('password');
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);

                const icon = this.querySelector('svg');
                if (type === 'text') {
                    icon.innerHTML = `
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                    `;
                } else {
                    icon.innerHTML = `
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    `;
                }
            });
        }
    }

    /**
     * Handles the login process, including validation and security checks.
     * @param {Event} e - The submit event from the login form.
     */
    async handleLogin(e) {
        e.preventDefault();

        if (this.isLoading) return;

        // Check for account lockout (using localStorage as temporary lockout mechanism)
        const lockedUntil = localStorage.getItem('account_locked_until');
        if (lockedUntil && Date.now() < parseInt(lockedUntil)) {
            const remainingTime = Math.ceil((parseInt(lockedUntil) - Date.now()) / 60000);
            UIHelpers.error(`Account locked. Try again in ${remainingTime} minutes.`, { duration: 8000 });
            return;
        }

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';

        if (!email || !password) {
            UIHelpers.warning('Please fill in all fields');
            return;
        }

        if (!FormValidation.validateEmail(email)) {
            UIHelpers.error('Please enter a valid email address');
            return;
        }

        if (password.length < 6) {
            UIHelpers.error('Password must be at least 6 characters');
            return;
        }

        this.setLoginLoading(true);
        this.hideErrorMessage(); // Clear any previous error messages

        try {
            console.log('🔐 Attempting login for:', email);
            // Use global logActivity function
            await logActivity('login_attempt', {
                email: email,
                userAgent: navigator.userAgent,
                ipAddress: await authGuard.getClientIP()
            });

            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            console.log('✅ Login successful:', userCredential.user.email);

            // Reset failed attempts on successful login
            authGuard.failedAttempts = 0;
            localStorage.removeItem('account_locked_until');

            // Wait for authGuard to fully process the authenticated user
            await new Promise(resolve => setTimeout(resolve, 500));

            if (authGuard.isAuthenticated()) {
                authGuard.showDashboard();
                await this.loadDashboardData();
                UIHelpers.showToast('Welcome back! Login successful.', 'success');
            }

        } catch (error) {
            console.error('❌ Login error:', error);
            await authGuard.handleAuthError(error); // Let authGuard handle error logging and lockout

            let errorMsg = 'Login failed. Please try again.';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMsg = 'No account found with this email address.';
                    break;
                case 'auth/wrong-password':
                    errorMsg = 'Incorrect password. Please try again.';
                    break;
                case 'auth/invalid-email':
                    errorMsg = 'Please enter a valid email address.';
                    break;
                case 'auth/too-many-requests':
                    errorMsg = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/network-request-failed':
                    errorMsg = 'Network error. Please check your connection.';
                    break;
                case 'auth/user-disabled':
                    errorMsg = 'This account has been disabled.';
                    break;
                default:
                    errorMsg = error.message || 'An unexpected error occurred.';
            }
            this.showErrorMessage(errorMsg); // Show error message in UI
            UIHelpers.error(errorMsg, { duration: 6000 }); // Show as toast
        } finally {
            this.setLoginLoading(false);
        }
    }

    /**
     * Toggles loading state for the login button.
     * @param {boolean} loading - True to show loading, false to hide.
     */
    setLoginLoading(loading) {
        this.isLoading = loading;
        const btnText = this.loginBtn?.querySelector('.btn-text');
        const btnSpinner = this.loginBtn?.querySelector('.btn-spinner');
        const errorDiv = document.getElementById('error-message');

        if (this.loginBtn) {
            this.loginBtn.disabled = loading;
            this.loginBtn.classList.toggle('loading', loading);

            if (loading) {
                if (btnText) btnText.style.display = 'none';
                if (btnSpinner) btnSpinner.style.display = 'block';
                if (errorDiv) errorDiv.style.display = 'none'; // Hide error when loading starts
            } else {
                if (btnText) btnText.style.display = 'block';
                if (btnSpinner) btnSpinner.style.display = 'none';
            }
        }
    }

    /**
     * Shows an error message in the login form.
     * @param {string} message - The error message to display.
     */
    showErrorMessage(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.innerHTML = `<strong>Error:</strong> ${sanitizer.sanitize(message, 'text')}`;
            errorDiv.style.display = 'block';
        }
    }

    /**
     * Hides the error message in the login form.
     */
    hideErrorMessage() {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    /**
     * Shows a specific content section in the dashboard.
     * @param {string} sectionName - The name of the section to show (e.g., 'overview', 'leads').
     */
    async showSection(sectionName) {
        console.log('📋 Showing section:', sectionName);
        UIHelpers.showLoading('Loading section...');

        try {
            const contentSections = document.querySelectorAll('.content-section');
            contentSections.forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';
            });

            const targetSection = document.getElementById(`${sectionName}-section`);
            if (targetSection) {
                targetSection.classList.add('active');
                targetSection.style.display = 'block';

                // Reset navigation state for new top-level section
                this.currentViewStack = [];
                this.selectedMasterId = null;
                this.selectedUserId = null;
                this.currentView = sectionName;

                // Load section-specific content
                switch (sectionName) {
                    case 'overview':
                        await this.loadDashboardData();
                        break;
                    case 'leads':
                        if (authGuard.hasRole('user')) {
                            await this.loadUserLeadsDirectly();
                        } else {
                            this.currentView = 'masters'; // Default for non-user roles in leads section
                            await this.loadMastersView();
                        }
                        break;
                    case 'users':
                        // Use the instantiated adminManager
                        if (this.adminManager && authGuard.hasRole('admin')) {
                            await this.adminManager.loadMasterManagementPanel();
                        } else {
                            UIHelpers.error('Access denied to User Management.');
                            targetSection.innerHTML = `<div class="coming-soon"><h3>Access Denied</h3><p>You do not have permission to view this section.</p></div>`;
                        }
                        break;
                    case 'reports':
                        // Use the instantiated activityLogger
                        if (this.activityLogger) {
                            await this.activityLogger.loadActivityDashboard();
                        } else {
                            targetSection.innerHTML = `<div class="coming-soon"><h3>Reports Coming Soon</h3><p>Reports and Analytics module is under development.</p></div>`;
                        }
                        break;
                    case 'team':
                        // Assuming this is handled by a separate part of adminManager or a new TeamManager
                        // For now, keep as placeholder
                        await this.loadTeamManagementSection();
                        break;
                    default:
                        console.log('ℹ️ Section not implemented:', sectionName);
                        targetSection.innerHTML = `<div class="coming-soon"><h3>Coming Soon!</h3><p>This section is under active development. Stay tuned for exciting updates!</p></div>`;
                }
            } else {
                console.error('❌ Section not found:', `${sectionName}-section`);
                UIHelpers.error('Requested section not found.');
            }
        } catch (error) {
            console.error('❌ Error showing section:', error);
            UIHelpers.error('Failed to load section: ' + error.message);
        } finally {
            UIHelpers.hideLoading();
        }
    }

    /**
     * Loads all data for the main dashboard overview.
     */
    async loadDashboardData() {
        if (!authGuard.isAuthenticated()) return;

        console.log('📊 Loading dashboard data...');
        UIHelpers.showLoading('Loading dashboard data...');

        try {
            await Promise.all([
                this.loadOverviewStats(),
                this.loadRecentActivity()
            ]);
            console.log('✅ Dashboard data loaded');
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
            UIHelpers.error('Failed to load dashboard data: ' + error.message);
        } finally {
            UIHelpers.hideLoading();
        }
    }

    /**
     * Loads and updates the main overview statistics (total leads, active leads, etc.).
     */
    async loadOverviewStats() {
        console.log('📈 Loading overview stats...');
        try {
            const currentUserId = authGuard.getCurrentUser()?.uid;
            const currentUserRole = authGuard.getCurrentRole();

            let leads = [];
            // Access Firestore via firebaseService.db
            if (currentUserRole === 'admin') {
                leads = await firebaseService.db.get(DB_CONFIG.COLLECTIONS.LEADS);
            } else if (currentUserRole === 'master') {
                const teamMembers = await firebaseService.ops.getTeamMembers(currentUserId);
                const teamMemberIds = teamMembers.map(m => m.id);
                teamMemberIds.push(currentUserId); // Include master's own leads
                leads = await firebaseService.db.get(DB_CONFIG.COLLECTIONS.LEADS, null, {
                    filters: [{ field: 'assignedTo', operator: 'in', value: teamMemberIds }]
                });
            } else { // user
                leads = await firebaseService.db.get(DB_CONFIG.COLLECTIONS.LEADS, null, {
                    filters: [{ field: 'assignedTo', operator: '==', value: currentUserId }]
                });
            }

            this.allLeads = leads; // Update global/class leads array

            const totalLeads = leads.length;
            const activeLeads = leads.filter(lead =>
                !['closed', 'dropped', 'notinterested'].includes(lead.status?.toLowerCase())
            ).length;
            const pendingFollowups = leads.filter(lead =>
                lead.status?.toLowerCase() === 'followup' || lead.status?.toLowerCase() === 'followUp'
            ).length;
            const overdueTasks = leads.filter(lead => {
                if (!lead.followupDate) return false;
                const followupDate = lead.followupDate.toDate ? lead.followupDate.toDate() : new Date(lead.followupDate);
                return followupDate < new Date() && !['closed', 'dropped', 'notinterested'].includes(lead.status?.toLowerCase());
            }).length;

            // Update UI elements
            document.getElementById('total-leads').textContent = totalLeads.toString();
            document.getElementById('active-leads').textContent = activeLeads.toString();
            document.getElementById('pending-followups').textContent = pendingFollowups.toString();
            document.getElementById('overdue-tasks').textContent = overdueTasks.toString();

            // Placeholder for trend calculation (needs more historical data)
            this.updateTrendIndicator('total-leads-trend', 'up', 'Active System');
            this.updateTrendIndicator('active-leads-trend', 'up', 'High Activity');
            this.updateTrendIndicator('followups-trend', 'neutral', 'Steady');
            this.updateTrendIndicator('overdue-trend', 'down', 'Needs Attention');

            // Update leads table (showing first 10 recent leads)
            this.updateLeadsTable(leads.slice(0, 10));

        } catch (error) {
            console.error('❌ Error loading overview stats:', error);
            UIHelpers.error('Failed to load overview statistics.');
            // Fallback to error state for metrics
            document.getElementById('total-leads').textContent = '-';
            document.getElementById('active-leads').textContent = '-';
            document.getElementById('pending-followups').textContent = '-';
            document.getElementById('overdue-tasks').textContent = '-';
            document.getElementById('leads-table-body').innerHTML = '<tr><td colspan="6" class="loading-row">Error loading leads data.</td></tr>';
        }
    }

    /**
     * Updates the trend indicator for a metric card.
     * @param {string} elementId - The ID of the trend element.
     * @param {'up' | 'down' | 'neutral'} trendType - The type of trend.
     * @param {string} text - The descriptive text for the trend.
     */
    updateTrendIndicator(elementId, trendType, text) {
        const trendElement = document.getElementById(elementId);
        if (trendElement) {
            trendElement.className = `metric-trend trend-${trendType}`;
            let iconSvg = '';
            if (trendType === 'up') {
                iconSvg = `<polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>`;
            } else if (trendType === 'down') {
                iconSvg = `<polyline points="1,18 8.5,10.5 13.5,15.5 23,6"/>`;
            } else { // neutral
                iconSvg = `<circle cx="12" cy="12" r="10"/>`;
            }
            trendElement.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${iconSvg}</svg> ${text}`;
        }
    }

    /**
     * Updates the recent leads table in the dashboard.
     * @param {Array<Object>} leads - Array of lead objects to display.
     */
    updateLeadsTable(leads) {
        const tableBody = document.getElementById('leads-table-body');
        if (!tableBody) return;

        if (leads.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="loading-row">No recent leads found</td></tr>';
            return;
        }

        tableBody.innerHTML = leads.map(lead => `
            <tr class="fade-in">
                <td><strong>${sanitizer.sanitize(lead.name || 'Unknown', 'text')}</strong></td>
                <td>${sanitizer.sanitize(lead.phone || 'No phone', 'text')}</td>
                <td><span class="status-badge enhanced status-${(lead.status || 'newlead').toLowerCase()}">${this.getStatusText(lead.status)}</span></td>
                <td>${sanitizer.sanitize(lead.source || 'Unknown', 'text')}</td>
                <td>${this.formatDate(lead.createdAt)}</td>
                <td>
                    <button class="action-btn view" onclick="crmApp.viewLead('${lead.id}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View
                    </button>
                    <button class="action-btn edit" onclick="crmApp.editLead('${lead.id}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Loads and updates the recent activity feed in the dashboard.
     */
    async loadRecentActivity() {
        console.log('📋 Loading recent activity...');
        try {
            const currentUserId = authGuard.getCurrentUser()?.uid;
            const currentUserRole = authGuard.getCurrentRole();

            let activities = [];
            // Access Cloud Functions via firebaseService.cf
            if (firebaseService.cf.isInitialized) {
                const result = await firebaseService.cf.call('getRecentActivity', { limit: 5 });
                activities = result.activities;
            } else {
                // Fallback to direct Firestore read via firebaseService.db
                let queryOptions = {
                    orderBy: [{ field: 'timestamp', direction: 'desc' }],
                    limit: 5
                };

                if (currentUserRole === 'user') {
                    queryOptions.filters = [{ field: 'userId', operator: '==', value: currentUserId }];
                } else if (currentUserRole === 'master') {
                    const teamUserIds = await firebaseService.ops.getTeamMembers(currentUserId);
                    teamUserIds.push({ id: currentUserId }); // Include master's own activity
                    const teamIds = teamUserIds.map(m => m.id);
                    queryOptions.filters = [{ field: 'userId', operator: 'in', value: teamIds }];
                }
                // Admin sees all

                activities = await firebaseService.db.get(DB_CONFIG.COLLECTIONS.ACTIVITY_LOGS, null, queryOptions);
            }

            const activityList = document.getElementById('activity-list');
            if (!activityList) return;

            if (activities.length === 0) {
                activityList.innerHTML = `
                    <div class="premium-activity-item">
                        <div class="activity-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="16" x2="12" y2="12"/>
                                <line x1="12" y1="8" x2="12.01" y2="8"/>
                            </svg>
                        </div>
                        <div class="activity-content">
                            <p>No recent activity</p>
                            <div class="activity-time">Start by adding some leads or users</div>
                        </div>
                    </div>
                `;
                return;
            }

            activityList.innerHTML = activities.map(activity => `
                <div class="premium-activity-item">
                    <div class="activity-icon">
                        ${this.getActivityIcon(activity.action)}
                    </div>
                    <div class="activity-content">
                        <p>${this.getActivityText(activity.action, activity.details)}</p>
                        <div class="activity-time">${this.formatTimeAgo(new Date(activity.timestamp))}</div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('❌ Error loading recent activity:', error);
            UIHelpers.error('Failed to load recent activity.');
            document.getElementById('activity-list').innerHTML = `
                <div class="premium-activity-item">
                    <div class="activity-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </div>
                    <div class="activity-content">
                        <p>Error loading activity data</p>
                        <div class="activity-time">Please refresh the page</div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Provides an SVG icon based on the activity type.
     * @param {string} action - The activity action.
     * @returns {string} SVG icon string.
     */
    getActivityIcon(action) {
        const icons = {
            'login_success': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
            'create_lead': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
            'update_lead': '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
            'delete_lead': '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6z"/><path d="M10 11v6"/><path d="M14 11v6"/>',
            'create_user': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
            'logout': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
            'navigate_to_section': '<path d="M9.5 3L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.5 3z"/>'
        };

        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[action] || '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'}</svg>`;
    }

    /**
     * Provides a descriptive text for the activity.
     * @param {string} action - The activity action.
     * @param {Object} details - Additional details for the activity.
     * @returns {string} Descriptive text.
     */
    getActivityText(action, details) {
        let text = '';
        switch (action) {
            case 'login_success':
                text = `Logged in successfully`;
                break;
            case 'create_lead':
                text = `New lead created: <strong>${sanitizer.sanitize(details.leadName || 'Unknown', 'text')}</strong>`;
                break;
            case 'update_lead':
                text = `Lead updated: <strong>${sanitizer.sanitize(details.leadId || 'Unknown', 'text')}</strong>`;
                if (details.newStatus) {
                    text += ` to <span class="status-badge enhanced status-${details.newStatus.toLowerCase()}">${this.getStatusText(details.newStatus)}</span>`;
                }
                break;
            case 'delete_lead':
                text = `Lead deleted: <strong>${sanitizer.sanitize(details.leadName || 'Unknown', 'text')}</strong>`;
                break;
            case 'create_user':
                text = `New user created: <strong>${sanitizer.sanitize(details.newUserEmail || 'Unknown', 'text')}</strong> (${sanitizer.sanitize(details.newUserRole || 'user', 'text')})`;
                break;
            case 'logout':
                text = `Logged out`;
                break;
            case 'navigate_to_section':
                text = `Mapsd to <strong>${sanitizer.sanitize(details.section || 'Unknown', 'text')}</strong> section`;
                break;
            default:
                text = sanitizer.sanitize(action.replace(/_/g, ' ') || 'Unknown activity', 'text');
                break;
        }
        return text;
    }

    /**
     * Loads the view for managing masters and their teams.
     */
    async loadMastersView() {
        console.log('👑 Loading masters view...');
        UIHelpers.showLoading('Loading Masters...');

        const leadsSection = document.getElementById('leads-section');
        if (!leadsSection) {
            UIHelpers.error('Leads section not found for Masters View.');
            return;
        }

        // Dynamically create the Masters Overview Panel structure
        leadsSection.innerHTML = `
            <div class="master-management-panel">
                <div class="panel-header">
                    <div class="panel-title">
                        Masters & Teams Overview
                    </div>
                    <div class="panel-controls">
                        <div class="enhanced-search-box">
                            <input type="text" id="masters-search" placeholder="Search masters..." onkeyup="crmApp.searchMasters(this.value)">
                            <div class="search-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="11" cy="11" r="8"/>
                                    <path d="M21 21l-4.35-4.35"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="enhanced-stats-grid">
                    <div class="enhanced-stat-card">
                        <div class="enhanced-stat-header">
                            <div class="enhanced-stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                        </div>
                        <div class="enhanced-stat-number" id="masters-count">0</div>
                        <div class="enhanced-stat-label">Total Masters</div>
                    </div>
                </div>

                <div class="enhanced-master-grid" id="masters-grid">
                    <div class="loading-card">Loading masters...</div>
                </div>
            </div>
        `;

        await this.loadMastersData();
        UIHelpers.hideLoading();
    }

    /**
     * Fetches and displays data for the Masters overview.
     */
    async loadMastersData() {
        try {
            const mastersContainer = document.getElementById('enhanced-masters-container');
            if (!mastersContainer) return;

            UIHelpers.showLoading('Fetching master data...', mastersContainer);

            // Using firebaseService.db to get data
            const users = await firebaseService.db.get(DB_CONFIG.COLLECTIONS.USERS);
            const masters = users.filter(user => user.role === 'master');
            this.allMasters = masters;
            this.allUsers = users; // Keep all users loaded for lookups

            document.getElementById('masters-count').textContent = masters.length.toString();

            if (masters.length === 0) {
                mastersContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                        </div>
                        <h3>No Masters Found</h3>
                        <p>There are no masters in the system yet.</p>
                    </div>
                `;
                return;
            }

            const allLeadsData = await firebaseService.db.get(DB_CONFIG.COLLECTIONS.LEADS);

            const mastersWithStats = masters.map(master => {
                const teamMembers = users.filter(user => user.linkedMaster === master.id);
                const teamMemberIds = teamMembers.map(member => member.id);
                teamMemberIds.push(master.id); // Include master's own leads if assigned to themselves

                const masterLeads = allLeadsData.filter(lead =>
                    teamMemberIds.includes(lead.assignedTo) ||
                    teamMemberIds.includes(lead.createdBy)
                );

                const activeLeads = masterLeads.filter(lead =>
                    !['closed', 'dropped', 'notinterested'].includes(lead.status?.toLowerCase())
                ).length;

                const pendingFollowups = masterLeads.filter(lead =>
                    lead.status?.toLowerCase() === 'followup'
                ).length;

                return {
                    ...master,
                    teamCount: teamMembers.length,
                    teamMembers: teamMembers,
                    totalLeads: masterLeads.length,
                    activeLeads: activeLeads,
                    pendingFollowups: pendingFollowups,
                    lastActive: master.lastLogin ? new Date(master.lastLogin.seconds * 1000) : null
                };
            });

            mastersContainer.innerHTML = mastersWithStats.map(master =>
                this.renderMasterCard(master)
            ).join('');

        } catch (error) {
            console.error('❌ Error loading masters:', error);
            UIHelpers.error('Failed to load masters data.');
            const mastersContainer = document.getElementById('enhanced-masters-container');
            if (mastersContainer) {
                mastersContainer.innerHTML = '<div class="loading-card">Error loading masters</div>';
            }
        } finally {
            UIHelpers.hideLoading(null); // Hide loading spinner for the container
        }
    }

    /**
     * Renders a single master card for the Masters overview.
     * @param {Object} master - Master data.
     * @returns {string} HTML string for the master card.
     * @private
     */
    renderMasterCard(master) {
        const statusClass = master.status === 'active' ? 'success' : 'danger';
        const lastActiveText = master.lastActive ?
            this.formatTimeAgo(master.lastActive) : 'Never logged in';

        return `
            <div class="enhanced-master-card" onclick="crmApp.selectMaster('${master.id}')">
                <div class="master-card-header">
                    <div class="enhanced-master-avatar">
                        ${(master.name || master.email || 'M').charAt(0).toUpperCase()}
                    </div>
                    <div class="master-card-info">
                        <h3>${sanitizer.sanitize(master.name || 'Unnamed Master', 'text')}</h3>
                        <p>${sanitizer.sanitize(master.email, 'email')}</p>
                        <div class="enhanced-master-badge">Master</div>
                    </div>
                </div>

                <div class="master-card-stats">
                    <div class="master-stat-item">
                        <div class="master-stat-number">${master.teamCount}</div>
                        <div class="master-stat-label">Team Size</div>
                    </div>
                    <div class="master-stat-item">
                        <div class="master-stat-number">${master.activeLeads}</div>
                        <div class="master-stat-label">Active Leads</div>
                    </div>
                    <div class="master-stat-item">
                        <div class="master-stat-number">${master.totalLeads}</div>
                        <div class="master-stat-label">Total Leads</div>
                    </div>
                    <div class="master-stat-item">
                        <div class="master-stat-number">${master.pendingFollowups}</div>
                        <div class="master-stat-label">Follow-ups</div>
                    </div>
                </div>

                <div class="master-card-meta">
                    <div class="meta-item">
                        <span class="enhanced-status-badge ${statusClass}">
                            ${master.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div class="meta-item">
                        <small>Last active: ${lastActiveText}</small>
                    </div>
                </div>

                <div class="master-card-footer">
                    <span class="view-team">Click to view team →</span>
                </div>
            </div>
        `;
    }

    /**
     * Handles selection of a master to view their team.
     * @param {string} masterId - ID of the selected master.
     */
    async selectMaster(masterId) {
        console.log('👤 Selecting master:', masterId);
        UIHelpers.showLoading('Loading master\'s team...');

        this.selectedMasterId = masterId;
        this.currentView = 'team_members';
        this.currentViewStack.push({ type: 'master', id: masterId });

        const master = this.allMasters.find(m => m.id === masterId);
        if (!master) {
            UIHelpers.error('Master not found.');
            UIHelpers.hideLoading();
            return;
        }

        await logActivity('view_master_team', { masterId: masterId });

        const leadsSection = document.getElementById('leads-section');
        if (!leadsSection) {
            UIHelpers.error('Leads section not found for Team View.');
            UIHelpers.hideLoading();
            return;
        }

        leadsSection.innerHTML = `
            <div class="master-management-panel">
                <div class="panel-header">
                    <div class="panel-title">
                        Team Members - ${sanitizer.sanitize(master.name || 'Unnamed Master', 'text')}
                    </div>
                    <div class="panel-controls">
                        <button class="enhanced-btn enhanced-btn-secondary" onclick="crmApp.loadMastersView()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 12H5m7-7l-7 7 7 7"/>
                            </svg>
                            Back to Masters
                        </button>
                    </div>
                </div>

                <div class="breadcrumb">
                    <span class="breadcrumb-item" onclick="crmApp.loadMastersView()">Masters</span>
                    <span class="breadcrumb-separator">→</span>
                    <span class="breadcrumb-item active">${sanitizer.sanitize(master.name || 'Master', 'text')}'s Team</span>
                </div>

                <div class="enhanced-master-grid" id="team-members-container">
                    <div class="loading-card">Loading team members...</div>
                </div>
            </div>
        `;

        await this.loadMasterTeam(masterId);
        UIHelpers.hideLoading();
    }

    /**
     * Loads and displays team members for a given master.
     * @param {string} masterId - ID of the master.
     */
    async loadMasterTeam(masterId) {
        try {
            const teamContainer = document.getElementById('team-members-container');
            if (!teamContainer) return;

            UIHelpers.showLoading('Fetching team members...', teamContainer);

            const teamMembers = this.allUsers.filter(user => user.linkedMaster === masterId);

            if (teamMembers.length === 0) {
                teamContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                            </svg>
                        </div>
                        <h3>No Team Members</h3>
                        <p>This master doesn't have any team members yet.</p>
                    </div>
                `;
                return;
            }

            const leadsSnapshot = await firebaseService.db.get(DB_CONFIG.COLLECTIONS.LEADS);

            const teamWithStats = teamMembers.map(user => {
                const userLeads = leadsSnapshot.filter(lead =>
                    lead.assignedTo === user.id || lead.createdBy === user.id
                );
                const activeLeads = userLeads.filter(lead =>
                    !['closed', 'dropped', 'notinterested'].includes(lead.status?.toLowerCase())
                ).length;

                return {
                    ...user,
                    leadsCount: userLeads.length,
                    activeLeads: activeLeads,
                    leads: userLeads
                };
            });

            teamContainer.innerHTML = teamWithStats.map(user => this.renderUserCard(user)).join('');

        } catch (error) {
            console.error('❌ Error loading master team:', error);
            UIHelpers.error('Failed to load team members.');
            const teamContainer = document.getElementById('team-members-container');
            if (teamContainer) {
                teamContainer.innerHTML = '<div class="loading-card">Error loading team.</div>';
            }
        } finally {
            UIHelpers.hideLoading(null);
        }
    }

    /**
     * Renders a single user card for team members.
     * @param {Object} user - User data.
     * @returns {string} HTML string for the user card.
     * @private
     */
    renderUserCard(user) {
        const statusClass = user.status === 'active' ? 'success' : 'danger';
        const lastActiveText = user.lastLogin ?
            this.formatTimeAgo(new Date(user.lastLogin.seconds * 1000)) : 'Never logged in';

        return `
            <div class="enhanced-master-card" onclick="crmApp.selectUser('${user.id}')">
                <div class="master-card-header">
                    <div class="enhanced-master-avatar" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                        ${(user.name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div class="master-card-info">
                        <h3>${sanitizer.sanitize(user.name || 'Unnamed User', 'text')}</h3>
                        <p>${sanitizer.sanitize(user.email, 'email')}</p>
                        <div class="enhanced-master-badge" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">User</div>
                    </div>
                </div>

                <div class="master-card-stats">
                    <div class="master-stat-item">
                        <div class="master-stat-number">${user.leadsCount}</div>
                        <div class="master-stat-label">Total Leads</div>
                    </div>
                    <div class="master-stat-item">
                        <div class="master-stat-number">${user.activeLeads}</div>
                        <div class="master-stat-label">Active Leads</div>
                    </div>
                </div>

                <div class="master-card-meta">
                    <div class="meta-item">
                        <span class="enhanced-status-badge ${statusClass}">
                            ${user.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div class="meta-item">
                        <small>Last active: ${lastActiveText}</small>
                    </div>
                </div>

                <div class="master-card-footer">
                    <span class="view-team">Click to view leads →</span>
                </div>
            </div>
        `;
    }

    /**
     * Handles selection of a user to view their leads.
     * @param {string} userId - ID of the selected user.
     */
    async selectUser(userId) {
        console.log('📋 Selecting user:', userId);
        UIHelpers.showLoading('Loading user\'s leads...');

        this.selectedUserId = userId;
        this.currentView = 'user_leads';
        this.currentViewStack.push({ type: 'user', id: userId });

        const user = this.allUsers.find(u => u.id === userId);
        const master = this.allMasters.find(m => m.id === this.selectedMasterId);

        if (!user) {
            UIHelpers.error('User not found.');
            UIHelpers.hideLoading();
            return;
        }

        await logActivity('view_user_leads', { userId: userId, masterId: this.selectedMasterId });

        const leadsSection = document.getElementById('leads-section');
        if (!leadsSection) {
            UIHelpers.error('Leads section not found for User Leads View.');
            UIHelpers.hideLoading();
            return;
        }

        leadsSection.innerHTML = `
            <div class="enhanced-data-table">
                <div class="enhanced-table-header">
                    <div class="enhanced-table-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        Leads - ${sanitizer.sanitize(user.name || 'Unnamed User', 'text')}
                    </div>
                    <div class="table-controls">
                        <div class="enhanced-search-box">
                            <input type="text" id="leads-search" placeholder="Search leads..." onkeyup="crmApp.filterUserLeads(this.value)">
                            <div class="search-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="11" cy="11" r="8"/>
                                    <path d="M21 21l-4.35-4.35"/>
                                </svg>
                            </div>
                        </div>
                        <button class="enhanced-btn enhanced-btn-secondary" onclick="crmApp.selectMaster('${this.selectedMasterId}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 12H5m7-7l-7 7 7 7"/>
                            </svg>
                            Back to Team
                        </button>
                        <button class="enhanced-btn enhanced-btn-primary" onclick="crmApp.selectUser('${userId}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23,4 23,10 17,10"/>
                                <polyline points="1,20 1,14 7,14"/>
                                <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10"/>
                                <path d="M3.51,15a9,9,0,0,0,14.85,3.36L23,14"/>
                            </svg>
                            Refresh
                        </button>
                    </div>
                </div>

                <div class="breadcrumb">
                    <span class="breadcrumb-item" onclick="crmApp.loadMastersView()">Masters</span>
                    <span class="breadcrumb-separator">→</span>
                    <span class="breadcrumb-item" onclick="crmApp.selectMaster('${this.selectedMasterId}')">${sanitizer.sanitize(master?.name || 'Master', 'text')}'s Team</span>
                    <span class="breadcrumb-separator">→</span>
                    <span class="breadcrumb-item active">${sanitizer.sanitize(user.name || 'User', 'text')}'s Leads</span>
                </div>

                <div class="enhanced-table-wrapper">
                    <table class="enhanced-table">
                        <thead>
                            <tr>
                                <th class="sortable" data-field="name">Name</th>
                                <th class="sortable" data-field="phone">Phone</th>
                                <th>Email</th>
                                <th class="sortable" data-field="status">Status</th>
                                <th class="sortable" data-field="source">Source</th>
                                <th class="sortable" data-field="created">Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="enhanced-user-leads-table-body">
                            <tr>
                                <td colspan="7" class="loading-row">Loading leads...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadUserLeads(userId);
        UIHelpers.hideLoading();
    }

    /**
     * Loads and displays leads for a specific user.
     * @param {string} userId - ID of the user.
     */
    async loadUserLeads(userId) {
        try {
            const tableBody = document.getElementById('enhanced-user-leads-table-body');
            if (!tableBody) return;

            UIHelpers.showLoading('Fetching user leads...', tableBody);

            // Using firebaseService.db to get leads
            const leads = await firebaseService.db.get(DB_CONFIG.COLLECTIONS.LEADS, null, {
                filters: [{ field: 'assignedTo', operator: '==', value: userId }],
                orderBy: [{ field: 'createdAt', direction: 'desc' }]
            });

            this.state.set('currentEnhancedUserLeads', leads); // Store for filtering

            if (leads.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">No leads found for this user</td></tr>';
                return;
            }

            tableBody.innerHTML = leads.map(lead => {
                const createdAt = lead.createdAt ? (lead.createdAt.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt.seconds * 1000)) : new Date(0);
                const formattedDate = this.formatDate(createdAt);

                return `
                    <tr data-lead-id="${lead.id}">
                        <td><strong>${sanitizer.sanitize(lead.name || 'Unnamed Lead', 'text')}</strong></td>
                        <td>${sanitizer.sanitize(lead.phone || 'No phone', 'text')}</td>
                        <td>${sanitizer.sanitize(lead.email || 'Not provided', 'email')}</td>
                        <td><span class="enhanced-status-badge ${(lead.status || 'newlead').toLowerCase()}">${this.getStatusText(lead.status)}</span></td>
                        <td>${sanitizer.sanitize(lead.source || 'Not specified', 'text')}</td>
                        <td>${formattedDate}</td>
                        <td>
                            <button class="enhanced-action-btn view" onclick="crmApp.viewLead('${lead.id}')">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                                View
                            </button>
                            <button class="enhanced-action-btn edit" onclick="crmApp.editLead('${lead.id}')">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                                Edit
                            </button>
                            <button class="enhanced-action-btn delete" onclick="crmApp.deleteLead('${lead.id}')">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3,6 5,6 21,6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                                Delete
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.error('❌ Error loading user leads:', error);
            UIHelpers.error('Failed to load user leads.');
            const tableBody = document.getElementById('enhanced-user-leads-table-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Error loading leads. Please refresh.</td></tr>';
            }
        } finally {
            UIHelpers.hideLoading(null);
        }
    }

    /**
     * Loads and displays leads directly for a regular user (non-admin/master).
     */
    async loadUserLeadsDirectly() {
        console.log('📋 Loading user leads directly...');
        UIHelpers.showLoading('Loading your leads...');

        const leadsSection = document.getElementById('leads-section');
        if (!leadsSection) {
            UIHelpers.error('Leads section not found for direct user view.');
            UIHelpers.hideLoading();
            return;
        }

        const currentUserId = authGuard.getCurrentUser()?.uid;
        const currentUserName = authGuard.getCurrentUser()?.name || 'Your';

        leadsSection.innerHTML = `
            <div class="enhanced-data-table">
                <div class="enhanced-table-header">
                    <div class="enhanced-table-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        ${currentUserName} Leads
                    </div>
                    <div class="table-controls">
                        <div class="enhanced-search-box">
                            <input type="text" id="user-leads-search" placeholder="Search your leads..." onkeyup="crmApp.filterUserLeadsDirectly(this.value)">
                            <div class="search-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="11" cy="11" r="8"/>
                                    <path d="M21 21l-4.35-4.35"/>
                                </svg>
                            </div>
                        </div>
                        <button class="enhanced-btn enhanced-btn-primary" onclick="crmApp.loadUserLeadsDirectly()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23,4 23,10 17,10"/>
                                <polyline points="1,20 1,14 7,14"/>
                                <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10"/>
                                <path d="M3.51,15a9,9,0,0,0,14.85,3.36L23,14"/>
                            </svg>
                            Refresh
                        </button>
                    </div>
                </div>

                <div class="enhanced-table-wrapper">
                    <table class="enhanced-table">
                        <thead>
                            <tr>
                                <th class="sortable" data-field="name">Name</th>
                                <th class="sortable" data-field="phone">Phone</th>
                                <th>Email</th>
                                <th class="sortable" data-field="status">Status</th>
                                <th class="sortable" data-field="source">Source</th>
                                <th class="sortable" data-field="created">Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="user-leads-direct-table-body">
                            <tr>
                                <td colspan="7" class="loading-row">Loading your leads...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadUserLeadsDirectData(currentUserId);
        UIHelpers.hideLoading();
    }

    /**
     * Fetches and displays leads directly assigned to the current user.
     * @param {string} userId - ID of the current user.
     */
    async loadUserLeadsDirectData(userId) {
        try {
            const tableBody = document.getElementById('user-leads-direct-table-body');
            if (!tableBody) return;

            UIHelpers.showLoading('Fetching your leads...', tableBody);

            // Using firebaseService.db to get leads
            const leads = await firebaseService.db.get(DB_CONFIG.COLLECTIONS.LEADS, null, {
                filters: [{ field: 'assignedTo', operator: '==', value: userId }],
                orderBy: [{ field: 'createdAt', direction: 'desc' }]
            });

            this.state.set('currentUserDirectLeads', leads);
            this.allLeads = leads; // Update global leads array for consistent findLeadById

            if (leads.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">No leads assigned to you yet</td></tr>';
                return;
            }

            tableBody.innerHTML = leads.map(lead => {
                const createdAt = lead.createdAt ? (lead.createdAt.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt.seconds * 1000)) : new Date(0);
                const formattedDate = this.formatDate(createdAt);

                return `
                    <tr data-lead-id="${lead.id}">
                        <td><strong>${sanitizer.sanitize(lead.name || 'Unnamed Lead', 'text')}</strong></td>
                        <td>${sanitizer.sanitize(lead.phone || 'No phone', 'text')}</td>
                        <td>${sanitizer.sanitize(lead.email || 'Not provided', 'email')}</td>
                        <td><span class="enhanced-status-badge ${(lead.status || 'newlead').toLowerCase()}">${this.getStatusText(lead.status)}</span></td>
                        <td>${sanitizer.sanitize(lead.source || 'Not specified', 'text')}</td>
                        <td>${formattedDate}</td>
                        <td>
                            <button class="enhanced-action-btn view" onclick="crmApp.viewLead('${lead.id}')">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                                View
                            </button>
                            <button class="enhanced-action-btn edit" onclick="crmApp.editLead('${lead.id}')">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                                Edit
                            </button>
                            <button class="enhanced-action-btn delete" onclick="crmApp.deleteLead('${lead.id}')">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3,6 5,6 21,6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                                Delete
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.error('❌ Error loading user leads directly:', error);
            UIHelpers.error('Failed to load your leads.');
            const tableBody = document.getElementById('user-leads-direct-table-body');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Error loading leads. Please refresh.</td></tr>';
            }
        } finally {
            UIHelpers.hideLoading(null);
        }
    }

    /**
     * Views details of a specific lead in a modal.
     * @param {string} leadId - ID of the lead to view.
     */
    async viewLead(leadId) {
        const lead = this.findLeadById(leadId);
        if (!lead) {
            UIHelpers.error('Lead not found.');
            return;
        }

        await logActivity('view_lead_details', { leadId: leadId });
        this.showLeadModal(lead, 'view');
    }

    /**
     * Opens a modal to edit a specific lead.
     * @param {string} leadId - ID of the lead to edit.
     */
    async editLead(leadId) {
        const lead = this.findLeadById(leadId);
        if (!lead) {
            UIHelpers.error('Lead not found.');
            return;
        }

        await logActivity('edit_lead_attempt', { leadId: leadId });
        this.showLeadModal(lead, 'edit');
    }

    /**
     * Deletes a lead after confirmation.
     * @param {string} leadId - ID of the lead to delete.
     */
    async deleteLead(leadId) {
        const lead = this.findLeadById(leadId);
        if (!lead) {
            UIHelpers.error('Lead not found.');
            return;
        }

        const confirmed = await UIHelpers.confirmDelete(lead.name || 'this lead');

        if (confirmed) {
            await this.deleteLeadFromDatabase(leadId);
        }
    }

    /**
     * Finds a lead by its ID from the currently loaded leads.
     * @param {string} leadId - The ID of the lead to find.
     * @returns {Object | undefined} The found lead object or undefined.
     */
    findLeadById(leadId) {
        return this.allLeads.find(l => l.id === leadId) ||
               this.state.get('currentEnhancedUserLeads')?.find(l => l.id === leadId) ||
               this.state.get('currentUserDirectLeads')?.find(l => l.id === leadId);
    }

    /**
     * Shows a modal for viewing or editing lead details.
     * @param {Object} lead - The lead object.
     * @param {'view' | 'edit'} mode - The mode of the modal.
     */
    showLeadModal(lead, mode = 'view') {
        const isEditMode = mode === 'edit';
        const createdAt = lead.createdAt ? (lead.createdAt.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt.seconds * 1000)) : new Date(0);

        // UIHelpers.showModal now handles modal creation and management
        UIHelpers.showModal({
            id: 'enhanced-lead-modal',
            title: `${isEditMode ? 'Edit' : 'View'} Lead - ${sanitizer.sanitize(lead.name || 'Unnamed Lead', 'text')}`,
            content: `
                <form id="enhanced-lead-form" class="enhanced-form">
                    <div class="enhanced-form-section">
                        <div class="enhanced-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            Personal Information
                        </div>
                        <div class="enhanced-form-grid">
                            <div class="enhanced-form-group">
                                <label>Full Name *</label>
                                <input type="text" id="enhanced-lead-name" value="${sanitizer.sanitize(lead.name || '', 'text')}" ${!isEditMode ? 'readonly' : ''} required>
                                <div class="enhanced-field-error" style="display: none;"></div>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Phone Number *</label>
                                <input type="tel" id="enhanced-lead-phone" value="${sanitizer.sanitize(lead.phone || '', 'phone')}" ${!isEditMode ? 'readonly' : ''} required>
                                <div class="enhanced-field-error" style="display: none;"></div>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Email Address</label>
                                <input type="email" id="enhanced-lead-email" value="${sanitizer.sanitize(lead.email || '', 'email')}" ${!isEditMode ? 'readonly' : ''}>
                                <div class="enhanced-field-error" style="display: none;"></div>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Alternative Phone</label>
                                <input type="tel" id="enhanced-lead-alt-phone" value="${sanitizer.sanitize(lead.altPhone || '', 'phone')}" ${!isEditMode ? 'readonly' : ''}>
                                <div class="enhanced-field-error" style="display: none;"></div>
                            </div>
                        </div>
                    </div>

                    <div class="enhanced-form-section">
                        <div class="enhanced-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 9.5L12 4l9 5.5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11z"/>
                                <polyline points="9,22 9,12 15,12 15,22"/>
                            </svg>
                            Lead Information
                        </div>
                        <div class="enhanced-form-grid">
                            <div class="enhanced-form-group">
                                <label>Status *</label>
                                <select id="enhanced-lead-status" ${!isEditMode ? 'disabled' : ''} required>
                                    ${VALIDATION_CONFIG.LEAD_OPTIONS.status.map(status => `
                                        <option value="${status}" ${lead.status === status ? 'selected' : ''}>${this.getStatusText(status)}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Source</label>
                                <select id="enhanced-lead-source" ${!isEditMode ? 'disabled' : ''}>
                                    <option value="" ${!lead.source ? 'selected' : ''}>Select source</option>
                                    ${VALIDATION_CONFIG.LEAD_OPTIONS.source.map(source => `
                                        <option value="${source}" ${lead.source === source ? 'selected' : ''}>${source.charAt(0).toUpperCase() + source.slice(1).replace('-', ' ')}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="enhanced-form-group full-width">
                                <label>Requirements</label>
                                <textarea id="enhanced-lead-requirements" rows="4" ${!isEditMode ? 'readonly' : ''} placeholder="Enter lead requirements and notes...">${sanitizer.sanitize(lead.requirements || '', 'multiline')}</textarea>
                                <div class="enhanced-field-error" style="display: none;"></div>
                            </div>
                        </div>
                    </div>

                    <div class="enhanced-form-section">
                        <div class="enhanced-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 6v6l4 2"/>
                            </svg>
                            System Information
                        </div>
                        <div class="enhanced-form-grid">
                            <div class="enhanced-form-group">
                                <label>Created Date</label>
                                <input type="text" value="${this.formatDate(createdAt)}" readonly>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Lead ID</label>
                                <input type="text" value="${lead.id}" readonly>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Last Updated</label>
                                <input type="text" value="${lead.updatedAt ? this.formatDate(lead.updatedAt.toDate ? lead.updatedAt.toDate() : new Date(lead.updatedAt.seconds * 1000)) : 'Never'}" readonly>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Assigned To</label>
                                <input type="text" value="${this.getAssignedUserName(lead.assignedTo)}" readonly>
                            </div>
                        </div>
                    </div>
                </form>
            `,
            size: 'large',
            buttons: isEditMode ? [
                {
                    text: 'Cancel',
                    className: 'btn-secondary',
                    action: 'cancel',
                    onClick: (e, modal) => UIHelpers.hideModal(modal.id)
                },
                {
                    text: 'Save Changes',
                    className: 'btn-primary',
                    action: 'submit',
                    primary: true,
                    onClick: async (formData, modal) => {
                        const success = await this.saveLeadChanges(lead.id, formData);
                        if (success) {
                            UIHelpers.hideModal(modal.id);
                        } else {
                            // Don't close modal if save failed due to validation or other errors
                            return false;
                        }
                    }
                }
            ] : [
                {
                    text: 'Close',
                    className: 'btn-secondary',
                    action: 'close',
                    onClick: (e, modal) => UIHelpers.hideModal(modal.id)
                },
                {
                    text: 'Edit Lead',
                    className: 'btn-primary',
                    action: 'edit',
                    onClick: (e, modal) => {
                        UIHelpers.hideModal(modal.id);
                        this.editLead(lead.id); // Re-open in edit mode
                    }
                }
            ],
            onShow: (modal) => {
                if (isEditMode) {
                    this.setupLeadFormValidation();
                }
            }
        });
    }

    /**
     * Sets up real-time validation for the lead form within the modal.
     */
    setupLeadFormValidation() {
        const form = document.getElementById('enhanced-lead-form');
        if (!form) return;

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.validateLeadField(input));
            input.addEventListener('blur', () => this.validateLeadField(input));
        });
    }

    /**
     * Validates a single lead form field and updates its UI state.
     * @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} field - The input field to validate.
     * @returns {boolean} True if valid, false otherwise.
     */
    validateLeadField(field) {
        const formGroup = field.closest('.enhanced-form-group');
        if (!formGroup) return true;

        let isValid = true;
        let errorMessage = '';

        const value = field.value.trim();
        const fieldName = field.id.replace('enhanced-lead-', '');

        switch (fieldName) {
            case 'name':
                const nameValidation = sanitizer.validate(value, 'name', field.required);
                if (!nameValidation.valid) {
                    isValid = false;
                    errorMessage = nameValidation.message;
                }
                break;
            case 'phone':
            case 'alt-phone':
                const phoneValidation = sanitizer.validate(value, 'phone', field.required);
                if (!phoneValidation.valid) {
                    isValid = false;
                    errorMessage = phoneValidation.message;
                }
                break;
            case 'email':
                const emailValidation = sanitizer.validate(value, 'email', field.required);
                if (!emailValidation.valid) {
                    isValid = false;
                    errorMessage = emailValidation.message;
                }
                break;
            case 'requirements':
                const reqValidation = sanitizer.validate(value, 'multiline', field.required);
                if (!reqValidation.valid) {
                    isValid = false;
                    errorMessage = reqValidation.message;
                }
                break;
            case 'status':
            case 'source':
                const selectValidation = sanitizer.validate(value, 'select', field.required, {
                    validValues: VALIDATION_CONFIG.LEAD_OPTIONS[fieldName]
                });
                if (!selectValidation.valid) {
                    isValid = false;
                    errorMessage = selectValidation.message;
                }
                break;
        }

        // Update UI based on validation
        const errorElement = formGroup.querySelector('.enhanced-field-error');
        if (isValid) {
            formGroup.classList.remove('error');
            formGroup.classList.add('success');
            if (errorElement) errorElement.style.display = 'none';
        } else {
            formGroup.classList.remove('success');
            formGroup.classList.add('error');
            if (errorElement) {
                errorElement.textContent = errorMessage;
                errorElement.style.display = 'block';
            }
        }
        return isValid;
    }

    /**
     * Saves changes to a lead.
     * @param {string} leadId - ID of the lead to save.
     * @param {Object} formData - The form data to save.
     * @returns {Promise<boolean>} True if save was successful, false otherwise.
     */
    async saveLeadChanges(leadId, formData) {
        try {
            const formElement = document.getElementById('enhanced-lead-form');
            if (!formElement) return false;

            // Manual re-validation of all fields on submit
            let isFormValid = true;
            formElement.querySelectorAll('input, select, textarea').forEach(input => {
                if (!this.validateLeadField(input)) {
                    isFormValid = false;
                }
            });

            if (!isFormValid) {
                UIHelpers.warning('Please fix the errors before saving');
                return false;
            }

            // Sanitize and validate data using the global sanitizer
            const sanitizedResult = sanitizer.sanitizeLeadData({
                name: formData['enhanced-lead-name'],
                phone: formData['enhanced-lead-phone'],
                email: formData['enhanced-lead-email'],
                altPhone: formData['enhanced-lead-alt-phone'],
                status: formData['enhanced-lead-status'],
                source: formData['enhanced-lead-source'],
                requirements: formData['enhanced-lead-requirements']
            });

            if (!sanitizedResult.isValid) {
                UIHelpers.error('Validation failed: ' + Object.values(sanitizedResult.errors).join(', '));
                sanitizer.displayValidationErrors(sanitizedResult.errors, 'enhanced-lead-form');
                return false;
            }

            const updateData = {
                ...sanitizedResult.sanitizedData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: authGuard.getCurrentUser()?.uid
            };

            UIHelpers.showLoading('Saving changes...');

            // Use firebaseService.db.update for database operation
            await firebaseService.db.update(DB_CONFIG.COLLECTIONS.LEADS, leadId, updateData);

            await logActivity('update_lead', {
                leadId: leadId,
                changes: Object.keys(updateData).filter(key => key !== 'updatedAt' && key !== 'updatedBy'),
                previousStatus: this.findLeadById(leadId)?.status,
                newStatus: updateData.status
            });

            UIHelpers.success('Lead updated successfully!');

            // Refresh current view
            if (this.selectedUserId) {
                await this.selectUser(this.selectedUserId);
            } else if (authGuard.hasRole('user')) {
                await this.loadUserLeadsDirectly();
            } else {
                // If on master/team view, refresh masters data
                await this.loadMastersView();
            }
            return true;
        } catch (error) {
            console.error('❌ Error saving lead changes:', error);
            UIHelpers.error('Error saving lead: ' + error.message);
            return false;
        } finally {
            UIHelpers.hideLoading();
        }
    }

    /**
     * Deletes a lead from the database.
     * @param {string} leadId - ID of the lead to delete.
     */
    async deleteLeadFromDatabase(leadId) {
        try {
            UIHelpers.showLoading('Deleting lead...');

            // Use firebaseService.db.delete for database operation
            await firebaseService.db.delete(DB_CONFIG.COLLECTIONS.LEADS, leadId);

            await logActivity('delete_lead', {
                leadId: leadId,
                leadName: this.findLeadById(leadId)?.name || 'Unknown Lead'
            });

            UIHelpers.success('Lead deleted successfully!');

            // Refresh current view
            if (this.selectedUserId) {
                await this.selectUser(this.selectedUserId);
            } else if (authGuard.hasRole('user')) {
                await this.loadUserLeadsDirectly();
            } else {
                await this.loadMastersView();
            }

        } catch (error) {
            console.error('❌ Error deleting lead:', error);
            UIHelpers.error('Error deleting lead: ' + error.message);
        } finally {
            UIHelpers.hideLoading();
        }
    }

    /**
     * Searches masters in the current view.
     * @param {string} searchTerm - The search term.
     */
    searchMasters(searchTerm) {
        const masterCards = document.querySelectorAll('.enhanced-master-card');
        const term = searchTerm.toLowerCase().trim();

        masterCards.forEach(card => {
            const name = card.querySelector('.master-card-info h3')?.textContent.toLowerCase() || '';
            const email = card.querySelector('.master-card-info p')?.textContent.toLowerCase() || '';

            if (name.includes(term) || email.includes(term) || term === '') {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    /**
     * Filters user leads displayed in the table.
     * @param {string} searchTerm - The search term.
     */
    filterUserLeads(searchTerm) {
        const currentLeads = this.state.get('currentEnhancedUserLeads');
        if (!currentLeads) return;

        const tableBody = document.getElementById('enhanced-user-leads-table-body');
        if (!tableBody) return;

        const filteredLeads = currentLeads.filter(lead => {
            const searchText = searchTerm.toLowerCase();
            return (
                (lead.name || '').toLowerCase().includes(searchText) ||
                (lead.phone || '').toLowerCase().includes(searchText) ||
                (lead.email || '').toLowerCase().includes(searchText) ||
                (lead.status || '').toLowerCase().includes(searchText) ||
                (lead.source || '').toLowerCase().includes(searchText)
            );
        });

        if (filteredLeads.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">No leads match your search</td></tr>';
            return;
        }

        tableBody.innerHTML = filteredLeads.map(lead => {
            const createdAt = lead.createdAt ? (lead.createdAt.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt.seconds * 1000)) : new Date(0);
            const formattedDate = this.formatDate(createdAt);

            return `
                <tr data-lead-id="${lead.id}">
                    <td><strong>${sanitizer.sanitize(lead.name || 'Unnamed Lead', 'text')}</strong></td>
                    <td>${sanitizer.sanitize(lead.phone || 'No phone', 'text')}</td>
                    <td>${sanitizer.sanitize(lead.email || 'Not provided', 'email')}</td>
                    <td><span class="enhanced-status-badge ${(lead.status || 'newlead').toLowerCase()}">${this.getStatusText(lead.status)}</span></td>
                    <td>${sanitizer.sanitize(lead.source || 'Not specified', 'text')}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <button class="enhanced-action-btn view" onclick="crmApp.viewLead('${lead.id}')">View</button>
                        <button class="enhanced-action-btn edit" onclick="crmApp.editLead('${lead.id}')">Edit</button>
                        <button class="enhanced-action-btn delete" onclick="crmApp.deleteLead('${lead.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Filters leads when displayed directly to a user.
     * @param {string} searchTerm - The search term.
     */
    filterUserLeadsDirectly(searchTerm) {
        const currentLeads = this.state.get('currentUserDirectLeads');
        if (!currentLeads) return;

        const tableBody = document.getElementById('user-leads-direct-table-body');
        if (!tableBody) return;

        const filteredLeads = currentLeads.filter(lead => {
            const searchText = searchTerm.toLowerCase();
            return (
                (lead.name || '').toLowerCase().includes(searchText) ||
                (lead.phone || '').toLowerCase().includes(searchText) ||
                (lead.email || '').toLowerCase().includes(searchText) ||
                (lead.status || '').toLowerCase().includes(searchText) ||
                (lead.source || '').toLowerCase().includes(searchText)
            );
        });

        if (filteredLeads.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">No leads match your search</td></tr>';
            return;
        }

        tableBody.innerHTML = filteredLeads.map(lead => {
            const createdAt = lead.createdAt ? (lead.createdAt.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt.seconds * 1000)) : new Date(0);
            const formattedDate = this.formatDate(createdAt);

            return `
                <tr data-lead-id="${lead.id}">
                    <td><strong>${sanitizer.sanitize(lead.name || 'Unnamed Lead', 'text')}</strong></td>
                    <td>${sanitizer.sanitize(lead.phone || 'No phone', 'text')}</td>
                    <td>${sanitizer.sanitize(lead.email || 'Not provided', 'email')}</td>
                    <td><span class="enhanced-status-badge ${(lead.status || 'newlead').toLowerCase()}">${this.getStatusText(lead.status)}</span></td>
                    <td>${sanitizer.sanitize(lead.source || 'Not specified', 'text')}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <button class="enhanced-action-btn view" onclick="crmApp.viewLead('${lead.id}')">View</button>
                        <button class="enhanced-action-btn edit" onclick="crmApp.editLead('${lead.id}')">Edit</button>
                        <button class="enhanced-action-btn delete" onclick="crmApp.deleteLead('${lead.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Formats a Date object into a readable string.
     * @param {Date | Object} date - The date object or Firestore timestamp.
     * @returns {string} Formatted date string.
     */
    formatDate(date) {
        if (!date) return 'N/A';
        const d = date.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date));
        if (isNaN(d.getTime())) return 'Invalid Date';

        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return d.toLocaleDateString('en-US', options);
    }

    /**
     * Formats a date into a "time ago" string.
     * @param {Date | Object} date - The date object or Firestore timestamp.
     * @returns {string} Time ago string.
     */
    formatTimeAgo(date) {
        if (!date) return 'N/A';
        const d = date.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date));
        if (isNaN(d.getTime())) return 'Invalid Date';

        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`; // 30 days

        return d.toLocaleDateString();
    }

    /**
     * Gets the display text for a lead status.
     * @param {string} status - The status key.
     * @returns {string} The display text.
     */
    getStatusText(status) {
        const statusMap = {
            'newLead': 'New Lead',
            'newlead': 'New Lead', // Handle variations
            'followUp': 'Follow Up',
            'followup': 'Follow Up',
            'visit': 'Visit Scheduled',
            'booked': 'Booked',
            'closed': 'Closed',
            'dropped': 'Dropped',
            'contacted': 'Contacted',
            'interested': 'Interested',
            'notinterested': 'Not Interested'
        };
        return statusMap[status] || status || 'New Lead';
    }

    /**
     * Gets the name of the user assigned to a lead.
     * @param {string} userId - The ID of the assigned user.
     * @returns {string} User's name or 'Unknown User'.
     */
    getAssignedUserName(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        return user ? (user.name || user.email) : 'Unknown User';
    }

    /**
     * Placeholder for Team Management section loading.
     */
    async loadTeamManagementSection() {
        console.log('👥 Team Management section - Coming soon');
        const teamSection = document.getElementById('team-section');
        if (teamSection) {
            teamSection.innerHTML = `
                <div class="coming-soon">
                    <div class="coming-soon-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        </svg>
                    </div>
                    <h3>Advanced Team Analytics</h3>
                    <p>Comprehensive team management dashboard coming soon.</p>
                </div>
            `;
        }
    }
}

// Instantiate the main application
const crmApp = new CRMApplication();

// Ensure the application initializes once the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', () => crmApp.init());

// Expose main app functions globally for direct HTML calls
// In a more advanced setup, these would be managed by a routing system.
window.crmApp = crmApp;
// Proxy calls to methods on the crmApp instance
window.showEnhancedSection = (section) => crmApp.showSection(section);
window.loadEnhancedDashboardData = () => crmApp.loadDashboardData();
window.selectEnhancedMaster = (masterId) => crmApp.selectMaster(masterId);
window.selectEnhancedUser = (userId) => crmApp.selectUser(userId);
window.searchEnhancedMasters = (searchTerm) => crmApp.searchMasters(searchTerm);
window.filterEnhancedUserLeads = (searchTerm) => crmApp.filterUserLeads(searchTerm);
window.filterUserLeadsDirectly = (searchTerm) => crmApp.filterUserLeadsDirectly(searchTerm);
window.viewEnhancedLead = (leadId) => crmApp.viewLead(leadId);
window.editEnhancedLead = (leadId) => crmApp.editLead(leadId);
window.deleteEnhancedLead = (leadId) => crmApp.deleteLead(leadId);
window.closeEnhancedLeadModal = () => crmApp.closeLeadModal(); // Assuming crmApp now has this directly
window.saveEnhancedLeadChanges = (leadId, formData) => crmApp.saveLeadChanges(leadId, formData);
window.loadUserLeadsDirectly = () => crmApp.loadUserLeadsDirectly();
window.loadEnhancedMastersView = () => crmApp.loadMastersView();


console.log('✅ Refactored script.js loaded and CRMApplication instantiated.');