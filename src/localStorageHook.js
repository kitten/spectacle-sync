import mitt from 'mitt';

const emitter = mitt();

// I guess it could be worse
if (typeof localStorage === 'object' && localStorage.setItem) {
  const _localStorage = localStorage;

  const proxy = {
    setItem(key, val) {
      emitter.emit(key, val);
      _localStorage.setItem.call(_localStorage, key, val);
    },
    getItem(key) {
      _localStorage.getItem.call(_localStorage, key);
    },
    clear() {
      _localStorage.clear.call(_localStorage);
    }
  };

  // NOTE: defineProperty is a necessary workaround for Firefox
  Object.defineProperty(window, 'localStorage', {
    value: proxy,
    configurable: true,
    enumerable: true,
    writable: true
  });
}

export const emitStorageEvent = (key, newValue) => {
  // Emit a fake "storage" event for Spectacle
  const event = new Event('storage');
  event.key = key;
  event.newValue = newValue;
  window.dispatchEvent(event);

  // Also set the result in the localStorage for other tabs
  localStorage.setItem(key, newValue);
};

export const subscribe = cb => {
  emitter.on('*', cb);
  return () => emitter.off('*', cb);
};
