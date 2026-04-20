// Firebase-based API Client

// Utility function to show alerts
function showAlert(message, type = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background-color: ${type === 'success' ? '#28a745' : '#dc3545'};
    color: white;
    border-radius: 5px;
    z-index: 9999;
    animation: slideIn 0.3s ease-in-out;
  `;
  alertDiv.textContent = message;
  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.style.animation = 'slideOut 0.3s ease-in-out';
    setTimeout(() => alertDiv.remove(), 300);
  }, 3000);
}

class AuthService {
  static async login(username, password) {
    // Hardcoded admin credentials — no Firebase Auth required
    if (username === 'insurifyorg@gmail.com' && password === 'admin123') {
      localStorage.setItem('admin_session', JSON.stringify({ username: 'insurifyorg@gmail.com', role: 'admin', token: 'local-admin-token' }));
      return { token: 'local-admin-token', username: 'insurifyorg@gmail.com' };
    }
    throw new Error('Invalid credentials');
  }

  static logout() {
    localStorage.removeItem('admin_session');
  }

  static isLoggedIn() {
    return !!localStorage.getItem('admin_session');
  }

  static getToken() {
    const session = localStorage.getItem('admin_session');
    return session ? JSON.parse(session).token : null;
  }

  static getAuthHeader() {
    return {}; // Kept for compatibility
  }
}

class ClaimsService {
  static async submitClaim(claimData) {
    const claimNumber = 'CLM-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    claimData.claim_number = claimNumber;
    claimData.status = 'pending';
    claimData.created_at = new Date().toISOString();

    await db.collection('claims').doc(claimNumber).set(claimData);
    return claimData; // return the claim directly, index.html expects result.claim_number
  }

  static async getClaimByNumber(claimNumber) {
    const doc = await db.collection('claims').doc(claimNumber).get();
    if (!doc.exists) throw new Error('Claim not found');
    return doc.data(); // returning object directly
  }

  static async getAllClaims() {
    const snapshot = await db.collection('claims').get();
    return snapshot.docs.map(doc => doc.data());
  }

  static async updateClaimStatus(claimNumber, status) {
    await db.collection('claims').doc(claimNumber).update({ status });
    return { success: true };
  }
}

class PoliciesService {
  static async createPolicy(policyData) {
    const policyNumber = 'POL-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    policyData.policy_number = policyNumber;
    policyData.status = 'active';
    policyData.created_at = new Date().toISOString();

    await db.collection('policies').doc(policyNumber).set(policyData);
    return policyData; // result.policy_number
  }

  static async getPolicyByNumber(policyNumber) {
    const doc = await db.collection('policies').doc(policyNumber).get();
    if (!doc.exists) throw new Error('Policy not found');
    return doc.data();
  }

  static async getAllPolicies() {
    const snapshot = await db.collection('policies').get();
    return snapshot.docs.map(doc => doc.data());
  }

  static async updatePolicyStatus(policyNumber, status) {
    await db.collection('policies').doc(policyNumber).update({ status });
    return { success: true };
  }

  static async deletePolicy(policyNumber) {
    await db.collection('policies').doc(policyNumber).delete();
    return { success: true };
  }
}

class AdminService {
  static async getDashboardStats() {
    const claimsSnap = await db.collection('claims').get();
    const policiesSnap = await db.collection('policies').get();

    const claims = claimsSnap.docs.map(d => d.data());
    const policies = policiesSnap.docs.map(d => d.data());

    return {
      total_policies: policies.length,
      active_policies: policies.filter(p => p.status === 'active').length,
      total_claims: claims.length,
      pending_claims: claims.filter(c => c.status === 'pending').length
    };
  }

  static async getClaimsByStatus(status) {
    const snapshot = await db.collection('claims').where('status', '==', status).get();
    return snapshot.docs.map(doc => doc.data());
  }
}
