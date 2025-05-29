// ===================================
// FIREBASE INTEGRATION FOR ENHANCED CRM
// File: enhanced-firebase-integration.js
// Purpose: Connect enhanced dashboard to your Firebase data
// ===================================

// Add this script to your existing project AFTER your Firebase config
// This extends your existing functionality without breaking it

// ===================================
// ENHANCED DASHBOARD DATA LOADING
// ===================================

async function loadEnhancedDashboardData() {
    console.log('📊 Loading enhanced dashboard with Firebase data...');

    try {
        // Check if user is authenticated
        if (!auth.currentUser) {
            console.log('❌ User not authenticated');
            return;
        }

        const currentUserId = auth.currentUser.uid;
        const currentUserRole = await getCurrentUserRole();

        console.log('👤 Current user role:', currentUserRole);

        // Load data based on user role
        let leads = [];
        let users = [];

        if (currentUserRole === 'admin') {
            // Admin sees all data
            leads = await getAllLeads();
            users = await getAllUsers();
        } else if (currentUserRole === 'master') {
            // Master sees their team's data
            leads = await getMasterTeamLeads(currentUserId);
            users = await getMasterTeamUsers(currentUserId);
        } else {
            // Regular user sees only their assigned leads
            leads = await getUserLeads(currentUserId);
        }

        // Calculate enhanced metrics
        const metrics = calculateEnhancedMetrics(leads);

        // Update the enhanced dashboard
        updateEnhancedDashboard(metrics, leads);

        console.log('✅ Enhanced dashboard loaded successfully');

    } catch (error) {
        console.error('❌ Error loading enhanced dashboard:', error);
        showErrorState();
    }
}

// ===================================
// FIREBASE DATA FETCHERS
// ===================================

async function getCurrentUserRole() {
    try {
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        if (userDoc.exists) {
            return userDoc.data().role || 'user';
        }
        return 'user';
    } catch (error) {
        console.error('Error getting user role:', error);
        return 'user';
    }
}

async function getAllLeads() {
    try {
        const leadsSnapshot = await db.collection('leads')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        return leadsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date()
        }));
    } catch (error) {
        console.error('Error fetching all leads:', error);
        return [];
    }
}

async function getAllUsers() {
    try {
        const usersSnapshot = await db.collection('users').get();
        return usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching all users:', error);
        return [];
    }
}

async function getMasterTeamLeads(masterId) {
    try {
        // Get team members first
        const teamSnapshot = await db.collection('users')
            .where('linkedMaster', '==', masterId)
            .get();

        const teamMemberIds = teamSnapshot.docs.map(doc => doc.id);
        teamMemberIds.push(masterId); // Include master's own leads

        if (teamMemberIds.length === 0) {
            return [];
        }

        // Get leads for all team members
        const leadsSnapshot = await db.collection('leads')
            .where('assignedTo', 'in', teamMemberIds)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        return leadsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date()
        }));
    } catch (error) {
        console.error('Error fetching master team leads:', error);
        return [];
    }
}

async function getMasterTeamUsers(masterId) {
    try {
        const teamSnapshot = await db.collection('users')
            .where('linkedMaster', '==', masterId)
            .get();

        return teamSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching master team users:', error);
        return [];
    }
}

async function getUserLeads(userId) {
    try {
        const leadsSnapshot = await db.collection('leads')
            .where('assignedTo', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        return leadsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date()
        }));
    } catch (error) {
        console.error('Error fetching user leads:', error);
        return [];
    }
}

// ===================================
// METRICS CALCULATION
// ===================================

