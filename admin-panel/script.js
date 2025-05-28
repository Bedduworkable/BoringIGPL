// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA0ENNDjS9E2Ph054G_3RZC3sR9J1uQ3Cs",
    authDomain: "igplcrm.firebaseapp.com",
    projectId: "igplcrm",
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
let selectedUserId = null;
let currentView = 'users';
let currentEditLeadId = null;
let currentEditLead = null;
let editRemarksList = [];

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const errorMessage = document.getElementById('error-message');
const togglePassword = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');
const logoutBtn = document.getElementById('logout-btn');

// Initialize App
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Admin Panel Initializing...');

    // Hide loading screen after initialization
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 1000);

    // Set up event listeners
    setupEventListeners();

    // Initialize auth guard
    try {
        const isAuthenticated = await authGuard.init();
        if (isAuthenticated) {
            showDashboard();
            await loadDashboardData();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showLogin();
    }
});

// Event Listeners Setup
function setupEventListeners() {
    // Login form submission
    loginForm.addEventListener('submit', handleLogin);

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        const eyeIcon = this.querySelector('svg');
        if (type === 'text') {
            eyeIcon.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
            `;
        } else {
            eyeIcon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
            `;
        }
    });

    // Navigation with role-based access
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');

            // Check access permission
            if (!checkSectionAccess(section)) {
                authGuard.showAccessDenied(`You don't have access to ${section} section`);
                return;
            }

            showSection(section);

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Logout with confirmation
    logoutBtn.addEventListener('click', async function() {
        if (confirm('Are you sure you want to logout?')) {
            await authGuard.logActivity('logout');
            await authGuard.signOut();
        }
    });

    // Search functionality with debouncing
    setupSearchListeners();

    // Set up real-time validation
    if (sanitizer) {
        sanitizer.setupRealtimeValidation();
    }
}

// Check section access based on user role
function checkSectionAccess(section) {
    if (!authGuard.isAuthenticated()) return false;

    const role = authGuard.getCurrentRole();
    const accessMatrix = {
        overview: ['admin', 'cp', 'employee'],
        leads: ['admin', 'cp', 'employee'],
        users: ['admin', 'cp'] // Only admin and cp can manage users
    };

    return accessMatrix[section]?.includes(role) ?? false;
}

// Setup search listeners with debouncing
function setupSearchListeners() {
    const searchFields = [
        { id: 'user-search', handler: debounce(filterUserCards, 300) },
        { id: 'user-leads-search', handler: debounce(() => filterTable('user-leads-table'), 300) },
        { id: 'all-leads-search', handler: debounce(() => filterTable('all-leads-table'), 300) },
        { id: 'users-search', handler: debounce(() => filterTable('users-table'), 300) }
    ];

    searchFields.forEach(({ id, handler }) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', function() {
                handler(this.value);
            });
        }
    });
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Enhanced Login Handler with Security
async function handleLogin(e) {
    e.preventDefault();

    const email = sanitizer.sanitize(document.getElementById('email').value, 'email');
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }

   // Rate limiting - only if user is authenticated
   if (authGuard.currentUser && !await authGuard.checkRateLimit('login', 5, 300000)) {
       return;
   }
    setLoginLoading(true);
    hideError();

    try {
        console.log('🔐 Attempting login for:', email);

        const userCredential = await auth.signInWithEmailAndPassword(email, password);

        // The authGuard will handle the rest of the authentication flow
        await authGuard.logActivity('login_success');

        console.log('✅ Login successful');

    } catch (error) {
        console.error('❌ Login error:', error);
        await authGuard.logActivity('login_failed', { error: error.code });

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
                errorMsg = '🚫 This account has been disabled. Please contact administrator.';
                break;
            default:
                errorMsg = '❌ Login failed: ' + (error.message || 'Please try again.');
        }

        showError(errorMsg);
    } finally {
        setLoginLoading(false);
    }
}

// UI Helper Functions
function showLogin() {
    loginPage.style.display = 'flex';
    dashboardPage.style.display = 'none';
    document.body.style.background = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
}

function showDashboard() {
    loginPage.style.display = 'none';
    dashboardPage.style.display = 'flex';
    document.body.style.background = '#f7f8fc';

    // Apply role-based UI immediately
    authGuard.applyRoleBasedUI();
}

function showSection(sectionName) {
    // Hide all sections first
    contentSections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';

        // Load section-specific data with role-based filtering
        switch (sectionName) {
            case 'overview':
                loadDashboardData();
                break;
            case 'leads':
                loadUsersList();
                break;
            case 'users':
                if (authGuard.hasAnyRole(['admin', 'cp'])) {
                    loadUsers();
                } else {
                    authGuard.showAccessDenied('You cannot access user management');
                }
                break;
        }
    }
}

// Enhanced Dashboard Data Loading with Role-Based Filtering
async function loadDashboardData() {
    if (!authGuard.requireAuth()) return;

    console.log('📊 Loading dashboard data...');

    try {
        // Load data based on user role
        const role = authGuard.getCurrentRole();
        const currentUserId = authGuard.getCurrentUser()?.uid;

        if (role === 'admin') {
            // Admin sees all data
            await Promise.all([
                loadOverviewStats(),
                loadRecentActivity()
            ]);
        } else if (role === 'cp') {
            // CP sees their team's data
            await Promise.all([
                loadOverviewStats(currentUserId, 'cp'),
                loadRecentActivity(currentUserId, 'cp')
            ]);
        } else {
            // Employee sees only their data
            await Promise.all([
                loadOverviewStats(currentUserId, 'employee'),
                loadRecentActivity(currentUserId, 'employee')
            ]);
        }

        console.log('✅ Dashboard data loaded');
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

// Role-based overview stats
async function loadOverviewStats(userId = null, userRole = null) {
    try {
        let leadsQuery = db.collection('leads');
        let usersQuery = db.collection('users');

        // Apply role-based filtering
        if (userRole === 'employee' && userId) {
            leadsQuery = leadsQuery.where('assignedTo', '==', userId);
        } else if (userRole === 'cp' && userId) {
            // CP sees leads from their team - this would need team structure implementation
            // For now, show leads assigned to or created by CP
            leadsQuery = leadsQuery.where('assignedTo', '==', userId);
        }

        const [leadsSnapshot, usersSnapshot] = await Promise.all([
            leadsQuery.get(),
            authGuard.hasAnyRole(['admin', 'cp']) ? usersQuery.get() : Promise.resolve({ docs: [] })
        ]);

        const leads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Calculate stats
        const totalLeads = leads.length;
        const totalUsers = authGuard.hasAnyRole(['admin', 'cp']) ? users.length : 0;

        // New leads today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newLeadsToday = leads.filter(lead => {
            const createdAt = lead.createdAt ? new Date(lead.createdAt) : new Date(0);
            return createdAt >= today;
        }).length;

        // Conversion rate (booked + closed / total leads)
        const bookedLeads = leads.filter(lead =>
            lead.status && ['booked', 'closed'].includes(lead.status.toLowerCase())
        ).length;
        const conversionRate = totalLeads > 0 ? Math.round((bookedLeads / totalLeads) * 100) : 0;

        // Update UI with sanitized data
        updateStatCard('total-leads', totalLeads);
        updateStatCard('total-users', totalUsers);
        updateStatCard('new-leads-today', newLeadsToday);
        updateStatCard('conversion-rate', `${conversionRate}%`);

        // Store for later use
        allLeads = leads;
        allUsers = users;

    } catch (error) {
        console.error('❌ Error loading overview stats:', error);

        // Show placeholder data
        updateStatCard('total-leads', '-');
        updateStatCard('total-users', '-');
        updateStatCard('new-leads-today', '-');
        updateStatCard('conversion-rate', '-%');
    }
}

