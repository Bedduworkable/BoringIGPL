// ===================================
// ADVANCED ADMIN MANAGEMENT FUNCTIONS
// File: admin-functions.js
// Location: /admin-panel/admin-functions.js
// Purpose: Master management, bulk operations, advanced features
// ===================================

class AdminManager {
    constructor() {
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.selectedItems = new Set();
        this.bulkActionsVisible = false;
        this.currentFilters = {};
        this.sortConfig = { field: null, direction: 'asc' };
    }

    // ===================================
    // MASTER MANAGEMENT FUNCTIONS
    // ===================================

    async loadMasterManagementPanel() {
        if (!authGuard.hasRole('admin')) {
            authGuard.showAccessDenied('Only admins can manage masters');
            return;
        }

        console.log('🔧 Loading Master Management Panel...');

        try {
            // Get all users with role filtering
            const usersSnapshot = await this.db.collection('users')
                .orderBy('createdAt', 'desc')
                .get();

            const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const masters = allUsers.filter(user => user.role === 'master');
            const regularUsers = allUsers.filter(user => user.role === 'user');

            // Get lead statistics for each master
            const leadsSnapshot = await this.db.collection('leads').get();
            const allLeads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const mastersWithStats = await Promise.all(masters.map(async (master) => {
                const teamMembers = regularUsers.filter(user => user.linkedMaster === master.id);
                const teamMemberIds = teamMembers.map(member => member.id);
                teamMemberIds.push(master.id); // Include master's own leads

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
            }));

            this.renderMasterManagementPanel(mastersWithStats);
            this.setupMasterEventListeners();

        } catch (error) {
            console.error('❌ Error loading master management:', error);
            UIHelpers.showToast('Failed to load master management panel', 'error');
        }
    }

