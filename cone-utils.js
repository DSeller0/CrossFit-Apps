// Shared utility functions for all public pages.
// Loaded after cone-client.js — exposes functions to all subsequent scripts.

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toISO(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function todayISO() {
  return toISO(new Date());
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
