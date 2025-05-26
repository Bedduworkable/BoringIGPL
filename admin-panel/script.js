// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA0ENNDjS9E2Ph054G_3RZC3sR9J1uQ3Cs",
    authDomain: "igplcrm.firebaseapp.com",
    projectId: "igplcrm",
    storageBucket: "igplcrm.firebasestorage.app",
    messagingSenderId: "688904879234",
    appId: "1:688904879234:web:your_web_app_id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global Variables
let currentUser = null;
let allLeads = [];
let allUsers = [];

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
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin Panel Initializing...');

    // Hide loading screen after a short delay
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 1000);

    // Set up event listeners
    setupEventListeners();

    // Check authentication state
    auth.onAuthStateChanged(handleAuthStateChanged);
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

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            showSection(section);

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // Search functionality
    const leadsSearch = document.getElementById('leads-search');
    if (leadsSearch) {
        leadsSearch.addEventListener('input', function() {
            filterTable('leads-table', this.value);
        });
    }

    const usersSearch = document.getElementById('users-search');
    if (usersSearch) {
        usersSearch.addEventListener('input', function() {
            filterTable('users-table', this.value);
        });
    }
}

// Authentication State Handler
async function handleAuthStateChanged(user) {
    console.log('🔐 Auth state changed:', user ? 'Logged in' : 'Not logged in');

    if (user) {
        // Double-check admin access when auth state changes
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                console.warn('🚫 User document not found, signing out...');
                await auth.signOut();
                showAccessDeniedError('User profile not found in system. Please contact administrator.');
                return;
            }

            const userData = userDoc.data();

            // Verify admin role
            if (!userData.role || userData.role !== 'admin') {
                console.warn('🚫 Non-admin user detected, signing out...');
                await auth.signOut();
                showAccessDeniedError('You do not have administrative privileges. This panel is restricted to administrators only.');
                return;
            }

            // Check if account is active
            if (userData.status && userData.status === 'inactive') {
                console.warn('🚫 Inactive admin account, signing out...');
                await auth.signOut();
                showAccessDeniedError('Your admin account has been deactivated. Please contact the system administrator.');
                return;
            }

            console.log('✅ Admin access verified for:', userData.name || userData.email);
            currentUser = user;
            showDashboard();
            loadDashboardData();

        } catch (error) {
            console.error('❌ Error verifying admin access:', error);
            await auth.signOut();
            showAccessDeniedError('Error verifying admin access. Please try again or contact administrator.');
        }
    } else {
        currentUser = null;
        showLogin();
    }
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }

    setLoginLoading(true);
    hideError();

    try {
        console.log('🔐 Attempting login for:', email);

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Login successful:', userCredential.user.uid);

        // Check if user is admin with detailed validation
        const userDoc = await db.collection('users').doc(userCredential.user.uid).get();

        if (!userDoc.exists) {
            // Sign out the user immediately
            await auth.signOut();
            throw new Error('❌ Access Denied: User profile not found in system. Please contact administrator.');
        }

        const userData = userDoc.data();
        console.log('👤 User data retrieved:', userData);

        // Check if user has admin role
        if (!userData.role || userData.role !== 'admin') {
            // Sign out the user immediately
            await auth.signOut();
            throw new Error('🚫 Access Denied: You do not have administrative privileges. This panel is restricted to administrators only.');
        }

        // Check if admin account is active
        if (userData.status && userData.status === 'inactive') {
            // Sign out the user immediately
            await auth.signOut();
            throw new Error('⛔ Access Denied: Your admin account has been deactivated. Please contact the system administrator.');
        }

        console.log('✅ Admin access granted for:', userData.name || userData.email);

    } catch (error) {
        console.error('❌ Login error:', error);
        let errorMsg = 'Login failed. Please try again.';

        switch (error.code) {
            case 'auth/user-not-found':
                errorMsg = '❌ No admin account found with this email address.';
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
                // Check if it's an access denied error
                if (error.message.includes('Access Denied') || error.message.includes('🚫') || error.message.includes('❌')) {
                    errorMsg = error.message;
                } else {
                    errorMsg = '❌ Login failed: ' + (error.message || 'Please try again.');
                }
        }

        showError(errorMsg);
    } finally {
        setLoginLoading(false);
    }
}

