import io from 'socket.io-client/dist/socket.io.slim';
import Peer from 'simple-peer';
import mitt from 'mitt';
import { emitStorageEvent } from './localStorageHook';

class SlaveManager {
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

    this.peer = new Peer({
      reconnectTimer: 3000,
      trickle: false
    });

    this.setStatus = setStatus;
    this.emitter = mitt();

    // Register signalling events
    this.socket.on('signal', this.onIncomingSignal);

    this.socket.on('reconnect_attempt', () => {
      this.socket.io.opts.transports = ['polling', 'websocket'];
    });

    // Emit session join event
    this.socket.emit('join-session', { token }, ({ error }) => {
      if (error) {
        cb(new Error(error));
      }

      // Set initialisation flag and token
      this.initialised = true;
      this.token = token;
      this.attachPeer();

      this.peer.on('connect', () => {
        this.setStatus('Connected');
        cb();
      });
    });
  }

  static create({ token, signalUri, setStatus }) {
    return new Promise((resolve, reject) => {
      const res = new SlaveManager(token, signalUri, setStatus, error => {
        if (error) {
          reject(error);
        } else {
          resolve(res);
        }
      });
    });
  }

  attachPeer = () => {
    this.peer.on('signal', this.onOutgoingSignal);

    this.peer.on('close', () => {
      this.setStatus('Reconnecting...');
      this.peer.destroy();
      this.reconnect();
    });

    this.peer.on('data', this.onData);
  };

  subscribe = cb => {
    this.emitter.on('*', cb);
    return () => this.emitter.off('*', cb);
  };

  onData = payload => {
    try {
      const { key, data, kind } = JSON.parse(payload);

      if (kind === 'localstorage') {
        emitStorageEvent(key, data);
      } else if (kind === 'event') {
        this.emitter.emit(key, data);
      }
    } catch (err) {
      console.error(`Error parsing master payload`, err);
    }
  }

  onIncomingSignal = ({ data }) => {
    this.peer.signal(data);
  };

  onOutgoingSignal = (data) => {
    this.socket.emit('signal', { data });
  };

  reconnect = () => {
    if (this.initialised) {
      this.initialised = false;
      this.peer = new Peer({});
      this.attachPeer();

      this.peer.on('connect', () => {
        this.setStatus('Connected');
      });
    }

    const opts = { token: this.token };

    this.socket.emit('join-session', opts, ({ error, tryagain }) => {
      if (error && tryagain) {
        return setTimeout(this.reconnect, 1000);
      } else if (error) {
        return this.destroy();
      }

      this.initialised = true;
    });
  };

  destroy = () => {
    this.socket.close();
    this.setStatus('Disconnected');

    if (this.initialised) {
      this.peer.destroy();
    }
  };
}

export default opts => SlaveManager.create(opts);