function calculateEnhancedMetrics(leads) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total leads
    const totalLeads = leads.length;

    // Active leads (not closed, dropped, or not interested)
    const activeLeads = leads.filter(lead =>
        !['closed', 'dropped', 'notinterested'].includes(lead.status?.toLowerCase())
    ).length;

    // Pending follow-ups
    const pendingFollowups = leads.filter(lead =>
        lead.status?.toLowerCase() === 'followup' || lead.status?.toLowerCase() === 'followUp'
    ).length;

    // Overdue tasks (follow-ups with past dates)
    const overdueTasks = leads.filter(lead => {
        if (!lead.followupDate) return false;
        const followupDate = lead.followupDate.toDate ? lead.followupDate.toDate() : new Date(lead.followupDate);
        return followupDate < now && !['closed', 'dropped', 'notinterested'].includes(lead.status?.toLowerCase());
    }).length;

    // New leads this week
    const newLeadsThisWeek = leads.filter(lead => lead.createdAt > weekAgo).length;
    const newLeadsLastWeek = leads.filter(lead =>
        lead.createdAt <= weekAgo && lead.createdAt > new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    // Calculate trends
    const weeklyGrowth = newLeadsLastWeek > 0 ?
        Math.round(((newLeadsThisWeek - newLeadsLastWeek) / newLeadsLastWeek) * 100) :
        (newLeadsThisWeek > 0 ? 100 : 0);

    return {
        totalLeads,
        activeLeads,
        pendingFollowups,
        overdueTasks,
        newLeadsThisWeek,
        weeklyGrowth,
        // Additional metrics
        conversionRate: totalLeads > 0 ? Math.round((leads.filter(l => ['booked', 'closed'].includes(l.status?.toLowerCase())).length / totalLeads) * 100) : 0
    };
}

// ===================================
// DASHBOARD UPDATE FUNCTIONS
// ===================================

function updateEnhancedDashboard(metrics, leads) {
    // Update metric cards with animations
    updateMetricCards(metrics);

    // Update leads table with real data
    updateLeadsTable(leads.slice(0, 10)); // Show recent 10 leads

    // Update activity feed with real activity
    updateActivityFeed(leads);
}

function updateMetricCards(metrics) {
    // Animate the counters
    animateCounter('total-leads', 0, metrics.totalLeads, 1500);
    animateCounter('active-leads', 0, metrics.activeLeads, 1800);
    animateCounter('pending-followups', 0, metrics.pendingFollowups, 2100);
    animateCounter('overdue-tasks', 0, metrics.overdueTasks, 2400);

    // Update trend indicators
    updateTrendIndicator('total-leads', metrics.weeklyGrowth);
    updateTrendIndicator('active-leads', Math.round((metrics.activeLeads / metrics.totalLeads) * 100));
}

