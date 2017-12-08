import io from 'socket.io-client/dist/socket.io.slim';
import Peer from 'simple-peer';
import mitt from 'mitt';
import { emitStorageEvent } from './localStorageHook';

class SlaveManager {
  constructor(token, signalUri, setStatus, cb) {
    this.setStatus = setStatus;
    this.socket = io(signalUri);
    this.peer = new Peer({});
    this.emitter = mitt();

    // Register signalling events
    this.socket.on('signal', this.onIncomingSignal);
    this.peer.on('signal', this.onOutgoingSignal);

    // Emit session join event
    this.socket.emit('join-session', { token }, ({ error }) => {
      if (error) {
        cb(new Error(error));
      }

      // Set initialisation flag
      this.initialised = true;

      this.peer.on('connect', () => {
        this.setStatus('Connected');
        cb();
      });

      this.peer.on('close', () => {
        this.socket.close();
        this.setStatus('Disconnected');
      });

      this.peer.on('data', this.onData);
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

  destroy = () => {
    if (this.initialised !== true) {
      return;
    }

    this.socket.close();
    this.peer.destroy();
    this.setStatus('Disconnected');
  };
}

export default opts => SlaveManager.create(opts);