// Helper to safely update stat cards
function updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = sanitizer.sanitizeDisplayText(String(value));
    }
}

// Role-based recent activity
async function loadRecentActivity(userId = null, userRole = null) {
    try {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;

        // Filter recent leads based on role
        let recentLeads = allLeads;

        if (userRole === 'employee' && userId) {
            recentLeads = allLeads.filter(lead =>
                lead.assignedTo === userId || lead.createdBy === userId
            );
        }

        // Sort and limit to 5 most recent
        recentLeads = recentLeads
            .sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA;
            })
            .slice(0, 5);

        if (recentLeads.length === 0) {
            activityList.innerHTML = createNoActivityHTML();
            return;
        }

        // Create safe HTML for activities
        activityList.innerHTML = recentLeads.map(lead => {
            const createdAt = new Date(lead.createdAt || 0);
            const timeAgo = getTimeAgo(createdAt);
            const safeName = sanitizer.sanitizeDisplayText(lead.name || 'Unnamed Lead');

            return `
                <div class="activity-item">
                    <div class="activity-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <div class="activity-content">
                        <p>New lead: <strong>${safeName}</strong></p>
                        <span class="activity-time">${timeAgo}</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('❌ Error loading recent activity:', error);
        const activityList = document.getElementById('activity-list');
        if (activityList) {
            activityList.innerHTML = createErrorActivityHTML();
        }
    }
}

// Helper functions for activity HTML
function createNoActivityHTML() {
    return `
        <div class="activity-item">
            <div class="activity-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="6" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
            </div>
            <div class="activity-content">
                <p>No recent activity</p>
                <span class="activity-time">Start by adding some leads</span>
            </div>
        </div>
    `;
}

function createErrorActivityHTML() {
    return `
        <div class="activity-item">
            <div class="activity-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="6" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
            </div>
            <div class="activity-content">
                <p>Error loading activity</p>
                <span class="activity-time">Please refresh to try again</span>
            </div>
        </div>
    `;
}

// Enhanced Users List with Role-Based Access
async function loadUsersList() {
    if (!authGuard.requireAuth()) return;

    console.log('👥 Loading users list...');
    currentView = 'users';

    // Show user list view, hide others
    document.getElementById('user-list-view').style.display = 'block';
    document.getElementById('user-leads-view').style.display = 'none';
    document.getElementById('all-leads-view').style.display = 'none';

    const usersList = document.getElementById('users-list');
    usersList.innerHTML = createLoadingUserCardHTML();

    try {
        // Load data based on role
        const role = authGuard.getCurrentRole();
        const currentUserId = authGuard.getCurrentUser()?.uid;

        let usersQuery = db.collection('users');
        let leadsQuery = db.collection('leads');

        // Apply role-based filtering
        if (role === 'employee') {
            // Employees can only see leads assigned to them
            leadsQuery = leadsQuery.where('assignedTo', '==', currentUserId);
            // Show only themselves in user list for leads context
            usersQuery = usersQuery.where(firebase.firestore.FieldPath.documentId(), '==', currentUserId);
        } else if (role === 'cp') {
            // CP sees their team - would need proper team structure
            // For now, filter out admin users
            usersQuery = usersQuery.where('role', '!=', 'admin');
        }
        // Admin sees all users (no filter needed)

        const [usersSnapshot, leadsSnapshot] = await Promise.all([
            usersQuery.get(),
            leadsQuery.get()
        ]);

        allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allLeads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (allUsers.length === 0) {
            usersList.innerHTML = createNoUsersHTML();
            return;
        }

        // Calculate leads stats for each user and render
        renderUsersWithStats();

        console.log('✅ Users list loaded successfully');

    } catch (error) {
        console.error('❌ Error loading users list:', error);
        usersList.innerHTML = createErrorUserCardHTML();
        authGuard.logActivity('error', { action: 'load_users_list', error: error.message });
    }
}

// Render users with calculated stats
function renderUsersWithStats() {
    const usersList = document.getElementById('users-list');

    // Calculate leads stats for each user
    const usersWithStats = allUsers.map(user => {
        const userLeads = allLeads.filter(lead =>
            lead.assignedTo === user.id ||
            lead.assignedTo === user.email ||
            lead.createdBy === user.id ||
            lead.createdBy === user.email
        );

        // Leads created this month
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const thisMonthLeads = userLeads.filter(lead => {
            const createdAt = new Date(lead.createdAt || 0);
            return createdAt >= thisMonth;
        }).length;

        return {
            ...user,
            totalLeads: userLeads.length,
            thisMonthLeads: thisMonthLeads
        };
    });

    // Sort by total leads (descending)
    usersWithStats.sort((a, b) => b.totalLeads - a.totalLeads);

    // Render user cards with sanitized data
    usersList.innerHTML = usersWithStats.map(user => {
        const safeName = sanitizer.sanitizeDisplayText(user.name || 'Unnamed User');
        const safeEmail = sanitizer.sanitizeDisplayText(user.email);
        const initials = (user.name || user.email || 'U').charAt(0).toUpperCase();

        return `
            <div class="user-card" onclick="selectUser('${user.id}')" data-user-id="${user.id}">
                <div class="user-header">
                    <div class="user-avatar">${initials}</div>
                    <div class="user-details">
                        <h4>${safeName}</h4>
                        <p>${safeEmail}</p>
                    </div>
                </div>
                <div class="user-stats">
                    <span>Total Leads: <span class="highlight">${user.totalLeads}</span></span>
                    <span>This Month: <span class="highlight">${user.thisMonthLeads}</span></span>
                </div>
            </div>
        `;
    }).join('');
}

// Helper HTML creators
function createLoadingUserCardHTML() {
    return `
        <div class="user-card">
            <div class="user-header">
                <div class="user-avatar">L</div>
                <div class="user-details">
                    <h4>Loading users...</h4>
                    <p>Please wait</p>
                </div>
            </div>
            <div class="user-stats">
                <span>Total Leads: <span class="highlight">-</span></span>
                <span>This Month: <span class="highlight">-</span></span>
            </div>
        </div>
    `;
}

function createNoUsersHTML() {
    return `
        <div class="user-card">
            <div class="user-header">
                <div class="user-avatar">!</div>
                <div class="user-details">
                    <h4>No users found</h4>
                    <p>No users available for your role</p>
                </div>
            </div>
            <div class="user-stats">
                <span>Total Leads: <span class="highlight">0</span></span>
                <span>This Month: <span class="highlight">0</span></span>
            </div>
        </div>
    `;
}

function createErrorUserCardHTML() {
    return `
        <div class="user-card">
            <div class="user-header">
                <div class="user-avatar">!</div>
                <div class="user-details">
                    <h4>Error loading users</h4>
                    <p>Please refresh to try again</p>
                </div>
            </div>
            <div class="user-stats">
                <span>Total Leads: <span class="highlight">-</span></span>
                <span>This Month: <span class="highlight">-</span></span>
            </div>
        </div>
    `;
}

// Enhanced Select User with Security Checks
async function selectUser(userId) {
    if (!authGuard.requireAuth()) return;

    // Check if user can access this user's data
    if (!authGuard.canAccessUser(userId)) {
        authGuard.showAccessDenied("You don't have permission to view this user's leads");
        return;
    }

    console.log('👤 Selecting user:', userId);
    selectedUserId = userId;
    currentView = 'user-leads';

    // Find the user
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }

    // Update active user card
    document.querySelectorAll('.user-card').forEach(card => {
        card.classList.remove('active');
    });
    const userCard = document.querySelector(`[data-user-id="${userId}"]`);
    if (userCard) userCard.classList.add('active');

    // Show user leads view
    document.getElementById('user-list-view').style.display = 'none';
    document.getElementById('user-leads-view').style.display = 'block';
    document.getElementById('all-leads-view').style.display = 'none';

    // Update header with sanitized name
    const safeName = sanitizer.sanitizeDisplayText(user.name || 'Unnamed User');
    document.getElementById('selected-user-name').textContent = `${safeName}'s Leads`;

    // Load user's leads
    await loadUserLeads(userId);

    // Log activity
    await authGuard.logActivity('view_user_leads', { targetUserId: userId });
}

// Enhanced Lead Loading with Security
async function loadUserLeads(userId) {
    if (!authGuard.requireAuth()) return;

    console.log('📋 Loading leads for user:', userId);

    const tableBody = document.querySelector('#user-leads-table tbody');
    tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Loading user leads...</td></tr>';

    try {
        // Load leads with proper filtering
        const userLeads = allLeads.filter(lead => {
            // Check if current user can access this lead
            return authGuard.canAccessLead(lead) && (
                lead.assignedTo === userId ||
                lead.assignedTo === allUsers.find(u => u.id === userId)?.email ||
                lead.createdBy === userId ||
                lead.createdBy === allUsers.find(u => u.id === userId)?.email
            );
        });

        if (userLeads.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">No leads found for this user</td></tr>';
            return;
        }

        // Sort by creation date (newest first)
        const sortedLeads = userLeads.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        // Render leads with sanitized data
        tableBody.innerHTML = sortedLeads.map(lead => createLeadTableRow(lead)).join('');

    } catch (error) {
        console.error('❌ Error loading user leads:', error);
        tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Error loading leads. Please refresh.</td></tr>';
        authGuard.logActivity('error', { action: 'load_user_leads', error: error.message });
    }
}

// Create sanitized lead table row
function createLeadTableRow(lead, includeAssignedTo = false) {
    const createdAt = new Date(lead.createdAt || 0);
    const formattedDate = formatDate(createdAt);
    const safeName = sanitizer.sanitizeDisplayText(lead.name || 'Unnamed Lead');
    const safePhone = sanitizer.sanitizeDisplayText(lead.phone || 'No phone');
    const safeEmail = sanitizer.sanitizeDisplayText(lead.email || 'Not provided');
    const safeSource = sanitizer.sanitizeDisplayText(lead.source || 'Not specified');
    const status = lead.status || 'newLead';

    let assignedToColumn = '';
    if (includeAssignedTo) {
        const assignedUser = allUsers.find(u => u.id === lead.assignedTo || u.email === lead.assignedTo);
        const assignedTo = assignedUser ?
            sanitizer.sanitizeDisplayText(assignedUser.name || assignedUser.email) :
            sanitizer.sanitizeDisplayText(lead.assignedTo || 'Unassigned');
        assignedToColumn = `<td>${assignedTo}</td>`;
    }

    return `
        <tr>
            <td><strong>${safeName}</strong></td>
            <td>${safePhone}</td>
            <td>${safeEmail}</td>
            <td><span class="status-badge status-${status.toLowerCase()}">${getStatusText(status)}</span></td>
            <td>${safeSource}</td>
            ${assignedToColumn}
            <td>${formattedDate}</td>
            <td>
                <button class="action-btn view" onclick="viewLead('${lead.id}')">View</button>
                ${authGuard.canAccessLead(lead) ? `<button class="action-btn edit" onclick="editLead('${lead.id}')">Edit</button>` : ''}
                ${canDeleteLead(lead) ? `<button class="action-btn delete" onclick="confirmDeleteLead('${lead.id}')">Delete</button>` : ''}
            </td>
        </tr>
    `;
}

// Check if user can delete lead
function canDeleteLead(lead) {
    if (!authGuard.isAuthenticated()) return false;

    const currentUserId = authGuard.getCurrentUser()?.uid;

    // Admin can delete any lead
    if (authGuard.hasRole('admin')) return true;

    // Original creator can delete
    if (lead.createdBy === currentUserId) return true;

    return false;
}

// Enhanced Delete with Confirmation
async function confirmDeleteLead(leadId) {
    if (!authGuard.requireAuth()) return;

    const lead = allLeads.find(l => l.id === leadId);
    if (!lead) {
        showToast('Lead not found', 'error');
        return;
    }

    if (!canDeleteLead(lead)) {
        authGuard.showAccessDenied("You don't have permission to delete this lead");
        return;
    }

    // Rate limiting for delete operations
    if (!await authGuard.checkRateLimit('delete_lead', 10, 60000)) {
        return;
    }

    const safeName = sanitizer.sanitizeDisplayText(lead.name || 'Unnamed Lead');
    const confirmMessage = `Are you sure you want to delete lead "${safeName}"?\n\nThis action cannot be undone.`;

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        // Delete from Firestore
        await db.collection('leads').doc(leadId).delete();

        // Log the deletion
        await authGuard.logActivity('delete_lead', {
            leadId: leadId,
            leadName: lead.name,
            leadPhone: lead.phone
        });

        showToast('Lead deleted successfully', 'success');

        // Refresh the current view
        refreshCurrentView();

    } catch (error) {
        console.error('❌ Error deleting lead:', error);
        showToast('Error deleting lead: ' + error.message, 'error');
        authGuard.logActivity('error', { action: 'delete_lead', error: error.message });
    }
}

