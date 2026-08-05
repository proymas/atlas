export const byId = (id) => document.getElementById(id);

export function safeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[char]);
}
