/**
 * Utility functions for standardized offline alert messages
 */

/**
 * Shows the standard offline save alert message
 * @param cycleNumber - The cycle number that was just completed
 */
export const showOfflineSaveAlert = (cycleNumber: number): void => {
  alert(`⚠️ Network connection lost!\n\nCycle ${cycleNumber} has been saved offline.\n\nYou can continue working offline. Data will be synced when connection is restored.`);
};

/**
 * Shows the standard offline save alert message for components that use addOfflineSubmissionByCategory
 * @param cycleNumber - The cycle number that was just completed
 * @param sectionName - The name of the section (e.g., 'CBB Evaluation', 'Primary', 'Secondary', 'Product')
 */
export const showOfflineSaveAlertForCategory = (cycleNumber: number, sectionName: string): void => {
  alert(`⚠️ Network connection lost!\n\nCycle ${cycleNumber} has been saved offline in ${sectionName}.\n\nYou can continue working offline. Data will be synced when connection is restored.`);
};

/**
 * Shows the standard offline cycle saved alert message (alias for showOfflineSaveAlert)
 * @param cycleNumber - The cycle number that was just completed
 */
export const showOfflineCycleSavedAlert = (cycleNumber: number): void => {
  alert(`⚠️ Network connection lost!\n\nCycle ${cycleNumber} has been saved offline.\n\nYou can continue working offline. Data will be synced when connection is restored.`);
};