// Enhanced filtering functions
function filterUserCards(searchTerm) {
    const userCards = document.querySelectorAll('.user-card');
    const sanitizedSearch = sanitizer.sanitize(searchTerm, 'text').toLowerCase();

    userCards.forEach(card => {
        const name = card.querySelector('h4').textContent.toLowerCase();
        const email = card.querySelector('p').textContent.toLowerCase();

        if (name.includes(sanitizedSearch) || email.includes(sanitizedSearch)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function filterTable(tableId, searchTerm = '') {
    const table = document.getElementById(tableId);
    if (!table) return;

    const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
    const sanitizedSearch = sanitizer.sanitize(searchTerm, 'text').toLowerCase();

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        let matchFound = false;

        for (let j = 0; j < cells.length - 1; j++) { // -1 to skip actions column
            const cellText = cells[j].textContent.toLowerCase();
            if (cellText.includes(sanitizedSearch)) {
                matchFound = true;
                break;
            }
        }

        row.style.display = matchFound ? '' : 'none';
    }
}

// Utility functions
function setLoginLoading(isLoading) {
    const btnText = document.querySelector('.btn-text');
    const btnSpinner = document.querySelector('.btn-spinner');

    loginBtn.disabled = isLoading;

    if (isLoading) {
        btnText.style.display = 'none';
        btnSpinner.style.display = 'block';
    } else {
        btnText.style.display = 'block';
        btnSpinner.style.display = 'none';
    }
}

function showError(message) {
    const safeMessage = sanitizer.sanitizeDisplayText(message);
    errorMessage.innerHTML = safeMessage;
    errorMessage.style.display = 'block';

    setTimeout(hideError, 5000);
}

function hideError() {
    errorMessage.style.display = 'none';
}

function showToast(message, type = 'success') {
    // Remove existing toasts
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    // Create new toast with sanitized message
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;

    const safeMessage = sanitizer.sanitizeDisplayText(message);
    const iconSvg = type === 'success'
        ? '<polyline points="20,6 9,17 4,12"/>'
        : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';

    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${iconSvg}
                </svg>
            </div>
            <div class="toast-message">${safeMessage}</div>
        </div>
    `;

    document.body.appendChild(toast);
    toast.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Enhanced utility functions
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

function formatDate(date) {
    if (!date) return 'N/A';

    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    return date.toLocaleDateString('en-US', options);
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        return formatDate(date);
    }
}

function refreshCurrentView() {
    // Clear cached data
    allLeads = [];

    switch (currentView) {
        case 'users':
            loadUsersList();
            break;
        case 'user-leads':
            if (selectedUserId) {
                loadUserLeads(selectedUserId);
            }
            break;
        case 'all-leads':
            // Implement if needed
            break;
    }

    // Also refresh overview stats
    loadOverviewStats();
}
// Working Lead View Function
function viewLead(leadId) {
    const lead = allLeads.find(l => l.id === leadId);
    if (!lead) {
        showToast('Lead not found', 'error');
        return;
    }

    // Check permission
    if (!authGuard.canAccessLead(lead)) {
        authGuard.showAccessDenied("You don't have permission to view this lead");
        return;
    }

    // Show the modal
    showLeadDetailModal(lead);
}

// Show Lead Detail Modal
function showLeadDetailModal(lead) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('lead-detail-modal');
    if (!modal) {
        modal = createLeadDetailModal();
        document.body.appendChild(modal);
    }

    // Set title
    document.getElementById('lead-detail-title').textContent = `Lead: ${lead.name || 'Unnamed Lead'}`;

    // Personal Information
    document.getElementById('detail-name').textContent = sanitizer.sanitizeDisplayText(lead.name || 'Not provided');
    document.getElementById('detail-phone').textContent = sanitizer.sanitizeDisplayText(lead.phone || 'Not provided');
    document.getElementById('detail-email').textContent = sanitizer.sanitizeDisplayText(lead.email || 'Not provided');

    // Lead Information
    const statusElement = document.getElementById('detail-status');
    const status = lead.status || 'newLead';
    statusElement.textContent = getStatusText(status);
    statusElement.className = `status-badge status-${status.toLowerCase()}`;

    document.getElementById('detail-source').textContent = sanitizer.sanitizeDisplayText(lead.source || 'Not specified');
    document.getElementById('detail-budget').textContent = sanitizer.sanitizeDisplayText(lead.budget || 'Not specified');
    document.getElementById('detail-property-type').textContent = sanitizer.sanitizeDisplayText(lead.propertyType || 'Not specified');
    document.getElementById('detail-location').textContent = sanitizer.sanitizeDisplayText(lead.location || 'Not specified');

    // Assignment Information
    const assignedUser = allUsers.find(u => u.id === lead.assignedTo || u.email === lead.assignedTo);
    document.getElementById('detail-assigned-to').textContent = assignedUser ?
        sanitizer.sanitizeDisplayText(assignedUser.name || assignedUser.email) :
        sanitizer.sanitizeDisplayText(lead.assignedTo || 'Unassigned');

    const createdUser = allUsers.find(u => u.id === lead.createdBy || u.email === lead.createdBy);
    document.getElementById('detail-created-by').textContent = createdUser ?
        sanitizer.sanitizeDisplayText(createdUser.name || createdUser.email) :
        sanitizer.sanitizeDisplayText(lead.createdBy || 'Unknown');

    const createdAt = lead.createdAt ? (lead.createdAt.toDate ? lead.createdAt.toDate() : new Date(lead.createdAt)) : new Date();
    document.getElementById('detail-created-date').textContent = formatDetailDate(createdAt);

    // Remarks
    const remarksContainer = document.getElementById('detail-remarks');
    if (lead.remarks && Array.isArray(lead.remarks) && lead.remarks.length > 0) {
        remarksContainer.innerHTML = lead.remarks.map((remark, index) => {
            const remarkDate = remark.timestamp ? (remark.timestamp.toDate ? remark.timestamp.toDate() : new Date(remark.timestamp)) : new Date();
            return `
                <div class="remark-item">
                    <div class="remark-header">
                        <span class="remark-author">${sanitizer.sanitizeDisplayText(remark.by || 'Unknown User')}</span>
                        <span class="remark-date">${formatDetailDate(remarkDate)}</span>
                    </div>
                    <div class="remark-text">${sanitizer.sanitizeDisplayText(remark.text || 'No content')}</div>
                </div>
            `;
        }).join('');
    } else {
        remarksContainer.innerHTML = '<p class="no-data">No remarks added yet</p>';
    }

    // Store current lead for actions
    modal.dataset.leadId = lead.id;

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Log activity
    authGuard.logActivity('view_lead', { leadId: lead.id, leadName: lead.name });
}

// Create Lead Detail Modal HTML
function createLeadDetailModal() {
    const modal = document.createElement('div');
    modal.id = 'lead-detail-modal';
    modal.className = 'modal';
    modal.style.display = 'none';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="lead-detail-title">Lead Details</h2>
                <button class="modal-close" onclick="closeLeadModal()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <div class="modal-body">
                <div class="lead-detail-grid">
                    <!-- Personal Information -->
                    <div class="detail-section">
                        <div class="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            Personal Information
                        </div>
                        <div class="detail-content">
                            <div class="detail-item">
                                <label>Full Name</label>
                                <span id="detail-name">-</span>
                            </div>
                            <div class="detail-item">
                                <label>Phone Number</label>
                                <span id="detail-phone">-</span>
                            </div>
                            <div class="detail-item">
                                <label>Email Address</label>
                                <span id="detail-email">-</span>
                            </div>
                        </div>
                    </div>

                    <!-- Lead Information -->
                    <div class="detail-section">
                        <div class="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 9.5L12 4l9 5.5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11z"/>
                                <polyline points="9,22 9,12 15,12 15,22"/>
                            </svg>
                            Lead Information
                        </div>
                        <div class="detail-content">
                            <div class="detail-item">
                                <label>Status</label>
                                <span id="detail-status" class="status-badge">-</span>
                            </div>
                            <div class="detail-item">
                                <label>Source</label>
                                <span id="detail-source">-</span>
                            </div>
                            <div class="detail-item">
                                <label>Budget</label>
                                <span id="detail-budget">-</span>
                            </div>
                            <div class="detail-item">
                                <label>Property Type</label>
                                <span id="detail-property-type">-</span>
                            </div>
                            <div class="detail-item">
                                <label>Location</label>
                                <span id="detail-location">-</span>
                            </div>
                        </div>
                    </div>

                    <!-- Assignment Information -->
                    <div class="detail-section">
                        <div class="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            Assignment & Tracking
                        </div>
                        <div class="detail-content">
                            <div class="detail-item">
                                <label>Assigned To</label>
                                <span id="detail-assigned-to">-</span>
                            </div>
                            <div class="detail-item">
                                <label>Created By</label>
                                <span id="detail-created-by">-</span>
                            </div>
                            <div class="detail-item">
                                <label>Created Date</label>
                                <span id="detail-created-date">-</span>
                            </div>
                        </div>
                    </div>

                    <!-- Remarks Section -->
                    <div class="detail-section full-width">
                        <div class="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                            </svg>
                            Remarks & Notes
                        </div>
                        <div class="detail-content">
                            <div id="detail-remarks" class="remarks-list">
                                <p class="no-data">No remarks added yet</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeLeadModal()">Close</button>
                <button class="btn btn-primary" onclick="editLeadFromModal()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit Lead
                </button>
                ${canDeleteLead ? `
                <button class="btn btn-danger" onclick="deleteLeadFromModal()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                    Delete Lead
                </button>` : ''}
            </div>
        </div>
    `;

    return modal;
}

// Close modal functions
function closeLeadModal() {
    const modal = document.getElementById('lead-detail-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function editLeadFromModal() {
    const modal = document.getElementById('lead-detail-modal');
    const leadId = modal?.dataset?.leadId;

    if (leadId) {
        const lead = allLeads.find(l => l.id === leadId);
        if (lead) {
            // For now, show detailed lead info for editing
            showToast(`Edit Lead: ${lead.name} | Phone: ${lead.phone} | Status: ${lead.status || 'newLead'}`, 'info');

            // Log the edit attempt (without await to avoid permission issues)
            try {
                authGuard.logActivity('attempt_edit_lead', { leadId });
            } catch (error) {
                console.log('Could not log activity:', error);
            }
        }
    }

    closeLeadModal();
}

function deleteLeadFromModal() {
    const modal = document.getElementById('lead-detail-modal');
    const leadId = modal?.dataset?.leadId;

    closeLeadModal();

    if (leadId) {
        confirmDeleteLead(leadId);
    }
}

// Complete Edit Lead Function
function editLead(leadId) {
    const lead = allLeads.find(l => l.id === leadId);
    if (!lead) {
        showToast('Lead not found', 'error');
        return;
    }

    // Check permission
    if (!authGuard.canAccessLead(lead)) {
        authGuard.showAccessDenied("You don't have permission to edit this lead");
        return;
    }

    // Show edit modal
    showEditLeadModal(lead);
}

// Show Edit Lead Modal
function showEditLeadModal(lead) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('edit-lead-modal');
    if (!modal) {
        modal = createEditLeadModal();
        document.body.appendChild(modal);
    }

    // Store current lead being edited
    window.currentEditingLead = lead;

    // Set modal title
    document.getElementById('edit-modal-title').textContent = `Edit Lead: ${lead.name || 'Unnamed Lead'}`;

    // Populate form fields
    populateEditForm(lead);

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Log activity
    authGuard.logActivity('start_edit_lead', { leadId: lead.id, leadName: lead.name });
}

// Create Edit Lead Modal HTML
function createEditLeadModal() {
    const modal = document.createElement('div');
    modal.id = 'edit-lead-modal';
    modal.className = 'modal';
    modal.style.display = 'none';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2 id="edit-modal-title">Edit Lead</h2>
                <button class="modal-close" onclick="closeEditModal()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <div class="modal-body">
                <form id="edit-lead-form" class="edit-form">
                    <!-- Personal Information -->
                    <div class="form-section">
                        <h3 class="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            Personal Information
                        </h3>

                        <div class="form-grid">
                            <div class="form-group">
                                <label for="edit-name">Full Name *</label>
                                <input type="text" id="edit-name" required placeholder="Enter full name">
                            </div>

                            <div class="form-group">
                                <label for="edit-phone">Phone Number *</label>
                                <input type="tel" id="edit-phone" required placeholder="Enter phone number">
                            </div>

                            <div class="form-group">
                                <label for="edit-email">Email Address</label>
                                <input type="email" id="edit-email" placeholder="Enter email address">
                            </div>

                            <div class="form-group">
                                <label for="edit-alt-phone">Alternative Phone</label>
                                <input type="tel" id="edit-alt-phone" placeholder="Alternative contact number">
                            </div>
                        </div>
                    </div>

                    <!-- Lead Information -->
                    <div class="form-section">
                        <h3 class="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 9.5L12 4l9 5.5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11z"/>
                                <polyline points="9,22 9,12 15,12 15,22"/>
                            </svg>
                            Lead Information
                        </h3>

                        <div class="form-grid">
                            <div class="form-group">
                                <label for="edit-status">Lead Status *</label>
                                <select id="edit-status" required>
                                    <option value="">Select status</option>
                                    <option value="newLead">New Lead</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="interested">Interested</option>
                                    <option value="followup">Follow Up</option>
                                    <option value="visit">Visit Scheduled</option>
                                    <option value="booked">Booked</option>
                                    <option value="closed">Closed</option>
                                    <option value="notinterested">Not Interested</option>
                                    <option value="dropped">Dropped</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="edit-source">Lead Source</label>
                                <select id="edit-source">
                                    <option value="">Select source</option>
                                    <option value="website">Website</option>
                                    <option value="facebook">Facebook</option>
                                    <option value="instagram">Instagram</option>
                                    <option value="google">Google Ads</option>
                                    <option value="referral">Referral</option>
                                    <option value="walk-in">Walk-in</option>
                                    <option value="cold-call">Cold Call</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="edit-property-type">Property Type</label>
                                <select id="edit-property-type">
                                    <option value="">Select property type</option>
                                    <option value="apartment">Apartment</option>
                                    <option value="villa">Villa</option>
                                    <option value="house">House</option>
                                    <option value="plot">Plot</option>
                                    <option value="commercial">Commercial</option>
                                    <option value="office">Office Space</option>
                                    <option value="warehouse">Warehouse</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="edit-budget">Budget Range</label>
                                <select id="edit-budget">
                                    <option value="">Select budget range</option>
                                    <option value="under-50L">Under ₹50 Lakh</option>
                                    <option value="50L-1Cr">₹50 Lakh - ₹1 Crore</option>
                                    <option value="1Cr-2Cr">₹1 Crore - ₹2 Crore</option>
                                    <option value="2Cr-5Cr">₹2 Crore - ₹5 Crore</option>
                                    <option value="above-5Cr">Above ₹5 Crore</option>
                                </select>
                            </div>

                            <div class="form-group full-width">
                                <label for="edit-location">Preferred Location</label>
                                <input type="text" id="edit-location" placeholder="Enter preferred location/area">
                            </div>

                            <div class="form-group full-width">
                                <label for="edit-requirements">Specific Requirements</label>
                                <textarea id="edit-requirements" rows="3" placeholder="Any specific requirements or preferences..."></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Assignment -->
                    <div class="form-section">
                        <h3 class="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            Assignment
                        </h3>

                        <div class="form-grid">
                            <div class="form-group">
                                <label for="edit-assigned-to">Assigned To</label>
                                <select id="edit-assigned-to">
                                    <option value="">Select team member</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="edit-priority">Priority Level</label>
                                <select id="edit-priority">
                                    <option value="">Select priority</option>
                                    <option value="high">High Priority</option>
                                    <option value="medium">Medium Priority</option>
                                    <option value="low">Low Priority</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="saveEditedLead()" id="save-lead-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17,21 17,13 7,13 7,21"/>
                        <polyline points="7,3 7,8 15,8"/>
                    </svg>
                    Save Changes
                </button>
            </div>
        </div>
    `;

    return modal;
}

// Populate Edit Form with Lead Data
function populateEditForm(lead) {
    // Personal Information
    document.getElementById('edit-name').value = lead.name || '';
    document.getElementById('edit-phone').value = lead.phone || '';
    document.getElementById('edit-email').value = lead.email || '';
    document.getElementById('edit-alt-phone').value = lead.altPhone || '';

    // Lead Information
    document.getElementById('edit-status').value = lead.status || '';
    document.getElementById('edit-source').value = lead.source || '';
    document.getElementById('edit-property-type').value = lead.propertyType || '';
    document.getElementById('edit-budget').value = lead.budget || '';
    document.getElementById('edit-location').value = lead.location || '';
    document.getElementById('edit-requirements').value = lead.requirements || '';

    // Assignment
    populateAssignmentDropdown();
    document.getElementById('edit-assigned-to').value = lead.assignedTo || '';
    document.getElementById('edit-priority').value = lead.priority || '';
}

// Populate Assignment Dropdown
function populateAssignmentDropdown() {
    const select = document.getElementById('edit-assigned-to');

    // Clear existing options except the first one
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }

    // Add user options
    allUsers.forEach(user => {
        if (authGuard.hasRole('admin') || authGuard.hasRole('cp') || user.id === authGuard.getCurrentUser()?.uid) {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name || user.email;
            select.appendChild(option);
        }
    });
}

// Save Edited Lead
async function saveEditedLead() {
    if (!window.currentEditingLead) {
        showToast('Error: No lead selected for editing', 'error');
        return;
    }

    // Validate required fields
    const name = document.getElementById('edit-name').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const status = document.getElementById('edit-status').value;

    if (!name || !phone || !status) {
        showToast('Please fill in all required fields (Name, Phone, Status)', 'error');
        return;
    }

    // Show loading state
    const saveBtn = document.getElementById('save-lead-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<div class="spinner"></div> Saving...';
    saveBtn.disabled = true;

    try {
        // Collect and sanitize form data
        const formData = {
            name: sanitizer.sanitize(name, 'name'),
            phone: sanitizer.sanitize(phone, 'phone'),
            email: sanitizer.sanitize(document.getElementById('edit-email').value, 'email'),
            altPhone: sanitizer.sanitize(document.getElementById('edit-alt-phone').value, 'phone'),
            status: status,
            source: document.getElementById('edit-source').value,
            propertyType: document.getElementById('edit-property-type').value,
            budget: document.getElementById('edit-budget').value,
            location: sanitizer.sanitize(document.getElementById('edit-location').value, 'text'),
            requirements: sanitizer.sanitize(document.getElementById('edit-requirements').value, 'multiline'),
            assignedTo: document.getElementById('edit-assigned-to').value,
            priority: document.getElementById('edit-priority').value,
        };

        // Remove empty values
        Object.keys(formData).forEach(key => {
            if (!formData[key] || formData[key] === '') {
                delete formData[key];
            }
        });

        // Add update metadata
        formData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        formData.updatedBy = authGuard.getCurrentUser()?.uid;

        // Update lead in Firestore
        await db.collection('leads').doc(window.currentEditingLead.id).update(formData);

        // Log activity
        await authGuard.logActivity('update_lead', {
            leadId: window.currentEditingLead.id,
            leadName: formData.name,
            changes: Object.keys(formData)
        });

        showToast('Lead updated successfully!', 'success');

        // Close modal
        closeEditModal();

        // Refresh data
        setTimeout(() => {
            refreshCurrentView();
        }, 1000);

    } catch (error) {
        console.error('❌ Error saving lead:', error);
        showToast('Error saving lead: ' + error.message, 'error');
    } finally {
        // Restore button state
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Close Edit Modal
function closeEditModal() {
    const modal = document.getElementById('edit-lead-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Clear current editing lead
    window.currentEditingLead = null;
}

// Update the editLeadFromModal function
function editLeadFromModal() {
    const modal = document.getElementById('lead-detail-modal');
    const leadId = modal?.dataset?.leadId;

    closeLeadModal();

    if (leadId) {
        editLead(leadId);
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('edit-lead-modal');
    if (modal && e.target === modal) {
        closeEditModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const editModal = document.getElementById('edit-lead-modal');
        if (editModal && editModal.style.display === 'flex') {
            closeEditModal();
        }
    }
});

// Helper function for detailed date formatting
function formatDetailDate(date) {
    if (!date || isNaN(date)) return 'Invalid Date';

    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };

    return date.toLocaleDateString('en-US', options);
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('lead-detail-modal');
    if (modal && e.target === modal) {
        closeLeadModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeLeadModal();
    }
});

// Complete Users Management Functions

// Load Users - Replace the placeholder function
async function loadUsers() {
    if (!authGuard.requireAnyRole(['admin', 'cp'])) {
        authGuard.showAccessDenied('You cannot access user management');
        return;
    }

    console.log('👥 Loading users management...');

    const tableBody = document.querySelector('#users-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6" class="loading-row">Loading users...</td></tr>';

    try {
        const role = authGuard.getCurrentRole();
        const currentUserId = authGuard.getCurrentUser()?.uid;

        let usersQuery = db.collection('users');

        // Apply role-based filtering
        if (role === 'cp') {
            // CP sees their team members + themselves
            usersQuery = usersQuery.where('role', '!=', 'admin');
        }
        // Admin sees all users (no filter needed)

        const usersSnapshot = await usersQuery.get();
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="loading-row">No users found</td></tr>';
            return;
        }

        // Sort users by role (admin first, then by name)
        users.sort((a, b) => {
            const roleOrder = { admin: 0, cp: 1, employee: 2 };
            if (roleOrder[a.role] !== roleOrder[b.role]) {
                return roleOrder[a.role] - roleOrder[b.role];
            }
            return (a.name || a.email).localeCompare(b.name || b.email);
        });

        // Render users table
        tableBody.innerHTML = users.map(user => {
            const safeName = sanitizer.sanitizeDisplayText(user.name || 'Unnamed User');
            const safeEmail = sanitizer.sanitizeDisplayText(user.email);
            const role = user.role || 'employee';
            const status = user.status || 'active';
            const lastLogin = user.lastLogin ?
                formatDate(user.lastLogin.toDate ? user.lastLogin.toDate() : new Date(user.lastLogin)) :
                'Never';

            const canEdit = authGuard.hasRole('admin') || (authGuard.hasRole('cp') && role === 'employee');
            const canDelete = authGuard.hasRole('admin') && user.id !== currentUserId;

            return `
                <tr>
                    <td><strong>${safeName}</strong></td>
                    <td>${safeEmail}</td>
                    <td><span class="status-badge status-${role}">${role.charAt(0).toUpperCase() + role.slice(1)}</span></td>
                    <td><span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                    <td>${lastLogin}</td>
                    <td>
                        <button class="action-btn view" onclick="viewUser('${user.id}')">View</button>
                        ${canEdit ? `<button class="action-btn edit" onclick="editUser('${user.id}')">Edit</button>` : ''}
                        ${canDelete ? `<button class="action-btn delete" onclick="confirmDeleteUser('${user.id}')">Delete</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');

        // Store users for later use
        allUsers = users;

        console.log('✅ Users loaded successfully');

    } catch (error) {
        console.error('❌ Error loading users:', error);
        tableBody.innerHTML = '<tr><td colspan="6" class="loading-row">Error loading users. Please refresh.</td></tr>';
        authGuard.logActivity('error', { action: 'load_users', error: error.message });
    }
}

// View User Details
function viewUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }

    if (!authGuard.canAccessUser(userId)) {
        authGuard.showAccessDenied("You don't have permission to view this user");
        return;
    }

    showUserDetailModal(user);
}

// Show User Detail Modal
function showUserDetailModal(user) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('user-detail-modal');
    if (!modal) {
        modal = createUserDetailModal();
        document.body.appendChild(modal);
    }

    // Populate user details
    document.getElementById('user-detail-title').textContent = `User: ${user.name || 'Unnamed User'}`;
    document.getElementById('user-detail-name').textContent = sanitizer.sanitizeDisplayText(user.name || 'Not provided');
    document.getElementById('user-detail-email').textContent = sanitizer.sanitizeDisplayText(user.email);

    const roleElement = document.getElementById('user-detail-role');
    roleElement.textContent = (user.role || 'employee').charAt(0).toUpperCase() + (user.role || 'employee').slice(1);
    roleElement.className = `status-badge status-${user.role || 'employee'}`;

    const statusElement = document.getElementById('user-detail-status');
    statusElement.textContent = (user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1);
    statusElement.className = `status-badge status-${user.status || 'active'}`;

    const createdAt = user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt)) : new Date();
    const lastLogin = user.lastLogin ? (user.lastLogin.toDate ? user.lastLogin.toDate() : new Date(user.lastLogin)) : null;

    document.getElementById('user-detail-created').textContent = formatDetailDate(createdAt);
    document.getElementById('user-detail-last-login').textContent = lastLogin ? formatDetailDate(lastLogin) : 'Never logged in';

    // Store current user for actions
    modal.dataset.userId = user.id;

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Log activity
    authGuard.logActivity('view_user', { targetUserId: user.id, targetUserEmail: user.email });
}

// Create User Detail Modal
function createUserDetailModal() {
    const modal = document.createElement('div');
    modal.id = 'user-detail-modal';
    modal.className = 'modal';
    modal.style.display = 'none';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="user-detail-title">User Details</h2>
                <button class="modal-close" onclick="closeUserModal()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <div class="modal-body">
                <div class="user-detail-grid">
                    <div class="detail-section">
                        <div class="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            User Information
                        </div>
                        <div class="detail-content">
                            <div class="detail-item">
                                <label>Full Name</label>
                                <span id="user-detail-name">-</span>
                            </div>
                            <div class="detail-item">
                                <label>Email Address</label>
                                <span id="user-detail-email">-</span>
                            </div>
                            <div class="detail-item">
                                <label>Role</label>
                                <span id="user-detail-role" class="status-badge">-</span>
                            </div>
                            <div class="detail-item">
                                <label>Status</label>
                                <span id="user-detail-status" class="status-badge">-</span>
                            </div>
                            <div class="detail-item">
                                <label>Created Date</label>
                                <span id="user-detail-created">-</span>
                            </div>
                            <div class="detail-item">
                                <label>Last Login</label>
                                <span id="user-detail-last-login">-</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeUserModal()">Close</button>
                <button class="btn btn-primary" onclick="editUserFromModal()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit User
                </button>
            </div>
        </div>
    `;

    return modal;
}

// Edit User
function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }

    if (!authGuard.canAccessUser(userId)) {
        authGuard.showAccessDenied("You don't have permission to edit this user");
        return;
    }

    showEditUserModal(user);
}

// Show Edit User Modal
function showEditUserModal(user) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('edit-user-modal');
    if (!modal) {
        modal = createEditUserModal();
        document.body.appendChild(modal);
    }

    // Store current user being edited
    window.currentEditingUser = user;

    // Set modal title
    document.getElementById('edit-user-modal-title').textContent = `Edit User: ${user.name || user.email}`;

    // Populate form fields
    document.getElementById('edit-user-name').value = user.name || '';
    document.getElementById('edit-user-email').value = user.email || '';
    document.getElementById('edit-user-role').value = user.role || 'employee';
    document.getElementById('edit-user-status').value = user.status || 'active';

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Log activity
    authGuard.logActivity('start_edit_user', { targetUserId: user.id, targetUserEmail: user.email });
}

// Create Edit User Modal
function createEditUserModal() {
    const modal = document.createElement('div');
    modal.id = 'edit-user-modal';
    modal.className = 'modal';
    modal.style.display = 'none';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="edit-user-modal-title">Edit User</h2>
                <button class="modal-close" onclick="closeEditUserModal()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <div class="modal-body">
                <form id="edit-user-form" class="edit-form">
                    <div class="form-section">
                        <h3 class="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            User Information
                        </h3>

                        <div class="form-grid">
                            <div class="form-group">
                                <label for="edit-user-name">Full Name *</label>
                                <input type="text" id="edit-user-name" required placeholder="Enter full name">
                            </div>

                            <div class="form-group">
                                <label for="edit-user-email">Email Address *</label>
                                <input type="email" id="edit-user-email" required readonly placeholder="Email cannot be changed" style="background: #f3f4f6; cursor: not-allowed;">
                            </div>

                            <div class="form-group">
                                <label for="edit-user-role">Role *</label>
                                <select id="edit-user-role" required>
                                    <option value="employee">Employee</option>
                                    <option value="cp">Channel Partner</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="edit-user-status">Status *</label>
                                <select id="edit-user-status" required>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeEditUserModal()">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="saveEditedUser()" id="save-user-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17,21 17,13 7,13 7,21"/>
                        <polyline points="7,3 7,8 15,8"/>
                    </svg>
                    Save Changes
                </button>
            </div>
        </div>
    `;

    return modal;
}

// Save Edited User
async function saveEditedUser() {
    if (!window.currentEditingUser) {
        showToast('Error: No user selected for editing', 'error');
        return;
    }

    // Validate required fields
    const name = document.getElementById('edit-user-name').value.trim();
    const role = document.getElementById('edit-user-role').value;
    const status = document.getElementById('edit-user-status').value;

    if (!name || !role || !status) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    // Show loading state
    const saveBtn = document.getElementById('save-user-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<div class="spinner"></div> Saving...';
    saveBtn.disabled = true;

    try {
        // Prepare update data
        const updateData = {
            name: sanitizer.sanitize(name, 'name'),
            role: role,
            status: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: authGuard.getCurrentUser()?.uid
        };

        // Update user in Firestore
        await db.collection('users').doc(window.currentEditingUser.id).update(updateData);

        // Log activity
        await authGuard.logActivity('update_user', {
            targetUserId: window.currentEditingUser.id,
            targetUserEmail: window.currentEditingUser.email,
            changes: { name: updateData.name, role: updateData.role, status: updateData.status }
        });

        showToast('User updated successfully!', 'success');

        // Close modal
        closeEditUserModal();

        // Refresh users list
        setTimeout(() => {
            loadUsers();
        }, 1000);

    } catch (error) {
        console.error('❌ Error saving user:', error);
        showToast('Error saving user: ' + error.message, 'error');
    } finally {
        // Restore button state
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Add New User
function addUser() {
    if (!authGuard.requireRole('admin')) {
        return;
    }

    showAddUserModal();
}

// Show Add User Modal
function showAddUserModal() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('add-user-modal');
    if (!modal) {
        modal = createAddUserModal();
        document.body.appendChild(modal);
    }

    // Clear form
    document.getElementById('add-user-form').reset();

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Create Add User Modal
function createAddUserModal() {
    const modal = document.createElement('div');
    modal.id = 'add-user-modal';
    modal.className = 'modal';
    modal.style.display = 'none';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add New User</h2>
                <button class="modal-close" onclick="closeAddUserModal()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <div class="modal-body">
                <form id="add-user-form" class="edit-form">
                    <div class="form-section">
                        <h3 class="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                            New User Information
                        </h3>

                        <div class="form-grid">
                            <div class="form-group">
                                <label for="add-user-name">Full Name *</label>
                                <input type="text" id="add-user-name" required placeholder="Enter full name">
                            </div>

                            <div class="form-group">
                                <label for="add-user-email">Email Address *</label>
                                <input type="email" id="add-user-email" required placeholder="Enter email address">
                            </div>

                            <div class="form-group">
                                <label for="add-user-password">Temporary Password *</label>
                                <input type="password" id="add-user-password" required placeholder="Enter temporary password">
                            </div>

                            <div class="form-group">
                                <label for="add-user-role">Role *</label>
                                <select id="add-user-role" required>
                                    <option value="">Select role</option>
                                    <option value="employee">Employee</option>
                                    <option value="cp">Channel Partner</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeAddUserModal()">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="saveNewUser()" id="add-user-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add User
                </button>
            </div>
        </div>
    `;

    return modal;
}

// Save New User
async function saveNewUser() {
    // Validate required fields
    const name = document.getElementById('add-user-name').value.trim();
    const email = document.getElementById('add-user-email').value.trim();
    const password = document.getElementById('add-user-password').value;
    const role = document.getElementById('add-user-role').value;

    if (!name || !email || !password || !role) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    // Show loading state
    const addBtn = document.getElementById('add-user-btn');
    const originalText = addBtn.innerHTML;
    addBtn.innerHTML = '<div class="spinner"></div> Creating...';
    addBtn.disabled = true;

    try {
        // Create Firebase Auth user
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(
            sanitizer.sanitize(email, 'email'),
            password
        );

        // Create Firestore user document
        await db.collection('users').doc(userCredential.user.uid).set({
            name: sanitizer.sanitize(name, 'name'),
            email: sanitizer.sanitize(email, 'email'),
            role: role,
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: authGuard.getCurrentUser()?.uid
        });

        // Log activity
        await authGuard.logActivity('create_user', {
            newUserId: userCredential.user.uid,
            newUserEmail: email,
            newUserRole: role
        });

        showToast('User created successfully!', 'success');

        // Close modal
        closeAddUserModal();

        // Refresh users list
        setTimeout(() => {
            loadUsers();
        }, 1000);

    } catch (error) {
        console.error('❌ Error creating user:', error);
        let errorMsg = 'Error creating user: ';

        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMsg += 'Email address is already in use';
                break;
            case 'auth/invalid-email':
                errorMsg += 'Invalid email address';
                break;
            case 'auth/weak-password':
                errorMsg += 'Password is too weak';
                break;
            default:
                errorMsg += error.message;
        }

        showToast(errorMsg, 'error');
    } finally {
        // Restore button state
        addBtn.innerHTML = originalText;
        addBtn.disabled = false;
    }
}

