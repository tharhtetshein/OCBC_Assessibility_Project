export const MAX_SHORTCUTS = 6; // Max per page
export const SHORTCUTS_PER_PAGE = 6;

export const defaultShortcuts = [
  { id: 'scanPay', icon: 'qr_code_scanner', label: 'Scan&Pay', usageCount: 0 },
  { id: 'payNow', icon: 'payment', label: 'PayNow', usageCount: 0 },
  { id: 'transfer', icon: 'transfer_within_a_station', label: 'Transfer', usageCount: 0 },
  { id: 'overseasTransfer', icon: 'public', label: 'Overseas Transfer', usageCount: 0 },
  { id: 'bills', icon: 'receipt_long', label: 'Bills', usageCount: 0 },
  { id: 'payment-list', icon: 'list_alt', label: 'Payment List', usageCount: 0 }
];

// Organized by categories
export const paymentShortcuts = [
  { id: 'scanPay', icon: 'qr_code_scanner', label: 'Scan&Pay', category: 'Payments' },
  { id: 'payNow', icon: 'payment', label: 'PayNow', category: 'Payments' },
  { id: 'transfer', icon: 'transfer_within_a_station', label: 'Transfer', category: 'Payments' },
  { id: 'overseasTransfer', icon: 'public', label: 'Overseas Transfer', category: 'Payments' },
  { id: 'bills', icon: 'receipt_long', label: 'Bills', category: 'Payments' },
  { id: 'payment-list', icon: 'list_alt', label: 'Payment List', category: 'Payments' },
];

export const cardManagementShortcuts = [
  { id: 'report-lost-card', icon: 'credit_card_off', label: 'Report lost card', category: 'Card Management' },
  { id: 'lock-unlock-card', icon: 'lock', label: 'Lock/unlock card', category: 'Card Management' },
  { id: 'manage-card-limit', icon: 'credit_card', label: 'Manage card limit', category: 'Card Management' },
  { id: 'cancel-card', icon: 'cancel', label: 'Cancel card', category: 'Card Management' },
  { id: 'reset-pin', icon: 'pin', label: 'Reset PIN', category: 'Card Management' },
];

export const cardSettingsShortcuts = [
  { id: 'manage-overseas-usage', icon: 'travel_explore', label: 'Manage overseas usage', category: 'Card Settings' },
  { id: 'manage-nets-contactless', icon: 'contactless', label: 'Manage NETS contactless', category: 'Card Settings' },
];

export const supportShortcuts = [
  { id: 'dispute-transaction', icon: 'description', label: 'Dispute transaction', category: 'Support' },
];

// Combined list for backward compatibility
export const cardServiceShortcuts = [
  ...paymentShortcuts,
  ...cardManagementShortcuts,
  ...cardSettingsShortcuts,
  ...supportShortcuts
];

export const allShortcutOptions = [...defaultShortcuts, ...cardServiceShortcuts];

// Shortcut categories for organized display
export const shortcutCategories = [
  { name: 'Payments', shortcuts: paymentShortcuts },
  { name: 'Card Management', shortcuts: cardManagementShortcuts },
  { name: 'Card Settings', shortcuts: cardSettingsShortcuts },
  { name: 'Support', shortcuts: supportShortcuts }
];

export const slugifyShortcutId = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

export const getShortcutId = (shortcut = {}) => {
  if (shortcut.id) {
    return slugifyShortcutId(shortcut.id);
  }
  if (shortcut.label) {
    return slugifyShortcutId(shortcut.label);
  }
  return '';
};

const destination = (path, state = {}, requiresLogin = true) => ({
  path,
  state,
  requiresLogin
});

export const shortcutDestinationMap = {
  scanpay: destination('/paynow', { entryPoint: 'scanPay' }),
  paynow: destination('/paynow', { entryPoint: 'payNow' }),
  transfer: destination('/paynow', { entryPoint: 'transfer' }),
  'overseas-transfer': destination('/shared-access', { entryPoint: 'overseasTransfer' }),
  bills: destination('/paynow', { entryPoint: 'bills' }),
  'payment-list': destination('#', { entryPoint: 'paymentList', disabled: true }), // Disabled - feature coming soon
  'report-lost-card': destination('/morepage', { highlightLabel: 'Report lost card' }),
  'lock-unlock-card': destination('/morepage', { highlightLabel: 'Lock/unlock card' }),
  'manage-card-limit': destination('/morepage', { highlightLabel: 'Manage card limit' }),
  'cancel-card': destination('/morepage', { highlightLabel: 'Cancel card' }),
  'reset-pin': destination('/morepage', { highlightLabel: 'Reset PIN' }),
  'manage-overseas-usage': destination('/morepage', { highlightLabel: 'Manage overseas usage' }),
  'manage-nets-contactless': destination('/morepage', { highlightLabel: 'Manage NETS contactless' }),
  'dispute-transaction': destination('/morepage', { highlightLabel: 'Dispute transaction' })
};

export const getShortcutDestination = (shortcut) => {
  const id = getShortcutId(shortcut);
  return (
    shortcutDestinationMap[id] ||
    destination('/morepage', {
      highlightLabel: shortcut?.label || 'feature'
    })
  );
};
