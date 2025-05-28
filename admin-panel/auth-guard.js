// Authentication and Authorization Guard System
class AuthGuard {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.permissions = {
            admin: ['all'],
            cp: ['leads:own', 'leads:team', 'users:team', 'reports:read'],
            employee: ['leads:assigned', 'leads:created', 'profile:edit']
        };
    }

    // Initialize auth guard
    async init() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(async (user) => {
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

    // Load user data from Firestore
    async loadUserData(user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                throw new Error('User profile not found');
            }

            const userData = userDoc.data();

            // Validate user has valid role
            if (!userData.role || !['admin', 'cp', 'employee'].includes(userData.role)) {
                throw new Error('Invalid user role');
            }

            // Check if user is active
            if (userData.status === 'inactive') {
                throw new Error('Account has been deactivated');
            }

            this.currentUser = {
                uid: user.uid,
                email: user.email,
                ...userData
            };
            this.userRole = userData.role;

            console.log('✅ User loaded:', this.currentUser.name || this.currentUser.email, `(${this.userRole})`);

            // Update last login
            await this.updateLastLogin();

        } catch (error) {
            console.error('❌ Failed to load user data:', error);
            throw error;
        }
    }

    // Update last login timestamp
    async updateLastLogin() {
        try {
            await db.collection('users').doc(this.currentUser.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.warn('Could not update last login:', error);
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Check if user has specific role
    hasRole(role) {
        return this.userRole === role;
    }

    // Check if user has any of the specified roles
    hasAnyRole(roles) {
        return roles.includes(this.userRole);
    }

    // Check specific permissions
    hasPermission(permission) {
        if (!this.isAuthenticated()) return false;

        // Admin has all permissions
        if (this.userRole === 'admin') return true;

        // Check role-specific permissions
        const rolePermissions = this.permissions[this.userRole] || [];
        return rolePermissions.includes(permission) || rolePermissions.includes('all');
    }

    // Check if user can access specific lead
    canAccessLead(lead) {
        if (!this.isAuthenticated()) return false;

        // Admin can access all leads
        if (this.userRole === 'admin') return true;

        // User can access leads they created or are assigned to
        if (lead.createdBy === this.currentUser.uid ||
            lead.assignedTo === this.currentUser.uid) {
            return true;
        }

        // CP can access leads from their team members
        if (this.userRole === 'cp') {
            // This would need additional logic to check team relationships
            return this.isTeamLead(lead);
        }

        return false;
    }

    // Check if lead belongs to CP's team
    isTeamLead(lead) {
        // Placeholder - implement based on your team structure
        // You might store linkedCP field in user documents
        return false;
    }

    // Check if user can access specific user data
    canAccessUser(userId) {
        if (!this.isAuthenticated()) return false;

        // Admin can access all users
        if (this.userRole === 'admin') return true;

        // Users can access their own data
        if (userId === this.currentUser.uid) return true;

        // CP can access their team members
        if (this.userRole === 'cp') {
            return this.isTeamMember(userId);
        }

        return false;
    }

    // Check if user is team member
    isTeamMember(userId) {
        // Placeholder - implement based on your team structure
        return false;
    }

    // Require authentication - redirect to login if not authenticated
    requireAuth() {
        if (!this.isAuthenticated()) {
            this.redirectToLogin();
            return false;
        }
        return true;
    }

    // Require specific role
    requireRole(role) {
        if (!this.requireAuth()) return false;

        if (!this.hasRole(role)) {
            this.showAccessDenied(`This feature requires ${role} role`);
            return false;
        }
        return true;
    }

    // Require any of the specified roles
    requireAnyRole(roles) {
        if (!this.requireAuth()) return false;

        if (!this.hasAnyRole(roles)) {
            this.showAccessDenied(`This feature requires one of: ${roles.join(', ')}`);
            return false;
        }
        return true;
    }

    // Show/hide UI elements based on role
    // Show/hide UI elements based on role
    applyRoleBasedUI() {
        if (!this.isAuthenticated()) return;

        console.log('🎨 Applying role-based UI for role:', this.userRole);

        // Hide elements based on role
        const elementsToHide = {
            employee: [
                '.admin-only',
                '.cp-only',
                '[data-role="admin"]',
                '[data-role="cp"]'
            ],
            cp: [
                '.admin-only',
                '[data-role="admin"]'
            ],
            admin: [] // Admin sees everything
        };

        const hideSelectors = elementsToHide[this.userRole] || [];
        console.log('🙈 Hiding elements:', hideSelectors);

        hideSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            console.log(`Found ${elements.length} elements for selector: ${selector}`);
            elements.forEach(el => {
                el.style.display = 'none';
            });
        });

        // Show role-specific elements
        // Show role-specific elements
        const showSelectors = [
            `.${this.userRole}-only`,
            '.authenticated-only'
        ];

        console.log('👁️ Showing elements:', showSelectors);

        showSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            console.log(`Found ${elements.length} elements for selector: ${selector}`);
            elements.forEach(el => {
                el.style.display = el.dataset.originalDisplay || 'block';
            });
        });

        // Handle data-role attributes
        const roleElements = document.querySelectorAll('[data-role]');
        roleElements.forEach(el => {
            const allowedRoles = el.dataset.role.split(',');
            if (allowedRoles.includes(this.userRole)) {
                el.style.display = el.tagName.toLowerCase() === 'button' ? 'flex' : 'block';
            } else {
                el.style.display = 'none';
            }
        });

        // Update user info in UI
        this.updateUserInfoUI();
    }

    // Update user info display
    updateUserInfoUI() {
        const userNameEl = document.getElementById('user-name');
        const userEmailEl = document.getElementById('user-email');
        const userRoleEl = document.getElementById('user-role');

        if (userNameEl) userNameEl.textContent = this.currentUser.name || 'User';
        if (userEmailEl) userEmailEl.textContent = this.currentUser.email;
        if (userRoleEl) userRoleEl.textContent = this.userRole.toUpperCase();
    }

    // Sign out user
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

    // Redirect to login page
    redirectToLogin() {
        // Hide dashboard, show login
        const loginPage = document.getElementById('login-page');
        const dashboardPage = document.getElementById('dashboard-page');

        if (loginPage) loginPage.style.display = 'flex';
        if (dashboardPage) dashboardPage.style.display = 'none';

        document.body.style.background = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
    }

    // Show dashboard page
    showDashboard() {
        const loginPage = document.getElementById('login-page');
        const dashboardPage = document.getElementById('dashboard-page');

        if (loginPage) loginPage.style.display = 'none';
        if (dashboardPage) dashboardPage.style.display = 'flex';

        document.body.style.background = '#f7f8fc';

        // Apply role-based UI
        this.applyRoleBasedUI();
    }

    // Show access denied message
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

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    // Log activity for audit trail
    async logActivity(action, details = {}) {
        if (!this.isAuthenticated()) return;

        try {
            await db.collection('activity_logs').add({
                userId: this.currentUser.uid,
                userEmail: this.currentUser.email,
                action: action,
                details: details,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                ip: await this.getClientIP(),
                userAgent: navigator.userAgent
            });
        } catch (error) {
            console.warn('Could not log activity:', error);
        }
    }

    // Get client IP (basic implementation)
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    // Sanitize input to prevent XSS
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;

        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    // Sanitize HTML content
    sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    // Rate limiting for sensitive operations
    async checkRateLimit(operation, maxAttempts = 5, windowMs = 60000) {
        const key = this.currentUser ? `${this.currentUser.uid}_${operation}` : `anonymous_${operation}`;
        const now = Date.now();

        // Get stored attempts from localStorage
        const stored = localStorage.getItem(key);
        let attempts = stored ? JSON.parse(stored) : [];

        // Remove old attempts outside the window
        attempts = attempts.filter(time => now - time < windowMs);

        if (attempts.length >= maxAttempts) {
            this.showAccessDenied(`Too many ${operation} attempts. Please wait a minute.`);
            return false;
        }

        // Add current attempt
        attempts.push(now);
        localStorage.setItem(key, JSON.stringify(attempts));

        return true;
    }

    // Get current user data
    getCurrentUser() {
        return this.currentUser;
    }

    // Get current user role
    getCurrentRole() {
        return this.userRole;
    }
}

// Create global auth guard instance
const authGuard = new AuthGuard();

// Export for use in other files
window.authGuard = authGuard;