// Delete User
async function confirmDeleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }

    if (!authGuard.requireRole('admin')) {
        return;
    }

    if (userId === authGuard.getCurrentUser()?.uid) {
        showToast('You cannot delete your own account', 'error');
        return;
    }

    const safeName = sanitizer.sanitizeDisplayText(user.name || user.email);
    if (!confirm(`Are you sure you want to delete user "${safeName}"?\n\nThis will:\n- Remove their account access\n- Keep their leads data for audit\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        // Delete from Firestore (this will also disable their access)
        await db.collection('users').doc(userId).delete();

        // Log activity
        await authGuard.logActivity('delete_user', {
            deletedUserId: userId,
            deletedUserEmail: user.email,
            deletedUserName: user.name
        });

        showToast('User deleted successfully', 'success');

        // Refresh users list
        setTimeout(() => {
            loadUsers();
        }, 1000);

    } catch (error) {
        console.error('❌ Error deleting user:', error);
        showToast('Error deleting user: ' + error.message, 'error');
    }
}

// Modal close functions
function closeUserModal() {
    const modal = document.getElementById('user-detail-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function closeEditUserModal() {
    const modal = document.getElementById('edit-user-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    window.currentEditingUser = null;
}

function closeAddUserModal() {
    const modal = document.getElementById('add-user-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function editUserFromModal() {
    const modal = document.getElementById('user-detail-modal');
    const userId = modal?.dataset?.userId;

    closeUserModal();

    if (userId) {
        editUser(userId);
    }
}

function backToUsersList() {
    selectedUserId = null;
    currentView = 'users';

    // Show user list view
    document.getElementById('user-list-view').style.display = 'block';
    document.getElementById('user-leads-view').style.display = 'none';
    document.getElementById('all-leads-view').style.display = 'none';

    // Clear active user selection
    document.querySelectorAll('.user-card').forEach(card => {
        card.classList.remove('active');
    });
}

// Security monitoring
window.addEventListener('error', function(e) {
    console.error('❌ Global error:', e.error);
    if (authGuard.isAuthenticated()) {
        authGuard.logActivity('javascript_error', { error: e.error?.message || 'Unknown error' });
    }
});

// Console security message
console.log(`
🔒 SECURITY NOTICE 🔒
This is a secure admin panel. Unauthorized access attempts are logged.
If you're a developer, use the proper development tools and procedures.

🛡️ Security Features Active:
- Role-based access control
- Input sanitization
- Rate limiting
- Activity logging
- XSS protection

📝 Build Info:
- Version: 2.0.0 (Secure)
- Build Date: ${new Date().toISOString().split('T')[0]}
- Environment: ${window.location.hostname === 'localhost' ? 'Development' : 'Production'}
`);

// Export for debugging (only in development)
if (window.location.hostname === 'localhost') {
    window.adminPanelDebug = {
        authGuard,
        sanitizer,
        loadUsersList,
        refreshCurrentView,
        currentUser: () => authGuard.getCurrentUser(),
        currentRole: () => authGuard.getCurrentRole()
    };
}