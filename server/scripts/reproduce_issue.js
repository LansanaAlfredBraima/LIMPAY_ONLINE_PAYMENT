const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testAddStudent() {
    try {
        // First login as admin to get token
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 'admin', password: 'admin123' })
        });

        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.error('Admin login failed:', loginData);
            return;
        }

        const token = loginData.token;
        console.log('Admin logged in, token received.');

        // Try to add student
        const studentData = {
            id: 'test_' + Date.now(),
            name: 'Test Student',
            email: 'test' + Date.now() + '@example.com',
            password: 'password123',
            faculty: 'Science'
        };

        const response = await fetch('http://localhost:3000/api/admin/students', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(studentData)
        });

        const data = await response.json();
        console.log('Add Student Response:', response.status, data);

    } catch (error) {
        console.error('Error:', error);
    }
}

testAddStudent();