    renderMasterManagementPanel(masters) {
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
                        <button class="enhanced-btn enhanced-btn-primary" onclick="adminManager.showCreateMasterModal()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Add Master
                        </button>
                        <button class="enhanced-btn enhanced-btn-secondary" onclick="adminManager.exportMasterData()">
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
                    ${masters.map(master => this.renderMasterCard(master)).join('')}
                </div>
            </div>
        `;
    }

    renderMasterCard(master) {
        const statusClass = master.status === 'active' ? 'success' : 'danger';
        const lastActiveText = master.lastActive ?
            this.formatTimeAgo(master.lastActive) : 'Never logged in';

        return `
            <div class="enhanced-master-card" data-master-id="${master.id}">
                <div class="master-card-header">
                    <div class="enhanced-master-avatar">
                        ${(master.name || master.email || 'M').charAt(0).toUpperCase()}
                    </div>
                    <div class="master-card-info">
                        <h3>${SecurityUtils.sanitizeInput(master.name || 'Unnamed Master')}</h3>
                        <p>${SecurityUtils.sanitizeInput(master.email)}</p>
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
                    <button class="enhanced-action-btn edit" onclick="adminManager.editMaster('${master.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                    </button>
                    <button class="enhanced-action-btn reset" onclick="adminManager.resetMasterPassword('${master.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <circle cx="12" cy="16" r="1"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Reset PWD
                    </button>
                    <button class="enhanced-action-btn toggle" onclick="adminManager.toggleMasterStatus('${master.id}', '${master.status}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                        </svg>
                        ${master.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="enhanced-action-btn view" onclick="adminManager.viewMasterDetails('${master.id}')">
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

    // ===================================
    // MASTER CRUD OPERATIONS
    // ===================================

    async editMaster(masterId) {
        if (!SecurityUtils.checkRateLimit('edit_master', 10, 60000)) {
            UIHelpers.showToast('Too many edit attempts. Please wait.', 'warning');
            return;
        }

        try {
            const masterDoc = await this.db.collection('users').doc(masterId).get();
            if (!masterDoc.exists) {
                UIHelpers.showToast('Master not found', 'error');
                return;
            }

            const master = masterDoc.data();
            this.showEditMasterModal(masterId, master);

        } catch (error) {
            console.error('❌ Error loading master for edit:', error);
            UIHelpers.showToast('Failed to load master details', 'error');
        }
    }

    showEditMasterModal(masterId, master) {
        const modal = document.createElement('div');
        modal.className = 'enhanced-modal';
        modal.innerHTML = `
            <div class="enhanced-modal-content">
                <div class="enhanced-modal-header">
                    <h2 class="enhanced-modal-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit Master - ${SecurityUtils.sanitizeInput(master.name || master.email)}
                    </h2>
                    <button class="enhanced-modal-close" onclick="this.closest('.enhanced-modal').remove()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                <div class="enhanced-modal-body">
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
                                    <input type="text" id="edit-master-name" value="${SecurityUtils.sanitizeInput(master.name || '')}" required>
                                    <div class="enhanced-field-error" style="display: none;"></div>
                                </div>
                                <div class="enhanced-form-group">
                                    <label>Email Address *</label>
                                    <input type="email" id="edit-master-email" value="${SecurityUtils.sanitizeInput(master.email || '')}" required>
                                    <div class="enhanced-field-error" style="display: none;"></div>
                                </div>
                                <div class="enhanced-form-group">
                                    <label>Status</label>
                                    <select id="edit-master-status" required>
                                        <option value="active" ${master.status === 'active' ? 'selected' : ''}>Active</option>
                                        <option value="inactive" ${master.status === 'inactive' ? 'selected' : ''}>Inactive</option>
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
                                    <input type="text" value="${master.createdAt ? new Date(master.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}" readonly>
                                </div>
                                <div class="enhanced-form-group">
                                    <label>Last Login</label>
                                    <input type="text" value="${master.lastLogin ? new Date(master.lastLogin.seconds * 1000).toLocaleString() : 'Never'}" readonly>
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
                </div>

                <div class="enhanced-modal-footer">
                    <button type="button" class="enhanced-btn enhanced-btn-secondary" onclick="this.closest('.enhanced-modal').remove()">
                        Cancel
                    </button>
                    <button type="button" class="enhanced-btn enhanced-btn-primary" onclick="adminManager.saveMasterChanges('${masterId}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <polyline points="17,21 17,13 7,13 7,21"/>
                            <polyline points="7,3 7,8 15,8"/>
                        </svg>
                        Save Changes
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Setup real-time validation
        this.setupFormValidation('edit-master-form');
    }

    async saveMasterChanges(masterId) {
        const form = document.getElementById('edit-master-form');
        if (!form) return;

        const formData = {
            name: document.getElementById('edit-master-name').value.trim(),
            email: document.getElementById('edit-master-email').value.trim(),
            status: document.getElementById('edit-master-status').value,
            role: document.getElementById('edit-master-role').value
        };

        // Validate form data
        const validation = FormValidation.validateMasterData(formData);
        if (!validation.isValid) {
            this.displayFormErrors(validation.errors);
            return;
        }

        try {
            UIHelpers.showLoadingSpinner(true);

            // Sanitize data
            const sanitizedData = {
                name: SecurityUtils.sanitizeInput(formData.name),
                email: SecurityUtils.sanitizeInput(formData.email).toLowerCase(),
                status: formData.status,
                role: formData.role,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: authGuard.getCurrentUser().uid
            };

            // Update Firestore
            await this.db.collection('users').doc(masterId).update(sanitizedData);

            // Update Firebase Auth email if changed
            const user = await firebase.auth().getUser ?
                await firebase.auth().getUser(masterId) :
                null;

            if (user && user.email !== sanitizedData.email) {
                // Note: Email update requires Firebase Admin SDK
                console.log('Email update requires server-side function');
            }

            // Log activity
            await logActivity('update_master', {
                masterId: masterId,
                changes: Object.keys(formData),
                newEmail: sanitizedData.email
            });

            UIHelpers.showToast('Master updated successfully!', 'success');
            document.querySelector('.enhanced-modal').remove();
            document.body.style.overflow = 'auto';

            // Refresh the panel
            await this.loadMasterManagementPanel();

        } catch (error) {
            console.error('❌ Error updating master:', error);
            UIHelpers.showToast('Failed to update master: ' + error.message, 'error');
        } finally {
            UIHelpers.showLoadingSpinner(false);
        }
    }

    async resetMasterPassword(masterId) {
        if (!SecurityUtils.checkRateLimit('reset_password', 3, 300000)) { // 3 attempts per 5 minutes
            UIHelpers.showToast('Too many password reset attempts. Please wait 5 minutes.', 'warning');
            return;
        }

        const confirmed = await this.showConfirmDialog(
            'Reset Master Password',
            'Are you sure you want to reset this master\'s password? They will receive an email with reset instructions.',
            'Reset Password',
            'Cancel'
        );

        if (!confirmed) return;

        try {
            UIHelpers.showLoadingSpinner(true);

            // Get master details
            const masterDoc = await this.db.collection('users').doc(masterId).get();
            if (!masterDoc.exists) {
                throw new Error('Master not found');
            }

            const master = masterDoc.data();

            // Send password reset email using Firebase Auth
            await firebase.auth().sendPasswordResetEmail(master.email);

            // Log activity
            await logActivity('reset_master_password', {
                masterId: masterId,
                masterEmail: master.email,
                resetBy: authGuard.getCurrentUser().uid
            });

            // Update last password reset timestamp
            await this.db.collection('users').doc(masterId).update({
                lastPasswordReset: firebase.firestore.FieldValue.serverTimestamp(),
                passwordResetBy: authGuard.getCurrentUser().uid
            });

            UIHelpers.showToast(`Password reset email sent to ${master.email}`, 'success');

        } catch (error) {
            console.error('❌ Error resetting password:', error);
            UIHelpers.showToast('Failed to reset password: ' + error.message, 'error');

            SecurityUtils.logSecurityIncident('password_reset_failed', {
                masterId: masterId,
                error: error.message,
                adminId: authGuard.getCurrentUser().uid
            });
        } finally {
            UIHelpers.showLoadingSpinner(false);
        }
    }

    async toggleMasterStatus(masterId, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const action = newStatus === 'active' ? 'activate' : 'deactivate';

        const confirmed = await this.showConfirmDialog(
            `${action.charAt(0).toUpperCase() + action.slice(1)} Master`,
            `Are you sure you want to ${action} this master account? This will ${newStatus === 'active' ? 'restore' : 'remove'} their access to the system.`,
            action.charAt(0).toUpperCase() + action.slice(1),
            'Cancel'
        );

        if (!confirmed) return;

        try {
            UIHelpers.showLoadingSpinner(true);

            await this.db.collection('users').doc(masterId).update({
                status: newStatus,
                statusChangedAt: firebase.firestore.FieldValue.serverTimestamp(),
                statusChangedBy: authGuard.getCurrentUser().uid
            });

            // Log activity
            await logActivity(`${action}_master`, {
                masterId: masterId,
                newStatus: newStatus,
                previousStatus: currentStatus
            });

            UIHelpers.showToast(`Master ${action}d successfully!`, 'success');

            // Refresh the panel
            await this.loadMasterManagementPanel();

        } catch (error) {
            console.error(`❌ Error ${action}ing master:`, error);
            UIHelpers.showToast(`Failed to ${action} master: ` + error.message, 'error');
        } finally {
            UIHelpers.showLoadingSpinner(false);
        }
    }

    async viewMasterDetails(masterId) {
        try {
            const masterDoc = await this.db.collection('users').doc(masterId).get();
            if (!masterDoc.exists) {
                UIHelpers.showToast('Master not found', 'error');
                return;
            }

            const master = masterDoc.data();

            // Get team members
            const teamSnapshot = await this.db.collection('users')
                .where('linkedMaster', '==', masterId)
                .get();
            const teamMembers = teamSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Get lead statistics
            const leadsSnapshot = await this.db.collection('leads')
                .where('assignedTo', '==', masterId)
                .get();
            const masterLeads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            this.showMasterDetailsModal(masterId, master, teamMembers, masterLeads);

        } catch (error) {
            console.error('❌ Error loading master details:', error);
            UIHelpers.showToast('Failed to load master details', 'error');
        }
    }

    showMasterDetailsModal(masterId, master, teamMembers, leads) {
        const modal = document.createElement('div');
        modal.className = 'enhanced-modal';
        modal.innerHTML = `
            <div class="enhanced-modal-content" style="max-width: 1000px;">
                <div class="enhanced-modal-header">
                    <h2 class="enhanced-modal-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Master Details - ${SecurityUtils.sanitizeInput(master.name || master.email)}
                    </h2>
                    <button class="enhanced-modal-close" onclick="this.closest('.enhanced-modal').remove()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                <div class="enhanced-modal-body">
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
                                    <span class="stat-value">${master.lastLogin ? new Date(master.lastLogin.seconds * 1000).toLocaleString() : 'Never'}</span>
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
                                                <strong>${SecurityUtils.sanitizeInput(member.name || 'Unnamed User')}</strong>
                                                <br><small>${SecurityUtils.sanitizeInput(member.email)}</small>
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
                                                    <td><strong>${SecurityUtils.sanitizeInput(lead.name || 'Unnamed Lead')}</strong></td>
                                                    <td>${SecurityUtils.sanitizeInput(lead.phone || 'No phone')}</td>
                                                    <td>
                                                        <span class="enhanced-status-badge ${lead.status || 'newlead'}">
                                                            ${this.getStatusText(lead.status)}
                                                        </span>
                                                    </td>
                                                    <td>${lead.createdAt ? new Date(lead.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>`
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <div class="enhanced-modal-footer">
                    <button type="button" class="enhanced-btn enhanced-btn-secondary" onclick="this.closest('.enhanced-modal').remove()">
                        Close
                    </button>
                    <button type="button" class="enhanced-btn enhanced-btn-primary" onclick="adminManager.editMaster('${masterId}'); this.closest('.enhanced-modal').remove();">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit Master
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }

    // ===================================
    // BULK OPERATIONS
    // ===================================

    toggleItemSelection(itemId, checked) {
        if (checked) {
            this.selectedItems.add(itemId);
        } else {
            this.selectedItems.delete(itemId);
        }

        this.updateBulkActionsVisibility();
    }

    selectAllItems(checked) {
        const checkboxes = document.querySelectorAll('.table-checkbox:not(.select-all)');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            this.toggleItemSelection(checkbox.dataset.itemId, checked);
        });
    }

    updateBulkActionsVisibility() {
        const bulkActions = document.querySelector('.enhanced-bulk-actions');
        if (bulkActions) {
            if (this.selectedItems.size > 0) {
                bulkActions.classList.add('visible');
            } else {
                bulkActions.classList.remove('visible');
            }
        }
    }

    async bulkExportSelected() {
        if (this.selectedItems.size === 0) {
            UIHelpers.showToast('No items selected for export', 'warning');
            return;
        }

        try {
            UIHelpers.showLoadingSpinner(true);

            const selectedIds = Array.from(this.selectedItems);
            const data = [];

            // Fetch selected items data
            for (const id of selectedIds) {
                const doc = await this.db.collection('users').doc(id).get();
                if (doc.exists) {
                    const userData = doc.data();
                    data.push({
                        ID: id,
                        Name: userData.name || 'N/A',
                        Email: userData.email || 'N/A',
                        Role: userData.role || 'N/A',
                        Status: userData.status || 'N/A',
                        CreatedDate: userData.createdAt ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
                        LastLogin: userData.lastLogin ? new Date(userData.lastLogin.seconds * 1000).toLocaleString() : 'Never'
                    });
                }
            }

            // Generate CSV
            const csvContent = this.generateCSV(data);
            this.downloadCSV(csvContent, `masters_export_${new Date().toISOString().split('T')[0]}.csv`);

            // Log activity
            await logActivity('bulk_export_masters', {
                exportedCount: data.length,
                exportedIds: selectedIds
            });

            UIHelpers.showToast(`Exported ${data.length} masters successfully!`, 'success');

        } catch (error) {
            console.error('❌ Error exporting masters:', error);
            UIHelpers.showToast('Failed to export masters: ' + error.message, 'error');
        } finally {
            UIHelpers.showLoadingSpinner(false);
        }
    }

    async bulkDeleteSelected() {
        if (this.selectedItems.size === 0) {
            UIHelpers.showToast('No items selected for deletion', 'warning');
            return;
        }

        const confirmed = await this.showConfirmDialog(
            'Bulk Delete Masters',
            `Are you sure you want to delete ${this.selectedItems.size} selected masters? This action cannot be undone and will also unlink their team members.`,
            'Delete All',
            'Cancel'
        );

        if (!confirmed) return;

        try {
            UIHelpers.showLoadingSpinner(true);

            const selectedIds = Array.from(this.selectedItems);
            const batch = this.db.batch();

            // Delete all selected masters
            for (const masterId of selectedIds) {
                const masterRef = this.db.collection('users').doc(masterId);
                batch.delete(masterRef);

                // Unlink team members
                const teamMembers = await this.db.collection('users')
                    .where('linkedMaster', '==', masterId)
                    .get();

                teamMembers.docs.forEach(memberDoc => {
                    batch.update(memberDoc.ref, {
                        linkedMaster: null,
                        unlinkReason: 'master_deleted',
                        unlinkedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
            }

            await batch.commit();

            // Log activity
            await logActivity('bulk_delete_masters', {
                deletedCount: selectedIds.length,
                deletedIds: selectedIds
            });

            UIHelpers.showToast(`Deleted ${selectedIds.length} masters successfully!`, 'success');

            // Clear selection and refresh
            this.selectedItems.clear();
            await this.loadMasterManagementPanel();

        } catch (error) {
            console.error('❌ Error deleting masters:', error);
            UIHelpers.showToast('Failed to delete masters: ' + error.message, 'error');
        } finally {
            UIHelpers.showLoadingSpinner(false);
        }
    }

    // ===================================
    // EXPORT AND DATA MANAGEMENT
    // ===================================

    async exportMasterData() {
        try {
            UIHelpers.showLoadingSpinner(true);

            // Get all masters with their statistics
            const mastersSnapshot = await this.db.collection('users')
                .where('role', '==', 'master')
                .orderBy('createdAt', 'desc')
                .get();

            const masters = mastersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Get team statistics for each master
            const exportData = [];
            for (const master of masters) {
                const teamSnapshot = await this.db.collection('users')
                    .where('linkedMaster', '==', master.id)
                    .get();

                const leadsSnapshot = await this.db.collection('leads')
                    .where('assignedTo', '==', master.id)
                    .get();

                exportData.push({
                    ID: master.id,
                    Name: master.name || 'N/A',
                    Email: master.email || 'N/A',
                    Status: master.status || 'N/A',
                    TeamSize: teamSnapshot.docs.length,
                    TotalLeads: leadsSnapshot.docs.length,
                    CreatedDate: master.createdAt ? new Date(master.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
                    LastLogin: master.lastLogin ? new Date(master.lastLogin.seconds * 1000).toLocaleString() : 'Never',
                    LastPasswordReset: master.lastPasswordReset ? new Date(master.lastPasswordReset.seconds * 1000).toLocaleString() : 'Never'
                });
            }

            // Generate and download CSV
            const csvContent = this.generateCSV(exportData);
            this.downloadCSV(csvContent, `all_masters_export_${new Date().toISOString().split('T')[0]}.csv`);

            // Log activity
            await logActivity('export_all_masters', {
                exportedCount: exportData.length
            });

            UIHelpers.showToast(`Exported ${exportData.length} masters successfully!`, 'success');

        } catch (error) {
            console.error('❌ Error exporting master data:', error);
            UIHelpers.showToast('Failed to export master data: ' + error.message, 'error');
        } finally {
            UIHelpers.showLoadingSpinner(false);
        }
    }

    generateCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [];

        // Add headers
        csvRows.push(headers.join(','));

        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                // Escape quotes and wrap in quotes if contains comma
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            });
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    }

    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // ===================================
    // ADVANCED FILTERING AND SEARCH
    // ===================================

    setupAdvancedFiltering() {
        const filterContainer = document.createElement('div');
        filterContainer.className = 'advanced-filters';
        filterContainer.innerHTML = `
            <div class="filter-row">
                <div class="filter-group">
                    <label>Filter by Status</label>
                    <select id="status-filter" onchange="adminManager.applyFilters()">
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Filter by Team Size</label>
                    <select id="team-size-filter" onchange="adminManager.applyFilters()">
                        <option value="">All Sizes</option>
                        <option value="0">No Team</option>
                        <option value="1-5">1-5 Members</option>
                        <option value="6-10">6-10 Members</option>
                        <option value="11+">11+ Members</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Created Date Range</label>
                    <input type="date" id="date-from-filter" onchange="adminManager.applyFilters()">
                    <input type="date" id="date-to-filter" onchange="adminManager.applyFilters()">
                </div>
                <div class="filter-group">
                    <button class="enhanced-btn enhanced-btn-secondary" onclick="adminManager.clearFilters()">
                        Clear Filters
                    </button>
                </div>
            </div>
        `;

        const panelHeader = document.querySelector('.panel-header');
        if (panelHeader) {
            panelHeader.after(filterContainer);
        }
    }

    applyFilters() {
        this.currentFilters = {
            status: document.getElementById('status-filter')?.value || '',
            teamSize: document.getElementById('team-size-filter')?.value || '',
            dateFrom: document.getElementById('date-from-filter')?.value || '',
            dateTo: document.getElementById('date-to-filter')?.value || ''
        };

        this.filterAndDisplayMasters();
    }

    clearFilters() {
        document.getElementById('status-filter').value = '';
        document.getElementById('team-size-filter').value = '';
        document.getElementById('date-from-filter').value = '';
        document.getElementById('date-to-filter').value = '';

        this.currentFilters = {};
        this.filterAndDisplayMasters();
    }

    async filterAndDisplayMasters() {
        try {
            UIHelpers.showLoadingSpinner(true);

            let query = this.db.collection('users').where('role', '==', 'master');

            // Apply status filter
            if (this.currentFilters.status) {
                query = query.where('status', '==', this.currentFilters.status);
            }

            // Apply date range filter
            if (this.currentFilters.dateFrom) {
                const fromDate = new Date(this.currentFilters.dateFrom);
                query = query.where('createdAt', '>=', fromDate);
            }

            if (this.currentFilters.dateTo) {
                const toDate = new Date(this.currentFilters.dateTo);
                toDate.setHours(23, 59, 59, 999); // End of day
                query = query.where('createdAt', '<=', toDate);
            }

            const snapshot = await query.orderBy('createdAt', 'desc').get();
            let masters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Apply team size filter (client-side)
            if (this.currentFilters.teamSize) {
                const allUsers = await this.db.collection('users').get();
                const regularUsers = allUsers.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(user => user.role === 'user');

                masters = masters.filter(master => {
                    const teamCount = regularUsers.filter(user => user.linkedMaster === master.id).length;

                    switch (this.currentFilters.teamSize) {
                        case '0': return teamCount === 0;
                        case '1-5': return teamCount >= 1 && teamCount <= 5;
                        case '6-10': return teamCount >= 6 && teamCount <= 10;
                        case '11+': return teamCount >= 11;
                        default: return true;
                    }
                });
            }

            // Get statistics for filtered masters
            const mastersWithStats = await this.calculateMasterStats(masters);

            // Update display
            const mastersGrid = document.getElementById('masters-grid');
            if (mastersGrid) {
                mastersGrid.innerHTML = mastersWithStats.map(master =>
                    this.renderMasterCard(master)
                ).join('');
            }

        } catch (error) {
            console.error('❌ Error filtering masters:', error);
            UIHelpers.showToast('Failed to apply filters', 'error');
        } finally {
            UIHelpers.showLoadingSpinner(false);
        }
    }

    async calculateMasterStats(masters) {
        // Get all users and leads for statistics
        const [usersSnapshot, leadsSnapshot] = await Promise.all([
            this.db.collection('users').get(),
            this.db.collection('leads').get()
        ]);

        const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allLeads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const regularUsers = allUsers.filter(user => user.role === 'user');

        return masters.map(master => {
            const teamMembers = regularUsers.filter(user => user.linkedMaster === master.id);
            const teamMemberIds = teamMembers.map(member => member.id);
            teamMemberIds.push(master.id);

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

    // ===================================
    // UTILITY FUNCTIONS
    // ===================================

    setupFormValidation(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.id.replace('edit-master-', '');
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'name':
                if (!value || value.length < 2) {
                    isValid = false;
                    errorMessage = 'Name must be at least 2 characters';
                } else if (SecurityUtils.containsDangerousContent(value)) {
                    isValid = false;
                    errorMessage = 'Name contains invalid characters';
                }
                break;

            case 'email':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Email is required';
                } else if (!FormValidation.validateEmail(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address';
                }
                break;
        }

        this.showFieldValidation(field, isValid, errorMessage);
        return isValid;
    }

    showFieldValidation(field, isValid, errorMessage) {
        const formGroup = field.closest('.enhanced-form-group');
        const errorElement = formGroup.querySelector('.enhanced-field-error');

        if (isValid) {
            formGroup.classList.remove('error');
            formGroup.classList.add('success');
            errorElement.style.display = 'none';
        } else {
            formGroup.classList.remove('success');
            formGroup.classList.add('error');
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
        }
    }

    clearFieldError(field) {
        const formGroup = field.closest('.enhanced-form-group');
        const errorElement = formGroup.querySelector('.enhanced-field-error');

        formGroup.classList.remove('error');
        errorElement.style.display = 'none';
    }

    displayFormErrors(errors) {
        Object.entries(errors).forEach(([fieldName, message]) => {
            const field = document.getElementById(`edit-master-${fieldName}`);
            if (field) {
                this.showFieldValidation(field, false, message);
            }
        });
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;

        return date.toLocaleDateString();
    }

    getStatusText(status) {
        const statusMap = {
            'newLead': 'New Lead',
            'newlead': 'New Lead',
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

    async showConfirmDialog(title, message, confirmText, cancelText) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'enhanced-modal';
            modal.innerHTML = `
                <div class="enhanced-modal-content" style="max-width: 400px;">
                    <div class="enhanced-modal-header">
                        <h2 class="enhanced-modal-title">${SecurityUtils.sanitizeInput(title)}</h2>
                    </div>
                    <div class="enhanced-modal-body">
                        <p style="font-size: 16px; line-height: 1.6; color: #64748b;">
                            ${SecurityUtils.sanitizeInput(message)}
                        </p>
                    </div>
                    <div class="enhanced-modal-footer">
                        <button type="button" class="enhanced-btn enhanced-btn-secondary" onclick="this.closest('.enhanced-modal').remove(); window.tempResolve(false);">
                            ${SecurityUtils.sanitizeInput(cancelText)}
                        </button>
                        <button type="button" class="enhanced-btn enhanced-btn-danger" onclick="this.closest('.enhanced-modal').remove(); window.tempResolve(true);">
                            ${SecurityUtils.sanitizeInput(confirmText)}
                        </button>
                    </div>
                </div>
            `;

            // Temporary global resolver
            window.tempResolve = resolve;

            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            // Clean up when modal is removed
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.removedNodes.forEach((node) => {
                            if (node === modal) {
                                document.body.style.overflow = 'auto';
                                delete window.tempResolve;
                                observer.disconnect();
                            }
                        });
                    }
                });
            });

            observer.observe(document.body, { childList: true });
        });
    }

    setupMasterEventListeners() {
        // Setup search functionality
        const searchInput = document.getElementById('master-search');
        if (searchInput) {
            searchInput.addEventListener('input', DataUtils.debounce((e) => {
                this.searchMasters(e.target.value);
            }, 300));
        }

        // Setup sorting
        const sortableHeaders = document.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const field = header.dataset.field;
                this.sortMasters(field);
            });
        });
    }

    searchMasters(searchTerm) {
        const masterCards = document.querySelectorAll('.enhanced-master-card');
        const term = searchTerm.toLowerCase().trim();

        masterCards.forEach(card => {
            const name = card.querySelector('.master-card-info h3').textContent.toLowerCase();
            const email = card.querySelector('.master-card-info p').textContent.toLowerCase();

            if (name.includes(term) || email.includes(term) || term === '') {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    sortMasters(field) {
        const grid = document.getElementById('masters-grid');
        const cards = Array.from(grid.querySelectorAll('.enhanced-master-card'));

        // Toggle sort direction
        if (this.sortConfig.field === field) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.field = field;
            this.sortConfig.direction = 'asc';
        }

        // Sort cards
        cards.sort((a, b) => {
            let aValue, bValue;

            switch (field) {
                case 'name':
                    aValue = a.querySelector('.master-card-info h3').textContent;
                    bValue = b.querySelector('.master-card-info h3').textContent;
                    break;
                case 'email':
                    aValue = a.querySelector('.master-card-info p').textContent;
                    bValue = b.querySelector('.master-card-info p').textContent;
                    break;
                case 'teamSize':
                    aValue = parseInt(a.querySelector('.master-stat-number').textContent);
                    bValue = parseInt(b.querySelector('.master-stat-number').textContent);
                    break;
                default:
                    return 0;
            }

            if (this.sortConfig.direction === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        // Re-append sorted cards
        grid.innerHTML = '';
        cards.forEach(card => grid.appendChild(card));

        // Update sort indicators
        this.updateSortIndicators();
    }

    updateSortIndicators() {
        const headers = document.querySelectorAll('.sortable');
        headers.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            if (header.dataset.field === this.sortConfig.field) {
                header.classList.add(`sort-${this.sortConfig.direction}`);
            }
        });
    }
}

// ===================================
// FORM VALIDATION EXTENSIONS
// ===================================

FormValidation.validateMasterData = function(data) {
    const errors = {};

    if (!this.validateRequired(data.name)) {
        errors.name = 'Name is required';
    } else if (!this.validateLength(data.name, 2, 50)) {
        errors.name = 'Name must be between 2 and 50 characters';
    } else if (SecurityUtils.containsDangerousContent(data.name)) {
        errors.name = 'Name contains invalid characters';
    }

    if (!this.validateRequired(data.email)) {
        errors.email = 'Email is required';
    } else if (!this.validateEmail(data.email)) {
        errors.email = 'Please enter a valid email address';
    }

    if (!['active', 'inactive'].includes(data.status)) {
        errors.status = 'Invalid status selected';
    }

    if (!['admin', 'master', 'user'].includes(data.role)) {
        errors.role = 'Invalid role selected';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// ===================================
// GLOBAL ADMIN MANAGER INSTANCE
// ===================================

const adminManager = new AdminManager();

// Export for global access
window.adminManager = adminManager;

console.log('✅ Advanced Admin Management Functions Loaded');
console.log('🔧 Available functions:', [
    'loadMasterManagementPanel',
    'editMaster',
    'resetMasterPassword',
    'toggleMasterStatus',
    'viewMasterDetails',
    'bulkExportSelected',
    'bulkDeleteSelected',
    'exportMasterData'
]);