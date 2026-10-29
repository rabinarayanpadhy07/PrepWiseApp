/**
 * Unsent interview answers, kept in this browser only so a reload or lost
 * connection doesn't lose a typed answer. Signing out removes them, so the
 * next person on a shared computer can't read them. Storage can be
 * unavailable; drafts are then simply not kept.
 */
const PREFIX = "prepwise:draft:";

export function draftKey(sessionId, position) {
  return `${PREFIX}${sessionId}:${position}`;
}

export function readDraft(key) {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function writeDraft(key, value) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearDraft(sessionId, position) {
  writeDraft(draftKey(sessionId, position), "");
}

export function clearAllDrafts() {
  try {
    const keys = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }
}
