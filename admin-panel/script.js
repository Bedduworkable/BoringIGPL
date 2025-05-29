`;
            return;
        }

        const mastersWithStats = await Promise.all(masters.map(async (master) => {
            const teamMembers = users.filter(user => user.linkedMaster === master.id);
            
            // Get leads for this master and their team
            const teamMemberIds = teamMembers.map(member => member.id);
            teamMemberIds.push(master.id);

            const leadsSnapshot = await db.collection('leads')
                .where('assignedTo', 'in', teamMemberIds.length > 0 ? teamMemberIds : ['dummy'])
                .get();

            const masterLeads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

        mastersContainer.innerHTML = mastersWithStats.map(master => 
            renderEnhancedMasterCard(master)
        ).join('');

    } catch (error) {
        console.error('❌ Error loading enhanced masters:', error);
        const mastersContainer = document.getElementById('enhanced-masters-container');
        if (mastersContainer) {
            mastersContainer.innerHTML = '<div class="loading-card">Error loading masters</div>';
        }
    }
}

function renderEnhancedMasterCard(master) {
    const statusClass = master.status === 'active' ? 'success' : 'danger';
    const lastActiveText = master.lastActive ? 
        formatEnhancedTimeAgo(master.lastActive) : 'Never logged in';

    return `
        <div class="enhanced-master-card" onclick="selectEnhancedMaster('${master.id}')">
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

            <div class="master-card-footer">
                <span class="view-team">Click to view team →</span>
            </div>
        </div>
    `;
}

// Enhanced Master Selection
async function selectEnhancedMaster(masterId) {
    console.log('👤 Selecting enhanced master:', masterId);

    selectedMasterId = masterId;
    currentView = 'users';
    currentViewStack.push({ type: 'master', id: masterId });

    const master = allMasters.find(m => m.id === masterId);
    if (!master) return;

    await logActivity('view_master_team', { masterId: masterId });

    const leadsSection = document.getElementById('leads-section');
    leadsSection.innerHTML = `
        <div class="master-management-panel">
            <div class="panel-header">
                <div class="panel-title">
                    Team Members - ${SecurityUtils.sanitizeInput(master.name || 'Unnamed Master')}
                </div>
                <div class="panel-controls">
                    <button class="enhanced-btn enhanced-btn-secondary" onclick="loadEnhancedMastersView()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5m7-7l-7 7 7 7"/>
                        </svg>
                        Back to Masters
                    </button>
                </div>
            </div>

            <div class="breadcrumb">
                <span class="breadcrumb-item" onclick="loadEnhancedMastersView()">Masters</span>
                <span class="breadcrumb-separator">→</span>
                <span class="breadcrumb-item active">${SecurityUtils.sanitizeInput(master.name || 'Master')}'s Team</span>
            </div>

            <div class="enhanced-master-grid" id="team-members-container">
                <div class="loading-card">Loading team members...</div>
            </div>
        </div>
    `;

    await loadEnhancedMasterTeam(masterId);
}

async function loadEnhancedMasterTeam(masterId) {
    try {
        const teamContainer = document.getElementById('team-members-container');
        if (!teamContainer) return;

        const teamMembers = allUsers.filter(user => user.linkedMaster === masterId);

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

        const leadsSnapshot = await db.collection('leads').get();
        const leads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const teamWithStats = teamMembers.map(user => {
            const userLeads = leads.filter(lead =>
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

        teamContainer.innerHTML = teamWithStats.map(user => renderEnhancedUserCard(user)).join('');

    } catch (error) {
        console.error('❌ Error loading enhanced master team:', error);
    }
}

function renderEnhancedUserCard(user) {
    const statusClass = user.status === 'active' ? 'success' : 'danger';
    const lastActiveText = user.lastLogin ? 
        formatEnhancedTimeAgo(new Date(user.lastLogin.seconds * 1000)) : 'Never logged in';

    return `
        <div class="enhanced-master-card" onclick="selectEnhancedUser('${user.id}')">
            <div class="master-card-header">
                <div class="enhanced-master-avatar" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                    ${(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div class="master-card-info">
                    <h3>${SecurityUtils.sanitizeInput(user.name || 'Unnamed User')}</h3>
                    <p>${SecurityUtils.sanitizeInput(user.email)}</p>
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

// Enhanced User Selection and Leads View
async function selectEnhancedUser(userId) {
    console.log('📋 Selecting enhanced user:', userId);

    selectedUserId = userId;
    currentView = 'leads';
    currentViewStack.push({ type: 'user', id: userId });

    const user = allUsers.find(u => u.id === userId);
    const master = allMasters.find(m => m.id === selectedMasterId);

    if (!user) return;

    await logActivity('view_user_leads', { userId: userId, masterId: selectedMasterId });

    const leadsSection = document.getElementById('leads-section');
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
                    Leads - ${SecurityUtils.sanitizeInput(user.name || 'Unnamed User')}
                </div>
                <div class="table-controls">
                    <div class="enhanced-search-box">
                        <input type="text" id="leads-search" placeholder="Search leads..." onkeyup="filterEnhancedUserLeads(this.value)">
                        <div class="search-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35"/>
                            </svg>
                        </div>
                    </div>
                    <button class="enhanced-btn enhanced-btn-secondary" onclick="selectEnhancedMaster('${selectedMasterId}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5m7-7l-7 7 7 7"/>
                        </svg>
                        Back to Team
                    </button>
                    <button class="enhanced-btn enhanced-btn-primary" onclick="selectEnhancedUser('${userId}')">
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
                <span class="breadcrumb-item" onclick="loadEnhancedMastersView()">Masters</span>
                <span class="breadcrumb-separator">→</span>
                <span class="breadcrumb-item" onclick="selectEnhancedMaster('${selectedMasterId}')">${SecurityUtils.sanitizeInput(master?.name || 'Master')}'s Team</span>
                <span class="breadcrumb-separator">→</span>
                <span class="breadcrumb-item active">${SecurityUtils.sanitizeInput(user.name || 'User')}'s Leads</span>
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

    await loadEnhancedUserLeads(userId);
}

async function loadEnhancedUserLeads(userId) {
    try {
        const tableBody = document.getElementById('enhanced-user-leads-table-body');
        if (!tableBody) return;

        const leadsSnapshot = await db.collection('leads')
            .where('assignedTo', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        const leads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (leads.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">No leads found for this user</td></tr>';
            return;
        }

        window.currentEnhancedUserLeads = leads;

        tableBody.innerHTML = leads.map(lead => {
            const createdAt = new Date(lead.createdAt ? lead.createdAt.seconds * 1000 : 0);
            const formattedDate = formatEnhancedDate(createdAt);

            return `
                <tr data-lead-id="${lead.id}">
                    <td><strong>${SecurityUtils.sanitizeInput(lead.name || 'Unnamed Lead')}</strong></td>
                    <td>${SecurityUtils.sanitizeInput(lead.phone || 'No phone')}</td>
                    <td>${SecurityUtils.sanitizeInput(lead.email || 'Not provided')}</td>
                    <td><span class="enhanced-status-badge ${(lead.status || 'newlead').toLowerCase()}">${getStatusText(lead.status)}</span></td>
                    <td>${SecurityUtils.sanitizeInput(lead.source || 'Not specified')}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <button class="enhanced-action-btn view" onclick="viewEnhancedLead('${lead.id}')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                            View
                        </button>
                        <button class="enhanced-action-btn edit" onclick="editEnhancedLead('${lead.id}')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edit
                        </button>
                        <button class="enhanced-action-btn delete" onclick="deleteEnhancedLead('${lead.id}')">
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
        console.error('❌ Error loading enhanced user leads:', error);
        const tableBody = document.getElementById('enhanced-user-leads-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Error loading leads. Please refresh.</td></tr>';
        }
    }
}

// Enhanced Lead Actions
async function viewEnhancedLead(leadId) {
    const lead = findLeadById(leadId);
    if (!lead) {
        showEnhancedToast('Lead not found', 'error');
        return;
    }

    await logActivity('view_lead_details', { leadId: leadId });
    showEnhancedLeadModal(lead, 'view');
}

async function editEnhancedLead(leadId) {
    const lead = findLeadById(leadId);
    if (!lead) {
        showEnhancedToast('Lead not found', 'error');
        return;
    }

    await logActivity('edit_lead_attempt', { leadId: leadId });
    showEnhancedLeadModal(lead, 'edit');
}

async function deleteEnhancedLead(leadId) {
    const lead = findLeadById(leadId);
    if (!lead) {
        showEnhancedToast('Lead not found', 'error');
        return;
    }

    const confirmed = await showEnhancedConfirmDialog(
        'Delete Lead',
        `Are you sure you want to delete the lead "${lead.name || 'Unnamed Lead'}"?\n\nThis action cannot be undone.`,
        'Delete',
        'Cancel'
    );

    if (confirmed) {
        await deleteLeadFromDatabase(leadId);
    }
}

function findLeadById(leadId) {
    return allLeads.find(l => l.id === leadId) ||
           (window.currentEnhancedUserLeads && window.currentEnhancedUserLeads.find(l => l.id === leadId));
}

// Enhanced Modal System
function showEnhancedLeadModal(lead, mode = 'view') {
    const isEditMode = mode === 'edit';
    const createdAt = new Date(lead.createdAt ? lead.createdAt.seconds * 1000 : 0);

    const existingModal = document.getElementById('enhanced-lead-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'enhanced-lead-modal';
    modal.className = 'enhanced-modal';
    modal.innerHTML = `
        <div class="enhanced-modal-content">
            <div class="enhanced-modal-header">
                <h2 class="enhanced-modal-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    ${isEditMode ? 'Edit' : 'View'} Lead - ${SecurityUtils.sanitizeInput(lead.name || 'Unnamed Lead')}
                </h2>
                <button class="enhanced-modal-close" onclick="closeEnhancedLeadModal()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <div class="enhanced-modal-body">
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
                                <input type="text" id="enhanced-lead-name" value="${SecurityUtils.sanitizeInput(lead.name || '')}" ${!isEditMode ? 'readonly' : ''} required>
                                <div class="enhanced-field-error" style="display: none;"></div>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Phone Number *</label>
                                <input type="tel" id="enhanced-lead-phone" value="${SecurityUtils.sanitizeInput(lead.phone || '')}" ${!isEditMode ? 'readonly' : ''} required>
                                <div class="enhanced-field-error" style="display: none;"></div>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Email Address</label>
                                <input type="email" id="enhanced-lead-email" value="${SecurityUtils.sanitizeInput(lead.email || '')}" ${!isEditMode ? 'readonly' : ''}>
                                <div class="enhanced-field-error" style="display: none;"></div>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Alternative Phone</label>
                                <input type="tel" id="enhanced-lead-alt-phone" value="${SecurityUtils.sanitizeInput(lead.altPhone || '')}" ${!isEditMode ? 'readonly' : ''}>
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
                                    <option value="newLead" ${lead.status === 'newLead' ? 'selected' : ''}>New Lead</option>
                                    <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                                    <option value="interested" ${lead.status === 'interested' ? 'selected' : ''}>Interested</option>
                                    <option value="followup" ${lead.status === 'followup' ? 'selected' : ''}>Follow Up</option>
                                    <option value="visit" ${lead.status === 'visit' ? 'selected' : ''}>Visit Scheduled</option>
                                    <option value="booked" ${lead.status === 'booked' ? 'selected' : ''}>Booked</option>
                                    <option value="closed" ${lead.status === 'closed' ? 'selected' : ''}>Closed</option>
                                    <option value="notinterested" ${lead.status === 'notinterested' ? 'selected' : ''}>Not Interested</option>
                                    <option value="dropped" ${lead.status === 'dropped' ? 'selected' : ''}>Dropped</option>
                                </select>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Source</label>
                                <select id="enhanced-lead-source" ${!isEditMode ? 'disabled' : ''}>
                                    <option value="" ${!lead.source ? 'selected' : ''}>Select source</option>
                                    <option value="website" ${lead.source === 'website' ? 'selected' : ''}>Website</option>
                                    <option value="facebook" ${lead.source === 'facebook' ? 'selected' : ''}>Facebook</option>
                                    <option value="instagram" ${lead.source === 'instagram' ? 'selected' : ''}>Instagram</option>
                                    <option value="google" ${lead.source === 'google' ? 'selected' : ''}>Google Ads</option>
                                    <option value="referral" ${lead.source === 'referral' ? 'selected' : ''}>Referral</option>
                                    <option value="walk-in" ${lead.source === 'walk-in' ? 'selected' : ''}>Walk-in</option>
                                    <option value="cold-call" ${lead.source === 'cold-call' ? 'selected' : ''}>Cold Call</option>
                                    <option value="other" ${lead.source === 'other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                            <div class="enhanced-form-group full-width">
                                <label>Requirements</label>
                                <textarea id="enhanced-lead-requirements" rows="4" ${!isEditMode ? 'readonly' : ''} placeholder="Enter lead requirements and notes...">${SecurityUtils.sanitizeInput(lead.requirements || '')}</textarea>
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
                                <input type="text" value="${formatEnhancedDate(createdAt)}" readonly>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Lead ID</label>
                                <input type="text" value="${lead.id}" readonly>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Last Updated</label>
                                <input type="text" value="${lead.updatedAt ? formatEnhancedDate(new Date(lead.updatedAt.seconds * 1000)) : 'Never'}" readonly>
                            </div>
                            <div class="enhanced-form-group">
                                <label>Assigned To</label>
                                <input type="text" value="${getAssignedUserName(lead.assignedTo)}" readonly>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <div class="enhanced-modal-footer">
                <button type="button" class="enhanced-btn enhanced-btn-secondary" onclick="closeEnhancedLeadModal()">
                    ${isEditMode ? 'Cancel' : 'Close'}
                </button>
                ${isEditMode ? `
                    <button type="button" class="enhanced-btn enhanced-btn-primary" onclick="saveEnhancedLeadChanges('${lead.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <polyline points="17,21 17,13 7,13 7,21"/>
                            <polyline points="7,3 7,8 15,8"/>
                        </svg>
                        Save Changes
                    </button>
                ` : `
                    <button type="button" class="enhanced-btn enhanced-btn-primary" onclick="editEnhancedLead('${lead.id}'); closeEnhancedLeadModal();">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit Lead
                    </button>
                `}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Setup enhanced form validation if in edit mode
    if (isEditMode) {
        setupEnhancedLeadFormValidation();
    }
}

function closeEnhancedLeadModal() {
    const modal = document.getElementById('enhanced-lead-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

function setupEnhancedLeadFormValidation() {
    const form = document.getElementById('enhanced-lead-form');
    if (!form) return;

    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            validateEnhancedLeadField(this);
        });
        
        input.addEventListener('blur', function() {
            validateEnhancedLeadField(this);
        });
    });
}

function validateEnhancedLeadField(field) {
    const formGroup = field.closest('.enhanced-form-group');
    if (!formGroup) return;

    let isValid = true;
    let errorMessage = '';

    const value = field.value.trim();
    const fieldName = field.id.replace('enhanced-lead-', '');

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

        case 'phone':
            if (!value) {
                isValid = false;
                errorMessage = 'Phone number is required';
            } else if (!FormValidation.validatePhone(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number';
            }
            break;

        case 'email':
            if (value && !FormValidation.validateEmail(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
            break;

        case 'alt-phone':
            if (value && !FormValidation.validatePhone(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number';
            }
            break;

        case 'requirements':
            if (value && SecurityUtils.containsDangerousContent(value)) {
                isValid = false;
                errorMessage = 'Requirements contain invalid characters';
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

async function saveEnhancedLeadChanges(leadId) {
    try {
        const form = document.getElementById('enhanced-lead-form');
        if (!form) return;

        // Validate all fields
        const inputs = form.querySelectorAll('input[required], select[required]');
        let isFormValid = true;

        inputs.forEach(input => {
            if (!validateEnhancedLeadField(input)) {
                isFormValid = false;
            }
        });

        if (!isFormValid) {
            showEnhancedToast('Please fix the errors before saving', 'warning');
            return;
        }

        const formData = {
            name: document.getElementById('enhanced-lead-name').value.trim(),
            phone: document.getElementById('enhanced-lead-phone').value.trim(),
            email: document.getElementById('enhanced-lead-email').value.trim(),
            altPhone: document.getElementById('enhanced-lead-alt-phone').value.trim(),
            status: document.getElementById('enhanced-lead-status').value,
            source: document.getElementById('enhanced-lead-source').value,
            requirements: document.getElementById('enhanced-lead-requirements').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: authGuard.getCurrentUser()?.uid
        };

        if (!formData.name || !formData.phone || !formData.status) {
            showEnhancedToast('Please fill in all required fields (Name, Phone, Status)', 'error');
            return;
        }

        // Sanitize data
        const sanitizedData = {
            name: SecurityUtils.sanitizeInput(formData.name),
            phone: SecurityUtils.sanitizeInput(formData.phone),
            email: SecurityUtils.sanitizeInput(formData.email),
            altPhone: SecurityUtils.sanitizeInput(formData.altPhone),
            status: formData.status,
            source: formData.source,
            requirements: SecurityUtils.sanitizeInput(formData.requirements),
            updatedAt: formData.updatedAt,
            updatedBy: formData.updatedBy
        };

        UIHelpers.showLoadingSpinner(true);

        await db.collection('leads').doc(leadId).update(sanitizedData);

        await logActivity('update_lead', {
            leadId: leadId,
            changes: Object.keys(sanitizedData).filter(key => key !== 'updatedAt' && key !== 'updatedBy'),
            previousStatus: findLeadById(leadId)?.status,
            newStatus: sanitizedData.status
        });

        showEnhancedToast('Lead updated successfully!', 'success');
        closeEnhancedLeadModal();

        // Refresh current view
        if (selectedUserId) {
            await selectEnhancedUser(selectedUserId);
        } else if (authGuard.hasRole('user')) {
            await loadUserLeadsDirectly();
        }

    } catch (error) {
        console.error('❌ Error saving enhanced lead:', error);
        showEnhancedToast('Error saving lead: ' + error.message, 'error');
    } finally {
        UIHelpers.showLoadingSpinner(false);
    }
}

async function deleteLeadFromDatabase(leadId) {
    try {
        UIHelpers.showLoadingSpinner(true);

        await db.collection('leads').doc(leadId).delete();

        await logActivity('delete_lead', {
            leadId: leadId,
            leadName: findLeadById(leadId)?.name || 'Unknown Lead'
        });

        showEnhancedToast('Lead deleted successfully!', 'success');

        // Refresh current view
        if (selectedUserId) {
            await selectEnhancedUser(selectedUserId);
        } else if (authGuard.hasRole('user')) {
            await loadUserLeadsDirectly();
        }

    } catch (error) {
        console.error('❌ Error deleting enhanced lead:', error);
        showEnhancedToast('Error deleting lead: ' + error.message, 'error');
    } finally {
        UIHelpers.showLoadingSpinner(false);
    }
}

// Enhanced User Leads (for regular users)
async function loadUserLeadsDirectly() {
    console.log('📋 Loading user leads directly...');

    const leadsSection = document.getElementById('leads-section');
    if (!leadsSection) return;

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
                        <input type="text" id="user-leads-search" placeholder="Search your leads..." onkeyup="filterUserLeadsDirectly(this.value)">
                        <div class="search-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35"/>
                            </svg>
                        </div>
                    </div>
                    <button class="enhanced-btn enhanced-btn-primary" onclick="loadUserLeadsDirectly()">
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

    await loadUserLeadsDirectData(currentUserId);
}

async function loadUserLeadsDirectData(userId) {
    try {
        const tableBody = document.getElementById('user-leads-direct-table-body');
        if (!tableBody) return;

        const leadsSnapshot = await db.collection('leads')
            .where('assignedTo', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        const leads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (leads.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">No leads assigned to you yet</td></tr>';
            return;
        }

        window.currentUserDirectLeads = leads;
        allLeads = leads; // Update global leads array

        tableBody.innerHTML = leads.map(lead => {
            const createdAt = new Date(lead.createdAt ? lead.createdAt.seconds * 1000 : 0);
            const formattedDate = formatEnhancedDate(createdAt);

            return `
                <tr data-lead-id="${lead.id}">
                    <td><strong>${SecurityUtils.sanitizeInput(lead.name || 'Unnamed Lead')}</strong></td>
                    <td>${SecurityUtils.sanitizeInput(lead.phone || 'No phone')}</td>
                    <td>${SecurityUtils.sanitizeInput(lead.email || 'Not provided')}</td>
                    <td><span class="enhanced-status-badge ${(lead.status || 'newlead').toLowerCase()}">${getStatusText(lead.status)}</span></td>
                    <td>${SecurityUtils.sanitizeInput(lead.source || 'Not specified')}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <button class="enhanced-action-btn view" onclick="viewEnhancedLead('${lead.id}')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                            View
                        </button>
                        <button class="enhanced-action-btn edit" onclick="editEnhancedLead('${lead.id}')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edit
                        </button>
                        <button class="enhanced-action-btn delete" onclick="deleteEnhancedLead('${lead.id}')">
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
        const tableBody = document.getElementById('user-leads-direct-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Error loading leads. Please refresh.</td></tr>';
        }
    }
}

// Enhanced Search and Filter Functions
function searchEnhancedMasters(searchTerm) {
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

function filterEnhancedUserLeads(searchTerm) {
    if (!window.currentEnhancedUserLeads) return;

    const tableBody = document.getElementById('enhanced-user-leads-table-body');
    if (!tableBody) return;

    const filteredLeads = window.currentEnhancedUserLeads.filter(lead => {
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
        const createdAt = new Date(lead.createdAt ? lead.createdAt.seconds * 1000 : 0);
        const formattedDate = formatEnhancedDate(createdAt);

        return `
            <tr data-lead-id="${lead.id}">
                <td><strong>${SecurityUtils.sanitizeInput(lead.name || 'Unnamed Lead')}</strong></td>
                <td>${SecurityUtils.sanitizeInput(lead.phone || 'No phone')}</td>
                <td>${SecurityUtils.sanitizeInput(lead.email || 'Not provided')}</td>
                <td><span class="enhanced-status-badge ${(lead.status || 'newlead').toLowerCase()}">${getStatusText(lead.status)}</span></td>
                <td>${SecurityUtils.sanitizeInput(lead.source || 'Not specified')}</td>
                <td>${formattedDate}</td>
                <td>
                    <button class="enhanced-action-btn view" onclick="viewEnhancedLead('${lead.id}')">View</button>
                    <button class="enhanced-action-btn edit" onclick="editEnhancedLead('${lead.id}')">Edit</button>
                    <button class="enhanced-action-btn delete" onclick="deleteEnhancedLead('${lead.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterUserLeadsDirectly(searchTerm) {
    if (!window.currentUserDirectLeads) return;

    const tableBody = document.getElementById('user-leads-direct-table-body');
    if (!tableBody) return;

    const filteredLeads = window.currentUserDirectLeads.filter(lead => {
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
        const createdAt = new Date(lead.createdAt ? lead.createdAt.seconds * 1000 : 0);
        const formattedDate = formatEnhancedDate(createdAt);

        return `
            <tr data-lead-id="${lead.id}">
                <td><strong>${SecurityUtils.sanitizeInput(lead.name || 'Unnamed Lead')}</strong></td>
                <td>${SecurityUtils.sanitizeInput(lead.phone || 'No phone')}</td>
                <td>${SecurityUtils.sanitizeInput(lead.email || 'Not provided')}</td>
                <td><span class="enhanced-status-badge ${(lead.status || 'newlead').toLowerCase()}">${getStatusText(lead.status)}</span></td>
                <td>${SecurityUtils.sanitizeInput(lead.source || 'Not specified')}</td>
                <td>${formattedDate}</td>
                <td>
                    <button class="enhanced-action-btn view" onclick="viewEnhancedLead('${lead.id}')">View</button>
                    <button class="enhanced-action-btn edit" onclick="editEnhancedLead('${lead.id}')">Edit</button>
                    <button class="enhanced-action-btn delete" onclick="deleteEnhancedLead('${lead.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Enhanced Utility Functions
function setEnhancedLoginLoading(loading) {
    isLoading = loading;
    const btnText = loginBtn?.querySelector('.btn-text');
    const btnSpinner = loginBtn?.querySelector('.btn-spinner');

    if (loginBtn) {
        loginBtn.disabled = loading;
        loginBtn.classList.toggle('loading', loading);

        if (loading) {
            if (btnText) btnText.style.display = 'none';
            if (btnSpinner) btnSpinner.style.display = 'block';
        } else {
            if (btnText) btnText.style.display = 'block';
            if (btnSpinner) btnSpinner.style.display = 'none';
        }
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;
        errorDiv.style.display = 'block';
        setTimeout(hideError, 6000);
    }
}

function hideError() {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

function formatEnhancedDate(date) {
    if (!date || isNaN(date)) return 'N/A';

    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    return date.toLocaleDateString('en-US', options);
}

function formatEnhancedTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

function getStatusText(status) {
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

function getAssignedUserName(userId) {
    const user = allUsers.find(u => u.id === userId);
    return user ? (user.name || user.email) : 'Unknown User';
}

// Enhanced Confirm Dialog
async function showEnhancedConfirmDialog(title, message, confirmText, cancelText) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'enhanced-modal';
        modal.innerHTML = `
            <div class="enhanced-modal-content" style="max-width: 450px;">
                <div class="enhanced-modal-header">
                    <h2 class="enhanced-modal-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        ${SecurityUtils.sanitizeInput(title)}
                    </h2>
                </div>
                <div class="enhanced-modal-body">
                    <p style="font-size: 16px; line-height: 1.6; color: #64748b; text-align: center; margin: 0;">
                        ${SecurityUtils.sanitizeInput(message)}
                    </p>
                </div>
                <div class="enhanced-modal-footer">
                    <button type="button" class="enhanced-btn enhanced-btn-secondary" onclick="this.closest('.enhanced-modal').remove(); window.tempEnhancedResolve(false);">
                        ${SecurityUtils.sanitizeInput(cancelText)}
                    </button>
                    <button type="button" class="enhanced-btn enhanced-btn-danger" onclick="this.closest('.enhanced-modal').remove(); window.tempEnhancedResolve(true);">
                        ${SecurityUtils.sanitizeInput(confirmText)}
                    </button>
                </div>
            </div>
        `;

        // Temporary global resolver
        window.tempEnhancedResolve = resolve;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Clean up when modal is removed
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.removedNodes.forEach((node) => {
                        if (node === modal) {
                            document.body.style.overflow = 'auto';
                            delete window.tempEnhancedResolve;
                            observer.disconnect();
                        }
                    });
                }
            });
        });

        observer.observe(document.body, { childList: true });
    });
}

// Placeholder functions for sections not yet implemented
async function loadTeamManagementSection() {
    console.log('👥 Team Management section - Coming soon');
}

async function loadSystemSettingsSection() {
    console.log('⚙️ System Settings section - Coming soon');
}

// Export enhanced functions for global access
window.showEnhancedSection = showEnhancedSection;
window.loadEnhancedDashboardData = loadDashboardData;
window.selectEnhancedMaster = selectEnhancedMaster;
window.selectEnhancedUser = selectEnhancedUser;
window.searchEnhancedMasters = searchEnhancedMasters;
window.filterEnhancedUserLeads = filterEnhancedUserLeads;
window.filterUserLeadsDirectly = filterUserLeadsDirectly;
window.viewEnhancedLead = viewEnhancedLead;
window.editEnhancedLead = editEnhancedLead;
window.deleteEnhancedLead = deleteEnhancedLead;
window.closeEnhancedLeadModal = closeEnhancedLeadModal;
window.saveEnhancedLeadChanges = saveEnhancedLeadChanges;
window.showEnhancedConfirmDialog = showEnhancedConfirmDialog;
window.loadUserLeadsDirectly = loadUserLeadsDirectly;
window.loadEnhancedMastersView = loadEnhancedMastersView;

// Make enhanced auth guard globally available
window.authGuard = authGuard;

console.log('✅ Enhanced Professional CRM Script Loaded');
console.log('🔧 Available enhanced functions:', Object.keys(window).filter(key =>
    typeof window[key] === 'function' && (
        key.startsWith('loadEnhanced') ||
        key.startsWith('selectEnhanced') ||
        key.startsWith('viewEnhanced') ||
        key.startsWith('editEnhanced') ||
        key.startsWith('deleteEnhanced') ||
        key.startsWith('filterEnhanced') ||
        key.startsWith('searchEnhanced') ||
        key.startsWith('showEnhanced')
    )
));

console.log('🚀 Enhanced CRM Ready - Professional Features Active');    projectId: "igplcrm",
    storageBucket: "igplcrm.firebasestorage.app",
    messagingSenderId: "688904879234",
    appId: "1:688904879234:web:3dfae5fcd879ae9a74889b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global Variables
let currentUser = null;
let allLeads = [];
let allUsers = [];
let allMasters = [];
let selectedMasterId = null;
let selectedUserId = null;
let currentView = 'masters';
let currentViewStack = [];

// Enhanced Auth Guard (Building on existing)
class EnhancedAuthGuard extends AuthGuard {
    constructor() {
        super();
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.sessionTimer = null;
        this.securityLevel = 'high';
        this.failedAttempts = 0;
        this.maxFailedAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000; // 15 minutes
    }

    async init() {
        console.log('🔐 Initializing Enhanced Security System...');
        
        // Initialize session management
        this.initSessionManagement();
        
        // Initialize security monitoring
        this.initSecurityMonitoring();
        
        // Call parent init
        return new Promise((resolve) => {
            auth.onAuthStateChanged(async (user) => {
                console.log('🔄 Enhanced auth state changed:', user ? user.email : 'No user');

                if (user) {
                    try {
                        await this.loadUserData(user);
                        await this.validateSession(user);
                        resolve(true);
                    } catch (error) {
                        console.error('❌ Enhanced auth error:', error);
                        await this.handleAuthError(error);
                        resolve(false);
                    }
                } else {
                    this.currentUser = null;
                    this.userRole = null;
                    this.clearSession();
                    resolve(false);
                }
            });
        });
    }

    async loadUserData(user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                console.log('👤 Creating enhanced user profile...');
                const newUserData = {
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    role: 'user',
                    status: 'active',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    linkedMaster: null,
                    securityLevel: 'standard',
                    lastPasswordChange: firebase.firestore.FieldValue.serverTimestamp(),
                    loginHistory: []
                };

                await db.collection('users').doc(user.uid).set(newUserData);
                this.currentUser = { uid: user.uid, email: user.email, ...newUserData };
                this.userRole = 'user';
            } else {
                const userData = userDoc.data();

                // Enhanced validation
                if (!userData.role || !['admin', 'master', 'user'].includes(userData.role)) {
                    throw new Error('Invalid user role');
                }

                if (userData.status === 'inactive') {
                    throw new Error('Account has been deactivated');
                }

                if (userData.status === 'locked') {
                    throw new Error('Account is temporarily locked due to security concerns');
                }

                this.currentUser = { uid: user.uid, email: user.email, ...userData };
                this.userRole = userData.role;
                this.securityLevel = userData.securityLevel || 'standard';
            }

            console.log('✅ Enhanced user loaded:', this.currentUser.name || this.currentUser.email, `(${this.userRole})`);

            await this.updateLoginHistory();
            await this.logSecureActivity('login_success', {
                userAgent: navigator.userAgent,
                ipAddress: await this.getClientIP(),
                securityLevel: this.securityLevel
            });

            this.updateUserInfoUI();
            this.startSessionTimer();

        } catch (error) {
            console.error('❌ Enhanced user data loading failed:', error);
            throw error;
        }
    }

    async validateSession(user) {
        const sessionData = localStorage.getItem('crm_session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                const now = Date.now();
                
                if (now - session.lastActivity > this.sessionTimeout) {
                    throw new Error('Session expired');
                }

                if (session.userId !== user.uid) {
                    throw new Error('Session user mismatch');
                }

                // Update session activity
                session.lastActivity = now;
                localStorage.setItem('crm_session', JSON.stringify(session));

            } catch (error) {
                console.warn('⚠️ Invalid session data, clearing...');
                this.clearSession();
            }
        } else {
            // Create new session
            this.createSession(user.uid);
        }
    }

    createSession(userId) {
        const sessionData = {
            userId: userId,
            startTime: Date.now(),
            lastActivity: Date.now(),
            sessionId: SecurityUtils.generateSecureToken(32),
            securityLevel: this.securityLevel
        };

        localStorage.setItem('crm_session', JSON.stringify(sessionData));
        console.log('✅ Secure session created');
    }

    startSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }

        this.sessionTimer = setInterval(() => {
            this.checkSessionTimeout();
        }, 60000); // Check every minute
    }

    checkSessionTimeout() {
        const sessionData = localStorage.getItem('crm_session');
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                const now = Date.now();
                
                if (now - session.lastActivity > this.sessionTimeout) {
                    this.handleSessionTimeout();
                }
            } catch (error) {
                console.error('❌ Session check error:', error);
                this.handleSessionTimeout();
            }
        }
    }

    async handleSessionTimeout() {
        console.warn('⏰ Session timeout detected');
        
        await this.logSecureActivity('session_timeout', {
            sessionDuration: Date.now() - JSON.parse(localStorage.getItem('crm_session') || '{}').startTime
        });

        showEnhancedToast('Your session has expired for security. Please login again.', 'warning', 6000);
        
        setTimeout(() => {
            this.signOut();
        }, 2000);
    }

    async updateLoginHistory() {
        try {
            const loginEntry = {
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                ipAddress: await this.getClientIP(),
                userAgent: navigator.userAgent,
                location: await this.getApproximateLocation(),
                sessionId: JSON.parse(localStorage.getItem('crm_session') || '{}').sessionId
            };

            await db.collection('users').doc(this.currentUser.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                loginHistory: firebase.firestore.FieldValue.arrayUnion(loginEntry)
            });

            // Keep only last 10 login entries
            const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
            const userData = userDoc.data();
            
            if (userData.loginHistory && userData.loginHistory.length > 10) {
                const recentHistory = userData.loginHistory.slice(-10);
                await db.collection('users').doc(this.currentUser.uid).update({
                    loginHistory: recentHistory
                });
            }

        } catch (error) {
            console.warn('⚠️ Could not update login history:', error);
        }
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

    async getApproximateLocation() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            return `${data.city}, ${data.country}`;
        } catch (error) {
            return 'unknown';
        }
    }

    async logSecureActivity(action, details = {}) {
        try {
            const enhancedDetails = {
                ...details,
                timestamp: Date.now(),
                sessionId: JSON.parse(localStorage.getItem('crm_session') || '{}').sessionId,
                securityLevel: this.securityLevel,
                browserFingerprint: this.getBrowserFingerprint()
            };

            await logActivity(action, enhancedDetails);
        } catch (error) {
            console.error('❌ Secure activity logging failed:', error);
        }
    }

    getBrowserFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Browser fingerprint', 2, 2);
        
        return {
            canvas: canvas.toDataURL(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    initSessionManagement() {
        // Track user activity to extend session
        let activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        let activityTimeout = null;

        const updateActivity = () => {
            if (activityTimeout) clearTimeout(activityTimeout);
            
            activityTimeout = setTimeout(() => {
                const sessionData = localStorage.getItem('crm_session');
                if (sessionData) {
                    try {
                        const session = JSON.parse(sessionData);
                        session.lastActivity = Date.now();
                        localStorage.setItem('crm_session', JSON.stringify(session));
                    } catch (error) {
                        console.error('❌ Activity update error:', error);
                    }
                }
            }, 1000);
        };

        activityEvents.forEach(event => {
            document.addEventListener(event, updateActivity, true);
        });
    }

    initSecurityMonitoring() {
        // Monitor for suspicious patterns
        let rapidClickCount = 0;
        let rapidClickTimer = null;
        
        document.addEventListener('click', () => {
            rapidClickCount++;
            
            if (rapidClickTimer) clearTimeout(rapidClickTimer);
            
            rapidClickTimer = setTimeout(() => {
                if (rapidClickCount > 50) {
                    this.logSecureActivity('suspicious_rapid_clicking', {
                        clickCount: rapidClickCount,
                        timeWindow: '10 seconds'
                    });
                }
                rapidClickCount = 0;
            }, 10000);
        });

        // Monitor console access
        let devtools = false;
        const threshold = 160;
        
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools) {
                    devtools = true;
                    this.logSecureActivity('devtools_opened', {
                        windowDimensions: {
                            outer: `${window.outerWidth}x${window.outerHeight}`,
                            inner: `${window.innerWidth}x${window.innerHeight}`
                        }
                    });
                }
            } else {
                devtools = false;
            }
        }, 500);

        // Monitor for page navigation away
        window.addEventListener('beforeunload', () => {
            this.logSecureActivity('page_unload', {
                sessionDuration: Date.now() - JSON.parse(localStorage.getItem('crm_session') || '{}').startTime
            });
        });
    }

    async handleAuthError(error) {
        this.failedAttempts++;
        
        await this.logSecureActivity('auth_error', {
            error: error.message,
            failedAttempts: this.failedAttempts,
            ipAddress: await this.getClientIP()
        });

        if (this.failedAttempts >= this.maxFailedAttempts) {
            await this.logSecureActivity('account_lockout_triggered', {
                failedAttempts: this.failedAttempts,
                lockoutDuration: this.lockoutTime
            });

            showEnhancedToast('Account temporarily locked due to multiple failed attempts', 'error', 8000);
            
            // Implement lockout logic here
            localStorage.setItem('account_locked_until', Date.now() + this.lockoutTime);
        }
    }

    clearSession() {
        localStorage.removeItem('crm_session');
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    async signOut() {
        try {
            await this.logSecureActivity('logout', {
                sessionDuration: Date.now() - JSON.parse(localStorage.getItem('crm_session') || '{}').startTime
            });

            await auth.signOut();
            this.currentUser = null;
            this.userRole = null;
            this.clearSession();
            this.redirectToLogin();
        } catch (error) {
            console.error('❌ Enhanced sign out error:', error);
        }
    }

    // Enhanced UI role application
    applyRoleBasedUI() {
        if (!this.isAuthenticated()) return;

        console.log('🎨 Applying enhanced role-based UI for role:', this.userRole);

        // Hide elements based on role
        const elementsToHide = {
            user: ['.admin-only', '.master-only'],
            master: ['.admin-only'],
            admin: []
        };

        const hideSelectors = elementsToHide[this.userRole] || [];
        hideSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = 'none';
            });
        });

        // Show role-specific elements
        const showSelectors = [`.${this.userRole}-only`, '.authenticated-only'];
        showSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = el.dataset.originalDisplay || 'block';
            });
        });

        // Update navigation based on role
        this.updateNavigationForRole();
    }

    updateNavigationForRole() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            const section = item.getAttribute('data-section');
            let shouldShow = true;

            switch (section) {
                case 'users':
                    shouldShow = this.hasAnyRole(['admin', 'master']);
                    break;
                case 'team':
                    shouldShow = this.hasRole('master');
                    break;
                case 'reports':
                    shouldShow = this.hasAnyRole(['admin', 'master']);
                    break;
                case 'settings':
                    shouldShow = this.hasRole('admin');
                    break;
            }

            if (shouldShow) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }
}

// Create enhanced auth guard instance
const authGuard = new EnhancedAuthGuard();

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
let isLoading = false;

// Enhanced Initialize App
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Enhanced Professional CRM Initializing...');

    // Show loading with enhanced progress
    showEnhancedLoadingScreen();

    setupEnhancedEventListeners();

    try {
        const isAuthenticated = await authGuard.init();
        console.log('🔐 Enhanced authentication result:', isAuthenticated);

        if (isAuthenticated) {
            console.log('✅ User authenticated, loading enhanced dashboard');
            authGuard.showDashboard();
            await loadEnhancedDashboardData();
        } else {
            console.log('❌ User not authenticated, showing enhanced login');
            authGuard.redirectToLogin();
        }
    } catch (error) {
        console.error('❌ Enhanced initialization error:', error);
        authGuard.redirectToLogin();
    } finally {
        hideEnhancedLoadingScreen();
    }
});

function showEnhancedLoadingScreen() {
    if (loadingScreen) {
        const progressBar = loadingScreen.querySelector('.progress-bar');
        if (progressBar) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress > 90) progress = 90;
                progressBar.style.width = progress + '%';
                
                if (progress >= 90) {
                    clearInterval(interval);
                }
            }, 100);
        }
    }
}

function hideEnhancedLoadingScreen() {
    setTimeout(() => {
        if (loadingScreen) {
            const progressBar = loadingScreen.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = '100%';
            }
            
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }, 300);
        }
    }, 500);
}

// Enhanced Event Listeners Setup
function setupEnhancedEventListeners() {
    if (loginForm) {
        loginForm.addEventListener('submit', handleEnhancedLogin);
    }

    // Enhanced navigation with security logging
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', async function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            console.log('📋 Enhanced navigation clicked:', section);

            // Log navigation for security
            await logActivity('navigate_to_section', { section: section });

            await showEnhancedSection(section);

            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const confirmed = await showEnhancedConfirmDialog(
                'Confirm Logout',
                'Are you sure you want to logout? Any unsaved changes will be lost.',
                'Logout',
                'Cancel'
            );
            
            if (confirmed) {
                await authGuard.signOut();
            }
        });
    }

    // Enhanced form interactions
    setupEnhancedFormHandlers();
}

function setupEnhancedFormHandlers() {
    // Real-time form validation
    const formInputs = document.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', function() {
            clearTimeout(this.validationTimeout);
            this.validationTimeout = setTimeout(() => {
                validateEnhancedInput(this);
            }, 300);
        });

        input.addEventListener('blur', function() {
            validateEnhancedInput(this);
        });
    });
}

function validateEnhancedInput(input) {
    const formGroup = input.closest('.enhanced-form-group') || input.closest('.enhanced-input-group');
    if (!formGroup) return;

    let isValid = true;
    let errorMessage = '';

    switch (input.type) {
        case 'email':
            if (input.value && !FormValidation.validateEmail(input.value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
            break;
        case 'tel':
            if (input.value && !FormValidation.validatePhone(input.value)) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number';
            }
            break;
        case 'text':
            if (input.required && !input.value.trim()) {
                isValid = false;
                errorMessage = 'This field is required';
            } else if (input.value && SecurityUtils.containsDangerousContent(input.value)) {
                isValid = false;
                errorMessage = 'Input contains invalid characters';
            }
            break;
    }

    // Update UI based on validation
    if (isValid) {
        formGroup.classList.remove('error');
        formGroup.classList.add('success');
        const errorElement = formGroup.querySelector('.enhanced-field-error');
        if (errorElement) errorElement.style.display = 'none';
    } else {
        formGroup.classList.remove('success');
        formGroup.classList.add('error');
        showEnhancedFieldError(formGroup, errorMessage);
    }
}

function showEnhancedFieldError(formGroup, message) {
    let errorElement = formGroup.querySelector('.enhanced-field-error');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'enhanced-field-error';
        formGroup.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Enhanced Login Handler
async function handleEnhancedLogin(e) {
    e.preventDefault();

    if (isLoading) return;

    // Check for account lockout
    const lockedUntil = localStorage.getItem('account_locked_until');
    if (lockedUntil && Date.now() < parseInt(lockedUntil)) {
        const remainingTime = Math.ceil((parseInt(lockedUntil) - Date.now()) / 60000);
        showEnhancedToast(`Account locked. Try again in ${remainingTime} minutes.`, 'error', 8000);
        return;
    }

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showEnhancedToast('Please fill in all fields', 'warning');
        return;
    }

    // Enhanced validation
    if (!FormValidation.validateEmail(email)) {
        showEnhancedToast('Please enter a valid email address', 'error');
        return;
    }

    if (password.length < 6) {
        showEnhancedToast('Password must be at least 6 characters', 'error');
        return;
    }

    setEnhancedLoginLoading(true);
    hideError();

    try {
        console.log('🔐 Attempting enhanced login for:', email);

        await logActivity('login_attempt', { 
            email: email,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
        });

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Enhanced login successful:', userCredential.user.email);

        // Reset failed attempts on successful login
        authGuard.failedAttempts = 0;
        localStorage.removeItem('account_locked_until');

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (authGuard.isAuthenticated()) {
            authGuard.showDashboard();
            await loadEnhancedDashboardData();
            showEnhancedToast('Welcome back! Login successful.', 'success');
        }

    } catch (error) {
        console.error('❌ Enhanced login error:', error);
        await authGuard.handleAuthError(error);

        let errorMsg = 'Login failed. Please try again.';

        switch (error.code) {
            case 'auth/user-not-found':
                errorMsg = '❌ No account found with this email address.';
                break;
            case 'auth/wrong-password':
                errorMsg = '❌ Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMsg = '❌ Please enter a valid email address.';
                break;
            case 'auth/too-many-requests':
                errorMsg = '⏳ Too many failed attempts. Please try again later.';
                break;
            case 'auth/network-request-failed':
                errorMsg = '🌐 Network error. Please check your connection.';
                break;
            case 'auth/user-disabled':
                errorMsg = '🚫 This account has been disabled.';
                break;
            default:
                errorMsg = '❌ Login failed: ' + (error.message || 'Please try again.');
        }

        showError(errorMsg);
        showEnhancedToast(errorMsg, 'error', 6000);
    } finally {
        setEnhancedLoginLoading(false);
    }
}

// Enhanced Section Navigation
async function showEnhancedSection(sectionName) {
    console.log('📋 Showing enhanced section:', sectionName);

    const contentSections = document.querySelectorAll('.content-section');
    contentSections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';

        // Reset navigation state
        currentViewStack = [];
        selectedMasterId = null;
        selectedUserId = null;

        // Load section-specific content
        switch (sectionName) {
            case 'overview':
                await loadEnhancedDashboardData();
                break;
            case 'leads':
                if (authGuard.hasRole('user')) {
                    await loadUserLeadsDirectly();
                } else {
                    currentView = 'masters';
                    await loadEnhancedMastersView();
                }
                break;
            case 'users':
                await adminManager.loadMasterManagementPanel();
                break;
            case 'reports':
                await activityLogger.loadActivityDashboard();
                break;
            case 'team':
                await loadTeamManagementSection();
                break;
            case 'settings':
                await loadSystemSettingsSection();
                break;
            default:
                console.log('ℹ️ Section not implemented:', sectionName);
        }
    } else {
        console.error('❌ Section not found:', `${sectionName}-section`);
    }
}

// Enhanced Dashboard Data Loading
async function loadEnhancedDashboardData() {
    if (!authGuard.isAuthenticated()) return;

    console.log('📊 Loading enhanced dashboard data...');

    try {
        await Promise.all([
            loadEnhancedOverviewStats(),
            loadEnhancedRecentActivity()
        ]);

        console.log('✅ Enhanced dashboard data loaded');
    } catch (error) {
        console.error('❌ Error loading enhanced dashboard data:', error);
        showEnhancedToast('Failed to load dashboard data', 'error');
    }
}

// Enhanced Masters View
async function loadEnhancedMastersView() {
    console.log('👑 Loading enhanced masters view...');

    const leadsSection = document.getElementById('leads-section');
    if (!leadsSection) return;

    leadsSection.innerHTML = `
        <div class="master-management-panel">
            <div class="panel-header">
                <div class="panel-title">
                    Masters & Teams Overview
                </div>
                <div class="panel-controls">
                    <div class="enhanced-search-box">
                        <input type="text" id="masters-search" placeholder="Search masters..." onkeyup="searchEnhancedMasters(this.value)">
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
                    <div class="enhanced-stat-label">Active Masters</div>
                </div>
            </div>

            <div class="enhanced-master-grid" id="enhanced-masters-container">
                <div class="loading-card">Loading masters...</div>
            </div>
        </div>
    `;

    await loadEnhancedMastersData();
}

async function loadEnhancedMastersData() {
    try {
        const mastersContainer = document.getElementById('enhanced-masters-container');
        if (!mastersContainer) return;

        const usersSnapshot = await db.collection('users').get();
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const masters = users.filter(user => user.role === 'master');
        allMasters = masters;
        allUsers = users;

        document.getElementById('masters-count').textContent = masters.length;

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
            `;// ===================================
// ENHANCED CORE SCRIPT WITH NEW FEATURES
// File: script.js
// Location: Replace existing /admin-panel/script.js
// Purpose: Enhanced core functionality with professional features
// ===================================

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA0ENNDjS9E2Ph054G_3RZC3sR9J1uQ3Cs",
    authDomain: "igplcrm.firebaseapp.com",
    projectId: "igplcrm