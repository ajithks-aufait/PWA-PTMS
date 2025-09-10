import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store/store";
import { setSectionDetails, clearSectionDetails } from "../store/planTourSlice";
import { addOfflineSubmissionByCategory } from "../store/stateSlice.ts";
import { saveSectionData } from "../Services/saveSectionData";
import { getAccessToken } from "../Services/getAccessToken";
import { 
  getInitialCycleData, 
  saveInitialCycleData,
  validateInitialCycleData
} from "../utils/initialCycleData";
// @ts-ignore
import moment from "moment";

type CycleResult = {
  started: boolean;
  completed: boolean;
  defects: string[]; // holds item names like "CBB 1"
  okays: string[];
  defectCategories: { [item: string]: string }; // stores defect categories for each item
  evaluationTypes: { [item: string]: string }; // stores evaluation types for each item
  defectRemarks: { [item: string]: string }; // stores defect remarks for each item
  okayEvaluationTypes: { [item: string]: string }; // stores evaluation types for okay items
  missedEvaluationTypes: { [item: string]: string }; // stores evaluation types for missed items
};

type CycleStatusMap = {
  [cycleNo: number]: CycleResult;
};

type SelectionItem = {
  status: "Okay" | "Not Okay" | null;
  category?: string;
  defect?: string;
  majorDefect?: string;
};

type SelectedMap = {
  [cycleNo: number]: Record<string, SelectionItem>;
};

const checklistItems: { [key: number]: string[] } = {
  1: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
  2: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
  3: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
  4: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
  5: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
  6: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
  7: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
  8: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
};

const totalCycles = 8;

interface CBBEvaluationProps {
  onCycleComplete?: () => void;
}

