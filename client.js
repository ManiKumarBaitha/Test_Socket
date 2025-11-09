const net = require('net');

const PORT = 4000;
const HOST = 'localhost';

console.log(`Attempting to connect to ${HOST}:${PORT}...`);

const client = net.createConnection({ port: PORT, host: HOST }, () => {
    console.log(' Connected to chat server!');
    console.log('');
    console.log('Available commands:');
    console.log('  LOGIN <username>  - Log in');
    console.log('  MSG <text>        - Send message');
    console.log('  WHO               - List users');
    console.log('  DM <user> <text>  - Private message');
    console.log('  PING              - Test connection');
    console.log('');
    console.log('Type your command and press Enter:');
});

client.on('data', (data) => {
    console.log('Server:', data.toString().trim());
});

client.on('error', (err) => {
    console.error(' Connection error:', err.message);
    process.exit(1);
});

client.on('end', () => {
    console.log('\n Disconnected from server');
    process.exit(0);
});

// Read from stdin
process.stdin.on('data', (data) => {
    const input = data.toString().trim();
    if (input.toLowerCase() === 'exit') {
        console.log('Disconnecting...');
        client.end();
        return;
    }
    client.write(input + '\n');
});

console.log('Connecting...');