// Logout Handler
async function handleLogout() {
    try {
        console.log('🚪 Logging out...');
        await auth.signOut();
        console.log('✅ Logout successful');
    } catch (error) {
        console.error('❌ Logout error:', error);
    }
}

// UI Helper Functions
function showLogin() {
    loginPage.style.display = 'flex';
    dashboardPage.style.display = 'none';
    document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
}

function showDashboard() {
    loginPage.style.display = 'none';
    dashboardPage.style.display = 'flex';
    document.body.style.background = '#f8f9fa';

    // Update user info
    const userNameEl = document.getElementById('user-name');
    const userEmailEl = document.getElementById('user-email');

    if (currentUser) {
        userEmailEl.textContent = currentUser.email;

        // Try to get display name from Firestore
        db.collection('users').doc(currentUser.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    userNameEl.textContent = userData.name || 'Admin User';
                } else {
                    userNameEl.textContent = 'Admin User';
                }
            })
            .catch(error => {
                console.warn('Could not fetch user data:', error);
                userNameEl.textContent = 'Admin User';
            });
    }
}

function showSection(sectionName) {
    contentSections.forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');

        // Load section-specific data
        switch (sectionName) {
            case 'leads':
                loadLeads();
                break;
            case 'users':
                loadUsers();
                break;
            case 'analytics':
                loadAnalytics();
                break;
        }
    }
}

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
    errorMessage.innerHTML = message; // Use innerHTML to support emojis and formatting
    errorMessage.style.display = 'block';

    // Auto-hide after 8 seconds for access denied errors, 5 seconds for others
    const hideDelay = message.includes('Access Denied') || message.includes('🚫') ? 8000 : 5000;
    setTimeout(hideError, hideDelay);
}

function showAccessDeniedError(message) {
    // Show a more prominent access denied error
    showError(`🚫 <strong>ACCESS DENIED</strong><br><br>${message}<br><br>🔒 This area is restricted to administrators only.`);

    // Also log to console for debugging
    console.error('🚫 ACCESS DENIED:', message);

    // Optional: Add a slight shake effect to the login container
    const loginContainer = document.querySelector('.login-container');
    if (loginContainer) {
        loginContainer.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            loginContainer.style.animation = '';
        }, 500);
    }
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Dashboard Data Loading
async function loadDashboardData() {
    console.log('📊 Loading dashboard data...');

    try {
        // Load overview stats
        await loadOverviewStats();

        // Load recent activity
        await loadRecentActivity();

        console.log('✅ Dashboard data loaded');
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
    }
}

async function loadOverviewStats() {
    try {
        // Get leads collection
        const leadsSnapshot = await db.collection('leads').get();
        const leads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Get users collection
        const usersSnapshot = await db.collection('users').get();
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Calculate stats
        const totalLeads = leads.length;
        const totalUsers = users.length;

        // New leads today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newLeadsToday = leads.filter(lead => {
            const createdAt = new Date(lead.createdAt || 0);
            return createdAt >= today;
        }).length;

        // Conversion rate (booked / total leads)
        const bookedLeads = leads.filter(lead =>
            lead.status && (lead.status.toLowerCase() === 'booked' || lead.status.toLowerCase() === 'closed')
        ).length;
        const conversionRate = totalLeads > 0 ? Math.round((bookedLeads / totalLeads) * 100) : 0;

        // Update UI
        document.getElementById('total-leads').textContent = totalLeads;
        document.getElementById('total-users').textContent = totalUsers;
        document.getElementById('new-leads-today').textContent = newLeadsToday;
        document.getElementById('conversion-rate').textContent = `${conversionRate}%`;

        // Store for later use
        allLeads = leads;
        allUsers = users;

    } catch (error) {
        console.error('❌ Error loading overview stats:', error);

        // Show placeholder data
        document.getElementById('total-leads').textContent = '-';
        document.getElementById('total-users').textContent = '-';
        document.getElementById('new-leads-today').textContent = '-';
        document.getElementById('conversion-rate').textContent = '-%';
    }
}

