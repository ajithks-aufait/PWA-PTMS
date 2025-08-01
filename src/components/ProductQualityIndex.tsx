import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store/store";
import DashboardLayout from "./DashboardLayout";
import { fetchSummaryData } from "../Services/getSummaryData";
import { getAccessToken } from "../Services/getAccessToken";
import { setSectionDetails, clearSectionDetails, setSummaryData, setCycleData } from "../store/planTourSlice";
import { addOfflineSubmission } from "../store/stateSlice.ts";
import { saveSectionData } from "../Services/saveSectionData";
import { fetchCycleDetails } from "../Services/getCycleDetails";
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

// Process data by category and count defects
function processData(data: any[]) {
  const summary: Record<string, { okays: number; aDefects: number; bDefects: number; cDefects: number }> = {};
  const uniqueCycles = new Set();

  data.forEach(item => {
    const category = item.cr3ea_category || 'Unknown';
    const cycle = item.cr3ea_cycle;

    if (cycle) {
      uniqueCycles.add(cycle);
    }

    if (!summary[category]) {
      summary[category] = { okays: 0, aDefects: 0, bDefects: 0, cDefects: 0 };
    }

    if (item.cr3ea_criteria === 'Okay') {
      summary[category].okays++;
    } else {
      if (item.cr3ea_defectcategory === 'Category A') summary[category].aDefects++;
      if (item.cr3ea_defectcategory === 'Category B') summary[category].bDefects++;
      if (item.cr3ea_defectcategory === 'Category C') summary[category].cDefects++;
    }
  });

  // Return both summary and cycle count
  return {
    summary,
    totalCycles: uniqueCycles.size
  };
}

