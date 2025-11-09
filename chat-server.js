const net = require('net');

// Configuration
const PORT = process.env.PORT || 4000;
const IDLE_TIMEOUT = 60000; // 60 seconds in milliseconds

// Store connected clients
const clients = new Map(); // Map<socket, {username, lastActivity}>

// Create TCP server
const server = net.createServer((socket) => {
    console.log(`New connection from ${socket.remoteAddress}:${socket.remotePort}`);
    
    let clientData = {
        username: null,
        lastActivity: Date.now(),
        idleTimer: null
    };
    
    // Set up idle timeout
    const resetIdleTimer = () => {
        clientData.lastActivity = Date.now();
        if (clientData.idleTimer) {
            clearTimeout(clientData.idleTimer);
        }
        clientData.idleTimer = setTimeout(() => {
            if (clientData.username) {
                console.log(`${clientData.username} timed out due to inactivity`);
                socket.write('INFO Connection closed due to inactivity\n');
                socket.end();
            }
        }, IDLE_TIMEOUT);
    };
    
    resetIdleTimer();
    
    // Handle incoming data
    socket.on('data', (data) => {
        resetIdleTimer();
        
        const message = data.toString().trim();
        const lines = message.split('\n');
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            
            console.log(`Received: ${line}`);
            
            // Parse command
            const parts = line.split(' ');
            const command = parts[0].toUpperCase();
            
            if (!clientData.username && command !== 'LOGIN') {
                socket.write('ERR must-login-first\n');
                return;
            }
            
            switch (command) {
                case 'LOGIN':
                    handleLogin(socket, clientData, parts.slice(1).join(' '));
                    break;
                    
                case 'MSG':
                    handleMessage(socket, clientData, parts.slice(1).join(' '));
                    break;
                    
                case 'WHO':
                    handleWho(socket);
                    break;
                    
                case 'DM':
                    handleDirectMessage(socket, clientData, parts[1], parts.slice(2).join(' '));
                    break;
                    
                case 'PING':
                    socket.write('PONG\n');
                    break;
                    
                default:
                    socket.write(`ERR unknown-command\n`);
            }
        });
    });
    
    // Handle client disconnect
    socket.on('end', () => {
        handleDisconnect(socket, clientData);
    });
    
    socket.on('error', (err) => {
        console.error(`Socket error: ${err.message}`);
        handleDisconnect(socket, clientData);
    });
});

// Handle LOGIN command
function handleLogin(socket, clientData, username) {
    username = username.trim();
    
    if (!username) {
        socket.write('ERR invalid-username\n');
        return;
    }
    
    // Check if username is already taken
    for (let [_, data] of clients) {
        if (data.username === username) {
            socket.write('ERR username-taken\n');
            return;
        }
    }
    
    // Register the client
    clientData.username = username;
    clients.set(socket, clientData);
    
    socket.write('OK\n');
    console.log(`${username} logged in successfully`);
    
    // Notify other users
    broadcast(`INFO ${username} joined the chat\n`, socket);
}

// Handle MSG command
function handleMessage(socket, clientData, text) {
    if (!text.trim()) {
        socket.write('ERR empty-message\n');
        return;
    }
    
    const message = `MSG ${clientData.username} ${text}\n`;
    broadcast(message, socket);
    console.log(`${clientData.username}: ${text}`);
}

// Handle WHO command
function handleWho(socket) {
    for (let [_, data] of clients) {
        if (data.username) {
            socket.write(`USER ${data.username}\n`);
        }
    }
}

// Handle DM command (bonus feature)
function handleDirectMessage(socket, clientData, targetUsername, text) {
    if (!targetUsername || !text.trim()) {
        socket.write('ERR invalid-dm-format\n');
        return;
    }
    
    // Find target user
    let targetSocket = null;
    for (let [sock, data] of clients) {
        if (data.username === targetUsername) {
            targetSocket = sock;
            break;
        }
    }
    
    if (!targetSocket) {
        socket.write(`ERR user-not-found\n`);
        return;
    }
    
    // Send DM to target
    targetSocket.write(`DM ${clientData.username} ${text}\n`);
    socket.write(`DM sent to ${targetUsername}\n`);
    console.log(`DM from ${clientData.username} to ${targetUsername}: ${text}`);
}

// Broadcast message to all clients except sender
function broadcast(message, senderSocket) {
    for (let [socket, data] of clients) {
        if (socket !== senderSocket && data.username) {
            socket.write(message);
        }
    }
}

// Handle client disconnect
function handleDisconnect(socket, clientData) {
    if (clientData.idleTimer) {
        clearTimeout(clientData.idleTimer);
    }
    
    if (clientData.username) {
        console.log(`${clientData.username} disconnected`);
        broadcast(`INFO ${clientData.username} disconnected\n`, socket);
    }
    
    clients.delete(socket);
    socket.destroy();
}

// Start the server
server.listen(PORT, () => {
    console.log(`Chat server listening on port ${PORT}`);
    console.log(`Connect using: nc localhost ${PORT}`);
    console.log(`Or: telnet localhost ${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
    console.error(`Server error: ${err.message}`);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    
    // Notify all clients
    for (let [socket, data] of clients) {
        socket.write('INFO Server is shutting down\n');
        socket.end();
    }
    
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});