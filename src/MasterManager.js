import io from 'socket.io-client/dist/socket.io.slim';
import Peer from 'simple-peer';
import { subscribe as subscribeToStorage } from './localStorageHook';

const makeClientCounterMessage = count => count === 0
  ? '⌛  Waiting for viewers'
  : `🔴  ${count} connected viewers`;

class MasterManager {
  constructor(token, signalUri, setStatus, cb) {
    this.socket = io(signalUri, {
      transports: ['websocket'],
      timeout: 3000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 1200,
      randomizationFactor: 0,
      autoConnect: true
    });

    this.setStatus = setStatus;
    this.clientPeers = Object.create(null);
    this.clientPeersConnecting = Object.create(null);
    this.clientCounter = 0;

    this.socket.on('reconnect_attempt', () => {
      this.socket.io.opts.transports = ['polling', 'websocket'];
      this.onReconnectAttempt();
    });

    // Register signalling events
    this.socket.on('create-peer', this.onCreatePeer);
    this.socket.on('signal', this.onSignal);
    this.socket.on('disconnect', this.onReconnectAttempt);
    this.socket.on('reconnecting', this.onReconnectAttempt);
    this.socket.on('reconnect', this.onReconnect);

    // Emit session creation
    this.socket.on('connect', () => {
      this.socket.emit('create-session', { token }, ({ secret, error }) => {
        if (error) {
          cb(new Error(error));
        }

        // Set initialisation flag and secret
        this.initialised = true;
        this.token = token;
        this.secret = secret;

        // Listen to changes on the local storage
        this.unsubscribeFromStorage = subscribeToStorage(this.onStorage);

        // Cache all local storage states
        this.peerStateCache = new Object(null);

        // Initialise state with slide-state
        const spectacleSlideState = localStorage.getItem('spectacle-slide');
        if (spectacleSlideState) {
          this.peerStateCache['spectacle-slide'] = data;
        }

        // Set initial status message
        this.setStatus(makeClientCounterMessage(0));

        cb();
      });
    });
  }

  static create({ token, signalUri, setStatus }) {
    return new Promise((resolve, reject) => {
      const res = new MasterManager(token, signalUri, setStatus, error => {
        if (error) {
          reject(error);
        } else {
          resolve(res);
        }
      });
    });
  }

  onReconnectAttempt = () => {
    this.reconnecting = true;
    this.setStatus('🛑  Reconnecting...');
  };

  onReconnect = () => {
    if (!this.initialised || !this.secret) {
      return;
    }

    const opts = { token: this.token, secret: this.secret };
    this.socket.emit('resume-session', opts, ({ error }) => {
      if (error) {
        return this.setStatus('🔚  Session died');
      }

      // Set initialisation flag and secret
      this.reconnecting = false;

      // Update normal status message
      this.setStatus(makeClientCounterMessage(this.clientCounter));
    });
  };

  onCreatePeer = ({ clientId }) => {
    const peer = new Peer({
      initiator: true,
      reconnectTimer: 3000,
      trickle: false
    });

    this.clientPeersConnecting[clientId] = peer;

    peer.on('signal', data => {
      this.socket.emit('signal', { clientId, data });
    });

    peer.on('connect', () => {
      delete this.clientPeersConnecting[clientId];
      this.clientPeers[clientId] = peer;

      this.clientCounter++;
      this.setStatus(makeClientCounterMessage(this.clientCounter));

      let index = 1;
      const initState = (key, data) => {
        const payload = JSON.stringify({ key, data, kind: 'localstorage' });

        // Wait for app to process & peer to 'calm down' before sending more
        setTimeout(() => {
          peer.send(payload);
        }, 100 * index++);
      };

      // Send all other state
      for (const key in this.peerStateCache) {
        initState(key, this.peerStateCache[key]);
      }
    });

    peer.on('close', () => {
      delete this.clientPeers[clientId];
      this.clientCounter--;

      if (!this.reconnecting) {
        this.setStatus(makeClientCounterMessage(this.clientCounter));
      }
    });
  };

  onSignal = ({ clientId, data }) => {
    const peer = this.clientPeersConnecting[clientId] || this.clientPeers[clientId];
    if (peer) {
      peer.signal(data);
    }
  };

  _doSendEvent = (key, data, kind = 'localstorage') => {
    const payload = JSON.stringify({ key, data, kind });

    for (const clientId in this.clientPeers) {
      try {
        const peer = this.clientPeers[clientId];
        if (peer) {
          peer.send(payload);
        }
      } catch (err) {
        console.warn(`_doSendEvent to client ${clientId}:`, err);
      }
    }
  };

  onStorage = (key, data) => {
    // Cache all local storage changes per key
    this.peerStateCache[key] = data;
    this._doSendEvent(key, data, 'localstorage');
  };

  sendEvent = (key, data) => {
    this._doSendEvent(key, data, 'event');
  };

  destroy = () => {
    this.setStatus('🔚  Session closed');

    if (!this.initialised) {
      return;
    }

    this.unsubscribeFromStorage();
    this.socket.close();

    for (const clientId in this.clientPeers) {
      const peer = this.clientPeers[clientId];
      peer.destroy();
    }
  };
}

export default opts => MasterManager.create(opts);
