// Mock Chrome APIs for development environment
// This file provides mock implementations of Chrome extension APIs so the app can run in development

interface MockStorage {
  sync: {
    get: (keys: string[] | string | null, callback: (result: any) => void) => void;
    set: (items: any, callback?: () => void) => void;
  };
}

interface MockTabs {
  query: (queryInfo: any, callback: (tabs: any[]) => void) => void;
}

interface MockRuntime {
  sendMessage: (message: any, callback?: (response: any) => void) => void;
}

declare global {
  interface Window {
    chrome: {
      storage: MockStorage;
      tabs: MockTabs;
      runtime: MockRuntime;
    };
  }
}

// Create a simple localStorage-based mock for Chrome storage
const mockStorage = {
  sync: {
    get: (keys: string[] | string | null, callback: (result: any) => void) => {
      setTimeout(() => {
        const result: any = {};
        if (keys === null) {
          // Return all stored items
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
              try {
                result[key] = JSON.parse(localStorage.getItem(key) || '{}');
              } catch {
                result[key] = localStorage.getItem(key);
              }
            }
          }
        } else if (typeof keys === 'string') {
          try {
            result[keys] = JSON.parse(localStorage.getItem(keys) || '{}');
          } catch {
            result[keys] = localStorage.getItem(keys);
          }
        } else if (Array.isArray(keys)) {
          keys.forEach(key => {
            try {
              result[key] = JSON.parse(localStorage.getItem(key) || '{}');
            } catch {
              result[key] = localStorage.getItem(key);
            }
          });
        }
        callback(result);
      }, 10);
    },
    set: (items: any, callback?: () => void) => {
      setTimeout(() => {
        Object.keys(items).forEach(key => {
          localStorage.setItem(key, JSON.stringify(items[key]));
        });
        if (callback) callback();
      }, 10);
    }
  }
};

// Mock tabs API
const mockTabs = {
  query: (queryInfo: any, callback: (tabs: any[]) => void) => {
    setTimeout(() => {
      // Return a mock tab representing the current development page
      callback([{
        id: 1,
        url: window.location.href,
        active: true,
        windowId: 1
      }]);
    }, 10);
  }
};

// Mock runtime API
const mockRuntime = {
  sendMessage: (message: any, callback?: (response: any) => void) => {
    setTimeout(() => {
      // Mock responses for different message types
      const mockResponse: any = {};
      
      if (message.type === 'GET_SITE_STATUS') {
        mockResponse.isDisabled = false;
      } else if (message.type === 'TOGGLE_SITE_DISABLED') {
        mockResponse.isDisabled = !message.isDisabled;
      }
      
      if (callback) callback(mockResponse);
    }, 10);
  }
};

// Only add mock if we're in development and chrome APIs don't exist
if (typeof window !== 'undefined' && !window.chrome) {
  window.chrome = {
    storage: mockStorage,
    tabs: mockTabs,
    runtime: mockRuntime
  };
  
  console.log('🔧 Development mode: Chrome APIs mocked');
}

// Also mock navigator.permissions if it doesn't exist
if (typeof navigator !== 'undefined' && !navigator.permissions) {
  (navigator as any).permissions = {
    query: async (permissions: any) => {
      return {
        state: 'granted',
        addEventListener: () => {}
      };
    }
  };
}

export {};