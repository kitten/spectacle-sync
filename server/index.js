const PORT = process.env.PORT || 3401;

const io = require('socket.io')(PORT, {
  serveClient: false,
  cookie: false
});

console.log(`> Listening on port ${PORT}`);

const sessions = new Map();
const clients = new Map();

const createSession = socket => ({ socket, size: 0 });
const registerClient = session => {
  session.size++;
  return session.size;
};

io.on('connection', socket => {
  // Client requests to create a new session
  socket.on('create-session', ({ token } = {}, callback) => {
    // Abort if token is taken
    if (!token || sessions.has(token)) {
      return callback({ error: 'The token is unavailable' });
    }

    callback({});
    console.log(`- Create Session: ${token}`);

    // Store master socket for session
    sessions.set(token, createSession(socket));

    // Forward master signals to client
    socket.on('signal', ({ clientId, data }) => {
      const client = clients.get(clientId);
      if (client !== undefined) {
        client.socket.emit('signal', { data });
      }
    });

    // Purge socket from cache when it disconnects to free session
    socket.on('disconnect', () => {
      sessions.delete(token);
    });
  });

  // Client requests to join a session
  socket.on('join-session', ({ token } = {}, callback) => {
    // Abort if token is unknown
    if (!token || !sessions.has(token)) {
      return callback({ error: 'Your token is unknown' });
    }

    callback({});

    // Retrieve session, create clientId, and store client socket
    const session = sessions.get(token);
    const clientId = `${token}-${registerClient(session)}`;
    clients.set(clientId, { socket });

    console.log(`- Join Session: ${clientId}`);

    // Signal master to establish a connection
    session.socket.emit('create-peer', { clientId });

    // Forward client signals to master
    socket.on('signal', ({ data } = {}) => {
      session.socket.emit('signal', { clientId, data });
    });

    // Purge client from cache when it disconnects from free session
    socket.on('disconnect', () => {
      clients.delete(clientId);
    });
  });
});