async function loadRecentActivity() {
    try {
        const activityList = document.getElementById('activity-list');

        // Get recent leads (last 5)
        const recentLeads = allLeads
            .sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA;
            })
            .slice(0, 5);

        if (recentLeads.length === 0) {
            activityList.innerHTML = `
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
            return;
        }

        activityList.innerHTML = recentLeads.map(lead => {
            const createdAt = new Date(lead.createdAt || 0);
            const timeAgo = getTimeAgo(createdAt);

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
                        <p>New lead: <strong>${lead.name || 'Unnamed Lead'}</strong></p>
                        <span class="activity-time">${timeAgo}</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('❌ Error loading recent activity:', error);

        const activityList = document.getElementById('activity-list');
        activityList.innerHTML = `
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
}

// Leads Management
async function loadLeads() {
    console.log('📋 Loading leads...');

    const tableBody = document.querySelector('#leads-table tbody');
    tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Loading leads...</td></tr>';

    try {
        if (allLeads.length === 0) {
            const leadsSnapshot = await db.collection('leads').get();
            allLeads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        if (allLeads.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">No leads found</td></tr>';
            return;
        }

        // Sort by creation date (newest first)
        const sortedLeads = allLeads.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        tableBody.innerHTML = sortedLeads.map(lead => {
            const createdAt = new Date(lead.createdAt || 0);
            const formattedDate = formatDate(createdAt);

            // Handle email field - it might not exist for all leads
            const email = lead.email || 'Not provided';

            // Handle status field mapping
            const status = lead.status || 'newLead';

            return `
                <tr>
                    <td><strong>${lead.name || 'Unnamed Lead'}</strong></td>
                    <td>${lead.phone || 'No phone'}</td>
                    <td>${email}</td>
                    <td><span class="status-badge status-${status.toLowerCase()}">${getStatusText(status)}</span></td>
                    <td>${lead.source || 'Not specified'}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <button class="action-btn view" onclick="viewLead('${lead.id}')">View</button>
                        <button class="action-btn edit" onclick="editLead('${lead.id}')">Edit</button>
                        <button class="action-btn delete" onclick="deleteLead('${lead.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

        console.log('✅ Leads loaded successfully');

    } catch (error) {
        console.error('❌ Error loading leads:', error);
        tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Error loading leads. Please refresh.</td></tr>';
    }
}

// Users Management
async function loadUsers() {
    console.log('👥 Loading users...');

    const tableBody = document.querySelector('#users-table tbody');
    tableBody.innerHTML = '<tr><td colspan="6" class="loading-row">Loading users...</td></tr>';

    try {
        if (allUsers.length === 0) {
            const usersSnapshot = await db.collection('users').get();
            allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        if (allUsers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="loading-row">No users found</td></tr>';
            return;
        }

        tableBody.innerHTML = allUsers.map(user => {
            const role = user.role || 'user';
            const status = user.status || 'active';
            const lastLogin = user.lastLogin ? formatDate(user.lastLogin.toDate()) : 'Never';

            return `
                <tr>
                    <td><strong>${user.name || 'Unnamed User'}</strong></td>
                    <td>${user.email}</td>
                    <td><span class="status-badge status-${role}">${role.charAt(0).toUpperCase() + role.slice(1)}</span></td>
                    <td><span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                    <td>${lastLogin}</td>
                    <td>
                        <button class="action-btn view" onclick="viewUser('${user.id}')">View</button>
                        <button class="action-btn edit" onclick="editUser('${user.id}')">Edit</button>
                        ${user.id !== currentUser.uid ? `<button class="action-btn delete" onclick="deleteUser('${user.id}')">Delete</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');

        console.log('✅ Users loaded successfully');

    } catch (error) {
        console.error('❌ Error loading users:', error);
        tableBody.innerHTML = '<tr><td colspan="6" class="loading-row">Error loading users. Please refresh.</td></tr>';
    }
}

// Analytics
async function loadAnalytics() {
    console.log('📊 Loading analytics...');

    try {
        // Lead sources analysis
        const sourcesChart = document.getElementById('sources-chart');
        const sources = {};

        allLeads.forEach(lead => {
            const source = lead.source || 'Unknown';
            sources[source] = (sources[source] || 0) + 1;
        });

        // Create simple bar chart representation
        const maxCount = Math.max(...Object.values(sources));
        sourcesChart.innerHTML = Object.entries(sources).map(([source, count]) => {
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return `
                <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-size: 14px; color: #666;">${source}</span>
                        <span style="font-size: 14px; font-weight: 600; color: #333;">${count}</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #f1f3f4; border-radius: 4px;">
                        <div style="width: ${percentage}%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 4px;"></div>
                    </div>
                </div>
            `;
        }).join('');

        // Monthly trends
        const trendsChart = document.getElementById('trends-chart');
        const monthlyData = {};

        allLeads.forEach(lead => {
            const date = new Date(lead.createdAt || 0);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
        });

        const sortedMonths = Object.keys(monthlyData).sort();
        const maxMonthlyCount = Math.max(...Object.values(monthlyData));

        trendsChart.innerHTML = sortedMonths.map(month => {
            const count = monthlyData[month];
            const percentage = maxMonthlyCount > 0 ? (count / maxMonthlyCount) * 100 : 0;
            const [year, monthNum] = month.split('-');
            const monthName = new Date(year, monthNum - 1).toLocaleDateString('en-US', { month: 'short' });

            return `
                <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-size: 14px; color: #666;">${monthName} ${year}</span>
                        <span style="font-size: 14px; font-weight: 600; color: #333;">${count}</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #f1f3f4; border-radius: 4px;">
                        <div style="width: ${percentage}%; height: 100%; background: linear-gradient(135deg, #10b981 0%, #047857 100%); border-radius: 4px;"></div>
                    </div>
                </div>
            `;
        }).join('');

        console.log('✅ Analytics loaded successfully');

    } catch (error) {
        console.error('❌ Error loading analytics:', error);

        document.getElementById('sources-chart').innerHTML = '<p style="color: #999;">Error loading chart data</p>';
        document.getElementById('trends-chart').innerHTML = '<p style="color: #999;">Error loading chart data</p>';
    }
}

// Action Handlers
function viewLead(leadId) {
    const lead = allLeads.find(l => l.id === leadId);
    if (!lead) {
        alert('Lead not found');
        return;
    }

    // Show the modal
    showLeadDetailModal(lead);
}

function showLeadDetailModal(lead) {
    const modal = document.getElementById('lead-detail-modal');

    // Set title
    document.getElementById('lead-detail-title').textContent = `Lead: ${lead.name || 'Unnamed Lead'}`;

    // Personal Information
    document.getElementById('detail-name').textContent = lead.name || 'Not provided';
    document.getElementById('detail-phone').textContent = lead.phone || 'Not provided';
    document.getElementById('detail-email').textContent = lead.email || 'Not provided';

    // Lead Information
    const statusElement = document.getElementById('detail-status');
    const status = lead.status || 'newLead';
    statusElement.textContent = getStatusText(status);
    statusElement.className = `status-badge status-${status.toLowerCase()}`;

    document.getElementById('detail-source').textContent = lead.source || 'Not specified';
    document.getElementById('detail-budget').textContent = lead.budget || 'Not specified';
    document.getElementById('detail-property-type').textContent = lead.propertyType || 'Not specified';
    document.getElementById('detail-location').textContent = lead.location || 'Not specified';

    // Assignment Information
    document.getElementById('detail-assigned-to').textContent = lead.assignedTo || 'Unassigned';
    document.getElementById('detail-created-by').textContent = lead.createdBy || 'Unknown';

    const createdAt = new Date(lead.createdAt || 0);
    document.getElementById('detail-created-date').textContent = formatDetailDate(createdAt);

    // Remarks
    const remarksContainer = document.getElementById('detail-remarks');
    if (lead.remarks && Array.isArray(lead.remarks) && lead.remarks.length > 0) {
        remarksContainer.innerHTML = lead.remarks.map((remark, index) => {
            const remarkDate = new Date(remark.timestamp || 0);
            return `
                <div class="remark-item">
                    <div class="remark-header">
                        <span class="remark-author">${remark.by || 'Unknown User'}</span>
                        <span class="remark-date">${formatDetailDate(remarkDate)}</span>
                    </div>
                    <div class="remark-text">${remark.text || 'No content'}</div>
                </div>
            `;
        }).join('');
    } else {
        remarksContainer.innerHTML = '<p class="no-data">No remarks added yet</p>';
    }

    // Reminders
    const remindersContainer = document.getElementById('detail-reminders');
    if (lead.reminders && Array.isArray(lead.reminders) && lead.reminders.length > 0) {
        const now = new Date();
        remindersContainer.innerHTML = lead.reminders.map((reminder, index) => {
            const reminderDate = new Date(reminder.date || 0);
            const isOverdue = reminderDate < now;
            const isUpcoming = reminderDate > now && reminderDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next 7 days

            let className = 'reminder-item';
            if (isOverdue) className += ' overdue';
            else if (isUpcoming) className += ' upcoming';

            return `
                <div class="${className}">
                    <div class="reminder-header">
                        <span class="reminder-author">Created by ${reminder.createdBy || 'Unknown'}</span>
                        <span class="reminder-date">${formatDetailDate(reminderDate)}</span>
                    </div>
                    <div class="reminder-text">${reminder.message || 'No message'}</div>
                    ${isOverdue ? '<small style="color: #ef4444; font-weight: 600;">⚠️ Overdue</small>' : ''}
                    ${isUpcoming ? '<small style="color: #10b981; font-weight: 600;">🔔 Upcoming</small>' : ''}
                </div>
            `;
        }).join('');
    } else {
        remindersContainer.innerHTML = '<p class="no-data">No reminders set</p>';
    }

    // Store current lead for actions
    modal.dataset.leadId = lead.id;

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scroll
}

function closeLeadModal() {
    const modal = document.getElementById('lead-detail-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore background scroll
}

function editLeadFromModal() {
    const modal = document.getElementById('lead-detail-modal');
    const leadId = modal.dataset.leadId;
    closeLeadModal();
    editLead(leadId);
}

function deleteLeadFromModal() {
    const modal = document.getElementById('lead-detail-modal');
    const leadId = modal.dataset.leadId;
    closeLeadModal();
    deleteLead(leadId);
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('lead-detail-modal');
    if (e.target === modal) {
        closeLeadModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeLeadModal();
    }
});

function editLead(leadId) {
    const lead = allLeads.find(l => l.id === leadId);
    if (!lead) {
        alert('Lead not found');
        return;
    }

    const newName = prompt('Enter new name:', lead.name);
    if (newName === null) return;

    const newPhone = prompt('Enter new phone:', lead.phone);
    if (newPhone === null) return;

    const newStatus = prompt('Enter new status (newLead, followUp, visit, booked, dropped):', lead.status);
    if (newStatus === null) return;

    // Update in Firestore
    db.collection('leads').doc(leadId).update({
        name: newName.trim(),
        phone: newPhone.trim(),
        status: newStatus.trim()
    }).then(() => {
        alert('Lead updated successfully');
        // Refresh the leads data
        allLeads = [];
        loadLeads();
        loadOverviewStats();
    }).catch(error => {
        console.error('Error updating lead:', error);
        alert('Error updating lead: ' + error.message);
    });
}

function deleteLead(leadId) {
    const lead = allLeads.find(l => l.id === leadId);
    if (!lead) {
        alert('Lead not found');
        return;
    }

    if (!confirm(`Are you sure you want to delete lead "${lead.name}"? This action cannot be undone.`)) {
        return;
    }

    // Delete from Firestore
    db.collection('leads').doc(leadId).delete().then(() => {
        alert('Lead deleted successfully');
        // Refresh the leads data
        allLeads = [];
        loadLeads();
        loadOverviewStats();
    }).catch(error => {
        console.error('Error deleting lead:', error);
        alert('Error deleting lead: ' + error.message);
    });
}

function viewUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        alert('User not found');
        return;
    }

    alert(`User Details:\n\nName: ${user.name || 'N/A'}\nEmail: ${user.email}\nRole: ${user.role || 'user'}\nStatus: ${user.status || 'active'}\nCreated: ${user.createdAt ? formatDate(user.createdAt.toDate()) : 'N/A'}`);
}

function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        alert('User not found');
        return;
    }

    const newName = prompt('Enter new name:', user.name || '');
    if (newName === null) return;

    const newRole = prompt('Enter new role (admin, user):', user.role || 'user');
    if (newRole === null) return;

    const newStatus = prompt('Enter new status (active, inactive):', user.status || 'active');
    if (newStatus === null) return;

    // Update in Firestore
    db.collection('users').doc(userId).update({
        name: newName.trim(),
        role: newRole.trim(),
        status: newStatus.trim()
    }).then(() => {
        alert('User updated successfully');
        // Refresh the users data
        allUsers = [];
        loadUsers();
        loadOverviewStats();
    }).catch(error => {
        console.error('Error updating user:', error);
        alert('Error updating user: ' + error.message);
    });
}

function deleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        alert('User not found');
        return;
    }

    if (userId === currentUser.uid) {
        alert('You cannot delete your own account');
        return;
    }

    if (!confirm(`Are you sure you want to delete user "${user.name || user.email}"? This action cannot be undone.`)) {
        return;
    }

    // Delete from Firestore
    db.collection('users').doc(userId).delete().then(() => {
        alert('User deleted successfully');
        // Refresh the users data
        allUsers = [];
        loadUsers();
        loadOverviewStats();
    }).catch(error => {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
    });
}

// Utility Functions
function filterTable(tableId, searchTerm) {
    const table = document.getElementById(tableId);
    const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');

    searchTerm = searchTerm.toLowerCase();

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        let matchFound = false;

        for (let j = 0; j < cells.length - 1; j++) { // -1 to skip actions column
            const cellText = cells[j].textContent.toLowerCase();
            if (cellText.includes(searchTerm)) {
                matchFound = true;
                break;
            }
        }

        row.style.display = matchFound ? '' : 'none';
    }
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

// Error Handling
window.addEventListener('error', function(e) {
    console.error('❌ Global error:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('❌ Unhandled promise rejection:', e.reason);
});

// Network Status
window.addEventListener('online', function() {
    console.log('🌐 Network: Online');
});

window.addEventListener('offline', function() {
    console.log('🌐 Network: Offline');
    alert('You are offline. Some features may not work properly.');
});

// Console Welcome Message
console.log(`
🏠 Real Estate CRM Admin Panel
🚀 Version: 1.0.0
📅 Build Date: ${new Date().toISOString().split('T')[0]}
🔧 Environment: ${window.location.hostname === 'localhost' ? 'Development' : 'Production'}

📖 Available Commands:
- loadLeads() - Refresh leads data
- loadUsers() - Refresh users data
- loadAnalytics() - Refresh analytics
- auth.currentUser - Get current user info
- db - Access Firestore database

🛡️ Security Note: This is an admin panel. Keep your credentials secure!
`);

// Export functions for global access (for debugging)
window.adminPanel = {
    loadLeads,
    loadUsers,
    loadAnalytics,
    loadDashboardData,
    currentUser: () => currentUser,
    allLeads: () => allLeads,
    allUsers: () => allUsers
};