import React, { useState, useEffect, useCallback } from "react";
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
  defects: string[];
  okays: string[];
  defectCategories: { [item: string]: string };
  evaluationTypes: { [item: string]: string };
  defectRemarks: { [item: string]: string };
  okayEvaluationTypes: { [item: string]: string };
  missedEvaluationTypes: { [item: string]: string };
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

const secondaryItems: { [key: number]: string[] } = {
  1: ["SP 1", "SP 2", "SP 3", "SP 4"],
  2: ["SP 1", "SP 2", "SP 3", "SP 4"],
  3: ["SP 1", "SP 2", "SP 3", "SP 4"],
  4: ["SP 1", "SP 2", "SP 3", "SP 4"],
  5: ["SP 1", "SP 2", "SP 3", "SP 4"],
  6: ["SP 1", "SP 2", "SP 3", "SP 4"],
  7: ["SP 1", "SP 2", "SP 3", "SP 4"],
  8: ["SP 1", "SP 2", "SP 3", "SP 4"],
};

const totalCycles = 8;

interface SecondaryEvaluationProps {
  onCycleComplete: () => void;
}

const SecondaryEvaluation: React.FC<SecondaryEvaluationProps> = ({
  onCycleComplete
}) => {
  const dispatch = useDispatch();
  const sectionDetails = useSelector((state: RootState) => state.planTour.sectionDetails);
  const user = useSelector((state: RootState) => state.user.user);
  const selectedShift = useSelector((state: RootState) => state.planTour.selectedCycle);
  const plantTourId = useSelector((state: RootState) => state.planTour.plantTourId);
  const isOfflineStarted = useSelector((state: RootState) => state.appState.isOfflineStarted);
  const offlineSubmissions = useSelector((state: RootState) => state.appState.offlineSubmissions);
  const offlineSubmissionsByCategory = useSelector((state: RootState) => state.appState.offlineSubmissionsByCategory);
  const reduxData = useSelector((state: RootState) => state.planTour.cycleData);
  const reduxCycleData = reduxData.filter((item: any) => 
    item.cr3ea_category === 'Secondary'
  );
  
  // Local state for Secondary evaluation
  const [cycleStatus, setCycleStatus] = useState<CycleStatusMap>({});
  const [selected, setSelected] = useState<SelectedMap>({});
  const [activeCycle, setActiveCycle] = useState<number>(1);
  const [formFields, setFormFields] = useState<{ [cycleNo: number]: any }>({});
  const [expandedCompletedCycle, setExpandedCompletedCycle] = useState<number | null>(null);

  const handleExpand = (cycleNo: number | null) => {
    setExpandedCompletedCycle(cycleNo);
    localStorage.setItem('expandedSecondaryCycle', cycleNo !== null ? String(cycleNo) : '');
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
      
      // If this is cycle 1 and we have all required fields, save as initial cycle data
      if (cycleNo === 1 && validateInitialCycleData(updatedForCycle)) {
        console.log('SecondaryEvaluation: Saving initial cycle data for auto-fill:', updatedForCycle);
        saveInitialCycleData(updatedForCycle);
      }
      
      return next;
    });
  };

  // Auto-fill start fields from localStorage initial cycle data
  useEffect(() => {
    const initialData = getInitialCycleData();
    if (!initialData) return;
    
    console.log('SecondaryEvaluation: Auto-filling from initial cycle data:', initialData);
    
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

  const processSecondaryData = useCallback((cycleData: any[]) => {
    console.log('SecondaryEvaluation: Processing Secondary data', { cycleDataLength: cycleData?.length });
    if (!cycleData || cycleData.length === 0) return;

    // Filter data for Secondary category
    const secondaryData = cycleData.filter((item: any) => 
      item.cr3ea_category === 'Secondary'
    );

    console.log('SecondaryEvaluation: Filtered Secondary data', { secondaryDataLength: secondaryData.length });

    // Process the cycle data to determine completed cycles
    const completedCycles = new Set<number>();
    const cycleDetails: { [cycleNo: number]: { defects: string[], okays: string[], defectCategories: { [item: string]: string }, evaluationTypes: { [item: string]: string }, defectRemarks: { [item: string]: string }, okayEvaluationTypes: { [item: string]: string }, missedEvaluationTypes: { [item: string]: string } } } = {};
    const newSelected: SelectedMap = {};
    
          secondaryData.forEach((item: any) => {
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
    
    console.log('SecondaryEvaluation: Processed cycle details:', cycleDetails);
    
    // Check if cycle status actually needs to be updated
    const newCycleStatus = { ...cycleStatus };
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
      const existingStatus = cycleStatus[cycleNo];
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
     if (hasChanges || nextAvailableCycle !== activeCycle) {
       console.log(`SecondaryEvaluation: Updating activeCycle from ${activeCycle} to ${nextAvailableCycle}`);
       setActiveCycle(nextAvailableCycle);
       setCycleStatus(newCycleStatus);
       setSelected(newSelected); // Update selected state with processed data
       
       console.log('SecondaryEvaluation: Updated cycle status:', newCycleStatus);
       console.log('SecondaryEvaluation: Updated selected state:', newSelected);
       console.log('SecondaryEvaluation: Next available cycle:', nextAvailableCycle);
     } else {
       console.log('SecondaryEvaluation: No changes detected, skipping state updates');
     }
  }, [cycleStatus, activeCycle]);

  // Process offline data for Secondary evaluation
  const processOfflineData = () => {
    if (!isOfflineStarted) {
      return;
    }

    console.log("SecondaryEvaluation: Offline mode: Processing offline submissions for cycle details");
    console.log("SecondaryEvaluation: Offline submissions length:", offlineSubmissions.length);
    console.log("SecondaryEvaluation: Redux cycle data length:", reduxCycleData?.length || 0);

    // Initialize cycle status and selected state
    const newCycleStatus: CycleStatusMap = {};
    const newSelected: SelectedMap = {};

    // First, process Redux data if available (for existing completed cycles)
    if (reduxCycleData && reduxCycleData.length > 0) {
      console.log("SecondaryEvaluation: Offline mode: Processing Redux data for existing completed cycles");
      
      // Filter data for Secondary category
      const secondaryData = reduxCycleData.filter((item: any) => 
        item.cr3ea_category === 'Secondary'
      );

      if (secondaryData.length > 0) {
        // Process each cycle from Redux data
        for (let cycleNo = 1; cycleNo <= totalCycles; cycleNo++) {
          const cycleData = secondaryData.filter((item: any) => {
            const cycleMatch = item.cr3ea_cycle?.match(/Cycle-(\d+)/);
            return cycleMatch && parseInt(cycleMatch[1]) === cycleNo;
          });

          if (cycleData.length > 0) {
            const defects: string[] = [];
            const okays: string[] = [];
            const defectCategories: { [key: string]: string } = {};
            const evaluationTypes: { [key: string]: string } = {};
            const defectRemarks: { [key: string]: string } = {};
            const okayEvaluationTypes: { [key: string]: string } = {};
            const missedEvaluationTypes: { [key: string]: string } = {};

            // Initialize selected state for this cycle
            if (!newSelected[cycleNo]) {
              newSelected[cycleNo] = {};
            }

            cycleData.forEach((item: any) => {
              const evaluationType = item.cr3ea_evaluationtype || item.cr3ea_defect || 'Unknown';
              
              if (item.cr3ea_criteria === 'Okay') {
                okays.push(evaluationType);
                okayEvaluationTypes[evaluationType] = evaluationType;
                
                // Update selected state for okay items
                newSelected[cycleNo][evaluationType] = {
                  status: 'Okay',
                  category: undefined,
                  defect: undefined,
                  majorDefect: undefined
                };
              } else if (item.cr3ea_criteria === 'Not Okay') {
                defects.push(evaluationType);
                defectCategories[evaluationType] = item.cr3ea_defectcategory || 'Category B';
                evaluationTypes[evaluationType] = evaluationType;
                defectRemarks[evaluationType] = item.cr3ea_defectremarks || '';
                
                // Update selected state for defect items
                newSelected[cycleNo][evaluationType] = {
                  status: 'Not Okay',
                  category: item.cr3ea_defectcategory || 'Category B',
                  defect: item.cr3ea_defect || '',
                  majorDefect: item.cr3ea_defectremarks || ''
                };
              }
            });

            newCycleStatus[cycleNo] = {
              started: true,
              completed: true,
              defects,
              okays,
              defectCategories,
              evaluationTypes,
              defectRemarks,
              okayEvaluationTypes,
              missedEvaluationTypes
            };
          }
        }
      }
    }

        // Then, process offline submissions (this will override/add to Redux data)
    const secondaryOfflineSubmissions = offlineSubmissionsByCategory['Secondary'] || [];
    if (secondaryOfflineSubmissions.length > 0) {
      console.log("SecondaryEvaluation: Offline mode: Processing Secondary offline submissions:", secondaryOfflineSubmissions.length);
      
      secondaryOfflineSubmissions.forEach(submission => {
        const cycleNo = submission.cycleNo;
        const secondaryRecords = submission.records;
        
        const defects: string[] = [];
        const okays: string[] = [];
        const defectCategories: { [key: string]: string } = {};
        const evaluationTypes: { [key: string]: string } = {};
        const defectRemarks: { [key: string]: string } = {};
        const okayEvaluationTypes: { [key: string]: string } = {};
        const missedEvaluationTypes: { [key: string]: string } = {};

        // Initialize selected state for this cycle
        if (!newSelected[cycleNo]) {
          newSelected[cycleNo] = {};
        }
        
        secondaryRecords.forEach((record: any) => {
          if (record.cr3ea_criteria === 'Okay') {
            okays.push(record.cr3ea_evaluationtype);
            okayEvaluationTypes[record.cr3ea_evaluationtype] = record.cr3ea_evaluationtype;
            
            // Update selected state for okay items
            newSelected[cycleNo][record.cr3ea_evaluationtype] = {
              status: 'Okay',
              category: undefined,
              defect: undefined,
              majorDefect: undefined
            };
          } else if (record.cr3ea_criteria === 'Not Okay') {
            // Check if this is a missed item
            if (record.cr3ea_defectcategory === 'Missed') {
              // This is a missed item, add to missedEvaluationTypes
              missedEvaluationTypes[record.cr3ea_defect] = record.cr3ea_defect;
            } else {
              // This is a regular defect
              defects.push(record.cr3ea_evaluationtype);
              defectCategories[record.cr3ea_evaluationtype] = record.cr3ea_defectcategory || 'Category B';
              evaluationTypes[record.cr3ea_evaluationtype] = record.cr3ea_evaluationtype;
              defectRemarks[record.cr3ea_evaluationtype] = record.cr3ea_defectremarks || '';
              
              // Update selected state for defect items
              newSelected[cycleNo][record.cr3ea_evaluationtype] = {
                status: 'Not Okay',
                category: record.cr3ea_defectcategory || 'Category B',
                defect: record.cr3ea_defect || '',
                majorDefect: record.cr3ea_defectremarks || ''
              };
            }
          }
        });
        
        newCycleStatus[cycleNo] = {
          started: true,
          completed: true,
          defects,
          okays,
          defectCategories,
          evaluationTypes,
          defectRemarks,
          okayEvaluationTypes,
          missedEvaluationTypes
        };
      });
    }
    
         // Find the next available cycle (first non-completed cycle)
     let nextAvailableCycle = 1;
     while (nextAvailableCycle <= totalCycles && newCycleStatus[nextAvailableCycle]?.completed) {
       nextAvailableCycle++;
     }
     
     console.log('SecondaryEvaluation: Offline mode - calculated nextAvailableCycle:', nextAvailableCycle);
     console.log('SecondaryEvaluation: Offline mode - completed cycles:', Object.entries(newCycleStatus).filter(([_, status]) => status.completed).map(([cycleNo, _]) => cycleNo));
     

     
     // Update cycle status and active cycle together
     setCycleStatus(newCycleStatus);
     setSelected(newSelected);
     setActiveCycle(nextAvailableCycle);
     
     console.log('SecondaryEvaluation: Offline data processed for summary display');
     console.log('SecondaryEvaluation: Processed cycle status:', newCycleStatus);
     console.log('SecondaryEvaluation: Updated selected state:', newSelected);
     console.log('SecondaryEvaluation: Next available cycle:', nextAvailableCycle);
     console.log('SecondaryEvaluation: Active cycle updated to:', nextAvailableCycle);
  };

  useEffect(() => {
    console.log('SecondaryEvaluation: useEffect triggered with reduxCycleData length:', reduxCycleData?.length, 'isOfflineStarted:', isOfflineStarted);
    if (reduxCycleData && reduxCycleData.length > 0) {
      // Filter for Secondary category only
      const secondaryData = reduxCycleData.filter((item: any) => 
        item.cr3ea_category === 'Secondary'
      );
      
      if (secondaryData.length > 0) {
        const currentDataHash = JSON.stringify(secondaryData);
        const lastProcessedHash = localStorage.getItem('lastProcessedSecondaryDataHash');
        
        if (currentDataHash !== lastProcessedHash) {
          console.log('SecondaryEvaluation: Processing new Secondary data');
          processSecondaryData(secondaryData);
          localStorage.setItem('lastProcessedSecondaryDataHash', currentDataHash);
        } else {
          console.log('SecondaryEvaluation: Skipping Secondary data processing - no changes detected');
        }
      } else {
        console.log('SecondaryEvaluation: No Secondary data found in reduxCycleData');
      }
    } else {
      console.log('SecondaryEvaluation: Skipping data processing - conditions not met');
    }
  }, [reduxCycleData, isOfflineStarted]);

           // Effect to handle offline mode and process offline submissions
    useEffect(() => {
      console.log("SecondaryEvaluation: Offline mode useEffect triggered - isOfflineStarted:", isOfflineStarted, "offlineSubmissionsByCategory:", offlineSubmissionsByCategory);
      if (isOfflineStarted) {
        console.log("SecondaryEvaluation: Offline mode detected, processing offline data");
        processOfflineData();
      }
    }, [isOfflineStarted, offlineSubmissionsByCategory]);
   


  useEffect(() => {
    return () => {
      localStorage.removeItem('lastProcessedSecondaryDataHash');
    };
  }, [plantTourId]);

  useEffect(() => {
    localStorage.removeItem('lastProcessedSecondaryDataHash');
    console.log('SecondaryEvaluation: Cleared localStorage data hash due to plantTourId change');
  }, [plantTourId]);

     // Initialize expanded cycle from localStorage
   useEffect(() => {
     const savedExpandedCycle = localStorage.getItem('expandedSecondaryCycle');
     if (savedExpandedCycle) {
       setExpandedCompletedCycle(parseInt(savedExpandedCycle));
     }
   }, []);
   
   // Debug: Log persisted data on component mount
   useEffect(() => {
     console.log('SecondaryEvaluation: Component mounted - checking persisted data');
     console.log('SecondaryEvaluation: isOfflineStarted:', isOfflineStarted);
     console.log('SecondaryEvaluation: offlineSubmissions length:', offlineSubmissions?.length);
     console.log('SecondaryEvaluation: offlineSubmissions:', offlineSubmissions);
     console.log('SecondaryEvaluation: reduxCycleData length:', reduxCycleData?.length);
     console.log('SecondaryEvaluation: reduxCycleData:', reduxCycleData);
     console.log('SecondaryEvaluation: Current cycleStatus:', cycleStatus);
     console.log('SecondaryEvaluation: Current activeCycle:', activeCycle);
   }, []);

   // Debug effect to monitor cycle status changes
   useEffect(() => {
     console.log('SecondaryEvaluation: Cycle status changed:', cycleStatus);
     console.log('SecondaryEvaluation: Active cycle changed to:', activeCycle);
   }, [cycleStatus, activeCycle]);

  const handleStart = (cycleNo: number) => {
    const items = secondaryItems[cycleNo] || [];
    const initialState: Record<string, SelectionItem> = {};
    items.forEach((item) => {
      initialState[item] = { status: null };
    });

    setCycleStatus((prev: CycleStatusMap) => ({
      ...prev,
      [cycleNo]: { 
        ...prev[cycleNo], 
        started: true,
        completed: false,
        defects: [],
        okays: [],
        defectCategories: {},
        evaluationTypes: {},
        defectRemarks: {},
        okayEvaluationTypes: {},
        missedEvaluationTypes: {}
      },
    }));

    setSelected((prev: SelectedMap) => ({
      ...prev,
      [cycleNo]: initialState,
    }));

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
    setSelected((prev: SelectedMap) => ({
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
    setSelected((prev: SelectedMap) => ({
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

    const details = sectionDetails[cycleNo] || {};
    const records = Object.entries(currentSelections || {}).map(([item, val]) => {
      const base = {
        cr3ea_evaluationtype: item,
        cr3ea_criteria: val.status,
        cr3ea_cycle: `Cycle-${cycleNo}`,
        cr3ea_title: 'QA_' + moment().format('MM-DD-YYYY'),
        cr3ea_expiry: details.expiry || '',
        cr3ea_shift: details.shift || '',
        cr3ea_batchno: details.batchNo || '',
        cr3ea_lineno: details.lineNo || '',
        cr3ea_category: 'Secondary',
        cr3ea_pkd: details.packaged || '',
        cr3ea_tourstartdate: moment().format('MM-DD-YYYY'),
        cr3ea_productname: details.product || '',
        cr3ea_observedby: user?.Name || '',
        cr3ea_qualitytourid: plantTourId || '',
        cr3ea_defect: val.defect || '',
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

    const allSecondaryItems = secondaryItems[cycleNo] || [];
    const evaluatedItems = Object.keys(currentSelections || {});
    const missedItems = allSecondaryItems.filter(item => !evaluatedItems.includes(item));
    
    missedItems.forEach(item => {
      records.push({
        cr3ea_evaluationtype: details.evaluationType || '',
        cr3ea_criteria: 'Not Okay',
        cr3ea_cycle: `Cycle-${cycleNo}`,
        cr3ea_title: 'QA_' + moment().format('MM-DD-YYYY'),
        cr3ea_expiry: details.expiry || '',
        cr3ea_shift: details.shift || '',
        cr3ea_batchno: details.batchNo || '',
        cr3ea_lineno: details.lineNo || '',
        cr3ea_category: 'Secondary',
        cr3ea_pkd: details.packaged || '',
        cr3ea_tourstartdate: moment().format('MM-DD-YYYY'),
        cr3ea_productname: details.product || '',
        cr3ea_observedby: user?.Name || '',
        cr3ea_qualitytourid: plantTourId || '',
        cr3ea_defect: item,
        cr3ea_defectcategory: 'Missed',
        cr3ea_defectremarks: 'Missed evaluation',
      });
    });

    if (isOfflineStarted) {
      const offlineSubmission = {
        cycleNo,
        records,
        timestamp: Date.now(),
        plantTourId: plantTourId || ''
      };
      
      dispatch(addOfflineSubmissionByCategory({ category: 'Secondary', submission: offlineSubmission }));
      alert('Secondary data saved offline. Will sync when you cancel or sync offline mode.');
    } else {
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
     setCycleStatus((prev: CycleStatusMap) => {
       const updatedStatus = {
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
       };
       
       // Find the next available cycle after updating the status
       let nextAvailableCycle = 1;
       const completedCycles = new Set<number>();
       
       // Check which cycles are completed (including the current one)
       Object.entries(updatedStatus).forEach(([cycleNoStr, status]) => {
         if (status.completed) {
           completedCycles.add(parseInt(cycleNoStr));
         }
       });
       
       // Find the first non-completed cycle
       while (nextAvailableCycle <= totalCycles && completedCycles.has(nextAvailableCycle)) {
         nextAvailableCycle++;
       }
       
       // Update active cycle immediately
       setActiveCycle(nextAvailableCycle);
       console.log(`SecondaryEvaluation: Cycle ${cycleNo} completed, updating activeCycle to ${nextAvailableCycle}`);
       
       return updatedStatus;
     });
    
    dispatch(clearSectionDetails(cycleNo));
    
    onCycleComplete();
  };

  // Debug logging
  console.log('SecondaryEvaluation: Current state:', {
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
        const items = secondaryItems[cycleNo] || [];

        const shouldShow = status.completed || cycleNo === activeCycle || cycleNo === activeCycle + 1;
        
        console.log(`SecondaryEvaluation: Cycle ${cycleNo} - status:`, status, 'shouldShow:', shouldShow, 'activeCycle:', activeCycle, 'completed:', status.completed);
        
        if (!shouldShow) {
          return null;
        }

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
                     <div key={item} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                       <div className="flex justify-between items-center">
                         <h3 className="font-semibold text-gray-900">{item}</h3>
                         <div className="flex gap-2">
                           <button
                             onClick={() => handleSelect(cycleNo, item, "Not Okay")}
                             className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                               current?.status === "Not Okay"
                                 ? "bg-red-600 text-white border border-red-600"
                                 : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                             }`}
                           >
                             Not Okay
                           </button>
                           <button
                             onClick={() => handleSelect(cycleNo, item, "Okay")}
                             className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                               current?.status === "Okay"
                                 ? "bg-green-600 text-white border border-green-600"
                                 : "bg-green-50 text-green-600 border border-green-200 hover:bg-green-100"
                             }`}
                           >
                             Okay
                           </button>
                         </div>
                       </div>
                       {current?.status === "Not Okay" && (
                         <div className="mt-4 pt-4 border-t border-gray-100">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                               <label className="block text-sm font-medium text-gray-700 mb-2">Select Category</label>
                               <select
                                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                 value={current.category || ""}
                                 onChange={(e) => updateField(cycleNo, item, "category", e.target.value)}
                               >
                                 <option value="">Select Category</option>
                                 <option value="Category A">Category A</option>
                                 <option value="Category B">Category B</option>
                                 <option value="Category C">Category C</option>
                               </select>
                             </div>
                             <div>
                               <label className="block text-sm font-medium text-gray-700 mb-2">Defect</label>
                               <input
                                 type="text"
                                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                 placeholder="Enter defect description"
                                 value={current.defect || ""}
                                 onChange={(e) => updateField(cycleNo, item, "defect", e.target.value)}
                               />
                             </div>
                             <div className="sm:col-span-2">
                               <label className="block text-sm font-medium text-gray-700 mb-2">Major Defect and Remarks</label>
                               <textarea
                                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                 placeholder="Enter major defect or remarks"
                                 value={current.majorDefect || ""}
                                 onChange={(e) => updateField(cycleNo, item, "majorDefect", e.target.value)}
                                 rows={2}
                               />
                             </div>
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
                                <th className="px-4 py-2 border font-medium">SP No</th>
                                <th className="px-4 py-2 border font-medium">Defect Category</th>
                                <th className="px-4 py-2 border font-medium">Defect</th>
                                <th className="px-4 py-2 border font-medium">Major Defect</th>
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
  
  export default SecondaryEvaluation; 