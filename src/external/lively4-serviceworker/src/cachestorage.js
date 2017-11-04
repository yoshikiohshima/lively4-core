/**
 * A key-value store used by the cache
 * Currently uses IndexedDB to store data
 */
export class CacheStorage {
  constructor() {
    this._dbName = 'lively-sw-cache',
    this._storeName = 'cache';
    
    var request = indexedDB.open(this._dbName, 1);
    
    request.onupgradeneeded = (event) => {
      this.db = event.target.result;
      this.db.createObjectStore(this._storeName);
    };
    
    request.onsuccess = (event) => {
      this.db = event.target.result;
    }
  }
  
  /**
   * Stores a new key value pair or updates an existing value
   */
  put(key, value) {
    this._getObjectStore().put(value, key);
  }
  
  /**
   * Retrieves a value for a given key, or `null` if no value was found
   * @return Promise
   */
  match(key) {
    return new Promise((resolve, reject) => {
      var request = this._getObjectStore().get(key);
      request.onsuccess = (event) => {
        if(request.result) {
          resolve(request.result);
        } else {
          resolve(null);
        }
      }
      request.onerror = (event) => {
        resolve(null);
      }
    });
  }
  
  /**
   * Gets the objectStore from IndexedDB
   * @return ObjectStore
   */
  _getObjectStore() {
    var transaction = this.db.transaction([this._storeName], "readwrite");
    var objectStore = transaction.objectStore(this._storeName);
    return objectStore;
  }
}