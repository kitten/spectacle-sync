const PORT = process.env.PORT || 3401;

const io = require('socket.io')(PORT, {
  pingInterval: 2000,
  pingTimeout: 3000,
  serveClient: false,
  cookie: false
});

console.log(`> Listening on port ${PORT}`);

const garbage = new Map();
const sessions = new Map();
const clients = new Map();

const createSession = socket => ({
  socket,
  size: 0,
  secret: Math.random().toString(26)
});

const registerClient = session => {
  session.size++;
  return session.size;
};

const scheduleSessionForGarbage = token => {
  // Schedule deletion
  const timeout = setTimeout(() => {
    sessions.delete(token);
    console.log(`- Destroy Session: ${token}`);
  }, 1000 * 60 * 60 * 4 /* 4h */);

  // Store timeout
  garbage.set(token, timeout);
};

const cancelSessionForGarbage = token => {
  clearTimeout(garbage.get(token));
  garbage.delete(token);
};

const attachMasterHandlers = (socket, token) => {
  // Forward master signals to client
  socket.on('signal', ({ clientId, data }) => {
    const client = clients.get(clientId);
    if (client !== undefined) {
      client.socket.emit('signal', { data });
    }
  });

  // Purge socket from cache when it disconnects to free session
  socket.on('disconnect', () => {
    console.log(`- Pause Session: ${token}`);
    scheduleSessionForGarbage(token);
  });
};

io.on('connection', socket => {
  // Client requests to create a new session
  socket.on('create-session', ({ token } = {}, callback) => {
    // Abort if token is taken
    if (!token || sessions.has(token)) {
      return callback({ error: 'The token is unavailable' });
    }

    console.log(`- Create Session: ${token}`);

    // Store master socket for session
    const session = createSession(socket);
    sessions.set(token, session);

    // Attach handlers to manage session for master
    attachMasterHandlers(socket, token);

    // Send success callback
    callback({ secret: session.secret });
  });

  // Client requests to pick up a stale session
  socket.on('resume-session', ({ token, secret } = {}, callback) => {
    if (!token || !sessions.has(token)) {
      return callback({ error: 'Your token is invalid' });
    }

    const session = sessions.get(token);
    if (session.secret !== secret) {
      return callback({ error: 'Unable to resume session' });
    }

    console.log(`- Resume Session: ${token}`);

    // Cancel deletion of stale session
    cancelSessionForGarbage(token);

    // Attach handlers once again
    attachMasterHandlers(socket, token);

    // Update session socket
    session.socket = socket;

    // Send success callback
    callback({});
  });

  // Client requests to join a session
  socket.on('join-session', ({ token } = {}, callback) => {
    // Abort if token is unknown
    if (!token || !sessions.has(token)) {
      return callback({ error: 'Your token is unknown', tryagain: false });
    } else if (garbage.has(token)) {
      return callback({ error: 'Presenter is currently disconnected', tryagain: true });
    }

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

    // Send success callback
    callback({});
  });
});
