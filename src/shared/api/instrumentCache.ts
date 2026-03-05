const cache = new Map();

export function getInstrumentFromCache(uid: string) {
  return cache.get(uid);
}

export function setInstrumentCache(uid: string, instrument: any) {
  cache.set(uid, instrument);
}