function updateTrendIndicator(metricId, value) {
    const metricCard = document.querySelector(`#${metricId}`).closest('.metric-card');
    const trendElement = metricCard.querySelector('.metric-trend');

    if (trendElement) {
        if (value > 0) {
            trendElement.className = 'metric-trend trend-up';
            trendElement.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
                </svg>
                +${value}% improvement
            `;
        } else if (value < 0) {
            trendElement.className = 'metric-trend trend-down';
            trendElement.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="1,18 8.5,10.5 13.5,15.5 23,6"/>
                </svg>
                ${value}% change
            `;
        } else {
            trendElement.className = 'metric-trend trend-neutral';
            trendElement.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                </svg>
                No change
            `;
        }
    }
}

function updateLeadsTable(leads) {
    const tableBody = document.getElementById('leads-table-body');
    if (!tableBody) return;

    if (leads.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="loading-row">No leads found</td></tr>';
        return;
    }

    tableBody.innerHTML = leads.map(lead => `
        <tr class="fade-in">
            <td><strong>${sanitizeText(lead.name || 'Unknown')}</strong></td>
            <td>${sanitizeText(lead.phone || 'No phone')}</td>
            <td><span class="status-badge enhanced status-${lead.status || 'newlead'}">${getStatusText(lead.status)}</span></td>
            <td>${sanitizeText(lead.source || 'Unknown')}</td>
            <td>${formatFirebaseDate(lead.createdAt)}</td>
            <td>
                <button class="action-btn view" onclick="viewLead('${lead.id}')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    View
                </button>
                <button class="action-btn edit" onclick="editLead('${lead.id}')">
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

function updateActivityFeed(leads) {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;

    // Generate activity from recent leads
    const recentLeads = leads.slice(0, 5);
    const activities = recentLeads.map(lead => {
        const timeAgo = getTimeAgo(lead.createdAt);
        return {
            icon: getActivityIcon(lead.status),
            description: `${getActivityText(lead.status)}: <strong>${sanitizeText(lead.name || 'Unknown Lead')}</strong>`,
            time: timeAgo
        };
    });

    if (activities.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item enhanced">
                <div class="activity-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                </div>
                <div class="activity-content">
                    <p>No recent activity</p>
                    <div class="activity-time">Start by adding some leads</div>
                </div>
            </div>
        `;
        return;
    }

    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item enhanced">
            <div class="activity-icon">
                ${activity.icon}
            </div>
            <div class="activity-content">
                <p>${activity.description}</p>
                <div class="activity-time">${activity.time}</div>
            </div>
        </div>
    `).join('');
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

function sanitizeText(text) {
    if (!text) return '';
    return text.toString().replace(/[<>&"']/g, function(match) {
        const escape = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escape[match];
    });
}

function formatFirebaseDate(date) {
    if (!date) return 'Unknown';

    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getTimeAgo(date) {
    if (!date) return 'Unknown time';

    const d = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now - d) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return d.toLocaleDateString();
}

function getActivityIcon(status) {
    const icons = {
        'newlead': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
        'contacted': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
        'interested': '<polyline points="20,6 9,17 4,12"/>',
        'followup': '<circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>',
        'visit': '<path d="M3 9.5L12 4l9 5.5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11z"/>',
        'booked': '<polyline points="20,6 9,17 4,12"/>',
        'closed': '<polyline points="20,6 9,17 4,12"/>'
    };

    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[status] || icons['newlead']}</svg>`;
}

function getActivityText(status) {
    const texts = {
        'newlead': 'New lead',
        'contacted': 'Lead contacted',
        'interested': 'Lead interested',
        'followup': 'Follow-up scheduled',
        'visit': 'Visit scheduled',
        'booked': 'Lead booked',
        'closed': 'Lead closed'
    };

    return texts[status] || 'Lead updated';
}

function showErrorState() {
    // Update metric cards to show error
    ['total-leads', 'active-leads', 'pending-followups', 'overdue-tasks'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '-';
    });

    // Update table to show error
    const tableBody = document.getElementById('leads-table-body');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="6" class="loading-row">Error loading data. Please refresh.</td></tr>';
    }

    // Show error in activity feed
    const activityList = document.getElementById('activity-list');
    if (activityList) {
        activityList.innerHTML = `
            <div class="activity-item enhanced">
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

// ===================================
// INTEGRATION WITH EXISTING FUNCTIONS
// ===================================

// Override/extend your existing loadDashboardData function
const originalLoadDashboardData = window.loadDashboardData;
window.loadDashboardData = function() {
    console.log('🔄 Loading enhanced dashboard data...');

    // Call original function if it exists
    if (originalLoadDashboardData) {
        originalLoadDashboardData();
    }

    // Load enhanced dashboard
    loadEnhancedDashboardData();
};

// ===================================
// FIREBASE LISTENERS FOR REAL-TIME UPDATES
// ===================================

function setupRealTimeListeners() {
    if (!auth.currentUser) return;

    console.log('🔄 Setting up real-time listeners...');

    // Listen for leads changes
    const leadsListener = db.collection('leads').onSnapshot((snapshot) => {
        console.log('📊 Leads data updated, refreshing dashboard...');
        setTimeout(() => {
            loadEnhancedDashboardData();
        }, 500); // Small delay to prevent too frequent updates
    }, (error) => {
        console.error('Error in leads listener:', error);
    });

    // Store listener for cleanup
    window.enhancedListeners = window.enhancedListeners || [];
    window.enhancedListeners.push(leadsListener);
}

// Cleanup listeners when user signs out
const originalSignOut = window.signOut;
window.signOut = function() {
    // Cleanup listeners
    if (window.enhancedListeners) {
        window.enhancedListeners.forEach(listener => listener());
        window.enhancedListeners = [];
    }

    // Call original signOut
    if (originalSignOut) {
        originalSignOut();
    }
};

// ===================================
// INITIALIZATION
// ===================================

// Initialize enhanced dashboard when auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('🔐 User authenticated, setting up enhanced features...');
        setTimeout(() => {
            loadEnhancedDashboardData();
            setupRealTimeListeners();
        }, 1000); // Give time for UI to load
    } else {
        console.log('🔐 User not authenticated');
        // Cleanup listeners
        if (window.enhancedListeners) {
            window.enhancedListeners.forEach(listener => listener());
            window.enhancedListeners = [];
        }
    }
});

console.log('✅ Enhanced Firebase Integration Loaded');
console.log('🚀 Functions available: loadEnhancedDashboardData(), setupRealTimeListeners()');