import io from 'socket.io-client/dist/socket.io.slim';
import Peer from 'simple-peer';
import { subscribe as subscribeToStorage } from './localStorageHook';

const makeClientCounterMessage = count => count === 0
  ? '⌛ Waiting for viewers'
  : `🔴 ${count} connected viewers`;

class MasterManager {
  constructor(token, signalUri, setStatus, cb) {
    this.setStatus = setStatus;
    this.socket = io(signalUri);
    this.clientPeers = Object.create(null);
    this.clientCounter = 0;

    // Register signalling events
    this.socket.on('create-peer', this.onCreatePeer);
    this.socket.on('signal', this.onSignal);

    // Emit session creation
    this.socket.emit('create-session', { token }, ({ error }) => {
      if (error) {
        cb(new Error(error));
      }

      // Set initialisation flag
      this.initialised = true;

      // Listen to changes on the local storage
      this.unsubscribeFromStorage = subscribeToStorage(this.onStorage);

      // Set initial status message
      this.setStatus(makeClientCounterMessage(0));

      cb();
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

  onCreatePeer = ({ clientId }) => {
    const peer = this.clientPeers[clientId] = new Peer({
      initiator: true
    });

    peer.on('signal', data => {
      this.socket.emit('signal', { clientId, data });
    });

    peer.on('connect', () => {
      this.clientCounter++;
      this.setStatus(makeClientCounterMessage(this.clientCounter));
    });

    peer.on('close', () => {
      delete this.clientPeers[clientId];
      this.clientCounter--;
      this.setStatus(makeClientCounterMessage(this.clientCounter));
    });
  };

  onSignal = ({ clientId, data }) => {
    const peer = this.clientPeers[clientId];
    peer.signal(data);
  };

  onStorage = (key, data) => {
    const payload = JSON.stringify({ key, data });

    for (const clientId in this.clientPeers) {
      const peer = this.clientPeers[clientId];
      // TODO: Send periodically until next storage event or until heuristically
      // the clients have received it for sure
      peer.send(payload);
    }
  };

  destroy = () => {
    if (this.initialised !== true) {
      return;
    }

    this.unsubscribeFromStorage();
    this.socket.close();

    for (const clientId in this.clientPeers) {
      const peer = this.clientPeers[clientId];
      peer.destroy();
    }

    this.setStatus('🔚 Session closed');
  };
}

export default opts => MasterManager.create(opts);