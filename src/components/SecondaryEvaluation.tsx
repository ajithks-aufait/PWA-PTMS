import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store/store";
import { setSectionDetails, clearSectionDetails } from "../store/planTourSlice";
import { addOfflineSubmission } from "../store/stateSlice.ts";
import { saveSectionData } from "../Services/saveSectionData";
import { getAccessToken } from "../Services/getAccessToken";
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
  const reduxData = useSelector((state: RootState) => state.planTour.cycleData);
  const reduxCycleData = reduxData.filter((item: any) => 
    item.cr3ea_category === 'Secondary'
  );
  console.log(reduxCycleData,'reduxCycleData');
  
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
    setFormFields((prev) => ({
      ...prev,
      [cycleNo]: {
        ...prev[cycleNo],
        [field]: value,
      },
    }));
  };

  const processSecondaryData = useCallback((cycleData: any[]) => {
    console.log('SecondaryEvaluation: Processing Secondary data', { cycleDataLength: cycleData?.length });
    if (!cycleData || cycleData.length === 0) return;

    // Since reduxCycleData is already filtered for Secondary category, we don't need to filter again
    const secondaryData = cycleData;

    console.log('SecondaryEvaluation: Using Secondary data', { secondaryDataLength: secondaryData.length });

    // Process the cycle data to determine completed cycles
    const completedCycles = new Set<number>();
    const cycleDetails: { [cycleNo: number]: { defects: string[], okays: string[], defectCategories: { [item: string]: string }, evaluationTypes: { [item: string]: string }, defectRemarks: { [item: string]: string }, okayEvaluationTypes: { [item: string]: string }, missedEvaluationTypes: { [item: string]: string } } } = {};
    
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
        
        // Process based on criteria
        if (item.cr3ea_criteria === 'Okay') {
          const evaluationType = item.cr3ea_evaluationtype || item.cr3ea_defect || 'Unknown';
          cycleDetails[cycleNo].okays.push(evaluationType);
          cycleDetails[cycleNo].okayEvaluationTypes[evaluationType] = evaluationType;
        } else if (item.cr3ea_criteria === 'Not Okay') {
          const defectItem = item.cr3ea_defect || item.cr3ea_evaluationtype || 'Unknown';
          cycleDetails[cycleNo].defects.push(defectItem);
          cycleDetails[cycleNo].defectCategories[defectItem] = item.cr3ea_defectcategory || 'Category B';
          cycleDetails[cycleNo].evaluationTypes[defectItem] = item.cr3ea_evaluationtype || defectItem;
          cycleDetails[cycleNo].defectRemarks[defectItem] = item.cr3ea_defectremarks || '';
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
      setActiveCycle(nextAvailableCycle);
      setCycleStatus(newCycleStatus);
      
      console.log('SecondaryEvaluation: Updated cycle status:', newCycleStatus);
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

    // If we have Redux data, use that instead of offline submissions
    if (reduxCycleData && reduxCycleData.length > 0) {
      console.log("SecondaryEvaluation: Offline mode: Using Redux cycle data instead of offline submissions");
      console.log("SecondaryEvaluation: Redux cycle data length:", reduxCycleData.length);
      return; // Let processSecondaryData handle this
    }

    if (offlineSubmissions.length === 0) {
      return;
    }

    console.log("SecondaryEvaluation: Offline mode: Processing offline submissions for cycle details");
    
    // Update cycle status based on offline submissions
    const newCycleStatus = { ...cycleStatus };
    offlineSubmissions.forEach(submission => {
      const cycleNo = submission.cycleNo;
      const records = submission.records;
      
      const defects: string[] = [];
      const okays: string[] = [];
      const defectCategories: { [key: string]: string } = {};
      const evaluationTypes: { [key: string]: string } = {};
      const defectRemarks: { [key: string]: string } = {};
      const okayEvaluationTypes: { [key: string]: string } = {};
      const missedEvaluationTypes: { [key: string]: string } = {};
      
      records.forEach((record: any) => {
        if (record.cr3ea_criteria === 'Okay') {
          okays.push(record.cr3ea_evaluationtype);
          // Store okay evaluation types
          okayEvaluationTypes[record.cr3ea_evaluationtype] = record.cr3ea_evaluationtype;
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
    
    // Find the next available cycle (first non-completed cycle)
    let nextAvailableCycle = 1;
    while (nextAvailableCycle <= totalCycles && newCycleStatus[nextAvailableCycle]?.completed) {
      nextAvailableCycle++;
    }
    
    setCycleStatus(newCycleStatus);
    setActiveCycle(nextAvailableCycle);
    console.log('SecondaryEvaluation: Offline data processed for summary display');
    console.log('SecondaryEvaluation: Processed cycle status:', newCycleStatus);
    console.log('SecondaryEvaluation: Next available cycle:', nextAvailableCycle);
  };

  useEffect(() => {
    console.log('SecondaryEvaluation: useEffect triggered with reduxCycleData length:', reduxCycleData?.length, 'isOfflineStarted:', isOfflineStarted);
    if (reduxCycleData && reduxCycleData.length > 0 && !isOfflineStarted) {
      const currentDataHash = JSON.stringify(reduxCycleData);
      const lastProcessedHash = localStorage.getItem('lastProcessedSecondaryDataHash');
      
      if (currentDataHash !== lastProcessedHash) {
        console.log('SecondaryEvaluation: Processing new Secondary data');
        processSecondaryData(reduxCycleData);
        localStorage.setItem('lastProcessedSecondaryDataHash', currentDataHash);
      } else {
        console.log('SecondaryEvaluation: Skipping Secondary data processing - no changes detected');
      }
    } else {
      console.log('SecondaryEvaluation: Skipping data processing - conditions not met');
    }
  }, [reduxCycleData, isOfflineStarted]);

  // Effect to handle offline mode and process offline submissions
  useEffect(() => {
    console.log("SecondaryEvaluation: Offline mode useEffect triggered - isOfflineStarted:", isOfflineStarted, "offlineSubmissions length:", offlineSubmissions?.length);
    if (isOfflineStarted) {
      console.log("SecondaryEvaluation: Offline mode detected, processing offline data");
      processOfflineData();
    }
  }, [isOfflineStarted, offlineSubmissions]);

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
      
      dispatch(addOfflineSubmission(offlineSubmission));
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

    setCycleStatus((prev: CycleStatusMap) => ({
      ...prev,
      [cycleNo]: {
        ...prev[cycleNo],
        completed: true,
        defects,
        okays,
        defectCategories: {},
        evaluationTypes: {},
        defectRemarks: {},
        okayEvaluationTypes: {},
        missedEvaluationTypes: {}
      },
    }));
    setActiveCycle((prev: number) => prev + 1);
    dispatch(clearSectionDetails(cycleNo));
    
    onCycleComplete();
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      {Array.from({ length: totalCycles }, (_, i) => {
        const cycleNo = i + 1;
        const status = cycleStatus[cycleNo] || { started: false, completed: false, defects: [], okays: [], defectCategories: {}, evaluationTypes: {}, defectRemarks: {}, okayEvaluationTypes: {}, missedEvaluationTypes: {} };
        const items = secondaryItems[cycleNo] || [];

        const shouldShow = status.completed || cycleNo === activeCycle || cycleNo === activeCycle + 1;
        
        console.log(`SecondaryEvaluation: Cycle ${cycleNo} - status:`, status, 'shouldShow:', shouldShow, 'activeCycle:', activeCycle);
        
        if (!shouldShow) {
          return null;
        }

        const isDisabled = !status.completed && cycleNo === activeCycle + 1;

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

            {/* Show active session form (product table and save/cancel) only if started and not completed */}
            {status.started && !status.completed && (
              <div className="space-y-6 mt-4">
                {/* Product Table Header */}
                <div className="bg-blue-100 p-3 rounded-lg">
                  <div className="grid grid-cols-6 gap-4 text-sm font-medium text-gray-700">
                    <div>Product</div>
                    <div className="text-center">Batch No</div>
                    <div className="text-center">Line No</div>
                    <div className="text-center">Packaged</div>
                    <div className="text-center">Expiry</div>
                    <div className="text-center">Status</div>
                  </div>
                </div>

                {/* Product Rows */}
                {items.map((item) => {
                  const current = selected[cycleNo]?.[item];
                  return (
                    <div key={item} className="border rounded-lg p-4 bg-white">
                      <div className="grid grid-cols-6 gap-4 items-center">
                        <div className="font-semibold text-gray-800">{item}</div>
                        <div className="text-center text-gray-600">
                          <input
                            type="text"
                            className="w-full border rounded px-2 py-1 text-sm"
                            placeholder="Batch No"
                            value={formFields[cycleNo]?.[`${item}_batchNo`] || ''}
                            onChange={e => handleFormFieldChange(cycleNo, `${item}_batchNo`, e.target.value)}
                          />
                        </div>
                        <div className="text-center text-gray-600">
                          <input
                            type="text"
                            className="w-full border rounded px-2 py-1 text-sm"
                            placeholder="Line No"
                            value={formFields[cycleNo]?.[`${item}_lineNo`] || ''}
                            onChange={e => handleFormFieldChange(cycleNo, `${item}_lineNo`, e.target.value)}
                          />
                        </div>
                        <div className="text-center text-gray-600">
                          <input
                            type="date"
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={formFields[cycleNo]?.[`${item}_packaged`] || ''}
                            onChange={e => handleFormFieldChange(cycleNo, `${item}_packaged`, e.target.value)}
                          />
                        </div>
                        <div className="text-center text-gray-600">
                          <input
                            type="date"
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={formFields[cycleNo]?.[`${item}_expiry`] || ''}
                            onChange={e => handleFormFieldChange(cycleNo, `${item}_expiry`, e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleSelect(cycleNo, item, "Not Okay")}
                            className={`px-3 py-1 rounded border text-sm ${current?.status === "Not Okay"
                              ? "bg-red-100 border-red-600 text-red-600"
                              : "border-red-400 text-red-500"
                              }`}
                          >
                            Not Okay
                          </button>
                          <button
                            onClick={() => handleSelect(cycleNo, item, "Okay")}
                            className={`px-3 py-1 rounded border text-sm ${current?.status === "Okay"
                              ? "bg-green-100 border-green-600 text-green-600"
                              : "border-green-400 text-green-500"
                              }`}
                          >
                            Okay
                          </button>
                        </div>
                      </div>
                      
                      {/* Additional fields for Not Okay items */}
                      {current?.status === "Not Okay" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t">
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
                                  <td className="px-4 py-2 border text-gray-800">{defect}</td>
                                  <td className="px-4 py-2 border text-gray-600">{status.defectRemarks[defect] || '-'}</td>
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