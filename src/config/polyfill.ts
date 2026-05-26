// Dedicated polyfill file to ensure global variables are defined at the absolute beginning of execution

// 1. Polyfill DOMException if it's missing (needed by Firebase SDK on Hermes)
if (typeof global.DOMException === 'undefined') {
  (global as any).DOMException = class DOMException extends Error {
    constructor(message: string, name?: string) {
      super(message);
      this.name = name || 'DOMException';
    }
  };
}

// 2. Polyfill to bypass the Event.NONE write error in event-target-shim on React Native 0.81+
if (typeof global.Event !== 'undefined') {
  const originalEvent = global.Event;
  
  // Create a customizable Event wrapper constructor
  const EventShim = function(type: string, options?: any) {
    return new originalEvent(type, options);
  };
  
  // Maintain the original prototype chain
  EventShim.prototype = originalEvent.prototype;
  
  // Make Event constants configurable & writable to support event-target-shim reassignment
  Object.defineProperty(EventShim, 'NONE', { value: 0, writable: true, enumerable: true, configurable: true });
  Object.defineProperty(EventShim, 'CAPTURING_PHASE', { value: 1, writable: true, enumerable: true, configurable: true });
  Object.defineProperty(EventShim, 'AT_TARGET', { value: 2, writable: true, enumerable: true, configurable: true });
  Object.defineProperty(EventShim, 'BUBBLING_PHASE', { value: 3, writable: true, enumerable: true, configurable: true });
  
  // Copy static properties from the original Event constructor safely
  for (const key of Object.getOwnPropertyNames(originalEvent)) {
    if (key !== 'NONE' && key !== 'CAPTURING_PHASE' && key !== 'AT_TARGET' && key !== 'BUBBLING_PHASE' && key !== 'prototype') {
      try {
        const desc = Object.getOwnPropertyDescriptor(originalEvent, key);
        if (desc) {
          Object.defineProperty(EventShim, key, desc);
        }
      } catch (e) {}
    }
  }

  global.Event = EventShim as any;
}
