import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store/store";
import  { persistor } from "../store/store";
import DashboardLayout from "./DashboardLayout";
import CBBEvaluation from "./CBBEvaluation";
import SecondaryEvaluation from "./SecondaryEvaluation";
import PrimaryEvaluation from "./PrimaryEvaluation";
import ProductEvaluation from "./ProductEvaluation";
import { fetchSummaryData } from "../Services/getSummaryData";
import { getAccessToken } from "../Services/getAccessToken";
import {  setSummaryData, setCycleData } from "../store/planTourSlice";
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





const totalCycles = 8;

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
  const [showDetails, setShowDetails] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isProcessingCycleCompletion, setIsProcessingCycleCompletion] = useState(false);
  const [selectedEvaluationType, setSelectedEvaluationType] = useState<'CBB' | 'Secondary' | 'Primary' | 'Product'>('CBB');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const selectedShift = useSelector((state: RootState) => state.planTour.selectedCycle);
  const plantTourId = useSelector((state: RootState) => state.planTour.plantTourId);
  const isOfflineStarted = useSelector((state: RootState) => state.appState.isOfflineStarted);
  const offlineSubmissions = useSelector((state: RootState) => state.appState.offlineSubmissions);
  const reduxSummaryData = useSelector((state: RootState) => state.planTour.summaryData);
  const reduxCycleData = useSelector((state: RootState) => state.planTour.cycleData);
  const lastFetchTimestamp = useSelector((state: RootState) => state.planTour.lastFetchTimestamp);



  // Update the fetchAndDisplaySummary function to use both APIs
  // Check if we have cached data and if it's still valid (less than 5 minutes old)
  const isCacheValid = () => {
    if (!lastFetchTimestamp) return false;
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    return (Date.now() - lastFetchTimestamp) < fiveMinutes;
  };

  // Function to fetch completed cycle details using reduxCycleData
  const fetchCompletedCycleDetails = () => {
    let cycleDataToProcess = reduxCycleData;
    
    // In offline mode, combine Redux cycle data with offline submissions
    if (isOfflineStarted) {
      if (reduxCycleData && reduxCycleData.length > 0) {
        console.log("Offline mode: Using reduxCycleData for completed cycle details:", reduxCycleData.length, "records");
        cycleDataToProcess = reduxCycleData;
      } else if (offlineSubmissions && offlineSubmissions.length > 0) {
        console.log("Offline mode: Using offline submissions for completed cycle details");
        cycleDataToProcess = offlineSubmissions.flatMap(submission => submission.records);
      } else {
        console.log("Offline mode: No cycle data available");
        return;
      }
    } else {
      if (!reduxCycleData || reduxCycleData.length === 0) {
        console.log("No cycle data available in Redux");
        return;
      }
      console.log("Using reduxCycleData to fetch completed cycle details:", reduxCycleData.length, "records");
    }
    
    // Process the cycle data to determine completed cycles
    const completedCycles = new Set<number>();
    const cycleDetails: { [cycleNo: number]: { defects: string[], okays: string[], defectCategories: { [item: string]: string }, evaluationTypes: { [item: string]: string }, defectRemarks: { [item: string]: string }, okayEvaluationTypes: { [item: string]: string }, missedEvaluationTypes: { [item: string]: string } } } = {};
    
    cycleDataToProcess.forEach((item: any) => {
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
    
    console.log('Processed cycle details from reduxCycleData:', cycleDetails);
    
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
      setCycleStatus(newCycleStatus);
      setActiveCycle(nextAvailableCycle);
      console.log('Updated cycle status from reduxCycleData:', newCycleStatus);
      console.log('Next available cycle:', nextAvailableCycle);
    } else {
      console.log('No changes detected in cycle status, skipping update');
    }
  };

  const fetchAndDisplaySummary = async (accessToken: string, qualityTourId: string) => {
    setIsLoadingSummary(true);
    
    // Check if we have valid cached data
    if (reduxSummaryData.length > 0 && reduxCycleData.length > 0 && isCacheValid()) {
      console.log("Using cached data from Redux");
      processApiData(reduxSummaryData, reduxCycleData);
      // Also fetch completed cycle details from reduxCycleData
      fetchCompletedCycleDetails();
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
      dispatch(setSummaryData([]));
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Separate function to process API data
  const processApiData = (summaryData: any[], cycleData: any[]) => {
    // Process summary data
    if (!summaryData || summaryData.length === 0) {
      dispatch(setSummaryData([]));
    } else {
      dispatch(setSummaryData(summaryData));
    }
    
    // Process cycle details to determine completed cycles
    const completedCycles = new Set<number>();
    const cycleDetails: { [cycleNo: number]: { defects: string[], okays: string[], defectCategories: { [item: string]: string }, evaluationTypes: { [item: string]: string }, defectRemarks: { [item: string]: string }, okayEvaluationTypes: { [item: string]: string }, missedEvaluationTypes: { [item: string]: string } } } = {};
    
    if (cycleData && cycleData.length > 0) {
      console.log('Processing cycle data:', cycleData.length, 'records');
      
      cycleData.forEach((item: any) => {
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
      
      console.log('Processed cycle details:', cycleDetails);
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
    
    console.log('Updated cycle status:', newCycleStatus);
    console.log('Next available cycle:', nextAvailableCycle);
  };


  // Process offline data for summary display
  const processOfflineData = () => {
    if (!isOfflineStarted) {
      return;
    }

    // If we have Redux data, use that instead of offline submissions
    if (reduxCycleData && reduxCycleData.length > 0) {
      console.log("Offline mode: Using Redux cycle data instead of offline submissions");
      return; // Let fetchCompletedCycleDetails handle this
    }

    if (offlineSubmissions.length === 0) {
      return;
    }

    console.log("Offline mode: Processing offline submissions for cycle details");
    
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
    console.log('Offline data processed for summary display');
    console.log('Processed cycle status:', newCycleStatus);
    console.log('Next available cycle:', nextAvailableCycle);
  };

  // Use this function after save and in useEffect
  useEffect(() => {
    const fetchSummary = async () => {
      if (!plantTourId) {
        dispatch(setSummaryData([]));
        return;
      }
      
      // If in offline mode, use Redux data for both summary and cycle details
      if (isOfflineStarted) {
        console.log("Offline mode: Using Redux data for summary and cycle details");
        // Use reduxSummaryData for summary calculations
        if (reduxSummaryData && reduxSummaryData.length > 0) {
          console.log("Using cached summary data from Redux for offline mode");
        }
        // Use reduxCycleData for completed cycle details
        if (reduxCycleData && reduxCycleData.length > 0) {
          console.log("Using cached cycle data from Redux for offline mode");
          fetchCompletedCycleDetails();
        }
        // Also process offline submissions for additional data
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

  // Effect to fetch completed cycle details when reduxCycleData changes
  useEffect(() => {
    if (reduxCycleData && reduxCycleData.length > 0 && !isOfflineStarted && !isProcessingCycleCompletion) {
      // Add a check to prevent processing if data hasn't actually changed
      const currentDataHash = JSON.stringify(reduxCycleData);
      const lastProcessedHash = localStorage.getItem('lastProcessedPQICycleDataHash');
      
      if (currentDataHash !== lastProcessedHash) {
        console.log("reduxCycleData changed, fetching completed cycle details");
        fetchCompletedCycleDetails();
        localStorage.setItem('lastProcessedPQICycleDataHash', currentDataHash);
      } else {
        console.log("reduxCycleData unchanged, skipping cycle details processing");
      }
    }
  }, [reduxCycleData, isOfflineStarted, isProcessingCycleCompletion]);

  // Debug effect to log Redux data persistence (only on mount and when plantTourId changes)
  useEffect(() => {
    console.log("Redux Data Status:", {
      summaryDataLength: reduxSummaryData?.length || 0,
      cycleDataLength: reduxCycleData?.length || 0,
      lastFetchTimestamp,
      isOfflineStarted,
      plantTourId
    });
  }, [plantTourId]); // Only log when plantTourId changes, not on every data change

  // Cleanup effect to clear localStorage when plantTourId changes or component unmounts
  useEffect(() => {
    return () => {
      // Clear the data hash when component unmounts
      localStorage.removeItem('lastProcessedPQICycleDataHash');
    };
  }, [plantTourId]);

  // Clear localStorage when plantTourId changes to ensure fresh data processing
  useEffect(() => {
    localStorage.removeItem('lastProcessedPQICycleDataHash');
    console.log('ProductQualityIndex: Cleared localStorage data hash due to plantTourId change');
  }, [plantTourId]);

  const onCycleComplete = async () => {
    // Set flag to prevent infinite loops
    setIsProcessingCycleCompletion(true);
    
    try {
      // Refresh summary after cycle completion
      const tokenResult = await getAccessToken();
      const accessToken = tokenResult?.token;
      if (accessToken) {
        await fetchAndDisplaySummary(accessToken, plantTourId || "");
      }
    } finally {
      // Clear flag after processing
      setIsProcessingCycleCompletion(false);
    }
  };

  // Calculate summary statistics from API data or offline data
  const calculateSummaryStats = () => {
    let dataToProcess = reduxSummaryData;
    
    // In offline mode, prioritize Redux data, then fall back to offline submissions
    if (isOfflineStarted) {
      if (reduxSummaryData && reduxSummaryData.length > 0) {
        console.log('Offline mode: Using reduxSummaryData for summary statistics');
        dataToProcess = reduxSummaryData;
      } else if (offlineSubmissions && offlineSubmissions.length > 0) {
        console.log('Offline mode: Using offline submissions for summary statistics');
        dataToProcess = offlineSubmissions.flatMap(submission => submission.records);
      } else {
        console.log('Offline mode: No data available for summary statistics');
        dataToProcess = [];
      }
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

  // Check if data was restored from localStorage on component mount (only run once)
  useEffect(() => {
    const checkPersistedData = async () => {
      // Wait for persistor to rehydrate
      await persistor.persist();
      
      const persistedData = localStorage.getItem('persist:planTour');
      if (persistedData) {
        try {
          const parsed = JSON.parse(persistedData);
          console.log("Persisted planTour data found:", {
            hasSummaryData: !!parsed.summaryData,
            hasCycleData: !!parsed.cycleData,
            summaryDataLength: parsed.summaryData ? JSON.parse(parsed.summaryData).length : 0,
            cycleDataLength: parsed.cycleData ? JSON.parse(parsed.cycleData).length : 0
          });
          
          // If we have persisted data but Redux state is empty, try to restore it
          if ((!reduxSummaryData || reduxSummaryData.length === 0) && parsed.summaryData) {
            console.log("Attempting to restore summary data from localStorage");
            const summaryData = JSON.parse(parsed.summaryData);
            if (summaryData && summaryData.length > 0) {
              dispatch(setSummaryData(summaryData));
            }
          }
          
          if ((!reduxCycleData || reduxCycleData.length === 0) && parsed.cycleData) {
            console.log("Attempting to restore cycle data from localStorage");
            const cycleData = JSON.parse(parsed.cycleData);
            if (cycleData && cycleData.length > 0) {
              dispatch(setCycleData(cycleData));
            }
          }
        } catch (error) {
          console.error("Error parsing persisted data:", error);
        }
      } else {
        console.log("No persisted planTour data found in localStorage");
      }
    };
    
    checkPersistedData();
  }, []); // Only run once on mount


  return (
    <DashboardLayout>
      {/* Back Button and Plant Tour ID */}
      <div className="mb-4 flex items-center justify-between w-full">
        <div
          className="flex items-center gap-2 text-blue-600 font-medium cursor-pointer"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/home');
            }
          }}
        >
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
                <div className="space-y-4">
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-[600px] w-full text-sm text-left border-separate border-spacing-0">
                      <thead>
                        <tr className="text-gray-700 border-b border-gray-200">
                          <th className="font-semibold py-2 px-2">Category</th>
                          <th className="font-semibold text-green-700 py-2 px-2">Okays</th>
                          <th className="font-semibold text-red-700 py-2 px-2">A Defects</th>
                          <th className="font-semibold text-red-700 py-2 px-2">B Defects</th>
                          <th className="font-semibold text-red-700 py-2 px-2">C Defects</th>
                          <th className="font-semibold text-green-700 py-2 px-2">Hrs</th>
                          <th className="font-semibold text-green-700 py-2 px-2">Max Score</th>
                          <th className="font-semibold py-2 px-2">Deduction</th>
                          <th className="font-semibold py-2 px-2">Obtained</th>
                          <th className="font-semibold py-2 px-2">Score%"</th>
                          <th className="font-semibold py-2 px-2">PQI Score</th>
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
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4">
                    {summaryStats.categories.map((category: any, index: number) => (
                      <div key={index} className={`bg-white border rounded-lg p-4 ${index % 2 === 0 ? 'border-gray-200' : 'border-gray-300'}`}>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold text-gray-900">{category.category}</h3>
                          <span className="text-sm font-medium text-blue-600">{category.pqiScore.toFixed(2)}%</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Okays:</span>
                            <span className="font-medium text-green-600">{category.okays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">A Defects:</span>
                            <span className="font-medium text-red-600">{category.aDefects}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">B Defects:</span>
                            <span className="font-medium text-red-600">{category.bDefects}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">C Defects:</span>
                            <span className="font-medium text-red-600">{category.cDefects}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Hours:</span>
                            <span className="font-medium">{category.hours}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Score %:</span>
                            <span className="font-medium">{category.scorePercent.toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Mobile Summary Cards */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-green-800">Broken %</span>
                        <span className="text-green-700">{summaryStats.brokenPercentage}%</span>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-yellow-800">Final PQI Score</span>
                        <span className="text-yellow-700">{summaryStats.finalPQIScore}%</span>
                      </div>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-red-800">PQI Status</span>
                        <span className={`px-3 py-1 rounded-full text-white font-bold text-sm ${summaryStats.pqiStatus === 'PASS' ? 'bg-green-500' : 'bg-red-500'}`}>
                          {summaryStats.pqiStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
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
          <button 
            className={`w-full text-left px-4 py-2 rounded-md font-medium border ${
              selectedEvaluationType === 'CBB' 
                ? 'bg-blue-100 text-blue-600 border-blue-200' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedEvaluationType('CBB')}
          >
            CBB Evaluation
          </button>
          <button 
            className={`w-full text-left px-4 py-2 rounded-md font-medium border ${
              selectedEvaluationType === 'Secondary' 
                ? 'bg-blue-100 text-blue-600 border-blue-200' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedEvaluationType('Secondary')}
          >
            Secondary
          </button>
          <button 
            className={`w-full text-left px-4 py-2 rounded-md font-medium border ${
              selectedEvaluationType === 'Primary' 
                ? 'bg-blue-100 text-blue-600 border-blue-200' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedEvaluationType('Primary')}
          >
            Primary
          </button>
          <button 
            className={`w-full text-left px-4 py-2 rounded-md font-medium border ${
              selectedEvaluationType === 'Product' 
                ? 'bg-blue-100 text-blue-600 border-blue-200' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedEvaluationType('Product')}
          >
            Product
          </button>
        </div>
        {/* Main Content - Cycles */}
        <div className="md:col-span-3">
          {selectedEvaluationType === 'CBB' && (
            <CBBEvaluation
              onCycleComplete={onCycleComplete}
            />
          )}
          {selectedEvaluationType === 'Secondary' && (
            <SecondaryEvaluation
              onCycleComplete={onCycleComplete}
            />
          )}
          {selectedEvaluationType === 'Primary' && (
            <PrimaryEvaluation
              onCycleComplete={onCycleComplete}
            />
          )}
          {selectedEvaluationType === 'Product' && (
            <ProductEvaluation
              onCycleComplete={onCycleComplete}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProductQualityIndex;
