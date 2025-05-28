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
let allMasters = [];
let selectedMasterId = null;
let selectedUserId = null;
let currentView = 'masters';
let currentViewStack = [];

// Enhanced Auth Guard
class AuthGuard {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.permissions = {
            admin: ['all'],
            master: ['leads:own', 'leads:team', 'users:team', 'reports:read', 'team:manage'],
            user: ['leads:assigned', 'leads:created', 'profile:edit']
        };
    }

    async init() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(async (user) => {
                console.log('🔄 Auth state changed:', user ? user.email : 'No user');

                if (user) {
                    try {
                        await this.loadUserData(user);
                        resolve(true);
                    } catch (error) {
                        console.error('❌ Error loading user data:', error);
                        await this.signOut();
                        resolve(false);
                    }
                } else {
                    this.currentUser = null;
                    this.userRole = null;
                    resolve(false);
                }
            });
        });
    }

    async loadUserData(user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                console.log('👤 User profile not found, creating basic profile...');
                const newUserData = {
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    role: 'user',
                    status: 'active',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    linkedMaster: null
                };

                await db.collection('users').doc(user.uid).set(newUserData);

                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    ...newUserData
                };
                this.userRole = 'user';
            } else {
                const userData = userDoc.data();

                if (!userData.role || !['admin', 'master', 'user'].includes(userData.role)) {
                    throw new Error('Invalid user role');
                }

                if (userData.status === 'inactive') {
                    throw new Error('Account has been deactivated');
                }

                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    ...userData
                };
                this.userRole = userData.role;
            }

            console.log('✅ User loaded:', this.currentUser.name || this.currentUser.email, `(${this.userRole})`);

            await this.updateLastLogin();
            this.updateUserInfoUI();

        } catch (error) {
            console.error('❌ Failed to load user data:', error);
            throw error;
        }
    }

    async updateLastLogin() {
        try {
            await db.collection('users').doc(this.currentUser.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.warn('⚠️ Could not update last login:', error);
        }
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    hasRole(role) {
        return this.userRole === role;
    }

    hasAnyRole(roles) {
        return roles.includes(this.userRole);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getCurrentRole() {
        return this.userRole;
    }

    updateUserInfoUI() {
        const userNameEl = document.getElementById('user-name');
        const userEmailEl = document.getElementById('user-email');
        const userRoleEl = document.getElementById('user-role');

        if (userNameEl) userNameEl.textContent = this.currentUser?.name || 'User';
        if (userEmailEl) userEmailEl.textContent = this.currentUser?.email || '';
        if (userRoleEl) userRoleEl.textContent = (this.userRole || 'USER').toUpperCase();

        this.applyRoleBasedUI();
    }

    applyRoleBasedUI() {
        if (!this.isAuthenticated()) return;

        console.log('🎨 Applying role-based UI for role:', this.userRole);

        const elementsToHide = {
            user: [
                '.admin-only',
                '.master-only',
                '[data-role="admin"]',
                '[data-role="master"]'
            ],
            master: [
                '.admin-only',
                '[data-role="admin"]'
            ],
            admin: []
        };

        const hideSelectors = elementsToHide[this.userRole] || [];

        hideSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = 'none';
            });
        });

        const showSelectors = [
            `.${this.userRole}-only`,
            '.authenticated-only'
        ];

        showSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = el.dataset.originalDisplay || 'block';
            });
        });

        const roleElements = document.querySelectorAll('[data-role]');
        roleElements.forEach(el => {
            const allowedRoles = el.dataset.role.split(',');
            if (allowedRoles.includes(this.userRole)) {
                el.style.display = el.tagName.toLowerCase() === 'button' ? 'flex' : 'block';
            } else {
                el.style.display = 'none';
            }
        });

        const roleTexts = document.querySelectorAll(`.${this.userRole}-only`);
        roleTexts.forEach(el => {
            el.style.display = 'inline';
        });
    }

    async signOut() {
        try {
            await auth.signOut();
            this.currentUser = null;
            this.userRole = null;
            this.redirectToLogin();
        } catch (error) {
            console.error('❌ Sign out error:', error);
        }
    }

    redirectToLogin() {
        const loginPage = document.getElementById('login-page');
        const dashboardPage = document.getElementById('dashboard-page');

        if (loginPage) loginPage.style.display = 'flex';
        if (dashboardPage) dashboardPage.style.display = 'none';

        document.body.style.background = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
    }

    showDashboard() {
        const loginPage = document.getElementById('login-page');
        const dashboardPage = document.getElementById('dashboard-page');

        if (loginPage) loginPage.style.display = 'none';
        if (dashboardPage) dashboardPage.style.display = 'flex';

        document.body.style.background = '#f7f8fc';
        this.applyRoleBasedUI();
    }

    showAccessDenied(message = 'Access denied') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'access-denied-message';
        errorDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #fef2f2;
                border: 1px solid #fecaca;
                color: #dc2626;
                padding: 16px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 10000;
                max-width: 300px;
            ">
                <strong>🚫 Access Denied</strong><br>
                ${message}
            </div>
        `;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// Create global auth guard instance
const authGuard = new AuthGuard();

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
let isLoading = false;

// Initialize App
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Admin Panel Initializing...');

    setTimeout(() => {
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 1500);

    setupEventListeners();

    try {
        const isAuthenticated = await authGuard.init();
        console.log('🔐 Authentication result:', isAuthenticated);

        if (isAuthenticated) {
            console.log('✅ User is authenticated, showing dashboard');
            authGuard.showDashboard();
            await loadDashboardData();
        } else {
            console.log('❌ User not authenticated, showing login');
            authGuard.redirectToLogin();
        }
    } catch (error) {
        console.error('❌ Initialization error:', error);
        authGuard.redirectToLogin();
    }
});

// Event Listeners Setup
function setupEventListeners() {
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            console.log('📋 Navigation clicked:', section);

            showSection(section);

            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to logout?')) {
                await authGuard.signOut();
            }
        });
    }

    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    if (togglePassword && passwordInput) {
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
    }
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();

    if (isLoading) return;

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
        console.log('✅ Login successful:', userCredential.user.email);

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (authGuard.isAuthenticated()) {
            authGuard.showDashboard();
            await loadDashboardData();
        }

    } catch (error) {
        console.error('❌ Login error:', error);

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
    } finally {
        setLoginLoading(false);
    }
}

// Show Section
function showSection(sectionName) {
    console.log('📋 Showing section:', sectionName);

    const contentSections = document.querySelectorAll('.content-section');
    contentSections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';

        currentViewStack = [];
        selectedMasterId = null;
        selectedUserId = null;

        switch (sectionName) {
            case 'overview':
                loadDashboardData();
                break;
            case 'leads':
                if (authGuard.hasRole('user')) {
                    loadUserLeadsDirectly();
                } else {
                    currentView = 'masters';
                    loadMastersView();
                }
                break;
            case 'users':
                loadUsersSection();
                break;
            default:
                console.log('ℹ️ Section not implemented:', sectionName);
        }
    } else {
        console.error('❌ Section not found:', `${sectionName}-section`);
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    if (!authGuard.isAuthenticated()) return;

    console.log('📊 Loading dashboard data...');

    try {
        await Promise.all([
            loadOverviewStats(),
            loadRecentActivity()
        ]);

        console.log('✅ Dashboard data loaded');
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
    }
}

// Load Overview Stats
async function loadOverviewStats() {
    try {
        const role = authGuard.getCurrentRole();
        const currentUserId = authGuard.getCurrentUser()?.uid;

        let leadsQuery = db.collection('leads');
        let usersQuery = db.collection('users');

        if (role === 'user' && currentUserId) {
            leadsQuery = leadsQuery.where('assignedTo', '==', currentUserId);
        } else if (role === 'master' && currentUserId) {
            const teamMembersSnapshot = await db.collection('users')
                .where('linkedMaster', '==', currentUserId)
                .get();

            const teamMemberIds = teamMembersSnapshot.docs.map(doc => doc.id);
            teamMemberIds.push(currentUserId);

            if (teamMemberIds.length > 0) {
                leadsQuery = leadsQuery.where('assignedTo', 'in', teamMemberIds);
                usersQuery = usersQuery.where('linkedMaster', '==', currentUserId);
            }
        }

        const [leadsSnapshot, usersSnapshot] = await Promise.all([
            leadsQuery.get(),
            authGuard.hasAnyRole(['admin', 'master']) ? usersQuery.get() : Promise.resolve({ docs: [] })
        ]);

        const leads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const totalLeads = leads.length;
        const totalUsers = authGuard.hasAnyRole(['admin', 'master']) ? users.length : 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newLeadsToday = leads.filter(lead => {
            const createdAt = lead.createdAt ? new Date(lead.createdAt.seconds * 1000) : new Date(0);
            return createdAt >= today;
        }).length;

        const bookedLeads = leads.filter(lead =>
            lead.status && ['booked', 'closed'].includes(lead.status.toLowerCase())
        ).length;
        const conversionRate = totalLeads > 0 ? Math.round((bookedLeads / totalLeads) * 100) : 0;

        updateStatCard('total-leads', totalLeads);
        updateStatCard('total-users', totalUsers);
        updateStatCard('new-leads-today', newLeadsToday);
        updateStatCard('conversion-rate', `${conversionRate}%`);

        allLeads = leads;
        allUsers = users;

    } catch (error) {
        console.error('❌ Error loading overview stats:', error);
        updateStatCard('total-leads', '-');
        updateStatCard('total-users', '-');
        updateStatCard('new-leads-today', '-');
        updateStatCard('conversion-rate', '-%');
    }
}

// Load Recent Activity
async function loadRecentActivity() {
    try {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;

        const recentLeads = allLeads
            .sort((a, b) => {
                const dateA = new Date(a.createdAt ? a.createdAt.seconds * 1000 : 0);
                const dateB = new Date(b.createdAt ? b.createdAt.seconds * 1000 : 0);
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
            const createdAt = new Date(lead.createdAt ? lead.createdAt.seconds * 1000 : 0);
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
                        <p>New lead: <strong>${sanitizeText(lead.name || 'Unnamed Lead')}</strong></p>
                        <span class="activity-time">${timeAgo}</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('❌ Error loading recent activity:', error);
    }
}

// Load Masters View
async function loadMastersView() {
    console.log('👑 Loading masters view...');

    const leadsSection = document.getElementById('leads-section');
    if (!leadsSection) return;

    leadsSection.innerHTML = `
        <div class="section-header">
            <h2>Masters & Teams</h2>
            <p>View all masters and their team members</p>
        </div>

        <div class="breadcrumb">
            <span class="breadcrumb-item active">Masters</span>
        </div>

        <div class="masters-grid" id="masters-container">
            <div class="loading-card">Loading masters...</div>
        </div>
    `;

    await loadMastersData();
}

// Load Masters Data
async function loadMastersData() {
    try {
        const mastersContainer = document.getElementById('masters-container');
        if (!mastersContainer) return;

        const usersSnapshot = await db.collection('users').get();
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const masters = users.filter(user => user.role === 'master');
        allMasters = masters;
        allUsers = users;

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

        const mastersWithStats = masters.map(master => {
            const teamMembers = users.filter(user => user.linkedMaster === master.id);
            return {
                ...master,
                teamCount: teamMembers.length,
                teamMembers: teamMembers
            };
        });

        mastersContainer.innerHTML = mastersWithStats.map(master => `
            <div class="master-card" onclick="selectMaster('${master.id}')">
                <div class="master-header">
                    <div class="master-avatar">
                        ${(master.name || master.email || 'M').charAt(0).toUpperCase()}
                    </div>
                    <div class="master-info">
                        <h3>${sanitizeText(master.name || 'Unnamed Master')}</h3>
                        <p>${sanitizeText(master.email)}</p>
                        <span class="master-badge">Master</span>
                    </div>
                </div>
                <div class="master-stats">
                    <div class="stat-item">
                        <span class="stat-number">${master.teamCount}</span>
                        <span class="stat-label">Team Members</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${master.status === 'active' ? 'Active' : 'Inactive'}</span>
                        <span class="stat-label">Status</span>
                    </div>
                </div>
                <div class="master-footer">
                    <span class="view-team">Click to view team →</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('❌ Error loading masters:', error);
        const mastersContainer = document.getElementById('masters-container');
        if (mastersContainer) {
            mastersContainer.innerHTML = '<div class="loading-card">Error loading masters</div>';
        }
    }
}

