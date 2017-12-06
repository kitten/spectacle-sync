import io from 'socket.io-client/dist/socket.io.slim';
import Peer from 'simple-peer';
import { emitStorageEvent } from './localStorageHook';

class SlaveManager {
  constructor(token, signalUri, setStatus, cb) {
    this.setStatus = setStatus;
    this.socket = io(signalUri);
    this.peer = new Peer({});

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
      });

      this.peer.on('close', () => {
        this.socket.close();
        this.setStatus('Disconnected');
      });

      this.peer.on('data', this.onData);

      cb();
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


  onData = payload => {
    try {
      const { key, data } = JSON.parse(payload);
      emitStorageEvent(key, data);
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
