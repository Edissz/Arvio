const sessions = new Map();
export const makeKey = (g,u,s) => `${g}:${u}:${s}`;
export const setSession = (k,v) => sessions.set(k,v);
export const getSession = (k) => sessions.get(k);
export const deleteSession = (k) => sessions.delete(k);