// Select Master and Show Their Team
async function selectMaster(masterId) {
    console.log('👤 Selecting master:', masterId);

    selectedMasterId = masterId;
    currentView = 'users';
    currentViewStack.push({ type: 'master', id: masterId });

    const master = allMasters.find(m => m.id === masterId);
    if (!master) return;

    const leadsSection = document.getElementById('leads-section');
    leadsSection.innerHTML = `
        <div class="section-header">
            <h2>Team Members - ${sanitizeText(master.name || 'Unnamed Master')}</h2>
            <p>Manage team members under this master</p>
        </div>

        <div class="breadcrumb">
            <span class="breadcrumb-item" onclick="loadMastersView()">Masters</span>
            <span class="breadcrumb-separator">→</span>
            <span class="breadcrumb-item active">${sanitizeText(master.name || 'Master')}'s Team</span>
        </div>

        <div class="users-grid" id="users-container">
            <div class="loading-card">Loading team members...</div>
        </div>
    `;

    await loadMasterTeam(masterId);
}

// Load Master's Team
async function loadMasterTeam(masterId) {
    try {
        const usersContainer = document.getElementById('users-container');
        if (!usersContainer) return;

        const teamMembers = allUsers.filter(user => user.linkedMaster === masterId);

        if (teamMembers.length === 0) {
            usersContainer.innerHTML = `
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
            return {
                ...user,
                leadsCount: userLeads.length,
                leads: userLeads
            };
        });

        usersContainer.innerHTML = teamWithStats.map(user => `
            <div class="user-card" onclick="selectUser('${user.id}')">
                <div class="user-header">
                    <div class="user-avatar">
                        ${(user.name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div class="user-info">
                        <h3>${sanitizeText(user.name || 'Unnamed User')}</h3>
                        <p>${sanitizeText(user.email)}</p>
                        <span class="user-badge">User</span>
                    </div>
                </div>
                <div class="user-stats">
                    <div class="stat-item">
                        <span class="stat-number">${user.leadsCount}</span>
                        <span class="stat-label">Total Leads</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${user.status === 'active' ? 'Active' : 'Inactive'}</span>
                        <span class="stat-label">Status</span>
                    </div>
                </div>
                <div class="user-footer">
                    <span class="view-leads">Click to view leads →</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('❌ Error loading master team:', error);
    }
}

// Select User and Show Their Leads
async function selectUser(userId) {
    console.log('📋 Selecting user:', userId);

    selectedUserId = userId;
    currentView = 'leads';
    currentViewStack.push({ type: 'user', id: userId });

    const user = allUsers.find(u => u.id === userId);
    const master = allMasters.find(m => m.id === selectedMasterId);

    if (!user) return;

    const leadsSection = document.getElementById('leads-section');
    leadsSection.innerHTML = `
        <div class="section-header">
            <h2>Leads - ${sanitizeText(user.name || 'Unnamed User')}</h2>
            <p>View and manage leads for this user</p>
        </div>

        <div class="breadcrumb">
            <span class="breadcrumb-item" onclick="loadMastersView()">Masters</span>
            <span class="breadcrumb-separator">→</span>
            <span class="breadcrumb-item" onclick="selectMaster('${selectedMasterId}')">${sanitizeText(master?.name || 'Master')}'s Team</span>
            <span class="breadcrumb-separator">→</span>
            <span class="breadcrumb-item active">${sanitizeText(user.name || 'User')}'s Leads</span>
        </div>

        <div class="data-table-container">
            <div class="table-header">
                <div class="search-box">
                    <input type="text" id="leads-search" placeholder="Search leads..." onkeyup="filterUserLeads(this.value)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                </div>
                <button class="refresh-btn" onclick="selectUser('${userId}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23,4 23,10 17,10"/>
                        <polyline points="1,20 1,14 7,14"/>
                        <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10"/>
                        <path d="M3.51,15a9,9,0,0,0,14.85,3.36L23,14"/>
                    </svg>
                    Refresh
                </button>
            </div>

            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Source</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="user-leads-table-body">
                        <tr>
                            <td colspan="7" class="loading-row">Loading leads...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    await loadUserLeads(userId);
}

// Load User's Leads
async function loadUserLeads(userId) {
    try {
        const tableBody = document.getElementById('user-leads-table-body');
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

        window.currentUserLeads = leads;

        tableBody.innerHTML = leads.map(lead => {
            const createdAt = new Date(lead.createdAt ? lead.createdAt.seconds * 1000 : 0);
            const formattedDate = formatDate(createdAt);

            return `
                <tr data-lead-id="${lead.id}">
                    <td><strong>${sanitizeText(lead.name || 'Unnamed Lead')}</strong></td>
                    <td>${sanitizeText(lead.phone || 'No phone')}</td>
                    <td>${sanitizeText(lead.email || 'Not provided')}</td>
                    <td><span class="status-badge status-${(lead.status || 'newLead').toLowerCase()}">${getStatusText(lead.status)}</span></td>
                    <td>${sanitizeText(lead.source || 'Not specified')}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <button class="action-btn view" onclick="viewLead('${lead.id}')">View</button>
                        <button class="action-btn edit" onclick="editLead('${lead.id}')">Edit</button>
                        <button class="action-btn delete" onclick="deleteLead('${lead.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('❌ Error loading user leads:', error);
        const tableBody = document.getElementById('user-leads-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Error loading leads. Please refresh.</td></tr>';
        }
    }
}

// Load User Leads Directly (for regular users)
async function loadUserLeadsDirectly() {
    console.log('📋 Loading user leads directly...');

    const leadsSection = document.getElementById('leads-section');
    if (!leadsSection) return;

    const currentUserId = authGuard.getCurrentUser()?.uid;
    const currentUserName = authGuard.getCurrentUser()?.name || 'My';

    leadsSection.innerHTML = `
        <div class="section-header">
            <h2>${currentUserName} Leads</h2>
            <p>View and manage your assigned leads</p>
        </div>

        <div class="data-table-container">
            <div class="table-header">
                <div class="search-box">
                    <input type="text" id="leads-search" placeholder="Search leads..." onkeyup="filterUserLeads(this.value)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                </div>
                <button class="refresh-btn" onclick="loadUserLeadsDirectly()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23,4 23,10 17,10"/>
                        <polyline points="1,20 1,14 7,14"/>
                        <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10"/>
                        <path d="M3.51,15a9,9,0,0,0,14.85,3.36L23,14"/>
                    </svg>
                    Refresh
                </button>
            </div>

            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Source</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="user-leads-table-body">
                        <tr>
                            <td colspan="7" class="loading-row">Loading your leads...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    await loadUserLeads(currentUserId);
}

// Filter User Leads
function filterUserLeads(searchTerm) {
    if (!window.currentUserLeads) return;

    const tableBody = document.getElementById('user-leads-table-body');
    if (!tableBody) return;

    const filteredLeads = window.currentUserLeads.filter(lead => {
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
        const formattedDate = formatDate(createdAt);

        return `
            <tr data-lead-id="${lead.id}">
                <td><strong>${sanitizeText(lead.name || 'Unnamed Lead')}</strong></td>
                <td>${sanitizeText(lead.phone || 'No phone')}</td>
                <td>${sanitizeText(lead.email || 'Not provided')}</td>
                <td><span class="status-badge status-${(lead.status || 'newLead').toLowerCase()}">${getStatusText(lead.status)}</span></td>
                <td>${sanitizeText(lead.source || 'Not specified')}</td>
                <td>${formattedDate}</td>
                <td>
                    <button class="action-btn view" onclick="viewLead('${lead.id}')">View</button>
                    <button class="action-btn edit" onclick="editLead('${lead.id}')">Edit</button>
                    <button class="action-btn delete" onclick="deleteLead('${lead.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Enhanced Lead Actions
function viewLead(leadId) {
    const lead = allLeads.find(l => l.id === leadId) ||
                 (window.currentUserLeads && window.currentUserLeads.find(l => l.id === leadId));

    if (!lead) {
        alert('Lead not found');
        return;
    }

    showLeadModal(lead, 'view');
}

function editLead(leadId) {
    const lead = allLeads.find(l => l.id === leadId) ||
                 (window.currentUserLeads && window.currentUserLeads.find(l => l.id === leadId));

    if (!lead) {
        alert('Lead not found');
        return;
    }

    showLeadModal(lead, 'edit');
}

function deleteLead(leadId) {
    const lead = allLeads.find(l => l.id === leadId) ||
                 (window.currentUserLeads && window.currentUserLeads.find(l => l.id === leadId));

    if (!lead) {
        alert('Lead not found');
        return;
    }

    if (confirm(`Are you sure you want to delete the lead "${lead.name || 'Unnamed Lead'}"?\n\nThis action cannot be undone.`)) {
        deleteLeadFromDatabase(leadId);
    }
}

// Show Lead Modal
function showLeadModal(lead, mode = 'view') {
    const isEditMode = mode === 'edit';
    const createdAt = new Date(lead.createdAt ? lead.createdAt.seconds * 1000 : 0);

    const existingModal = document.getElementById('lead-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'lead-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content lead-detail-modal">
            <div class="modal-header">
                <h2>${isEditMode ? 'Edit' : 'View'} Lead - ${sanitizeText(lead.name || 'Unnamed Lead')}</h2>
                <button class="modal-close" onclick="closeLeadModal()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <div class="modal-body">
                <form id="lead-form" class="lead-form">
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
                                <label>Full Name *</label>
                                <input type="text" id="lead-name" value="${sanitizeText(lead.name || '')}" ${!isEditMode ? 'readonly' : ''} required>
                            </div>
                            <div class="form-group">
                                <label>Phone Number *</label>
                                <input type="tel" id="lead-phone" value="${sanitizeText(lead.phone || '')}" ${!isEditMode ? 'readonly' : ''} required>
                            </div>
                            <div class="form-group">
                                <label>Email Address</label>
                                <input type="email" id="lead-email" value="${sanitizeText(lead.email || '')}" ${!isEditMode ? 'readonly' : ''}>
                            </div>
                            <div class="form-group">
                                <label>Alternative Phone</label>
                                <input type="tel" id="lead-alt-phone" value="${sanitizeText(lead.altPhone || '')}" ${!isEditMode ? 'readonly' : ''}>
                            </div>
                        </div>
                    </div>

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
                                <label>Status *</label>
                                <select id="lead-status" ${!isEditMode ? 'disabled' : ''} required>
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
                            <div class="form-group">
                                <label>Source</label>
                                <select id="lead-source" ${!isEditMode ? 'disabled' : ''}>
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
                            <div class="form-group">
                                <label>Property Type</label>
                                <select id="lead-property-type" ${!isEditMode ? 'disabled' : ''}>
                                    <option value="" ${!lead.propertyType ? 'selected' : ''}>Select property type</option>
                                    <option value="apartment" ${lead.propertyType === 'apartment' ? 'selected' : ''}>Apartment</option>
                                    <option value="villa" ${lead.propertyType === 'villa' ? 'selected' : ''}>Villa</option>
                                    <option value="house" ${lead.propertyType === 'house' ? 'selected' : ''}>House</option>
                                    <option value="plot" ${lead.propertyType === 'plot' ? 'selected' : ''}>Plot</option>
                                    <option value="commercial" ${lead.propertyType === 'commercial' ? 'selected' : ''}>Commercial</option>
                                    <option value="office" ${lead.propertyType === 'office' ? 'selected' : ''}>Office Space</option>
                                    <option value="warehouse" ${lead.propertyType === 'warehouse' ? 'selected' : ''}>Warehouse</option>
                                    <option value="other" ${lead.propertyType === 'other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Budget Range</label>
                                <select id="lead-budget" ${!isEditMode ? 'disabled' : ''}>
                                    <option value="" ${!lead.budget ? 'selected' : ''}>Select budget range</option>
                                    <option value="under-50L" ${lead.budget === 'under-50L' ? 'selected' : ''}>Under ₹50 Lakh</option>
                                    <option value="50L-1Cr" ${lead.budget === '50L-1Cr' ? 'selected' : ''}>₹50 Lakh - ₹1 Crore</option>
                                    <option value="1Cr-2Cr" ${lead.budget === '1Cr-2Cr' ? 'selected' : ''}>₹1 Crore - ₹2 Crore</option>
                                    <option value="2Cr-5Cr" ${lead.budget === '2Cr-5Cr' ? 'selected' : ''}>₹2 Crore - ₹5 Crore</option>
                                    <option value="above-5Cr" ${lead.budget === 'above-5Cr' ? 'selected' : ''}>Above ₹5 Crore</option>
                                </select>
                            </div>
                            <div class="form-group full-width">
                                <label>Preferred Location</label>
                                <input type="text" id="lead-location" value="${sanitizeText(lead.location || '')}" ${!isEditMode ? 'readonly' : ''}>
                            </div>
                            <div class="form-group full-width">
                                <label>Requirements</label>
                                <textarea id="lead-requirements" rows="3" ${!isEditMode ? 'readonly' : ''}>${sanitizeText(lead.requirements || '')}</textarea>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3 class="section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 6v6l4 2"/>
                            </svg>
                            Metadata
                        </h3>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Created Date</label>
                                <input type="text" value="${formatDate(createdAt)}" readonly>
                            </div>
                            <div class="form-group">
                                <label>Lead ID</label>
                                <input type="text" value="${lead.id}" readonly>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeLeadModal()">
                    ${isEditMode ? 'Cancel' : 'Close'}
                </button>
                ${isEditMode ? `
                    <button type="button" class="btn btn-primary" onclick="saveLeadChanges('${lead.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <polyline points="17,21 17,13 7,13 7,21"/>
                            <polyline points="7,3 7,8 15,8"/>
                        </svg>
                        Save Changes
                    </button>
                ` : `
                    <button type="button" class="btn btn-primary" onclick="editLead('${lead.id}'); closeLeadModal();">
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
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close Lead Modal
function closeLeadModal() {
    const modal = document.getElementById('lead-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

// Save Lead Changes
async function saveLeadChanges(leadId) {
    try {
        const formData = {
            name: document.getElementById('lead-name').value.trim(),
            phone: document.getElementById('lead-phone').value.trim(),
            email: document.getElementById('lead-email').value.trim(),
            altPhone: document.getElementById('lead-alt-phone').value.trim(),
            status: document.getElementById('lead-status').value,
            source: document.getElementById('lead-source').value,
            propertyType: document.getElementById('lead-property-type').value,
            budget: document.getElementById('lead-budget').value,
            location: document.getElementById('lead-location').value.trim(),
            requirements: document.getElementById('lead-requirements').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: authGuard.getCurrentUser()?.uid
        };

        if (!formData.name || !formData.phone || !formData.status) {
            alert('Please fill in all required fields (Name, Phone, Status)');
            return;
        }

        await db.collection('leads').doc(leadId).update(formData);

        alert('Lead updated successfully!');
        closeLeadModal();

        if (selectedUserId) {
            selectUser(selectedUserId);
        } else if (authGuard.hasRole('user')) {
            loadUserLeadsDirectly();
        }

    } catch (error) {
        console.error('❌ Error saving lead:', error);
        alert('Error saving lead: ' + error.message);
    }
}

// Delete Lead from Database
async function deleteLeadFromDatabase(leadId) {
    try {
        await db.collection('leads').doc(leadId).delete();
        alert('Lead deleted successfully!');

        if (selectedUserId) {
            selectUser(selectedUserId);
        } else if (authGuard.hasRole('user')) {
            loadUserLeadsDirectly();
        }

    } catch (error) {
        console.error('❌ Error deleting lead:', error);
        alert('Error deleting lead: ' + error.message);
    }
}

// Load Users Section (for admin user management)
async function loadUsersSection() {
    console.log('👥 Loading users section...');

    const usersSection = document.getElementById('users-section');
    if (!usersSection) return;

    usersSection.innerHTML = `
        <div class="section-header">
            <h2>User Management</h2>
            <p>Manage all system users and their permissions</p>
        </div>

        <div class="data-table-container">
            <div class="table-header">
                <div class="search-box">
                    <input type="text" id="users-search" placeholder="Search users..." onkeyup="filterUsers(this.value)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                </div>
                <button class="refresh-btn" onclick="loadUsersSection()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23,4 23,10 17,10"/>
                        <polyline points="1,20 1,14 7,14"/>
                        <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10"/>
                        <path d="M3.51,15a9,9,0,0,0,14.85,3.36L23,14"/>
                    </svg>
                    Refresh
                </button>
            </div>

            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Master</th>
                            <th>Status</th>
                            <th>Last Login</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="users-table-body">
                        <tr>
                            <td colspan="7" class="loading-row">Loading users...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    await loadAllUsers();
}

// Load All Users
async function loadAllUsers() {
    try {
        const tableBody = document.getElementById('users-table-body');
        if (!tableBody) return;

        const usersSnapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">No users found</td></tr>';
            return;
        }

        window.allSystemUsers = users;
        renderUsersTable(users);

    } catch (error) {
        console.error('❌ Error loading users:', error);
        const tableBody = document.getElementById('users-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-row">Error loading users. Please refresh.</td></tr>';
        }
    }
}

// Render Users Table
function renderUsersTable(users) {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = users.map(user => {
        const lastLogin = user.lastLogin ? formatDate(new Date(user.lastLogin.seconds * 1000)) : 'Never';
        const master = users.find(u => u.id === user.linkedMaster);
        const masterName = master ? (master.name || master.email) : 'None';

        return `
            <tr>
                <td><strong>${sanitizeText(user.name || 'Unnamed User')}</strong></td>
                <td>${sanitizeText(user.email || 'No email')}</td>
                <td><span class="status-badge status-${(user.role || 'user').toLowerCase()}">${(user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1)}</span></td>
                <td>${sanitizeText(masterName)}</td>
                <td><span class="status-badge status-${(user.status || 'active').toLowerCase()}">${(user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)}</span></td>
                <td>${lastLogin}</td>
                <td>
                    <button class="action-btn view" onclick="viewUser('${user.id}')">View</button>
                    <button class="action-btn edit" onclick="editUser('${user.id}')">Edit</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter Users
function filterUsers(searchTerm) {
    if (!window.allSystemUsers) return;

    const filteredUsers = window.allSystemUsers.filter(user => {
        const searchText = searchTerm.toLowerCase();
        return (
            (user.name || '').toLowerCase().includes(searchText) ||
            (user.email || '').toLowerCase().includes(searchText) ||
            (user.role || '').toLowerCase().includes(searchText)
        );
    });

    renderUsersTable(filteredUsers);
}

// User Actions
function viewUser(userId) {
    const user = window.allSystemUsers.find(u => u.id === userId);
    if (user) {
        alert(`User Details:\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nStatus: ${user.status}`);
    }
}

function editUser(userId) {
    alert('User editing feature coming soon!');
}

// Helper Functions
function updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = String(value);
    }
}

function setLoginLoading(loading) {
    isLoading = loading;
    const btnText = loginBtn?.querySelector('.btn-text');
    const btnSpinner = loginBtn?.querySelector('.btn-spinner');

    if (loginBtn) {
        loginBtn.disabled = loading;

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
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(hideError, 5000);
    }
}

function hideError() {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

function sanitizeText(text) {
    if (!text) return '';
    return String(text).replace(/[<>]/g, '');
}

function formatDate(date) {
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

function getTimeAgo(date) {
    if (!date || isNaN(date)) return 'Unknown';

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

// Activity logging function
async function logActivity(action, details = {}) {
    if (!authGuard.isAuthenticated()) return;

    try {
        await db.collection('activity_logs').add({
            userId: authGuard.getCurrentUser().uid,
            userEmail: authGuard.getCurrentUser().email,
            action: action,
            details: details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userAgent: navigator.userAgent
        });
    } catch (error) {
        console.warn('⚠️ Could not log activity:', error);
    }
}

// Enhanced error handling for Firebase operations
function handleFirebaseError(error, operation = 'operation') {
    console.error(`❌ Firebase ${operation} error:`, error);

    let userMessage = `Failed to ${operation}. Please try again.`;

    switch (error.code) {
        case 'permission-denied':
            userMessage = 'You do not have permission to perform this action.';
            break;
        case 'not-found':
            userMessage = 'The requested data was not found.';
            break;
        case 'network-request-failed':
            userMessage = 'Network error. Please check your connection.';
            break;
        case 'quota-exceeded':
            userMessage = 'Service temporarily unavailable. Please try again later.';
            break;
    }

    alert(userMessage);
    return false;
}

// Enhanced lead creation function
async function createNewLead(leadData) {
    try {
        if (!leadData.name || !leadData.phone) {
            throw new Error('Name and phone are required');
        }

        const sanitizedData = {
            name: sanitizeText(leadData.name),
            phone: sanitizeText(leadData.phone),
            email: sanitizeText(leadData.email || ''),
            altPhone: sanitizeText(leadData.altPhone || ''),
            status: leadData.status || 'newLead',
            source: leadData.source || '',
            propertyType: leadData.propertyType || '',
            budget: leadData.budget || '',
            location: sanitizeText(leadData.location || ''),
            requirements: sanitizeText(leadData.requirements || ''),
            assignedTo: leadData.assignedTo || authGuard.getCurrentUser().uid,
            priority: leadData.priority || 'medium',
            createdBy: authGuard.getCurrentUser().uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: authGuard.getCurrentUser().uid
        };

        const leadRef = await db.collection('leads').add(sanitizedData);

        await logActivity('create_lead', {
            leadId: leadRef.id,
            leadName: sanitizedData.name,
            leadPhone: sanitizedData.phone
        });

        return { success: true, leadId: leadRef.id };

    } catch (error) {
        handleFirebaseError(error, 'create lead');
        return { success: false, error: error.message };
    }
}

// Connection status monitoring
function monitorConnection() {
    const showConnectionStatus = (online) => {
        const existingNotice = document.querySelector('.connection-notice');
        if (existingNotice) {
            existingNotice.remove();
        }

        if (!online) {
            const notice = document.createElement('div');
            notice.className = 'connection-notice';
            notice.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #f59e0b;
                color: white;
                text-align: center;
                padding: 8px;
                font-size: 14px;
                font-weight: 600;
                z-index: 10000;
            `;
            notice.innerHTML = '🌐 You are offline. Some features may not work properly.';
            document.body.appendChild(notice);
        }
    };

    window.addEventListener('online', () => {
        showConnectionStatus(true);
        console.log('🌐 Connection restored');
    });

    window.addEventListener('offline', () => {
        showConnectionStatus(false);
        console.log('🌐 Connection lost');
    });

    showConnectionStatus(navigator.onLine);
}

// Initialize connection monitoring
monitorConnection();

// Global functions for onclick handlers
window.loadMastersView = loadMastersView;
window.selectMaster = selectMaster;
window.selectUser = selectUser;
window.viewLead = viewLead;
window.editLead = editLead;
window.deleteLead = deleteLead;
window.viewUser = viewUser;
window.editUser = editUser;
window.closeLeadModal = closeLeadModal;
window.saveLeadChanges = saveLeadChanges;
window.filterUserLeads = filterUserLeads;
window.filterUsers = filterUsers;
window.loadUsersSection = loadUsersSection;
window.loadUserLeadsDirectly = loadUserLeadsDirectly;
window.createNewLead = createNewLead;
window.logActivity = logActivity;

// Make auth guard globally available
window.authGuard = authGuard;

console.log('✅ Enhanced Admin Panel Script Loaded - Master Hierarchy Ready');
console.log('🔧 Available functions:', Object.keys(window).filter(key =>
    typeof window[key] === 'function' && (
        key.startsWith('load') ||
        key.startsWith('select') ||
        key.startsWith('view') ||
        key.startsWith('edit') ||
        key.startsWith('delete') ||
        key.startsWith('filter') ||
        key.startsWith('close') ||
        key.startsWith('save')
    )
));

// Debug info for development
window.adminDebug = {
    authGuard,
    currentUser: () => authGuard.getCurrentUser(),
    currentRole: () => authGuard.getCurrentRole(),
    isAuthenticated: () => authGuard.isAuthenticated(),
    allLeads: () => allLeads,
    allUsers: () => allUsers,
    allMasters: () => allMasters,
    currentView: () => currentView,
    selectedMasterId: () => selectedMasterId,
    selectedUserId: () => selectedUserId,
    testConnection: () => navigator.onLine,
    resetData: () => {
        allLeads = [];
        allUsers = [];
        allMasters = [];
        console.log('🔄 Data arrays reset');
    }
};

// Performance monitoring
if (window.PerformanceUtils) {
    PerformanceUtils.endMark('app_initialization');
}

// Final initialization check
setTimeout(() => {
    if (authGuard.isAuthenticated()) {
        console.log('✅ Application fully initialized');
        console.log('👤 Current user:', authGuard.getCurrentUser()?.email);
        console.log('🔐 Current role:', authGuard.getCurrentRole());
    } else {
        console.log('ℹ️ Application initialized - waiting for authentication');
    }
}, 2000);

// Export for module compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        authGuard,
        loadDashboardData,
        showSection
    };
}