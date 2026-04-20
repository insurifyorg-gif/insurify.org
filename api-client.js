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
    if (username !== 'admin' || password !== 'admin123') {
      throw new Error('Invalid credentials');
    }
    const email = 'insurify@gmail.com';
    try {
      // In a real app, make sure to handle creation or actual auth correctly.
      // For demo compatibility, if login fails because user doesn't exist, we fallback to create
      let userCredential;
      try {
        userCredential = await auth.signInWithEmailAndPassword(email, password);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          userCredential = await auth.createUserWithEmailAndPassword(email, password);
        } else {
          throw err;
        }
      }
      localStorage.setItem('user', JSON.stringify({ username: 'admin', role: 'admin' }));
      return { token: userCredential.user.uid, username: 'admin' };
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  }

  static logout() {
    auth.signOut();
    localStorage.removeItem('user');
  }

  static isLoggedIn() {
    return !!auth.currentUser || !!localStorage.getItem('user');
  }

  static getToken() {
    return auth.currentUser ? auth.currentUser.uid : null;
  }

  static getAuthHeader() {
    return {}; // Not needed for client side SDK, but kept for compatibility
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
