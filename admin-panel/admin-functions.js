// ===================================
// ADVANCED ADMIN MANAGEMENT FUNCTIONS - REFACTORED
// File: admin-functions.js
// Purpose: Modularized admin management with enhanced features
// ===================================

/**
 * Manages operations related to Masters (CPs in original context).
 * Handles loading, rendering, and specific CRUD operations for Master users.
 */
class MasterManager {
    /**
     * @param {FirebaseService} firebaseService - Instance of the centralized FirebaseService.
     */
    constructor(firebaseService) {
        this.firebaseService = firebaseService;
        // Access Firestore and Auth instances via the centralized firebaseService
        this.db = this.firebaseService.db.db;
        this.auth = this.firebaseService.db.auth;
        this.allMasters = []; // Cache masters data
        this.allUsers = []; // Cache all users for team lookups
    }

    /**
     * Loads and renders the Master Management Panel.
     * @returns {Promise<void>}
     */
    async loadManagementPanel() {
        if (!authGuard.hasRole('admin')) {
            authGuard.showAccessDenied('Only admins can manage masters');
            return;
        }

        console.log('🔧 Loading Master Management Panel...');
        UIHelpers.showLoading('Loading Masters...');

        try {
            // Fetch all users and leads using the new firebaseService
            const [usersSnapshot, leadsSnapshot] = await Promise.all([
                this.firebaseService.db.get(DB_CONFIG.COLLECTIONS.USERS),
                this.firebaseService.db.get(DB_CONFIG.COLLECTIONS.LEADS)
            ]);

            this.allUsers = usersSnapshot;
            this.allMasters = usersSnapshot.filter(user => user.role === 'master');

            const mastersWithStats = await this._calculateMasterStats(this.allMasters, this.allUsers, leadsSnapshot);

            this._renderMasterManagementPanel(mastersWithStats);
            this._setupPanelEventListeners(); // Setup listeners for search, sort etc.

            console.log('✅ Master Management Panel loaded.');

        } catch (error) {
            console.error('❌ Error loading master management:', error);
            UIHelpers.error('Failed to load master management panel: ' + error.message);
        } finally {
            UIHelpers.hideLoading();
        }
    }

