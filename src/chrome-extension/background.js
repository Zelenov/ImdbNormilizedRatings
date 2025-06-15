const DB_NAME = 'NormalizedRatingsDB';
const STORE_NAME = 'ratings';
const CHUNK_SIZE = 1000;
let TOTAL_COUNT = 0;
let PROGRESS_COUNT = 0;

// Initialize counts from storage when service worker loads
chrome.storage.local.get(['TOTAL_COUNT','PROGRESS_COUNT'], data => {
  if (typeof data.TOTAL_COUNT === 'number') TOTAL_COUNT = data.TOTAL_COUNT;
  if (typeof data.PROGRESS_COUNT === 'number') PROGRESS_COUNT = data.PROGRESS_COUNT;
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if ([chrome.runtime.OnInstalledReason.INSTALL, chrome.runtime.OnInstalledReason.UPDATE].includes(reason)) {
    try {
      const res = await fetch(chrome.runtime.getURL('title.ratings.normalized.json'));
      const data = await res.json();
      const keys = Object.keys(data);
      TOTAL_COUNT = keys.length;
      PROGRESS_COUNT = 0;
      // Persist counts
      chrome.storage.local.set({ TOTAL_COUNT, PROGRESS_COUNT });
      chrome.runtime.sendMessage({ type: 'SEED_PROGRESS', done: 0, total: TOTAL_COUNT });

      const dbReq = indexedDB.open(DB_NAME, 1);
      dbReq.onupgradeneeded = e => {
        const db = e.target.result;
        if (db.objectStoreNames.contains(STORE_NAME)) db.deleteObjectStore(STORE_NAME);
        db.createObjectStore(STORE_NAME);
      };
      dbReq.onsuccess = e => seedChunk(e.target.result, data, keys, 0);
      dbReq.onerror = e => chrome.runtime.sendMessage({ type: 'SEED_ERROR', error: e });
    } catch (err) {
      chrome.runtime.sendMessage({ type: 'SEED_ERROR', error: err });
    }
  }
});

function seedChunk(db, data, keys, start) {
  const end = Math.min(start + CHUNK_SIZE, TOTAL_COUNT);
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  if (start === 0) store.clear();
  for (let i = start; i < end; i++) store.put(data[keys[i]], keys[i]);

  tx.oncomplete = () => {
    PROGRESS_COUNT = end;
    // Persist updated progress
    chrome.storage.local.set({ PROGRESS_COUNT });
    chrome.runtime.sendMessage({ type: 'SEED_PROGRESS', done: PROGRESS_COUNT, total: TOTAL_COUNT });
    if (end < TOTAL_COUNT) {
      setTimeout(() => {
        const dbReq = indexedDB.open(DB_NAME, 1);
        dbReq.onsuccess = e => seedChunk(e.target.result, data, keys, end);
        dbReq.onerror = e => chrome.runtime.sendMessage({ type: 'SEED_ERROR', error: e });
      }, 0);
    } else {
      chrome.runtime.sendMessage({ type: 'SEED_COMPLETE', done: PROGRESS_COUNT, total: TOTAL_COUNT });
    }
  };
  tx.onerror = e => chrome.runtime.sendMessage({ type: 'SEED_ERROR', error: e });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_PROGRESS') {
    // Return persisted values
    chrome.storage.local.get(['PROGRESS_COUNT','TOTAL_COUNT'], data => {
      sendResponse({ r: data.PROGRESS_COUNT ?? 0, total: data.TOTAL_COUNT ?? 0 });
    });
    return true;
  }
  if (msg.type === 'GET_RATING') {
    const raw = msg.tconst;
    const key = raw.startsWith('tt') ? raw.substring(2) : raw;
    const dbReq = indexedDB.open(DB_NAME, 1);
    dbReq.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(key);
      getReq.onsuccess = () => sendResponse(getReq.result);
      getReq.onerror = () => sendResponse(null);
    };
    dbReq.onerror = () => sendResponse(null);
    return true;
  }
  if (msg.type === 'GET_RANDOM') {
    const dbReq = indexedDB.open(DB_NAME, 1);
    dbReq.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const keysReq = store.getAllKeys();
      keysReq.onsuccess = () => {
        const raw = keysReq.result[Math.floor(Math.random() * keysReq.result.length)];
        sendResponse({ tconst: `tt${raw}` });
      };
    };
    dbReq.onerror = () => sendResponse({ tconst: null });
    return true;
  }
});