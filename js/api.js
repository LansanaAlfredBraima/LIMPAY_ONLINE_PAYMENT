const API_BASE_URL = 'https://localhost:3000/api'; // HTTPS for secure communication 
// Note: If mixed content issues arise (serving HTML from file:// and API from http://), we might need to adjust. 
// Since we are likely opening files directly or via a simple server, let's assume localhost:3000 is accessible.

const api = {
    token: localStorage.getItem('limpay_token'),

    setToken(token) {
        this.token = token;
        localStorage.setItem('limpay_token', token);
    },

    clearToken() {
        this.token = null;
        localStorage.removeItem('limpay_token');
        localStorage.removeItem('limpay_user');
    },

    async request(endpoint, method = 'GET', body = null) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            method,
            headers,
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // Token expired or invalid
                    this.clearToken();
                    if (!window.location.href.includes('login.html') && !window.location.href.includes('register.html')) {
                        window.location.href = 'login.html';
                    }
                }
                throw new Error(data.message || 'API Request Failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Auth
    async login(id, password) {
        return this.request('/auth/login', 'POST', { id, password });
    },

    async register(userData) {
        return this.request('/auth/register', 'POST', userData);
    },

    async getMe() {
        return this.request('/auth/me');
    },

    async updateProfile(profileData) {
        return this.request('/auth/me', 'PUT', profileData);
    },

    // Fees
    async getOutstandingFees() {
        return this.request('/fees/outstanding');
    },

    // Payments
    async createPaymentIntent(amount, currency = 'sle') {
        return this.request('/payments/create-payment-intent', 'POST', { amount, currency });
    },

    async recordPayment(paymentData) {
        return this.request('/payments/record', 'POST', paymentData);
    },

    async getTransactions() {
        return this.request('/payments/transactions');
    },

    // Admin
    async getAllStudents() {
        return this.request('/admin/students');
    },

    async getAllTransactions() {
        return this.request('/admin/transactions');
    },

    async addStudent(studentData) {
        return this.request('/admin/students', 'POST', studentData);
    },

    async updateStudent(studentId, studentData) {
        return this.request('/admin/students/' + studentId, 'PUT', studentData);
    },

    async deleteStudent(studentId) {
        return this.request('/admin/students/' + studentId, 'DELETE');
    }
};
