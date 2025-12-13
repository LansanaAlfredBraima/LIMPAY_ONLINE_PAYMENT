// Native fetch is available in Node.js 18+


const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let userId = '';
let feeId = '';

async function runTests() {
    console.log('Starting System Verification...');

    try {
        // 1. Test Registration
        console.log('\n1. Testing Registration...');
        const regData = {
            id: 'TEST-' + Date.now(),
            name: 'Test Student',
            email: `test${Date.now()}@example.com`,
            password: 'password123',
            faculty: 'Science'
        };

        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(regData)
        });
        const regJson = await regRes.json();

        if (regJson.success) {
            console.log('✅ Registration Successful');
            userId = regData.id;
        } else {
            throw new Error(`Registration Failed: ${regJson.message}`);
        }

        // 2. Test Login
        console.log('\n2. Testing Login...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: regData.id, password: regData.password })
        });
        const loginJson = await loginRes.json();

        if (loginJson.success && loginJson.token) {
            console.log('✅ Login Successful');
            authToken = loginJson.token;
        } else {
            throw new Error(`Login Failed: ${loginJson.message}`);
        }

        // 3. Test Get Outstanding Fees
        console.log('\n3. Testing Get Fees...');
        const feesRes = await fetch(`${BASE_URL}/fees/outstanding`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const feesJson = await feesRes.json();

        if (feesJson.success && feesJson.fees.length > 0) {
            console.log(`✅ Fees Fetched: ${feesJson.fees.length} fees found`);
            feeId = feesJson.fees[0].id;
        } else {
            throw new Error('Fees Fetch Failed or No Fees Found');
        }

        // 4. Test Record Payment
        console.log('\n4. Testing Payment Recording...');
        const payData = {
            amount: 100,
            feeId: feeId,
            description: 'Test Payment'
        };

        const payRes = await fetch(`${BASE_URL}/payments/record`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(payData)
        });
        const payJson = await payRes.json();

        if (payJson.success) {
            console.log('✅ Payment Recorded Successfully');
        } else {
            throw new Error(`Payment Failed: ${payJson.message}`);
        }

        // 5. Test Transaction History
        console.log('\n5. Testing Transaction History...');
        const histRes = await fetch(`${BASE_URL}/payments/transactions`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const histJson = await histRes.json();

        if (histJson.success && histJson.transactions.length > 0) {
            console.log(`✅ History Fetched: ${histJson.transactions.length} transactions found`);
        } else {
            throw new Error('History Fetch Failed');
        }

        console.log('\n🎉 ALL TESTS PASSED!');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        process.exit(1);
    }
}

runTests();
