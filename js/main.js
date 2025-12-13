/**
 * LIMPAY University - Core Logic
 * Handles Mock Authentication, Data Storage, and Payment Processing
 */

/**
 * LIMPAY University - Core Logic
 * Handles Authentication, Data Storage, and Payment Processing via API
 */

class LimpaySystem {
    constructor() {
        // No local init needed anymore
    }

    // --- Authentication ---

    async login(id, password) {
        try {
            const response = await api.login(id, password);
            if (response.success) {
                api.setToken(response.token);
                localStorage.setItem('limpay_user', JSON.stringify(response.user));
                return { success: true, user: response.user };
            }
            return { success: false, message: response.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async register(userData) {
        try {
            const response = await api.register(userData);
            return response;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    logout(redirectUrl = 'index.html') {
        api.clearToken();
        window.location.href = redirectUrl;
    }

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('limpay_user'));
    }

    requireAuth(loginUrl = 'index.html') {
        const user = this.getCurrentUser();
        if (!user) {
            window.location.href = loginUrl;
            return null;
        }
        return user;
    }

    async updateProfile(profileData) {
        try {
            return await api.updateProfile(profileData);
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // --- Transactions ---

    async createPaymentIntent(amount) {
        try {
            return await api.createPaymentIntent(amount);
        } catch (error) {
            console.error('Error creating payment intent:', error);
            return { success: false, message: error.message };
        }
    }

    async addTransaction(transaction) {
        // Now records payment via API
        try {
            const response = await api.recordPayment({
                amount: transaction.amount,
                feeId: transaction.feeId,
                description: transaction.description,
                paymentIntentId: transaction.paymentIntentId
            });
            return response;
        } catch (error) {
            console.error('Transaction error:', error);
            throw error;
        }
    }

    async getTransactions(userId) {
        try {
            const response = await api.getTransactions();
            return response.transactions;
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    }

    async getTransaction(txnId) {
        try {
            const transactions = await this.getTransactions();
            return transactions.find(t => t.id === txnId || t.id == txnId);
        } catch (error) {
            console.error('Error fetching transaction:', error);
            return null;
        }
    }

    // --- Fee Management ---

    async getOutstandingFees(userId) {
        try {
            const response = await api.getOutstandingFees();
            return response.fees;
        } catch (error) {
            console.error('Error fetching fees:', error);
            return [];
        }
    }

    // --- Admin ---

    async getAllStudents() {
        try {
            const response = await api.getAllStudents();
            return response.students;
        } catch (error) {
            console.error('Error fetching students:', error);
            return [];
        }
    }

    async getAllTransactions() {
        try {
            const response = await api.getAllTransactions();
            return response.transactions;
        } catch (error) {
            console.error('Error fetching all transactions:', error);
            return [];
        }
    }

    async addStudent(studentData) {
        try {
            return await api.addStudent(studentData);
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async updateStudent(studentId, studentData) {
        try {
            return await api.updateStudent(studentId, studentData);
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async deleteStudent(studentId) {
        try {
            return await api.deleteStudent(studentId);
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

const limpay = new LimpaySystem();

