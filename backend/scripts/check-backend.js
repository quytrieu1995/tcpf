/**
 * Script to check if backend is running
 */

const http = require('http');

const checkBackend = (port = 5000, host = 'localhost') => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: port,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Backend is running and healthy');
          console.log('Response:', data);
          resolve(true);
        } else {
          console.error(`❌ Backend returned status ${res.statusCode}`);
          reject(new Error(`Status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Backend is not reachable:', error.message);
      console.error('\n💡 Possible issues:');
      console.error('   1. Backend server is not running');
      console.error('   2. Backend is running on a different port');
      console.error('   3. Firewall is blocking the connection');
      console.error('   4. Backend crashed or failed to start');
      console.error('\n🔧 Solutions:');
      console.error('   - Check if backend is running: ps aux | grep node');
      console.error('   - Check backend logs: docker-compose logs backend');
      console.error('   - Restart backend: docker-compose restart backend');
      console.error('   - Start backend: cd backend && npm start');
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('❌ Backend health check timed out');
      reject(new Error('Timeout'));
    });

    req.end();
  });
};

// Run check
if (require.main === module) {
  const port = process.env.PORT || 5000;
  const host = process.env.HOST || 'localhost';
  
  checkBackend(port, host)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      process.exit(1);
    });
}

module.exports = { checkBackend };

