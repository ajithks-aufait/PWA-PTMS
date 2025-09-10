// Utility functions for managing initial cycle data in localStorage
// This data is used to auto-fill form fields across all evaluation cycles

export interface InitialCycleData {
  product: string;
  batchNo: string;
  executiveName: string;
  lineNo: string;
  packaged: string; // Packaged Date
  expiry: string;   // Expiry Date
  timestamp: number;
}

const STORAGE_KEY = 'initialCycleData';

/**
 * Save initial cycle data to localStorage
 * This should be called when the user fills and saves the first cycle's start section
 */
export const saveInitialCycleData = (data: Partial<InitialCycleData>): void => {
  try {
    const initialData: InitialCycleData = {
      product: data.product || '',
      batchNo: data.batchNo || '',
      executiveName: data.executiveName || '',
      lineNo: data.lineNo || '',
      packaged: data.packaged || '',
      expiry: data.expiry || '',
      timestamp: Date.now()
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    console.log('Initial cycle data saved:', initialData);
  } catch (error) {
    console.error('Error saving initial cycle data:', error);
  }
};

/**
 * Get initial cycle data from localStorage
 * Returns null if no data exists
 */
export const getInitialCycleData = (): InitialCycleData | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored) as InitialCycleData;
    console.log('Initial cycle data retrieved:', data);
    return data;
  } catch (error) {
    console.error('Error retrieving initial cycle data:', error);
    return null;
  }
};

/**
 * Clear initial cycle data from localStorage
 */
export const clearInitialCycleData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Initial cycle data cleared');
  } catch (error) {
    console.error('Error clearing initial cycle data:', error);
  }
};

/**
 * Check if initial cycle data exists
 */
export const hasInitialCycleData = (): boolean => {
  return getInitialCycleData() !== null;
};

/**
 * Update a specific field in the initial cycle data
 */
export const updateInitialCycleDataField = (field: keyof InitialCycleData, value: string): void => {
  const currentData = getInitialCycleData();
  if (currentData) {
    const updatedData = { ...currentData, [field]: value, timestamp: Date.now() };
    saveInitialCycleData(updatedData);
  }
};

/**
 * Validate initial cycle data - check if we have at least one field filled
 */
export const validateInitialCycleData = (data: Partial<InitialCycleData>): boolean => {
  return !!(
    data.product ||
    data.batchNo ||
    data.executiveName ||
    data.lineNo ||
    data.packaged ||
    data.expiry
  );
};

/**
 * Check if initial cycle data is complete (all fields filled)
 */
export const isInitialCycleDataComplete = (data: Partial<InitialCycleData>): boolean => {
  return !!(
    data.product &&
    data.batchNo &&
    data.executiveName &&
    data.lineNo &&
    data.packaged &&
    data.expiry
  );
};

/**
 * Get default form values for a cycle
 * Returns initial cycle data if available, otherwise empty values
 */
export const getDefaultFormValues = (): Partial<InitialCycleData> => {
  const initialData = getInitialCycleData();
  return initialData ? {
    product: initialData.product,
    batchNo: initialData.batchNo,
    executiveName: initialData.executiveName,
    lineNo: initialData.lineNo,
    packaged: initialData.packaged,
    expiry: initialData.expiry
  } : {
    product: '',
    batchNo: '',
    executiveName: '',
    lineNo: '',
    packaged: '',
    expiry: ''
  };
};

/**
 * Format date for display (YYYY-MM-DD format for input fields)
 */
export const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format date for input (ensures proper format)
 */
export const formatDateForInput = (dateString: string): string => {
  if (!dateString) return '';
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Try to parse and format
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
};
