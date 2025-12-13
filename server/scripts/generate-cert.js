const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, '..', 'certs');
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir);
}

const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// Command to generate self-signed cert using openssl (common on dev machines)
// If this fails, we might need another approach.
const cmd = `openssl req -nodes -new -x509 -keyout "${keyPath}" -out "${certPath}" -days 365 -subj "/CN=localhost"`;

exec(cmd, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error generating certificate: ${error.message}`);
        console.log('Ensure OpenSSL is installed and in your PATH.');
        return;
    }
    console.log('Certificate generated successfully.');
});