    /**
     * Renders the HTML structure for the master management panel.
     * @param {Array<Object>} masters - Array of master user objects with stats.
     * @private
     */
    _renderMasterManagementPanel(masters) {
        const targetSection = document.getElementById('users-section');
        if (!targetSection) return;

        targetSection.innerHTML = `
            <div class="master-management-panel">
                <div class="panel-header">
                    <div class="panel-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        Master Management
                    </div>
                    <div class="panel-controls">
                        <button class="enhanced-btn enhanced-btn-primary" id="add-master-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Add Master
                        </button>
                        <button class="enhanced-btn enhanced-btn-secondary" id="export-masters-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Export Data
                        </button>
                    </div>
                </div>

                <div class="enhanced-stats-grid">
                    <div class="enhanced-stat-card">
                        <div class="enhanced-stat-header">
                            <div class="enhanced-stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                        </div>
                        <div class="enhanced-stat-number">${masters.length}</div>
                        <div class="enhanced-stat-label">Total Masters</div>
                        <div class="enhanced-stat-trend trend-up">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
                                <polyline points="17,6 23,6 23,12"/>
                            </svg>
                            Active System
                        </div>
                    </div>

                    <div class="enhanced-stat-card">
                        <div class="enhanced-stat-header">
                            <div class="enhanced-stat-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                            </div>
                        </div>
                        <div class="enhanced-stat-number">${masters.reduce((sum, m) => sum + m.teamCount, 0)}</div>
                        <div class="enhanced-stat-label">Team Members</div>
                        <div class="enhanced-stat-trend trend-up">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
                                <polyline points="17,6 23,6 23,12"/>
                            </svg>
                            Growing Teams
                        </div>
                    </div>

                    <div class="enhanced-stat-card">
                        <div class="enhanced-stat-header">
                            <div class="enhanced-stat-icon" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                            </div>
                        </div>
                        <div class="enhanced-stat-number">${masters.reduce((sum, m) => sum + m.activeLeads, 0)}</div>
                        <div class="enhanced-stat-label">Active Leads</div>
                        <div class="enhanced-stat-trend trend-up">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
                                <polyline points="17,6 23,6 23,12"/>
                            </svg>
                            High Activity
                        </div>
                    </div>
                </div>

                <div class="enhanced-master-grid" id="masters-grid">
                    ${masters.map(master => this._renderMasterCard(master)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Sets up event listeners for the master management panel.
     * @private
     */
    _setupPanelEventListeners() {
        document.getElementById('add-master-btn')?.addEventListener('click', () => this.showCreateMasterModal());
        document.getElementById('export-masters-btn')?.addEventListener('click', () => this.exportMasterData());

        // Search
        const searchInput = document.getElementById('masters-search');
        if (searchInput) {
            searchInput.addEventListener('input', DataUtils.debounce((e) => {
                this.searchMasters(e.target.value);
            }, 300));
        }
    }

    /**
     * Renders a single master card HTML.
     * @param {Object} master - The master data.
     * @returns {string} HTML string for the master card.
     * @private
     */
    _renderMasterCard(master) {
        const statusClass = master.status === 'active' ? 'success' : 'danger';
        const lastActiveText = master.lastActive ?
            DataUtils.formatTimeAgo(master.lastActive) : 'Never logged in';

        return `
            <div class="enhanced-master-card" data-master-id="${master.id}">
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

                <div class="master-card-actions">
                    <button class="enhanced-action-btn edit" onclick="adminManager.masterManager.editMaster('${master.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                    </button>
                    <button class="enhanced-action-btn reset" onclick="adminManager.masterManager.resetMasterPassword('${master.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <circle cx="12" cy="16" r="1"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Reset PWD
                    </button>
                    <button class="enhanced-action-btn toggle" onclick="adminManager.masterManager.toggleMasterStatus('${master.id}', '${master.status}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                        </svg>
                        ${master.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="enhanced-action-btn view" onclick="adminManager.masterManager.viewMasterDetails('${master.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Calculates statistics for a list of masters.
     * @param {Array<Object>} masters - Array of master user objects.
     * @param {Array<Object>} allUsers - All users in the system.
     * @param {Array<Object>} allLeads - All leads in the system.
     * @returns {Promise<Array<Object>>} Masters with their calculated statistics.
     * @private
     */
    async _calculateMasterStats(masters, allUsers, allLeads) {
        return masters.map(master => {
            const teamMembers = allUsers.filter(user => user.linkedMaster === master.id);
            const teamMemberIds = teamMembers.map(member => member.id);
            teamMemberIds.push(master.id); // Include master's own leads if assigned to themselves

            const masterLeads = allLeads.filter(lead =>
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
    }

    /**
     * Shows the create master modal.
     */
    showCreateMasterModal() {
        UIHelpers.showModal({
            title: 'Create New Master',
            content: `
                <form id="create-master-form" class="enhanced-form">
                    <div class="enhanced-form-section">
                        <div class="enhanced-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            Master Details
                        </div>
                        <div class="enhanced-form-grid">
                            <div class="enhanced-form-group">
                                <label>Full Name *</label>
                                <input type="text" id="create-master-name" required>
                                <div class="enhanced-field-error" style="display: none;"></div>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Email Address *</label>
                                <input type="email" id="create-master-email" required>
                                <div class="enhanced-field-error" style="display: none;"></div>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Initial Password *</label>
                                <input type="password" id="create-master-password" required>
                                <div class="enhanced-field-error" style="display: none;"></div>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Confirm Password *</label>
                                <input type="password" id="create-master-confirm-password" required>
                                <div class="enhanced-field-error" style="display: none;"></div>
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
                        if (success) {
                            UIHelpers.hideModal(modal.id);
                        } else {
                            return false; // Prevent modal from closing on failure
                        }
                    }
                }
            ],
            onShow: () => {
                this._setupCreateMasterFormValidation();
            }
        });
    }

    /**
     * Creates a new master user.
     * @param {Object} formData - Data from the create master form.
     * @returns {Promise<boolean>} True if creation was successful, false otherwise.
     */
    async createMaster(formData) {
        UIHelpers.showLoading('Creating master...');
        try {
            const name = formData['create-master-name'].trim();
            const email = formData['create-master-email'].trim();
            const password = formData['create-master-password'];
            const confirmPassword = formData['create-master-confirm-password'];

            // Basic validation
            if (!name || !email || !password || !confirmPassword) {
                UIHelpers.warning('All fields are required.');
                return false;
            }
            if (password !== confirmPassword) {
                UIHelpers.error('Passwords do not match.');
                return false;
            }
            if (password.length < 6) {
                UIHelpers.error('Password must be at least 6 characters.');
                return false;
            }
            if (!FormValidation.validateEmail(email)) {
                UIHelpers.error('Invalid email format.');
                return false;
            }

            // Call Cloud Function for secure user creation (Firebase Admin SDK needed on backend)
            // This assumes `createUser` Cloud Function is available and handles Firebase Auth user creation
            // and Firestore document creation.
            const result = await this.firebaseService.cf.call('createUser', {
                email: sanitizer.sanitize(email, 'email'),
                password: password, // Password sent directly to Cloud Function for Auth creation
                name: sanitizer.sanitize(name, 'name'),
                role: 'master'
            });

            if (result.success) {
                await logActivity('create_master', {
                    newMasterId: result.userId,
                    newMasterEmail: email
                });
                UIHelpers.success('Master created successfully!');
                await this.loadManagementPanel(); // Refresh list
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
     * Sets up form validation for the create master modal.
     * @private
     */
    _setupCreateMasterFormValidation() {
        const form = document.getElementById('create-master-form');
        if (!form) return;

        form.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => this._validateCreateMasterField(input));
            input.addEventListener('blur', () => this._validateCreateMasterField(input));
        });
    }

    /**
     * Validates a single field in the create master form.
     * @param {HTMLInputElement} field - The input field to validate.
     * @returns {boolean} True if valid, false otherwise.
     * @private
     */
    _validateCreateMasterField(field) {
        const formGroup = field.closest('.enhanced-form-group');
        if (!formGroup) return true;

        let isValid = true;
        let errorMessage = '';
        const value = field.value.trim();

        switch (field.id) {
            case 'create-master-name':
                const nameValidation = sanitizer.validate(value, 'name', field.required);
                if (!nameValidation.valid) { isValid = false; errorMessage = nameValidation.message; }
                break;
            case 'create-master-email':
                const emailValidation = sanitizer.validate(value, 'email', field.required);
                if (!emailValidation.valid) { isValid = false; errorMessage = emailValidation.message; }
                break;
            case 'create-master-password':
                if (value.length < 6) { isValid = false; errorMessage = 'Password must be at least 6 characters.'; }
                break;
            case 'create-master-confirm-password':
                const password = document.getElementById('create-master-password').value;
                if (value !== password) { isValid = false; errorMessage = 'Passwords do not match.'; }
                break;
            default: break;
        }

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
     * Opens the edit master modal.
     * @param {string} masterId - ID of the master to edit.
     */
    async editMaster(masterId) {
        if (!authGuard.hasPermission('users:edit')) {
            authGuard.showAccessDenied('You do not have permission to edit users.');
            return;
        }
        if (!SecurityUtils.checkRateLimit('edit_master', 10, 60000)) {
            UIHelpers.warning('Too many edit attempts. Please wait.');
            return;
        }

        UIHelpers.showLoading('Loading master details...');
        try {
            const master = await this.firebaseService.db.get(DB_CONFIG.COLLECTIONS.USERS, masterId);
            if (!master) {
                UIHelpers.error('Master not found.');
                return;
            }

            this._showEditMasterModal(masterId, master);

        } catch (error) {
            console.error('❌ Error loading master for edit:', error);
            UIHelpers.error('Failed to load master details: ' + error.message);
        } finally {
            UIHelpers.hideLoading();
        }
    }

    /**
     * Renders and displays the edit master modal.
     * @param {string} masterId - ID of the master.
     * @param {Object} master - Master data.
     * @private
     */
    _showEditMasterModal(masterId, master) {
        UIHelpers.showModal({
            title: `Edit Master - ${sanitizer.sanitize(master.name || master.email, 'text')}`,
            content: `
                <form id="edit-master-form" class="enhanced-form">
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
                                <input type="text" id="edit-master-name" value="${sanitizer.sanitize(master.name || '', 'text')}" required>
                                <div class="enhanced-field-error" style="display: none;"></div>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Email Address *</label>
                                <input type="email" id="edit-master-email" value="${sanitizer.sanitize(master.email || '', 'email')}" required>
                                <div class="enhanced-field-error" style="display: none;"></div>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Status</label>
                                <select id="edit-master-status" required>
                                    <option value="active" ${master.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${master.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    <option value="locked" ${master.status === 'locked' ? 'selected' : ''}>Locked</option>
                                </select>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Role</label>
                                <select id="edit-master-role" required>
                                    <option value="master" ${master.role === 'master' ? 'selected' : ''}>Master</option>
                                    <option value="user" ${master.role === 'user' ? 'selected' : ''}>User</option>
                                    <option value="admin" ${master.role === 'admin' ? 'selected' : ''}>Admin</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="enhanced-form-section">
                        <div class="enhanced-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            Account Information
                        </div>
                        <div class="enhanced-form-grid">
                            <div class="enhanced-form-group">
                                <label>Created Date</label>
                                <input type="text" value="${master.createdAt ? DataUtils.formatDate(master.createdAt.toDate()) : 'Unknown'}" readonly>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Last Login</label>
                                <input type="text" value="${master.lastLogin ? DataUtils.formatDate(master.lastLogin.toDate()) : 'Never'}" readonly>
                            </div>
                            <div class="enhanced-form-group">
                                <label>User ID</label>
                                <input type="text" value="${masterId}" readonly>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Team Members</label>
                                <input type="text" value="${master.teamCount || 0} users linked" readonly>
                            </div>
                        </div>
                    </div>
                </form>
            `,
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
                    action: 'submit',
                    primary: true,
                    onClick: async (formData, modal) => {
                        const success = await this.saveMasterChanges(masterId, formData);
                        if (success) {
                            UIHelpers.hideModal(modal.id);
                        } else {
                            return false; // Prevent modal from closing on failure
                        }
                    }
                }
            ],
            onShow: () => {
                this._setupEditMasterFormValidation();
            }
        });
    }

    /**
     * Saves changes to a master user.
     * @param {string} masterId - ID of the master.
     * @param {Object} formData - Form data.
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    async saveMasterChanges(masterId, formData) {
        UIHelpers.showLoading('Saving master changes...');
        try {
            // Validate and sanitize using global sanitizer
            const sanitizedResult = sanitizer.sanitizeUserData({
                name: formData['edit-master-name'],
                email: formData['edit-master-email'],
                status: formData['edit-master-status'],
                role: formData['edit-master-role'],
                // linkedMaster will not be changed here, only in user management
            });

            if (!sanitizedResult.isValid) {
                UIHelpers.error('Validation failed: ' + Object.values(sanitizedResult.errors).join(', '));
                // Display specific errors on the form if needed
                return false;
            }

            const updateData = {
                ...sanitizedResult.sanitizedData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: authGuard.getCurrentUser()?.uid
            };

            // Update Firestore
            await this.firebaseService.db.update(DB_CONFIG.COLLECTIONS.USERS, masterId, updateData);

            // If email changed, Firebase Auth email needs to be updated via Cloud Function
            const masterUser = await firebase.auth().getUser(masterId); // Use direct firebase.auth().getUser
            if (masterUser && masterUser.email !== updateData.email) {
                // Call a Cloud Function to update Firebase Auth user email
                // This requires Firebase Admin SDK on the backend
                console.warn('Email update requires server-side Cloud Function call.');
                // await this.firebaseService.cf.call('updateUserEmail', { uid: masterId, newEmail: updateData.email });
                UIHelpers.info('Email update is pending server-side processing.');
            }

            await logActivity('update_master', {
                masterId: masterId,
                changes: Object.keys(updateData),
                newEmail: updateData.email
            });

            UIHelpers.success('Master updated successfully!');
            await this.loadManagementPanel(); // Refresh the list
            return true;
        } catch (error) {
            console.error('❌ Error updating master:', error);
            UIHelpers.error('Failed to update master: ' + error.message);
            return false;
        } finally {
            UIHelpers.hideLoading();
        }
    }

    /**
     * Sets up form validation for the edit master modal.
     * @private
     */
    _setupEditMasterFormValidation() {
        const form = document.getElementById('edit-master-form');
        if (!form) return;

        form.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('input', () => this._validateEditMasterField(input));
            input.addEventListener('blur', () => this._validateEditMasterField(input));
        });
    }

    /**
     * Validates a single field in the edit master form.
     * @param {HTMLInputElement | HTMLSelectElement} field - The input field to validate.
     * @returns {boolean} True if valid, false otherwise.
     * @private
     */
    _validateEditMasterField(field) {
        const formGroup = field.closest('.enhanced-form-group');
        if (!formGroup) return true;

        let isValid = true;
        let errorMessage = '';
        const value = field.value.trim();
        const fieldName = field.id.replace('edit-master-', '');

        switch (fieldName) {
            case 'name':
                const nameValidation = sanitizer.validate(value, 'name', field.required);
                if (!nameValidation.valid) { isValid = false; errorMessage = nameValidation.message; }
                break;
            case 'email':
                const emailValidation = sanitizer.validate(value, 'email', field.required);
                if (!emailValidation.valid) { isValid = false; errorMessage = emailValidation.message; }
                break;
            case 'status':
                if (!VALIDATION_CONFIG.USER_OPTIONS.status.includes(value)) {
                    isValid = false; errorMessage = 'Invalid status selected.';
                }
                break;
            case 'role':
                if (!VALIDATION_CONFIG.USER_OPTIONS.role.includes(value)) {
                    isValid = false; errorMessage = 'Invalid role selected.';
                }
                break;
            default: break;
        }

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
     * Resets a master's password by sending a reset email.
     * @param {string} masterId - ID of the master.
     */
    async resetMasterPassword(masterId) {
        if (!authGuard.hasPermission('users:edit')) { // Or specific 'users:reset_password' permission
            authGuard.showAccessDenied('You do not have permission to reset passwords.');
            return;
        }
        if (!SecurityUtils.checkRateLimit('reset_password', 3, 300000)) { // 3 attempts per 5 minutes
            UIHelpers.warning('Too many password reset attempts. Please wait 5 minutes.');
            return;
        }

        const confirmed = await UIHelpers.confirm({
            title: 'Reset Master Password',
            message: 'Are you sure you want to reset this master\'s password? They will receive an email with reset instructions.',
            confirmText: 'Reset Password',
            cancelText: 'Cancel',
            type: 'warning'
        });

        if (!confirmed) return;

        UIHelpers.showLoading('Sending password reset email...');
        try {
            const master = await this.firebaseService.db.get(DB_CONFIG.COLLECTIONS.USERS, masterId);
            if (!master || !master.email) {
                throw new Error('Master not found or email missing.');
            }

            await firebase.auth().sendPasswordResetEmail(master.email);

            // Update last password reset timestamp in Firestore
            await this.firebaseService.db.update(DB_CONFIG.COLLECTIONS.USERS, masterId, {
                lastPasswordReset: firebase.firestore.FieldValue.serverTimestamp(),
                passwordResetBy: authGuard.getCurrentUser()?.uid
            });

            await logActivity('reset_master_password', {
                masterId: masterId,
                masterEmail: master.email,
                resetBy: authGuard.getCurrentUser()?.uid
            });

            UIHelpers.success(`Password reset email sent to ${master.email}`);

        } catch (error) {
            console.error('❌ Error resetting password:', error);
            UIHelpers.error('Failed to reset password: ' + error.message);
            SecurityUtils.logSecurityIncident('password_reset_failed', {
                masterId: masterId,
                error: error.message,
                adminId: authGuard.getCurrentUser()?.uid
            });
        } finally {
            UIHelpers.hideLoading();
        }
    }

    /**
     * Toggles the active/inactive status of a master user.
     * @param {string} masterId - ID of the master.
     * @param {string} currentStatus - Current status ('active' or 'inactive').
     */
    async toggleMasterStatus(masterId, currentStatus) {
        if (!authGuard.hasPermission('users:edit')) { // Or specific 'users:toggle_status' permission
            authGuard.showAccessDenied('You do not have permission to change user status.');
            return;
        }

        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const action = newStatus === 'active' ? 'activate' : 'deactivate';

        const confirmed = await UIHelpers.confirm({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Master`,
            message: `Are you sure you want to ${action} this master account? This will ${newStatus === 'active' ? 'restore' : 'remove'} their access to the system.`,
            confirmText: action.charAt(0).toUpperCase() + action.slice(1),
            cancelText: 'Cancel',
            type: newStatus === 'active' ? 'primary' : 'danger'
        });

        if (!confirmed) return;

        UIHelpers.showLoading(`Setting master to ${newStatus}...`);
        try {
            await this.firebaseService.db.update(DB_CONFIG.COLLECTIONS.USERS, masterId, {
                status: newStatus,
                statusChangedAt: firebase.firestore.FieldValue.serverTimestamp(),
                statusChangedBy: authGuard.getCurrentUser()?.uid
            });

            await logActivity(`${action}_master`, {
                masterId: masterId,
                newStatus: newStatus,
                previousStatus: currentStatus
            });

            UIHelpers.success(`Master ${action}d successfully!`);
            await this.loadManagementPanel(); // Refresh the panel

        } catch (error) {
            console.error(`❌ Error ${action}ing master:`, error);
            UIHelpers.error(`Failed to ${action} master: ` + error.message);
        } finally {
            UIHelpers.hideLoading();
        }
    }

    /**
     * Views detailed information about a specific master in a modal.
     * @param {string} masterId - ID of the master to view.
     */
    async viewMasterDetails(masterId) {
        if (!authGuard.hasPermission('users:view')) {
            authGuard.showAccessDenied('You do not have permission to view user details.');
            return;
        }

        UIHelpers.showLoading('Loading master details...');
        try {
            const master = await this.firebaseService.db.get(DB_CONFIG.COLLECTIONS.USERS, masterId);
            if (!master) {
                UIHelpers.error('Master not found.');
                return;
            }

            const teamMembers = await this.firebaseService.db.get(DB_CONFIG.COLLECTIONS.USERS, null, {
                filters: [{ field: 'linkedMaster', operator: '==', value: masterId }]
            });

            const leads = await this.firebaseService.db.get(DB_CONFIG.COLLECTIONS.LEADS, null, {
                filters: [{ field: 'assignedTo', operator: '==', value: masterId }]
            });

            this._showMasterDetailsModal(masterId, master, teamMembers, leads);

        } catch (error) {
            console.error('❌ Error loading master details:', error);
            UIHelpers.error('Failed to load master details: ' + error.message);
        } finally {
            UIHelpers.hideLoading();
        }
    }

    /**
     * Renders and displays the master details modal.
     * @param {string} masterId - ID of the master.
     * @param {Object} master - Master data.
     * @param {Array<Object>} teamMembers - List of team members.
     * @param {Array<Object>} leads - List of leads.
     * @private
     */
    _showMasterDetailsModal(masterId, master, teamMembers, leads) {
        UIHelpers.showModal({
            title: `Master Details - ${sanitizer.sanitize(master.name || master.email, 'text')}`,
            content: `
                <div class="master-details-grid">
                    <div class="detail-section">
                        <h3>Overview</h3>
                        <div class="detail-stats">
                            <div class="stat-item">
                                <span class="stat-label">Team Size</span>
                                <span class="stat-value">${teamMembers.length}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Total Leads</span>
                                <span class="stat-value">${leads.length}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Status</span>
                                <span class="enhanced-status-badge ${master.status === 'active' ? 'success' : 'danger'}">
                                    ${master.status === 'active' ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Last Login</span>
                                <span class="stat-value">${master.lastLogin ? DataUtils.formatDate(master.lastLogin.toDate()) : 'Never'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>Team Members</h3>
                        <div class="team-list">
                            ${teamMembers.length === 0 ?
                                '<p class="no-data">No team members assigned</p>' :
                                teamMembers.map(member => `
                                    <div class="team-member-item">
                                        <div class="member-avatar">
                                            ${(member.name || member.email || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div class="member-info">
                                            <strong>${sanitizer.sanitize(member.name || 'Unnamed User', 'text')}</strong>
                                            <br><small>${sanitizer.sanitize(member.email, 'email')}</small>
                                        </div>
                                        <div class="member-status">
                                            <span class="enhanced-status-badge ${member.status === 'active' ? 'success' : 'danger'}">
                                                ${member.status || 'active'}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')
                            }
                        </div>
                    </div>

                    <div class="detail-section full-width">
                        <h3>Recent Leads</h3>
                        <div class="leads-table">
                            ${leads.length === 0 ?
                                '<p class="no-data">No leads assigned</p>' :
                                `<table class="enhanced-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Phone</th>
                                            <th>Status</th>
                                            <th>Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${leads.slice(0, 10).map(lead => `
                                            <tr>
                                                <td><strong>${sanitizer.sanitize(lead.name || 'Unnamed Lead', 'text')}</strong></td>
                                                <td>${sanitizer.sanitize(lead.phone || 'No phone', 'text')}</td>
                                                <td>
                                                    <span class="enhanced-status-badge ${(lead.status || 'newlead').toLowerCase()}">
                                                        ${crmApp.getStatusText(lead.status)}
                                                    </span>
                                                </td>
                                                <td>${lead.createdAt ? DataUtils.formatDate(lead.createdAt.toDate()) : 'Unknown'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>`
                            }
                        </div>
                    </div>
                </div>
            `,
            size: 'large',
            buttons: [
                {
                    text: 'Close',
                    className: 'btn-secondary',
                    action: 'close'
                },
                {
                    text: 'Edit Master',
                    className: 'btn-primary',
                    action: 'edit',
                    onClick: (e, modal) => {
                        UIHelpers.hideModal(modal.id);
                        this.editMaster(masterId); // Re-open in edit mode
                    }
                }
            ]
        });
    }

    /**
     * Exports all master data to a CSV file.
     */
    async exportMasterData() {
        if (!authGuard.hasPermission('reports:view')) { // Or specific 'reports:export_users'
            authGuard.showAccessDenied('You do not have permission to export data.');
            return;
        }

        UIHelpers.showLoading('Exporting master data...');
        try {
            // Get all masters and their related data via ops (higher level operations)
            const result = await this.firebaseService.ops.exportData(DB_CONFIG.COLLECTIONS.USERS, 'csv', {
                filters: [{ field: 'role', operator: '==', value: 'master' }]
            });

            if (result) {
                const blob = new Blob([result.data], { type: result.mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = result.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url); // Clean up

                await logActivity('export_all_masters', {
                    exportedCount: this.allMasters.length, // Use cached count or result.data.length if parsed
                    filename: result.filename
                });
                UIHelpers.success(`Exported master data to ${result.filename}!`);
            } else {
                UIHelpers.error('Failed to export master data. No data returned.');
            }

        } catch (error) {
            console.error('❌ Error exporting master data:', error);
            UIHelpers.error('Failed to export master data: ' + error.message);
        } finally {
            UIHelpers.hideLoading();
        }
    }

    /**
     * Searches through the displayed master cards.
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
}


/**
 * Manages all administrative functions, coordinating between different managers.
 */
class AdminManager {
    constructor() {
        // FirebaseService will be passed during instantiation by CRMApplication
        this.firebaseService = null; // Will be set later
        this.db = null; // Will be set later

        // Instantiate sub-managers here, passing firebaseService once available
        this.masterManager = null;
        // this.userManager = null; // Placeholder for future UserManager
        // this.bulkOperations = null; // Placeholder for future BulkOperations
    }

    /**
     * Initializes the AdminManager and its sub-managers.
     * This method should be called by CRMApplication once FirebaseService is ready.
     * @param {FirebaseService} firebaseService - The initialized FirebaseService instance.
     */
    init(firebaseService) {
        this.firebaseService = firebaseService;
        this.db = this.firebaseService.db.db;
        this.masterManager = new MasterManager(this.firebaseService);
        // Initialize other managers here, e.g., this.userManager = new UserManager(this.firebaseService);
        console.log('✅ AdminManager initialized with FirebaseService.');
    }


    /**
     * Loads the appropriate admin panel based on user role and permissions.
     * This acts as the entry point for the 'Users' navigation item.
     */
    async loadMasterManagementPanel() {
        // Ensure masterManager is initialized before calling its method
        if (!this.masterManager) {
            console.error('MasterManager is not initialized.');
            UIHelpers.error('Admin functions are not ready. Please refresh.');
            return;
        }
        await this.masterManager.loadManagementPanel();
    }

    // Proxy methods to MasterManager for direct calls from HTML (e.g., onclick)
    showCreateMasterModal() { return this.masterManager.showCreateMasterModal(); }
    editMaster(masterId) { return this.masterManager.editMaster(masterId); }
    saveMasterChanges(masterId, formData) { return this.masterManager.saveMasterChanges(masterId, formData); }
    resetMasterPassword(masterId) { return this.masterManager.resetMasterPassword(masterId); }
    toggleMasterStatus(masterId, currentStatus) { return this.masterManager.toggleMasterStatus(masterId, currentStatus); }
    viewMasterDetails(masterId) { return this.masterManager.viewMasterDetails(masterId); }
    exportMasterData() { return this.masterManager.exportMasterData(); }
    searchMasters(searchTerm) { return this.masterManager.searchMasters(searchTerm); }


    // Placeholder for other admin functionalities (will be implemented in separate managers)
    // async loadUserManagementPanel() { /* ... */ }
    // async bulkEditUsers() { /* ... */ }
    // async generateSystemReports() { /* ... */ }
}

// No global instantiation of adminManager here.
// It will be instantiated and initialized by CRMApplication in script.js

console.log('✅ Advanced Admin Management Functions Loaded');
console.log('🔧 AdminManager and MasterManager are defined.');