const ProductQualityIndex: React.FC = () => {
  const [activeCycle, setActiveCycle] = useState<number>(1);
  const [cycleStatus, setCycleStatus] = useState<CycleStatusMap>(
    Object.fromEntries(
      Array.from({ length: totalCycles }, (_, i) => [
        i + 1,
        { started: false, completed: false, defects: [], okays: [], defectCategories: {}, evaluationTypes: {}, defectRemarks: {}, okayEvaluationTypes: {}, missedEvaluationTypes: {} },
      ])
    )
  );
  const [selected, setSelected] = useState<SelectedMap>({});
  const [showDetails, setShowDetails] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const sectionDetails = useSelector((state: RootState) => state.planTour.sectionDetails);
  const user = useSelector((state: RootState) => state.user.user);
  const selectedShift = useSelector((state: RootState) => state.planTour.selectedCycle);
  const plantTourId = useSelector((state: RootState) => state.planTour.plantTourId);
  const isOfflineStarted = useSelector((state: RootState) => state.appState.isOfflineStarted);
  const offlineSubmissions = useSelector((state: RootState) => state.appState.offlineSubmissions);
  const reduxSummaryData = useSelector((state: RootState) => state.planTour.summaryData);
  const reduxCycleData = useSelector((state: RootState) => state.planTour.cycleData);
  const lastFetchTimestamp = useSelector((state: RootState) => state.planTour.lastFetchTimestamp);
  const [categorySummary, setCategorySummary] = useState<any>({});
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [isSummaryVisible, setIsSummaryVisible] = useState(true);
  // Local state for form fields per cycle
  const [formFields, setFormFields] = useState<{ [cycleNo: number]: any }>({});
  // State for expanded completed cycle
  const [expandedCompletedCycle, setExpandedCompletedCycle] = useState<number | null>(null);

  // Handler to expand/collapse and persist to localStorage
  const handleExpand = (cycleNo: number | null) => {
    setExpandedCompletedCycle(cycleNo);
    localStorage.setItem('expandedCompletedCycle', cycleNo !== null ? String(cycleNo) : '');
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

  // Update the fetchAndDisplaySummary function to use both APIs
  // Check if we have cached data and if it's still valid (less than 5 minutes old)
  const isCacheValid = () => {
    if (!lastFetchTimestamp) return false;
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    return (Date.now() - lastFetchTimestamp) < fiveMinutes;
  };

  const fetchAndDisplaySummary = async (accessToken: string, qualityTourId: string) => {
    setIsLoadingSummary(true);
    
    // Check if we have valid cached data
    if (reduxSummaryData.length > 0 && reduxCycleData.length > 0 && isCacheValid()) {
      console.log("Using cached data from Redux");
      processApiData(reduxSummaryData, reduxCycleData);
      setIsLoadingSummary(false);
      return;
    }
    
    try {
      console.log("Fetching fresh data from API");
      // Use both APIs: fetchSummaryData for summary and fetchCycleDetails for cycle details
      const [summaryData, cycleData]: [any[] | null, any[]] = await Promise.all([
        fetchSummaryData(accessToken, qualityTourId),
        fetchCycleDetails(accessToken, qualityTourId)
      ]);
      
      console.log("Fetched Summary Data:", summaryData);
      console.log("Fetched Cycle Records:", cycleData);
       
      // Store data in Redux
      dispatch(setSummaryData(summaryData || []));
      dispatch(setCycleData(cycleData || []));
      
      // Process the data
      processApiData(summaryData || [], cycleData || []);
      
          } catch (error) {
        console.error("Error loading data:", error);
        setIsSummaryVisible(false);
        dispatch(setSummaryData([]));
        setCategorySummary({});
        setCycleCount(0);
      } finally {
      setIsLoadingSummary(false);
    }
  };

  // Separate function to process API data
  const processApiData = (summaryData: any[], cycleData: any[]) => {
    // Process summary data
    if (!summaryData || summaryData.length === 0) {
      setIsSummaryVisible(false);
      dispatch(setSummaryData([]));
      setCategorySummary({});
      setCycleCount(0);
    } else {
      setIsSummaryVisible(true);
      dispatch(setSummaryData(summaryData));
      const processed = processData(summaryData);
      setCategorySummary(processed.summary);
      setCycleCount(processed.totalCycles);
    }
    
    // Process cycle details to determine completed cycles
    const completedCycles = new Set<number>();
    const cycleDetails: { [cycleNo: number]: { defects: string[], okays: string[], defectCategories: { [item: string]: string }, evaluationTypes: { [item: string]: string }, defectRemarks: { [item: string]: string }, okayEvaluationTypes: { [item: string]: string }, missedEvaluationTypes: { [item: string]: string } } } = {};
    
    if (cycleData && cycleData.length > 0) {
      cycleData.forEach((item: any) => {
        const cycleMatch = item.cr3ea_cycle?.match(/Cycle-(\d+)/);
        if (cycleMatch) {
          const cycleNo = parseInt(cycleMatch[1]);
          completedCycles.add(cycleNo);
          
          if (!cycleDetails[cycleNo]) {
            cycleDetails[cycleNo] = { defects: [], okays: [], defectCategories: {}, evaluationTypes: {}, defectRemarks: {}, okayEvaluationTypes: {}, missedEvaluationTypes: {} };
          }
          
          if (item.cr3ea_criteria === 'Okay') {
            cycleDetails[cycleNo].okays.push(item.cr3ea_evaluationtype || 'Unknown');
            cycleDetails[cycleNo].okayEvaluationTypes[item.cr3ea_defect || 'Unknown'] = item.cr3ea_evaluationtype || 'Unknown';
          } else if (item.cr3ea_criteria === 'Not Okay') {
            cycleDetails[cycleNo].defects.push(item.cr3ea_defect || 'Unknown');
            cycleDetails[cycleNo].defectCategories[item.cr3ea_defect || 'Unknown'] = item.cr3ea_defectcategory || 'Category B';
            cycleDetails[cycleNo].evaluationTypes[item.cr3ea_defect || 'Unknown'] = item.cr3ea_evaluationtype || 'Unknown';
            cycleDetails[cycleNo].defectRemarks[item.cr3ea_defect || 'Unknown'] = item.cr3ea_defectremarks || '';
          } else if (!item.cr3ea_criteria || item.cr3ea_criteria === null) {
            cycleDetails[cycleNo].missedEvaluationTypes[item.cr3ea_evaluationtype] = item.cr3ea_evaluationtype;
          }
        }
      });
    }
    
    // Update cycle status based on cycle details API data
    const newCycleStatus = { ...cycleStatus };
    completedCycles.forEach(cycleNo => {
      newCycleStatus[cycleNo] = {
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
    });
    
    // Find the next available cycle (first non-completed cycle)
    let nextAvailableCycle = 1;
    while (nextAvailableCycle <= totalCycles && completedCycles.has(nextAvailableCycle)) {
      nextAvailableCycle++;
    }
    
    setActiveCycle(nextAvailableCycle);
    setCycleStatus(newCycleStatus);
  };


  // Process offline data for summary display
  const processOfflineData = () => {
    if (!isOfflineStarted || offlineSubmissions.length === 0) {
      return;
    }

    console.log('Processing offline data for summary display...');
    
    // Combine all offline submissions into summary data
    const offlineSummaryData = offlineSubmissions.flatMap(submission => submission.records);
    
    // Process the offline data
    const processed = processData(offlineSummaryData);
    setCategorySummary(processed.summary);
    setCycleCount(processed.totalCycles);
    setIsSummaryVisible(true);
    
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
    
    setCycleStatus(newCycleStatus);
    console.log('Offline data processed for summary display');
    console.log('Processed cycle status:', newCycleStatus);
  };

  // Use this function after save and in useEffect
  useEffect(() => {
    const fetchSummary = async () => {
      if (!plantTourId) {
        setIsSummaryVisible(false);
        dispatch(setSummaryData([]));
        setCategorySummary({});
        setCycleCount(0);
        return;
      }
      
      // If in offline mode, process offline data
      if (isOfflineStarted) {
        processOfflineData();
        return;
      }
      
      // Otherwise fetch from API
      const tokenResult = await getAccessToken();
      const accessToken = tokenResult?.token;
      if (!accessToken) return;
      await fetchAndDisplaySummary(accessToken, plantTourId);
    };
    fetchSummary();
  }, [plantTourId, isOfflineStarted, offlineSubmissions]);

  // After save, call fetchAndDisplaySummary instead of fetchSummaryData
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
      console.log('Saving data in offline mode to Redux...');
      
      // Store submission in Redux
      const offlineSubmission = {
        cycleNo,
        records,
        timestamp: Date.now(),
        plantTourId: plantTourId || ''
      };
      
      dispatch(addOfflineSubmission(offlineSubmission));
      console.log('Data saved to Redux. Total offline submissions:', offlineSubmissions.length + 1);
      alert('Data saved offline. Will sync when you cancel or sync offline mode.');
      
      // Refresh offline data display
      setTimeout(() => {
        processOfflineData();
      }, 100);
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

    setCycleStatus((prev) => ({
      ...prev,
      [cycleNo]: {
        ...prev[cycleNo],
        completed: true,
        defects,
        okays,
      },
    }));
    setActiveCycle((prev) => prev + 1);
    dispatch(clearSectionDetails(cycleNo));
    
    // Refresh summary only in online mode
    if (!isOfflineStarted) {
      const tokenResult = await getAccessToken();
      const accessToken = tokenResult?.token;
      if (accessToken) {
        await fetchAndDisplaySummary(accessToken, plantTourId || "");
      }
    }
  };

  // Calculate summary statistics from API data or offline data
  const calculateSummaryStats = () => {
    let dataToProcess = reduxSummaryData;
    
    // If in offline mode and no API data, use offline submissions
    if (isOfflineStarted && (!reduxSummaryData || reduxSummaryData.length === 0)) {
      console.log('Using offline data for summary statistics...');
      dataToProcess = offlineSubmissions.flatMap(submission => submission.records);
    }
    
    if (!dataToProcess || dataToProcess.length === 0) {
      return {
        totalDefects: 0,
        totalOkays: 0,
        categories: [],
        finalPQIScore: 0,
        pqiStatus: 'HOLD'
      };
    }

    let totalDefects = 0;
    let totalOkays = 0;
    const categories: any[] = [];
    
    // Individual bonus scores
    let bonusScores = {
      cbb: 0,
      secondary: 0,
      primary: 0,
      product: 0
    };

    // Process data by category
    const summary: Record<string, { okays: number; aDefects: number; bDefects: number; cDefects: number }> = {};
    const uniqueCycles = new Set();

    dataToProcess.forEach((item: any) => {
      const category = item.cr3ea_category || 'Unknown';
      const cycle = item.cr3ea_cycle;

      if (cycle) {
        uniqueCycles.add(cycle);
      }

      if (!summary[category]) {
        summary[category] = { okays: 0, aDefects: 0, bDefects: 0, cDefects: 0 };
      }

      if (item.cr3ea_criteria === 'Okay') {
        summary[category].okays++;
        totalOkays++;
      } else if (item.cr3ea_criteria === 'Not Okay') {
        totalDefects++;
        if (item.cr3ea_defectcategory === 'Category A') summary[category].aDefects++;
        if (item.cr3ea_defectcategory === 'Category B') summary[category].bDefects++;
        if (item.cr3ea_defectcategory === 'Category C') summary[category].cDefects++;
      }
    });

    const totalCycles = uniqueCycles.size;

    // Calculate scores for each category
    Object.entries(summary).forEach(([category, counts]) => {
      let maxPotentialScore = 0;
      let bonusMultiplier = 0.10; // Default

      if (category === "CBB Evaluation") {
        maxPotentialScore = 10 * 120 * totalCycles;
        bonusMultiplier = 0.10;
      } else if (category === "Secondary") {
        maxPotentialScore = 120 * 2 * totalCycles;
        bonusMultiplier = 0.15;
      } else if (category === "Primary") {
        maxPotentialScore = 120 * 2 * totalCycles;
        bonusMultiplier = 0.20;
      } else if (category === "Product") {
        maxPotentialScore = 120 * 2 * totalCycles;
        bonusMultiplier = 0.40;
      }

      const scoreDeduction = (counts.aDefects * 80) + (counts.bDefects * 30) + (counts.cDefects * 10);
      const finalScore = Math.max(maxPotentialScore - scoreDeduction, 0);
      const scorePercentageValue = maxPotentialScore > 0 ? (finalScore / maxPotentialScore) * 100 : 0;
      const bonusScoreValue = scorePercentageValue * bonusMultiplier;

      // Store bonus scores individually
      if (category === "CBB Evaluation") bonusScores.cbb = bonusScoreValue;
      else if (category === "Secondary") bonusScores.secondary = bonusScoreValue;
      else if (category === "Primary") bonusScores.primary = bonusScoreValue;
      else if (category === "Product") bonusScores.product = bonusScoreValue;

      categories.push({
        category: category,
        okays: counts.okays,
        aDefects: counts.aDefects,
        bDefects: counts.bDefects,
        cDefects: counts.cDefects,
        hours: totalCycles,
        maxScore: maxPotentialScore,
        scoreDeduction: scoreDeduction,
        scoreObtained: finalScore,
        scorePercent: scorePercentageValue,
        pqiScore: bonusScoreValue
      });
    });

    // Net Wt. calculation
    const netWtCycles = totalCycles;
    const netWtMaxScore = netWtCycles * 120 * 15.625;
    const netWtScoreObtained = netWtMaxScore;
    const netWtScorePercentage = 100.00;
    const netWtBonusScoreValue = netWtScorePercentage * 0.15;

    // Add Net Wt. row
    categories.push({
      category: "Net Wt.",
      okays: 0,
      aDefects: 0,
      bDefects: 0,
      cDefects: 0,
      hours: netWtCycles,
      maxScore: netWtMaxScore,
      scoreDeduction: 0,
      scoreObtained: netWtScoreObtained,
      scorePercent: netWtScorePercentage,
      pqiScore: netWtBonusScoreValue
    });

    // Broken % (always 0 for now)
    const brokenPercentage = 0.00;

    // Final PQI Score = sum of all bonus scores - broken%
    const finalPQIScore = (
      bonusScores.cbb +
      bonusScores.secondary +
      bonusScores.primary +
      bonusScores.product +
      netWtBonusScoreValue
    ) - brokenPercentage;

    const pqiStatus = finalPQIScore >= 90 ? 'PASS' : 'HOLD';

    return { 
      totalDefects, 
      totalOkays, 
      categories,
      finalPQIScore: finalPQIScore.toFixed(2),
      pqiStatus,
      brokenPercentage: brokenPercentage.toFixed(2)
    };
  };

  const summaryStats = calculateSummaryStats();


  return (
    <DashboardLayout>
      {/* Back Button and Plant Tour ID */}
      <div className="mb-4 flex items-center justify-between w-full">
        <div className="flex items-center gap-2 text-blue-600 font-medium cursor-pointer" onClick={() => navigate('/home')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </div>
        {plantTourId && (
          <div className="text-sm text-gray-700 font-semibold truncate max-w-xs ml-4" title={plantTourId}>
            Plant Tour ID: <span className="text-blue-700">{plantTourId}</span>
          </div>
        )}
      </div>

      {/* Header and Summary Section (updated style) */}
      <div className="bg-gray-100 p-4 sm:p-6 rounded-lg mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
          <span className="font-semibold text-lg sm:text-xl">Product Quality Index</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium ml-0 sm:ml-2">
            <span className="w-2 h-2 bg-gray-500 rounded-full mr-1"></span>
            {selectedShift ? selectedShift : "Shift"}
          </span>
          <span className="text-gray-500 text-sm ml-0 sm:ml-2">• 24/07/2025</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-2 sm:p-6 overflow-x-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-base sm:text-lg">Summary</span>
              {isOfflineStarted && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 text-xs font-medium">
                  📱 Offline Data
                </span>
              )}
              {isLoadingSummary ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 text-sm font-medium">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 text-sm font-medium">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9l-6 6m0-6l6 6" />
                  </svg>
                  {summaryStats.totalDefects} Defects
                </span>
              )}
            </div>
            <button
              className="text-blue-700 text-sm font-medium underline"
              onClick={() => setShowDetails((v) => !v)}
            >
              {showDetails ? "View less" : "View more"}
            </button>
          </div>
          {showDetails && (
            <div className="mt-4 overflow-x-auto">
              {isLoadingSummary ? (
                <div className="flex justify-center items-center py-8">
                  <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="ml-2 text-gray-600">Loading summary data...</span>
                </div>
              ) : summaryStats.categories.length > 0 ? (
                <table className="min-w-[600px] w-full text-sm text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="text-gray-700 border-b border-gray-200">
                      <th className="font-semibold py-2 px-2">Category</th>
                      <th className="font-semibold text-green-700 py-2 px-2">Okays</th>
                      <th className="font-semibold text-red-700 py-2 px-2">A Defects</th>
                      <th className="font-semibold text-red-700 py-2 px-2">B Defects</th>
                      <th className="font-semibold text-red-700 py-2 px-2">C Defects</th>
                      <th className="font-semibold text-green-700 py-2 px-2">Nos of Hrs inspection/production</th>
                      <th className="font-semibold text-green-700 py-2 px-2">Max Potential Score</th>
                      <th className="font-semibold py-2 px-2">Score deduction</th>
                      <th className="font-semibold py-2 px-2">Score obtained</th>
                      <th className="font-semibold py-2 px-2">Score%"</th>
                      <th className="font-semibold py-2 px-2">PQI Score as per weightage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {summaryStats.categories.map((category: any, index: number) => (
                      <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} align-middle`}>
                        <td className="py-4 px-2">{category.category}</td>
                        <td className="py-4 px-2">{category.okays}</td>
                        <td className="py-4 px-2">{category.aDefects}</td>
                        <td className="py-4 px-2">{category.bDefects}</td>
                        <td className="py-4 px-2">{category.cDefects}</td>
                        <td className="py-4 px-2">{category.hours}</td>
                        <td className="py-4 px-2">{category.maxScore}</td>
                        <td className="py-4 px-2">{category.scoreDeduction}</td>
                        <td className="py-4 px-2">{category.scoreObtained}</td>
                        <td className="py-4 px-2">{category.scorePercent.toFixed(2)}%</td>
                        <td className="py-4 px-2">{category.pqiScore.toFixed(2)}%</td>
                      </tr>
                    ))}
                    {/* Broken % row */}
                    <tr className="bg-green-50 align-middle">
                      <td className="py-4 px-2">Broken %</td>
                      <td className="py-4 px-2" colSpan={10}>{summaryStats.brokenPercentage}%</td>
                    </tr>
                    {/* Final PQI Score row */}
                    <tr className="bg-yellow-50 align-middle">
                      <td className="py-4 px-2">Final PQI Score post deduction of broken</td>
                      <td className="py-4 px-2" colSpan={10}>{summaryStats.finalPQIScore}%</td>
                    </tr>
                    {/* PQI Status row */}
                    <tr className="bg-red-50 align-middle">
                      <td className="font-semibold py-4 px-2">PQI Status</td>
                      <td colSpan={10} className="p-0">
                        <div className={`text-white text-center py-2 rounded-b-lg font-bold ${summaryStats.pqiStatus === 'PASS' ? 'bg-green-500' : 'bg-red-500'}`}>
                          {summaryStats.pqiStatus}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No summary data available for this tour.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Cycles */}
      <div className="flex flex-col md:grid md:grid-cols-4 gap-4">
        {/* Sidebar (page-specific) */}
        <div className="space-y-2 md:col-span-1">
          <button className="w-full text-left px-4 py-2 bg-blue-100 text-blue-600 rounded-md font-medium border border-blue-200">CBB Evaluation</button>
          <button className="w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-md">Secondary</button>
          <button className="w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-md">Primary</button>
          <button className="w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-md">Product</button>
        </div>
        {/* Main Content - Cycles */}
        <div className="md:col-span-3 space-y-6 max-h-[70vh] overflow-y-auto">
          {Array.from({ length: totalCycles }, (_, i) => {
            const cycleNo = i + 1;
            const status = cycleStatus[cycleNo];
            const items = checklistItems[cycleNo] || [];
            

            // Show cycles that are completed, active, or the next few cycles
            const shouldRender = cycleNo <= 2 || cycleNo <= activeCycle + 1 || status.completed;
            if (!shouldRender) return null;

            // A cycle is disabled if it's not completed and comes after the active cycle
            const isDisabled = !status.completed && cycleNo > activeCycle;

            return (
              <div
                key={cycleNo}
                className={`border rounded-md p-4 shadow-sm ${isDisabled ? "bg-gray-100 opacity-60" : "bg-white"
                  }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-md font-semibold">
                    Cycle {cycleNo}{" "}
                    {status.completed && status.defects.length > 0 && (
                      <span className="ml-2 text-red-600 bg-red-100 px-2 py-0.5 rounded-full text-xs">
                        {status.defects.length} Defect(s)
                      </span>
                    )}
                  </h2>
                </div>

                {/* Show form only for non-completed cycles that are active or earlier, and not started */}
                {!status.completed && !isDisabled && !status.started && (
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
                  <div key={cycleNo} className="">
                    <div
                      className=" rounded-lg flex items-center justify-between cursor-pointer"
                      onClick={() => handleExpand(expandedCompletedCycle === cycleNo ? null : cycleNo)}
                    >
                      <div className="flex-1"></div>
                      <button
                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                        tabIndex={-1}
                        onClick={e => { e.stopPropagation(); handleExpand(expandedCompletedCycle === cycleNo ? null : cycleNo); }}
                      >
                        <svg className={`w-5 h-5 transform transition-transform duration-200 ${expandedCompletedCycle === cycleNo ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    {expandedCompletedCycle === cycleNo && (
                      <div className="pt-6">
                        {/* Defects Table */}
                        <div className="mb-4">
                          <div className="text-red-600 font-semibold mb-2">Defects</div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border rounded-md">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 border">CBB No</th>
                                  <th className="px-4 py-2 border">Defect Category</th>
                                  <th className="px-4 py-2 border">Defect</th>
                                  <th className="px-4 py-2 border">Major Defect</th>
                                </tr>
                              </thead>
                              <tbody>
                                {status.defects.length > 0 ? (
                                  status.defects.map((defect, index) => (
                                    <tr key={index} className="bg-white">
                                      <td className="px-4 py-2 border font-semibold">{status.evaluationTypes[defect] || defect}</td>
                                      <td className="px-4 py-2 border">{status.defectCategories[defect] || 'Category B'}</td>
                                      <td className="px-4 py-2 border">{defect}</td>
                                      <td className="px-4 py-2 border">{status.defectRemarks[defect] || ''}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr><td colSpan={4} className="px-4 py-2 border text-center text-gray-400">No Defects</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        {/* Okays and Missed */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-green-700 font-semibold mb-1">Okays</div>
                            <div className="flex gap-2 flex-wrap">
                              {status.okays.length > 0 ? (
                                status.okays
                                  .sort((a, b) => {
                                    // Extract numbers from CBB items for proper sorting
                                    const aNum = parseInt(a.toString().replace(/\D/g, '')) || 0;
                                    const bNum = parseInt(b.toString().replace(/\D/g, '')) || 0;
                                    return aNum - bNum;
                                  })
                                  .map((okay, i) => (
                                    <span key={i} className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">{status.okayEvaluationTypes[okay] || okay}</span>
                                  ))
                              ) : (
                                <span className="text-gray-400">No Okays</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600 font-semibold mb-1">Missed</div>
                            <div className="flex gap-2 flex-wrap">
                              {/* Show missed items from API data with null criteria in order */}
                              {Object.keys(status.missedEvaluationTypes).length > 0 ? (
                                Object.values(status.missedEvaluationTypes)
                                  .sort((a, b) => {
                                    // Extract numbers from CBB items for proper sorting
                                    const aNum = parseInt(a.toString().replace(/\D/g, '')) || 0;
                                    const bNum = parseInt(b.toString().replace(/\D/g, '')) || 0;
                                    return aNum - bNum;
                                  })
                                  .map((item, i) => (
                                    <span key={i} className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">{item}</span>
                                  ))
                              ) : (
                                <span className="text-gray-400">No Missed</span>
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
      </div>
              {/* Example: Display processed summary and cycle count if summary is visible */}
        {isSummaryVisible && (
          <div className="my-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="font-semibold">Cycle Count: {cycleCount}</div>
              {isOfflineStarted && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                  📱 Offline Data
                </span>
              )}
            </div>
            <div className="font-semibold">Category Summary:</div>
            <pre className="bg-gray-100 p-2 rounded text-xs">{JSON.stringify(categorySummary, null, 2)}</pre>
          </div>
        )}
    </DashboardLayout>
  );
};

export default ProductQualityIndex;