const CBBEvaluation: React.FC<CBBEvaluationProps> = ({
  onCycleComplete
}) => {
  // Internal state management
  const [cycleStatus, setCycleStatus] = useState<CycleStatusMap>({});
  const [selected, setSelected] = useState<SelectedMap>({});
  const [activeCycle, setActiveCycle] = useState<number>(1);
  const dispatch = useDispatch();
  const sectionDetails = useSelector((state: RootState) => state.planTour.sectionDetails);
  const user = useSelector((state: RootState) => state.user.user);
  const selectedShift = useSelector((state: RootState) => state.planTour.selectedCycle);
  const plantTourId = useSelector((state: RootState) => state.planTour.plantTourId);
  const isOfflineStarted = useSelector((state: RootState) => state.appState.isOfflineStarted);
  const offlineSubmissionsByCategory = useSelector((state: RootState) => state.appState.offlineSubmissionsByCategory);
  const reduxData = useSelector((state: RootState) => state.planTour.cycleData);
  const reduxCycleData = reduxData.filter((item: any) => 
    item.cr3ea_category === 'CBB Evaluation'
  );
  
  // Local state for form fields per cycle
  const [formFields, setFormFields] = useState<{ [cycleNo: number]: any }>({});
  // State for expanded completed cycle
  const [expandedCompletedCycle, setExpandedCompletedCycle] = useState<number | null>(null);
  
  // Refs to access current state values in callbacks
  const cycleStatusRef = useRef<CycleStatusMap>({});
  const activeCycleRef = useRef<number>(1);

  // Handler to expand/collapse and persist to localStorage
  const handleExpand = (cycleNo: number | null) => {
    setExpandedCompletedCycle(cycleNo);
    localStorage.setItem('expandedCompletedCycle', cycleNo !== null ? String(cycleNo) : '');
  };

  const handleFormFieldChange = (cycleNo: number, field: string, value: string) => {
    setFormFields((prev) => {
      const updatedForCycle = { ...(prev[cycleNo] || {}), [field]: value };
      const next = { ...prev, [cycleNo]: updatedForCycle } as { [cycle: number]: any };
      const details = {
        product: updatedForCycle.product || '',
        batchNo: updatedForCycle.batchNo || '',
        lineNo: updatedForCycle.lineNo || '',
        expiry: updatedForCycle.expiry || '',
        packaged: updatedForCycle.packaged || '',
        executiveName: updatedForCycle.executiveName || '',
        shift: selectedShift || '',
        evaluationType: '',
        criteria: '',
        cycleNum: cycleNo,
      };
      dispatch(setSectionDetails({ cycleNo, details }));
      
      // If this is cycle 1 and we have at least one field filled, save as initial cycle data
      if (cycleNo === 1 && validateInitialCycleData(updatedForCycle)) {
        saveInitialCycleData(updatedForCycle);
      }
      
      return next;
    });
  };

  // Auto-fill start fields from localStorage initial cycle data
  useEffect(() => {
    const initialData = getInitialCycleData();
    if (!initialData) return;
    
    setFormFields((prev) => {
      const next = { ...prev } as { [cycle: number]: any };
      for (let i = 1; i <= totalCycles; i++) {
        const current = next[i] || {};
        // Only auto-fill if the field is empty (don't overwrite existing data)
        next[i] = {
          ...current,
          product: current.product || initialData.product || '',
          batchNo: current.batchNo || initialData.batchNo || '',
          lineNo: current.lineNo || initialData.lineNo || '',
          packaged: current.packaged || initialData.packaged || '',
          expiry: current.expiry || initialData.expiry || '',
          executiveName: current.executiveName || initialData.executiveName || '',
        };
      }
      return next;
    });
  }, []); // Run only once on component mount

     // Function to process CBB-specific data from Redux
   const processCBBData = useCallback((cycleData: any[]) => {
     console.log('CBBEvaluation: Processing CBB data', { cycleDataLength: cycleData?.length });
     if (!cycleData || cycleData.length === 0) return;

     // Filter data for CBB Evaluation category
     const cbbData = cycleData.filter((item: any) => 
       item.cr3ea_category === 'CBB Evaluation'
     );

     console.log('CBBEvaluation: Filtered CBB data', { cbbDataLength: cbbData.length });

     // Process the cycle data to determine completed cycles
     const completedCycles = new Set<number>();
     const cycleDetails: { [cycleNo: number]: { defects: string[], okays: string[], defectCategories: { [item: string]: string }, evaluationTypes: { [item: string]: string }, defectRemarks: { [item: string]: string }, okayEvaluationTypes: { [item: string]: string }, missedEvaluationTypes: { [item: string]: string } } } = {};
     const newSelected: SelectedMap = {};
     
     cbbData.forEach((item: any) => {
       const cycleMatch = item.cr3ea_cycle?.match(/Cycle-(\d+)/);
       if (cycleMatch) {
         const cycleNo = parseInt(cycleMatch[1]);
         completedCycles.add(cycleNo);
         
         if (!cycleDetails[cycleNo]) {
           cycleDetails[cycleNo] = { 
             defects: [], 
             okays: [], 
             defectCategories: {}, 
             evaluationTypes: {}, 
             defectRemarks: {}, 
             okayEvaluationTypes: {}, 
             missedEvaluationTypes: {} 
           };
         }
         
         // Initialize selected state for this cycle if not exists
         if (!newSelected[cycleNo]) {
           newSelected[cycleNo] = {};
         }
         
         // Process based on criteria
         if (item.cr3ea_criteria === 'Okay') {
           const evaluationType = item.cr3ea_evaluationtype || item.cr3ea_defect || 'Unknown';
           cycleDetails[cycleNo].okays.push(evaluationType);
           cycleDetails[cycleNo].okayEvaluationTypes[evaluationType] = evaluationType;
           
           // Add to selected state
           newSelected[cycleNo][evaluationType] = { status: 'Okay' };
         } else if (item.cr3ea_criteria === 'Not Okay') {
           const defectItem = item.cr3ea_defect || item.cr3ea_evaluationtype || 'Unknown';
           cycleDetails[cycleNo].defects.push(defectItem);
           cycleDetails[cycleNo].defectCategories[defectItem] = item.cr3ea_defectcategory || 'Category B';
           cycleDetails[cycleNo].evaluationTypes[defectItem] = item.cr3ea_evaluationtype || defectItem;
           cycleDetails[cycleNo].defectRemarks[defectItem] = item.cr3ea_defectremarks || '';
           
           // Add to selected state with defect details
           newSelected[cycleNo][defectItem] = { 
             status: 'Not Okay',
             category: item.cr3ea_defectcategory || 'Category B',
             defect: item.cr3ea_defect || defectItem,
             majorDefect: item.cr3ea_defectremarks || ''
           };
         } else if (!item.cr3ea_criteria || item.cr3ea_criteria === null) {
           // Handle missed evaluations
           const missedItem = item.cr3ea_evaluationtype || item.cr3ea_defect || 'Unknown';
           cycleDetails[cycleNo].missedEvaluationTypes[missedItem] = missedItem;
         }
       }
     });
    
    console.log('CBBEvaluation: Processed cycle details:', cycleDetails);
    
         // Check if cycle status actually needs to be updated
     const newCycleStatus = { ...cycleStatusRef.current };
     let hasChanges = false;
    
    completedCycles.forEach(cycleNo => {
      const newStatus = {
        started: true,
        completed: true,
        defects: cycleDetails[cycleNo]?.defects || [],
        okays: cycleDetails[cycleNo]?.okays || [],
        defectCategories: cycleDetails[cycleNo]?.defectCategories || {},
        evaluationTypes: cycleDetails[cycleNo]?.evaluationTypes || {},
        defectRemarks: cycleDetails[cycleNo]?.defectRemarks || {},
        okayEvaluationTypes: cycleDetails[cycleNo]?.okayEvaluationTypes || {},
        missedEvaluationTypes: cycleDetails[cycleNo]?.missedEvaluationTypes || {}
      };
      
             // Compare with existing status to avoid unnecessary updates
       const existingStatus = cycleStatusRef.current[cycleNo];
       if (!existingStatus || 
           JSON.stringify(existingStatus) !== JSON.stringify(newStatus)) {
         newCycleStatus[cycleNo] = newStatus;
         hasChanges = true;
       }
    });
    
    // Find the next available cycle (first non-completed cycle)
    let nextAvailableCycle = 1;
    while (nextAvailableCycle <= totalCycles && completedCycles.has(nextAvailableCycle)) {
      nextAvailableCycle++;
    }
    
         // Only update state if there are actual changes
     if (hasChanges || nextAvailableCycle !== activeCycleRef.current) {
       console.log(`CBBEvaluation: Updating activeCycle from ${activeCycleRef.current} to ${nextAvailableCycle}`);
       setActiveCycle(nextAvailableCycle);
       setCycleStatus(newCycleStatus);
       setSelected(newSelected); // Update selected state with processed data
       
       console.log('CBBEvaluation: Updated cycle status:', newCycleStatus);
       console.log('CBBEvaluation: Updated selected state:', newSelected);
       console.log('CBBEvaluation: Next available cycle:', nextAvailableCycle);
     } else {
       console.log('CBBEvaluation: No changes detected, skipping state updates');
     }
     }, []);

  // Function to process offline submissions for CBB Evaluation
  const processOfflineData = useCallback(() => {
    console.log('CBBEvaluation: Processing offline data');
    
    // Get CBB-specific offline submissions
    const cbbOfflineSubmissions = offlineSubmissionsByCategory['CBB Evaluation'] || [];
    
    if (cbbOfflineSubmissions.length === 0) {
      console.log('CBBEvaluation: No offline submissions found for CBB Evaluation');
      return;
    }
    
    console.log('CBBEvaluation: Found offline submissions:', cbbOfflineSubmissions.length);
    
    // Process each offline submission
    cbbOfflineSubmissions.forEach(submission => {
      const cycleNo = submission.cycleNo;
      const records = submission.records;
      
      console.log(`CBBEvaluation: Processing offline submission for cycle ${cycleNo}`, records);
      
      // Process the records to update cycle status
      const defects: string[] = [];
      const okays: string[] = [];
      const defectCategories: { [key: string]: string } = {};
      const evaluationTypes: { [key: string]: string } = {};
      const defectRemarks: { [key: string]: string } = {};
      const okayEvaluationTypes: { [key: string]: string } = {};
      const missedEvaluationTypes: { [key: string]: string } = {};
      
      // Initialize selected state for this cycle
      const newSelected: Record<string, SelectionItem> = {};
      
      records.forEach((record: any) => {
        const item = record.cr3ea_evaluationtype || record.cr3ea_defect || 'Unknown';
        
        if (record.cr3ea_criteria === 'Okay') {
          okays.push(item);
          okayEvaluationTypes[item] = item;
          newSelected[item] = { status: 'Okay' };
        } else if (record.cr3ea_criteria === 'Not Okay') {
          defects.push(item);
          defectCategories[item] = record.cr3ea_defectcategory || 'Category B';
          evaluationTypes[item] = item;
          defectRemarks[item] = record.cr3ea_defectremarks || '';
          newSelected[item] = {
            status: 'Not Okay',
            category: record.cr3ea_defectcategory || 'Category B',
            defect: record.cr3ea_defect || item,
            majorDefect: record.cr3ea_defectremarks || ''
          };
        }
      });
      
      // Update cycle status
      setCycleStatus(prev => ({
        ...prev,
        [cycleNo]: {
          started: true,
          completed: true,
          defects,
          okays,
          defectCategories,
          evaluationTypes,
          defectRemarks,
          okayEvaluationTypes,
          missedEvaluationTypes
        }
      }));
      
      // Update selected state
      setSelected(prev => ({
        ...prev,
        [cycleNo]: newSelected
      }));
      
      console.log(`CBBEvaluation: Updated cycle ${cycleNo} with offline data`);
    });
    
    // Find the next available cycle
    const completedCycles = new Set<number>();
    Object.entries(cycleStatus).forEach(([cycleNoStr, status]) => {
      if (status.completed) {
        completedCycles.add(parseInt(cycleNoStr));
      }
    });
    
    // Add cycles from offline submissions
    cbbOfflineSubmissions.forEach(submission => {
      completedCycles.add(submission.cycleNo);
    });
    
    let nextAvailableCycle = 1;
    while (nextAvailableCycle <= totalCycles && completedCycles.has(nextAvailableCycle)) {
      nextAvailableCycle++;
    }
    
    setActiveCycle(nextAvailableCycle);
    console.log(`CBBEvaluation: Set active cycle to ${nextAvailableCycle}`);
    
  }, [offlineSubmissionsByCategory, cycleStatus]);

  // Process CBB data when reduxCycleData changes
  useEffect(() => {
    // Only process if we have data and it's different from what we've processed before
    if (reduxCycleData && reduxCycleData.length > 0) {
      const currentDataHash = JSON.stringify(reduxCycleData);
      const lastProcessedHash = localStorage.getItem('lastProcessedCBBDataHash');
      
      if (currentDataHash !== lastProcessedHash) {
        console.log('CBBEvaluation: Processing new CBB data');
        processCBBData(reduxCycleData);
        localStorage.setItem('lastProcessedCBBDataHash', currentDataHash);
      } else {
        console.log('CBBEvaluation: Skipping CBB data processing - no changes detected');
      }
    } else if (reduxCycleData && reduxCycleData.length === 0) {
      // Only reset if we actually have an empty array (not undefined/null)
      // and if we haven't already reset
      const hasReset = localStorage.getItem('cbbDataReset');
      if (!hasReset) {
        console.log('CBBEvaluation: No CBB data found, resetting to initial state');
        setCycleStatus({});
        setSelected({});
        setActiveCycle(1);
        localStorage.setItem('cbbDataReset', 'true');
      }
    }
  }, [reduxCycleData]);

  // Cleanup effect to clear localStorage when plantTourId changes or component unmounts
  useEffect(() => {
    return () => {
      // Clear the data hash when component unmounts
      localStorage.removeItem('lastProcessedCBBDataHash');
      localStorage.removeItem('cbbDataReset');
    };
  }, [plantTourId]);

  // Clear localStorage when plantTourId changes to ensure fresh data processing
  useEffect(() => {
    localStorage.removeItem('lastProcessedCBBDataHash');
    localStorage.removeItem('cbbDataReset');
    console.log('CBBEvaluation: Cleared localStorage data hash due to plantTourId change');
  }, [plantTourId]);

  // Keep refs updated with current state values
  useEffect(() => {
    cycleStatusRef.current = cycleStatus;
  }, [cycleStatus]);

  useEffect(() => {
    activeCycleRef.current = activeCycle;
  }, [activeCycle]);

  // Effect to handle offline mode and process offline submissions
  useEffect(() => {
    console.log('CBBEvaluation: Offline mode useEffect triggered - isOfflineStarted:', isOfflineStarted, 'offlineSubmissionsByCategory:', offlineSubmissionsByCategory);
    if (isOfflineStarted) {
      console.log('CBBEvaluation: Offline mode detected, processing offline data');
      processOfflineData();
    }
  }, [isOfflineStarted, offlineSubmissionsByCategory, processOfflineData]);

  const handleStart = (cycleNo: number) => {
    const items = checklistItems[cycleNo] || [];
    const initialState: Record<string, SelectionItem> = {};
    items.forEach((item) => {
      initialState[item] = { status: null };
    });

    setCycleStatus((prev) => ({
      ...prev,
      [cycleNo]: { ...prev[cycleNo], started: true },
    }));

    setSelected((prev) => ({
      ...prev,
      [cycleNo]: initialState,
    }));

    // Use values from formFields for this cycle
    const details = {
      product: formFields[cycleNo]?.product || '',
      batchNo: formFields[cycleNo]?.batchNo || '',
      lineNo: formFields[cycleNo]?.lineNo || '',
      expiry: formFields[cycleNo]?.expiry || '',
      packaged: formFields[cycleNo]?.packaged || '',
      executiveName: formFields[cycleNo]?.executiveName || '',
      shift: selectedShift || '',
      evaluationType: '',
      criteria: '',
      cycleNum: cycleNo,
    };
    dispatch(setSectionDetails({ cycleNo, details }));
  };

  const handleSelect = (
    cycleNo: number,
    item: string,
    value: "Okay" | "Not Okay"
  ) => {
    setSelected((prev) => ({
      ...prev,
      [cycleNo]: {
        ...prev[cycleNo],
        [item]: {
          ...prev[cycleNo][item],
          status: value,
        },
      },
    }));
  };

  const updateField = (
    cycleNo: number,
    item: string,
    field: keyof SelectionItem,
    value: string
  ) => {
    setSelected((prev) => ({
      ...prev,
      [cycleNo]: {
        ...prev[cycleNo],
        [item]: {
          ...prev[cycleNo][item],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async (cycleNo: number) => {
    const defects: string[] = [];
    const okays: string[] = [];
    const currentSelections = selected[cycleNo];
    Object.entries(currentSelections || {}).forEach(([key, val]) => {
      if (val.status === "Okay") okays.push(key);
      else if (val.status === "Not Okay") defects.push(key);
    });

    // Build payload for each item
    const details = sectionDetails[cycleNo] || {};
    const records = Object.entries(currentSelections || {}).map(([item, val]) => {
      const base = {
        cr3ea_evaluationtype: item, // Pass the CBB number (CBB 1, CBB 2, etc.)
        cr3ea_criteria: val.status,
        cr3ea_cycle: `Cycle-${cycleNo}`,
        cr3ea_title: 'QA_' + moment().format('MM-DD-YYYY'),
        cr3ea_expiry: details.expiry || '',
        cr3ea_shift: details.shift || '',
        cr3ea_batchno: details.batchNo || '',
        cr3ea_lineno: details.lineNo || '',
        cr3ea_category: 'CBB Evaluation',
        cr3ea_pkd: details.packaged || '',
        cr3ea_tourstartdate: moment().format('MM-DD-YYYY'),
        cr3ea_productname: details.product || '',
        cr3ea_observedby: user?.Name || '',
        cr3ea_qualitytourid: plantTourId || '',
        cr3ea_defect: val.defect || '', // Pass the defect details
      };
      if (val.status === "Not Okay") {
        return {
          ...base,
          cr3ea_defectcategory: val.category || '',
          cr3ea_defectremarks: val.majorDefect || '',
        };
      }
      return base;
    });

    // Also create records for missed items (not evaluated)
    const allCBBItems = checklistItems[cycleNo] || [];
    const evaluatedItems = Object.keys(currentSelections || {});
    const missedItems = allCBBItems.filter(item => !evaluatedItems.includes(item));
    
    // Add records for missed items
    missedItems.forEach(item => {
      records.push({
        cr3ea_evaluationtype: details.evaluationType || '',
        cr3ea_criteria: 'Not Okay', // Use 'Not Okay' for missed items to satisfy type constraint
        cr3ea_cycle: `Cycle-${cycleNo}`,
        cr3ea_title: 'QA_' + moment().format('MM-DD-YYYY'),
        cr3ea_expiry: details.expiry || '',
        cr3ea_shift: details.shift || '',
        cr3ea_batchno: details.batchNo || '',
        cr3ea_lineno: details.lineNo || '',
        cr3ea_category: 'CBB Evaluation',
        cr3ea_pkd: details.packaged || '',
        cr3ea_tourstartdate: moment().format('MM-DD-YYYY'),
        cr3ea_productname: details.product || '',
        cr3ea_observedby: user?.Name || '',
        cr3ea_qualitytourid: plantTourId || '',
        cr3ea_defect: item, // Store the actual CBB item name
        cr3ea_defectcategory: 'Missed',
        cr3ea_defectremarks: 'Missed evaluation',
      });
    });

    // Handle offline mode
    if (isOfflineStarted) {
      console.log('Saving CBB data in offline mode to Redux...');
      
      // Store submission in Redux
      const offlineSubmission = {
        cycleNo,
        records,
        timestamp: Date.now(),
        plantTourId: plantTourId || ''
      };
      
      dispatch(addOfflineSubmissionByCategory({ category: 'CBB Evaluation', submission: offlineSubmission }));
      console.log('CBB data saved to Redux. Total CBB offline submissions:', (offlineSubmissionsByCategory['CBB Evaluation'] || []).length + 1);
      alert('CBB data saved offline. Will sync when you cancel or sync offline mode.');
    } else {
      // Online mode - save to API
      const tokenResult = await getAccessToken();
      const accessToken = tokenResult?.token;
      if (!accessToken) {
        alert('No access token available');
        return;
      }
      await saveSectionData(accessToken, records);
    }

         // Collect defect details and remarks from current selections
     const defectCategories: { [item: string]: string } = {};
     const evaluationTypes: { [item: string]: string } = {};
     const defectRemarks: { [item: string]: string } = {};
     const okayEvaluationTypes: { [item: string]: string } = {};
     const missedEvaluationTypes: { [item: string]: string } = {};
     
     // Process current selections to collect details
     Object.entries(currentSelections || {}).forEach(([item, val]) => {
       if (val.status === "Okay") {
         okayEvaluationTypes[item] = item;
       } else if (val.status === "Not Okay") {
         defectCategories[item] = val.category || 'Category B';
         evaluationTypes[item] = item;
         defectRemarks[item] = val.majorDefect || '';
       }
     });
     
     // Add missed items
     missedItems.forEach(item => {
       missedEvaluationTypes[item] = item;
     });
     
     // Update cycle status to completed with all details
     setCycleStatus((prev) => ({
       ...prev,
       [cycleNo]: {
         ...prev[cycleNo],
         started: true,
         completed: true,
         defects,
         okays,
         defectCategories,
         evaluationTypes,
         defectRemarks,
         okayEvaluationTypes,
         missedEvaluationTypes
       },
     }));
    
    // Find the next available cycle
    let nextAvailableCycle = 1;
    const completedCycles = new Set<number>();
    
    // Check which cycles are completed
    Object.entries(cycleStatus).forEach(([cycleNoStr, status]) => {
      if (status.completed) {
        completedCycles.add(parseInt(cycleNoStr));
      }
    });
    // Add the current cycle as completed
    completedCycles.add(cycleNo);
    
    // Find the first non-completed cycle
    while (nextAvailableCycle <= totalCycles && completedCycles.has(nextAvailableCycle)) {
      nextAvailableCycle++;
    }
    
    // Update active cycle
    setActiveCycle(nextAvailableCycle);
    console.log(`CBBEvaluation: Cycle ${cycleNo} completed, updating activeCycle to ${nextAvailableCycle}`);
    
    dispatch(clearSectionDetails(cycleNo));
    
    // Call the parent's onCycleComplete callback if provided
    if (onCycleComplete) {
      onCycleComplete();
    }
  };

  // Debug logging
  console.log('CBBEvaluation: Current state:', {
    activeCycle,
    cycleStatus: Object.keys(cycleStatus).length,
    completedCycles: Object.entries(cycleStatus).filter(([_, status]) => status.completed).map(([cycleNo, _]) => cycleNo),
    isOfflineStarted
  });

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
             {Array.from({ length: totalCycles }, (_, i) => {
         const cycleNo = i + 1;
         const status = cycleStatus[cycleNo] || { started: false, completed: false, defects: [], okays: [], defectCategories: {}, evaluationTypes: {}, defectRemarks: {}, okayEvaluationTypes: {}, missedEvaluationTypes: {} };
         const items = checklistItems[cycleNo] || [];

         // Show all cycles that are completed, active, or the next available cycle
         const shouldShow = status.completed || cycleNo === activeCycle || cycleNo === activeCycle + 1;
         
         // Don't render cycles that shouldn't be shown
         if (!shouldShow) {
           return null;
         }

         // A cycle is disabled if it's not completed and is not the active cycle
         const isDisabled = !status.completed && cycleNo !== activeCycle;

        return (
          <div
            key={cycleNo}
            className={`border rounded-md p-4 shadow-sm ${isDisabled ? "bg-gray-100 opacity-60" : "bg-white"}`}
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-md font-semibold">
                Cycle {cycleNo}{" "}
              </h2>
            </div>

            {/* Show form only for the active cycle that is not completed and not started */}
            {!status.completed && cycleNo === activeCycle && !status.started && (
              <div className="space-y-6">
                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Product</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      placeholder="Enter Product"
                      value={formFields[cycleNo]?.product || ''}
                      onChange={e => handleFormFieldChange(cycleNo, 'product', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Batch No</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      placeholder="Enter Batch No"
                      value={formFields[cycleNo]?.batchNo || ''}
                      onChange={e => handleFormFieldChange(cycleNo, 'batchNo', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Executive Name</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      placeholder="Enter Executive Name"
                      value={formFields[cycleNo]?.executiveName || ''}
                      onChange={e => handleFormFieldChange(cycleNo, 'executiveName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Line No</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      placeholder="Enter Line No"
                      value={formFields[cycleNo]?.lineNo || ''}
                      onChange={e => handleFormFieldChange(cycleNo, 'lineNo', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Packaged</label>
                    <input
                      type="date"
                      className="w-full border rounded px-3 py-2"
                      value={formFields[cycleNo]?.packaged || ''}
                      onChange={e => handleFormFieldChange(cycleNo, 'packaged', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Expiry</label>
                    <input
                      type="date"
                      className="w-full border rounded px-3 py-2"
                      value={formFields[cycleNo]?.expiry || ''}
                      onChange={e => handleFormFieldChange(cycleNo, 'expiry', e.target.value)}
                    />
                  </div>
                </div>

                {/* Start Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleStart(cycleNo)}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Start Session
                  </button>
                </div>
              </div>
            )}

            {/* Show active session form (checklist and save/cancel) only if started and not completed */}
            {status.started && !status.completed && (
              <div className="space-y-6 mt-4">
                {items.map((item) => {
                  const current = selected[cycleNo]?.[item];
                  return (
                    <div key={item} className="border p-4 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">{item}</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSelect(cycleNo, item, "Not Okay")}
                            className={`px-3 py-1 rounded border ${current?.status === "Not Okay"
                              ? "bg-red-100 border-red-600 text-red-600"
                              : "border-red-400 text-red-500"
                              }`}
                          >
                            Not Okay
                          </button>
                          <button
                            onClick={() => handleSelect(cycleNo, item, "Okay")}
                            className={`px-3 py-1 rounded border ${current?.status === "Okay"
                              ? "bg-green-100 border-green-600 text-green-600"
                              : "border-green-400 text-green-500"
                              }`}
                          >
                            Okay
                          </button>
                        </div>
                      </div>
                      {current?.status === "Not Okay" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Select Category</label>
                            <select
                              className="w-full border rounded px-3 py-2"
                              value={current.category || ""}
                              onChange={(e) => updateField(cycleNo, item, "category", e.target.value)}
                            >
                              <option value="">Select</option>
                              <option value="Category A">Category A</option>
                              <option value="Category B">Category B</option>
                              <option value="Category C">Category C</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Defect</label>
                            <input
                              type="text"
                              className="w-full border rounded px-3 py-2"
                              placeholder="Enter Defect"
                              value={current.defect || ""}
                              onChange={(e) => updateField(cycleNo, item, "defect", e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium mb-1">Major Defect and Remarks</label>
                            <input
                              type="text"
                              className="w-full border rounded px-3 py-2"
                              placeholder="Enter Major Defect or Remarks"
                              value={current.majorDefect || ""}
                              onChange={(e) => updateField(cycleNo, item, "majorDefect", e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex justify-end gap-2 mt-4">
                  <button className="px-4 py-2 border rounded">Cancel</button>
                  <button
                    onClick={() => handleSave(cycleNo)}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Save Session
                  </button>
                </div>
              </div>
            )}

            {/* Show completed cycle summary */}
            {status.completed && (
              <div key={cycleNo} className="border-t pt-4">
                <div
                  className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => handleExpand(expandedCompletedCycle === cycleNo ? null : cycleNo)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-semibold">✓ Completed</span>
                      {status.defects.length > 0 && (
                        <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded-full text-xs font-medium">
                          {status.defects.length} Defect(s)
                        </span>
                      )}
                      {status.okays.length > 0 && (
                        <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded-full text-xs font-medium">
                          {status.okays.length} Okay(s)
                        </span>
                      )}
                      {Object.keys(status.missedEvaluationTypes).length > 0 && (
                        <span className="text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full text-xs font-medium">
                          {Object.keys(status.missedEvaluationTypes).length} Missed
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                    tabIndex={-1}
                    onClick={e => { e.stopPropagation(); handleExpand(expandedCompletedCycle === cycleNo ? null : cycleNo); }}
                  >
                    <svg className={`w-5 h-5 transform transition-transform duration-200 ${expandedCompletedCycle === cycleNo ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                {expandedCompletedCycle === cycleNo && (
                  <div className="pt-4 space-y-4">
                    {/* Defects Table */}
                    {status.defects.length > 0 && (
                      <div className="mb-4">
                        <div className="text-red-600 font-semibold mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Defects ({status.defects.length})
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm border rounded-md">
                            <thead className="bg-red-50">
                              <tr>
                                <th className="px-4 py-2 border font-medium">CBB Item</th>
                                <th className="px-4 py-2 border font-medium">Defect Category</th>
                                <th className="px-4 py-2 border font-medium">Defect Details</th>
                                <th className="px-4 py-2 border font-medium">Remarks</th>
                              </tr>
                            </thead>
                                                         <tbody>
                               {status.defects.map((defect, index) => (
                                 <tr key={index} className="bg-white hover:bg-gray-50">
                                   <td className="px-4 py-2 border font-medium text-gray-700">
                                     {status.evaluationTypes[defect] || defect}
                                   </td>
                                   <td className="px-4 py-2 border">
                                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                       status.defectCategories[defect] === 'Category A' ? 'bg-red-100 text-red-700' :
                                       status.defectCategories[defect] === 'Category B' ? 'bg-orange-100 text-orange-700' :
                                       status.defectCategories[defect] === 'Category C' ? 'bg-yellow-100 text-yellow-700' :
                                       'bg-gray-100 text-gray-700'
                                     }`}>
                                       {status.defectCategories[defect] || 'Category B'}
                                     </span>
                                   </td>
                                   <td className="px-4 py-2 border text-gray-800">
                                     {/* Show the actual defect details entered by user */}
                                     {selected[cycleNo]?.[defect]?.defect || defect}
                                   </td>
                                   <td className="px-4 py-2 border text-gray-600">
                                     {/* Show the actual remarks entered by user */}
                                     {selected[cycleNo]?.[defect]?.majorDefect || status.defectRemarks[defect] || '-'}
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {/* Okays and Missed Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Okays Section */}
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-green-700 font-semibold mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Okays ({status.okays.length})
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {status.okays.length > 0 ? (
                            status.okays
                              .sort((a, b) => {
                                const aNum = parseInt(a.toString().replace(/\D/g, '')) || 0;
                                const bNum = parseInt(b.toString().replace(/\D/g, '')) || 0;
                                return aNum - bNum;
                              })
                              .map((okay, i) => (
                                <span key={i} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                                  {status.okayEvaluationTypes[okay] || okay}
                                </span>
                              ))
                          ) : (
                            <span className="text-gray-400 italic">No Okays</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Missed Section */}
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="text-yellow-700 font-semibold mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Missed ({Object.keys(status.missedEvaluationTypes).length})
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {Object.keys(status.missedEvaluationTypes).length > 0 ? (
                            Object.values(status.missedEvaluationTypes)
                              .sort((a, b) => {
                                const aNum = parseInt(a.toString().replace(/\D/g, '')) || 0;
                                const bNum = parseInt(b.toString().replace(/\D/g, '')) || 0;
                                return aNum - bNum;
                              })
                              .map((item, i) => (
                                <span key={i} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">
                                  {item}
                                </span>
                              ))
                          ) : (
                            <span className="text-gray-400 italic">No Missed Items</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CBBEvaluation; 