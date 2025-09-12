import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector,useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import DashboardLayout from './DashboardLayout';
import * as CriteriaMasterService from '../Services/CriteriaMasterService';
import * as PlantTourService from '../Services/PlantTourService';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../auth/authConfig';
import {setEmployeeDetails} from '../store/planTourSlice';
import { fetchEmployeeList } from '../Services/getEmployeeDetails';
import { saveNotApplicableObservation } from '../Services/NotApplicableObservationService';
import { getOfflineDataAge } from '../Services/PlantTourOfflineService';
import { saveOfflineObservation } from '../Services/PlantTourOfflineStorage';
import { finishPlantTour, storeFinishTourOffline, type ValidationData } from '../Services/FinishTourService';

const PlantTourSection: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // Get data from planTour slice (since plantTourSection slice was deleted)
  const { 
    plantTourId: reduxPlantTourId,
    employeeDetails,
    offlineCriteriaList, 
    offlineEmployeeDetails, 
    offlineExistingObservations, 
    offlineDataTimestamp, 
    isOfflineMode
  } = useSelector((state: RootState) => state.planTour);
  
  // CRITICAL: Use localStorage backup if Redux doesn't have plant tour ID
  const localStoragePlantTourId = localStorage.getItem('plantTourId');
  const plantTourId = reduxPlantTourId || localStoragePlantTourId;
  
  console.log('🔍 PlantTourSection Debug:');
  console.log('  - Redux plantTourId:', reduxPlantTourId);
  console.log('  - localStorage plantTourId:', localStoragePlantTourId);
  console.log('  - Final plantTourId:', plantTourId);
  console.log('  - employeeDetails:', employeeDetails);
  console.log('  - isOfflineMode:', isOfflineMode);
  console.log('  - offlineCriteriaList.length:', offlineCriteriaList?.length || 0);
  
  const user = useSelector((state: any) => state.user.user);
  const { instance, accounts } = useMsal();

  // State for comments
  const [comments, setComments] = useState('');
  
  // State for expanded sections
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  
  // State for expanded categories within areas
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: { [key: string]: boolean } }>({});
  
  // State for checklist responses
  const [checklistResponses, setChecklistResponses] = useState<{ [key: string]: { [questionId: string]: string } }>({});
  
  // State for criteria master list
  const [criteriaList, setCriteriaList] = useState<any[]>([]);
  const [isLoadingCriteria, setIsLoadingCriteria] = useState(false);
  
  // State for comments and near miss for each criteria
  const [criteriaComments, setCriteriaComments] = useState<{ [key: string]: { [questionId: string]: string } }>({});
  const [criteriaNearMiss, setCriteriaNearMiss] = useState<{ [key: string]: { [questionId: string]: boolean } }>({});
  
  // State for tour statistics
  const [tourStats, setTourStats] = useState({
    startedDate: '',
    duration: '00:00',
    completionDate: '',
    totalCriteria: 0,
    approvedCriteria: 0,
    rejectedCriteria: 0,
    pendingCriteria: 0,
    tourScore: 0,
    isCompleted: false
  });
  
  // State for loading and saving
  const [isSaving, setIsSaving] = useState(false);
  
  // State for tracking saved observations
  const [savedObservations, setSavedObservations] = useState<{ [key: string]: { [questionId: string]: string } }>({});
  
  // State for tracking observation IDs for deletion
  const [observationIds, setObservationIds] = useState<{ [key: string]: { [questionId: string]: string } }>({});
  
  // State for tour pause modal
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [tourScore, setTourScore] = useState(0);
  
  


  // Handle section expansion
  const handleSectionExpand = (sectionName: string) => {
    console.log(`Expanding section: ${sectionName}`);
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Handle category expansion within an area
  const handleCategoryExpand = (areaName: string, categoryName: string) => {
    console.log(`Expanding category: ${categoryName} in area: ${areaName}`);
    setExpandedCategories(prev => ({
      ...prev,
      [areaName]: {
        ...prev[areaName],
        [categoryName]: !prev[areaName]?.[categoryName]
      }
    }));
  };

  // Handle checklist response change
  const handleChecklistResponse = async (sectionName: string, questionId: string, response: string) => {
    setChecklistResponses(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [questionId]: response
      }
    }));

    // Only automatically save for "Not Applicable" - Approved and Rejected will be saved via Save button
    if (response === 'Not Applicable') {
      await handleNotApplicableClick(sectionName, questionId);
    }
  };

  // Handle comment change
  const handleCommentChange = (sectionName: string, questionId: string, comment: string) => {
    setCriteriaComments(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [questionId]: comment
      }
    }));
  };


  // Handle Near Miss checkbox
  const handleNearMissChange = (sectionName: string, questionId: string, isNearMiss: boolean) => {
    setCriteriaNearMiss(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [questionId]: isNearMiss
      }
    }));
  };

  // Handle save criteria data
  const handleSaveCriteria = async (sectionName: string, questionId: string) => {
    try {
      setIsSaving(true);
      const response = checklistResponses[sectionName]?.[questionId];
      const comment = criteriaComments[sectionName]?.[questionId] || '';
      const isNearMiss = criteriaNearMiss[sectionName]?.[questionId] || false;
      
      // Find the criteria details
      const criteria = criteriaList.find(c => c.id === questionId);
      if (!criteria) {
        console.error('Criteria not found:', questionId);
        return;
      }
      
      // Get access token
      if (accounts.length === 0) {
        console.error('No user accounts found');
        return;
      }
      
      await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      
      // Prepare data for API
      const observationData = {
        cr3ea_title: `${employeeDetails?.roleName || 'User'}_${new Date().toLocaleDateString('en-US')}`,
        cr3ea_observedbyrole: employeeDetails?.roleName || 'User',
        cr3ea_plantid: String(employeeDetails?.plantId || ''),
        cr3ea_departmentid: String(employeeDetails?.departmentId || ''),
        cr3ea_departmenttourid: String(plantTourId || ''),
        cr3ea_areaid: criteria.Area || sectionName,
        cr3ea_criteriaid: String(questionId || ''),
        cr3ea_observedby: user?.Name || '',
        cr3ea_observedperson: employeeDetails?.name || '',
        cr3ea_categoryid: criteria.Category || null,
        cr3ea_categorytitle: criteria.Category || '',
        cr3ea_what: criteria.What || '',
        cr3ea_criteria: criteria.Criteria || '',
        cr3ea_observation: comment,
        cr3ea_correctiveaction: '',
        cr3ea_severityid: getSeverityId(response, isNearMiss),
        cr3ea_status: getStatus(response),
        cr3ea_tourdate: new Date().toLocaleString(),
        cr3ea_action: response,
        cr3ea_observeddate: new Date().toLocaleString(),
        cr3ea_where: criteria.Area || sectionName,
        cr3ea_closurecomment: '',
        cr3ea_nearmiss: isNearMiss
      };
      
      let observationId: string | null = null;
      
      if (isOfflineMode) {
        // Save to offline storage
        console.log('Saving observation to offline storage...');
        const offlineObservationData = {
          id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sectionName,
          questionId,
          response,
          comment,
          nearMiss: isNearMiss,
          timestamp: Date.now(),
          plantTourId: plantTourId || '',
          employeeDetails,
          user,
          observationData,
          isNotApplicable: false
        };
        
        saveOfflineObservation(offlineObservationData);
        observationId = offlineObservationData.id;
        
        console.log('Observation saved to offline storage:', observationId);
        alert(`Observation saved offline! Will sync when online. ID: ${observationId}`);
      } else {
        // Save to backend API using PlantTourService
        const result = await PlantTourService.saveObservationToAPI(observationData);
        
        // Store the observation ID for potential deletion
        console.log('Full API response:', result);
        console.log('Response keys:', Object.keys(result || {}));
        
        // Try different possible field names for the observation ID
        observationId = result?.cr3ea_prod_observationsid || result?.cr3ea_observationsid || result?.id;
        
        if (observationId) {
          console.log('Storing observation ID:', observationId, 'for:', { sectionName, questionId });
          
          setObservationIds(prev => ({
            ...prev,
            [sectionName]: {
              ...prev[sectionName],
              [questionId]: observationId!
            }
          }));
          
          // Also store in sessionStorage for consistency with the provided code
          const itemid = `uniqueID_${questionId}_${plantTourId}`;
          sessionStorage.setItem(itemid, observationId);
          console.log('Stored in sessionStorage with key:', itemid);
          
          // Show success message with ID
          alert(`Observation saved successfully! ID: ${observationId}`);
        } else {
          console.log('No observation ID found in API response. Available fields:', Object.keys(result || {}));
          alert('Warning: Observation saved but no ID returned from API');
        }
      }
      
      // Update local statistics
      updateTourStatistics();
      
      // Mark this observation as saved
      setSavedObservations(prev => ({
        ...prev,
        [sectionName]: {
          ...prev[sectionName],
          [questionId]: response
        }
      }));
      
      console.log('Criteria data saved successfully:', observationData);
      
    } catch (error) {
      console.error('Error saving criteria data:', error);
      alert('Failed to save criteria data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Not Applicable radio button click - SaveNAObservationTableDraft
  const handleNotApplicableClick = async (sectionName: string, questionId: string) => {
    try {
      setIsSaving(true);
      console.log('Starting Not Applicable save process...', { sectionName, questionId });
      
      // Find the criteria details
      const criteria = criteriaList.find(c => c.id === questionId);
      if (!criteria) {
        console.error('Criteria not found:', questionId, 'Available criteria:', criteriaList);
        alert('Criteria not found. Please refresh the page and try again.');
        return;
      }
      console.log('Found criteria:', criteria);
      
      // Check employee details
      if (!employeeDetails) {
        console.error('Employee details not found:', employeeDetails);
        alert('Employee details not found. Please refresh the page and try again.');
        return;
      }
      console.log('Employee details:', employeeDetails);
      
      // Check plant tour ID
      if (!plantTourId) {
        console.error('Plant tour ID not found:', plantTourId);
        alert('Plant tour ID not found. Please refresh the page and try again.');
        return;
      }
      console.log('Plant tour ID:', plantTourId);
      
      let observationId: string | null = null;
      
      if (isOfflineMode) {
        // Save to offline storage
        console.log('Saving Not Applicable observation to offline storage...');
        const offlineObservationData = {
          id: `offline_na_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sectionName,
          questionId,
          response: 'Not Applicable',
          comment: '',
          nearMiss: false,
          timestamp: Date.now(),
          plantTourId: plantTourId || '',
          employeeDetails,
          user,
          observationData: {
            criteria,
            employeeDetails,
            user,
            plantTourId,
            sectionName
          },
          isNotApplicable: true
        };
        
        saveOfflineObservation(offlineObservationData);
        observationId = offlineObservationData.id;
        
        console.log('Not Applicable observation saved to offline storage:', observationId);
        alert(`Not Applicable observation saved offline! Will sync when online. ID: ${observationId}`);
      } else {
        // Use the service to save Not Applicable observation
        console.log('Calling saveNotApplicableObservation with:', {
          criteria,
          employeeDetails,
          user,
          plantTourId,
          sectionName
        });
        
        await saveNotApplicableObservation(
          criteria,
          employeeDetails,
          user,
          plantTourId,
          sectionName
        );
        
        // Store the observation ID for potential deletion
        const itemId = `uniqueID_${questionId}_${plantTourId}`;
        observationId = sessionStorage.getItem(itemId);
        console.log('Not Applicable - Retrieved observation ID from sessionStorage:', observationId, 'for:', { sectionName, questionId });
        
        if (observationId) {
          setObservationIds(prev => ({
            ...prev,
            [sectionName]: {
              ...prev[sectionName],
              [questionId]: observationId!
            }
          }));
          console.log('Stored Not Applicable observation ID in state');
        } else {
          console.log('No observation ID found in sessionStorage for Not Applicable');
        }
        
        console.log('Not Applicable observation saved successfully');
        alert('Not Applicable observation saved successfully!');
      }
      
      // Update local statistics
      updateTourStatistics();
      
    } catch (error) {
      console.error('Error saving Not Applicable observation:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
      alert(`Failed to save Not Applicable observation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle clear criteria data
  const handleClearCriteria = async (sectionName: string, questionId: string) => {
    alert(`Clear button clicked for section: ${sectionName}, question: ${questionId}`);
    console.log('Clear button clicked for:', { sectionName, questionId });
    console.log('Current observationIds state:', observationIds);
    
    try {
      if (isOfflineMode) {
        // Delete from offline storage
        console.log('Deleting observation from offline storage...');
        const { deleteOfflineObservation } = await import('../Services/PlantTourOfflineStorage');
        deleteOfflineObservation(plantTourId || '', sectionName, questionId);
        console.log('Observation deleted from offline storage');
        alert('Observation deleted from offline storage!');
      } else {
        // Check if there's an observation ID to delete
        const observationId = observationIds[sectionName]?.[questionId];
        console.log('Found observationId:', observationId);
        
        // Also check sessionStorage as fallback
        const itemid = `uniqueID_${questionId}_${plantTourId}`;
        const sessionStorageId = sessionStorage.getItem(itemid);
        console.log('SessionStorage ID:', sessionStorageId);
        
        const idToDelete = observationId || sessionStorageId;
        
        if (idToDelete) {
          console.log('Deleting observation with ID:', idToDelete);
          alert(`Attempting to delete observation with ID: ${idToDelete}`);
          
          // Call delete API
          await PlantTourService.deleteObservationFromAPI(idToDelete);
          
          // Clear from sessionStorage
          sessionStorage.removeItem(itemid);
          
          console.log('Observation deleted successfully');
          alert('Observation deleted successfully!');
        } else {
          console.log('No observation ID found to delete');
          alert('No observation ID found to delete');
        }
      }
    } catch (error) {
      console.error('Error deleting observation:', error);
      // Continue with clearing the form even if deletion fails
    }
    
    // Clear all form data
    setChecklistResponses(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [questionId]: ''
      }
    }));
    
    setCriteriaComments(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [questionId]: ''
      }
    }));
    
    setCriteriaNearMiss(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [questionId]: false
      }
    }));
    
    // Clear saved observation state
    setSavedObservations(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [questionId]: ''
      }
    }));
    
    // Clear observation ID
    setObservationIds(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [questionId]: ''
      }
    }));
    
    // Update tour statistics
    updateTourStatistics();
  };


  // Helper function to get severity ID based on response and near miss
  const getSeverityId = (response: string, isNearMiss: boolean): string => {
    if (response === 'Approved') {
      return '1'; // Approved severity
    } else if (response === 'Rejected') {
      return isNearMiss ? '3' : '2'; // Near miss = 3, Rejected = 2
    }
    return '1'; // Default
  };

  // Helper function to get status based on response
  const getStatus = (response: string): string => {
    if (response === 'Approved') {
      return 'NA';
    } else if (response === 'Rejected') {
      return 'Pending';
    }
    return 'NA'; // Not Applicable
  };


  // Function to validate and calculate tour statistics
  const validateFinishTour = () => {
    const groupedCriteria = groupCriteriaByArea();
    let totalCriteria = 0;
    let approvedCriteria = 0;
    let rejectedCriteria = 0;
    let naCriteria = 0;
    
    Object.values(groupedCriteria).forEach((areaCriteria: any[]) => {
      totalCriteria += areaCriteria.length;
      areaCriteria.forEach(criteria => {
        const response = checklistResponses[criteria.Area]?.[criteria.id];
        if (response === 'Approved') {
          approvedCriteria++;
        } else if (response === 'Rejected') {
          rejectedCriteria++;
        } else if (response === 'Not Applicable') {
          naCriteria++;
        }
      });
    });
    
    return {
      TotalCriteria: totalCriteria,
      ApprovedCriteria: approvedCriteria,
      RejectedCriteria: rejectedCriteria,
      NACriteria: naCriteria
    };
  };

  // Function to pause tour
  const handlePauseTour = async () => {
    try {
      const objTempData = validateFinishTour();
      
      // Check if any criteria have been selected
      if (objTempData.RejectedCriteria + objTempData.NACriteria + objTempData.ApprovedCriteria === 0) {
        alert("Please do any selection before pausing the tour");
        return;
      }
      
      setIsSaving(true);
      
      // Calculate tour score
      let totalScore = 0;
      if (objTempData.TotalCriteria > 0) {
        const tourScore = (objTempData.ApprovedCriteria / objTempData.TotalCriteria) * 100;
        totalScore = Math.round(tourScore * 100) / 100; // Round to 2 decimal places
      }
      
      // Prepare tour update data
      const tourUpdateData = {
        cr3ea_finalcomment: comments || '', // Use current comments
        cr3ea_totalcriterias: String(parseInt(String(objTempData.TotalCriteria)) + parseInt(String(objTempData.NACriteria))),
        cr3ea_totalobservations: String(parseInt(String(objTempData.RejectedCriteria))),
        cr3ea_totalnacriterias: String(parseInt(String(objTempData.NACriteria))),
        cr3ea_totalcompliances: String(parseInt(String(objTempData.ApprovedCriteria))),
        cr3ea_tourscore: String(totalScore),
        cr3ea_tourcompletiondate: new Date().toLocaleString(),
        cr3ea_status: "In Progress"
      };
      
      if (isOfflineMode) {
        // Offline mode: Store pause data in Redux/localStorage for later sync
        console.log('Pausing tour in offline mode - storing data locally');
        
        // Store pause data in localStorage for later sync
        const offlinePauseData = {
          plantTourId: plantTourId,
          tourUpdateData: tourUpdateData,
          pauseTimestamp: new Date().toISOString(),
          tourScore: totalScore,
          comments: comments
        };
        
        // Get existing offline data
        const existingOfflineData = JSON.parse(localStorage.getItem('plantTourOfflineData') || '{}');
        
        // Update with pause data
        existingOfflineData.pauseData = offlinePauseData;
        
        // Save back to localStorage
        localStorage.setItem('plantTourOfflineData', JSON.stringify(existingOfflineData));
        
        console.log('Tour pause data stored offline:', offlinePauseData);
        
      } else {
        // Online mode: Make API call
        console.log('Pausing tour in online mode - making API call');
        
        // Get access token
        if (accounts.length === 0) {
          console.error('No user accounts found');
          return;
        }
        
        await instance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        });
        
        // Update tour status using PlantTourService
        await PlantTourService.updateTourStatus(plantTourId || '', tourUpdateData);
        
        console.log('Tour paused successfully via API with score:', totalScore);
      }
      
      // Set tour score and show modal (works for both online and offline)
      setTourScore(totalScore);
      setShowPauseModal(true);
      
    } catch (error) {
      console.error('Error pausing tour:', error);
      alert('Failed to pause tour. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Function to update tour statistics
  const updateTourStatistics = () => {
    const groupedCriteria = groupCriteriaByArea();
    let totalCriteria = 0;
    let approvedCriteria = 0;
    let rejectedCriteria = 0;
    let pendingCriteria = 0;
    
    Object.values(groupedCriteria).forEach((areaCriteria: any[]) => {
      totalCriteria += areaCriteria.length;
      areaCriteria.forEach(criteria => {
        const response = checklistResponses[criteria.Area]?.[criteria.id];
        if (response === 'Approved') {
          approvedCriteria++;
        } else if (response === 'Rejected') {
          rejectedCriteria++;
        } else if (!response) {
          pendingCriteria++;
        }
      });
    });
    
    const tourScore = totalCriteria > 0 ? (approvedCriteria / totalCriteria) * 100 : 0;
    
    setTourStats(prev => ({
      ...prev,
      totalCriteria,
      approvedCriteria,
      rejectedCriteria,
      pendingCriteria,
      tourScore: Math.round(tourScore)
    }));
  };

  // Function to fetch existing observation data
  const fetchExistingObservations = async () => {
    try {
      if (!plantTourId) {
        console.error('No plant tour ID available');
        return;
      }
      
      let observations: any[] = [];
      
      // Check if we're in offline mode and have cached data from planTour slice
      if (isOfflineMode && offlineExistingObservations.length > 0) {
        console.log('=== USING OFFLINE EXISTING OBSERVATIONS FROM PLAN TOUR SLICE ===');
        console.log('Offline observations count:', offlineExistingObservations.length);
        observations = offlineExistingObservations;
      } else if (isOfflineMode && !offlineExistingObservations.length) {
        console.error('=== OFFLINE MODE: NO VALID CACHED OBSERVATIONS ===');
        console.error('Offline observations count:', offlineExistingObservations.length);
        // In offline mode, continue with empty observations array
        observations = [];
      } else {
        console.log('=== FETCHING EXISTING OBSERVATIONS FROM API ===');
        console.log('Fetching existing observations for plant tour ID:', plantTourId);
        observations = await PlantTourService.fetchExistingObservations(plantTourId);
        console.log('Existing observations:', observations);
      }
      
      // Populate existing data
      if (observations && observations.length > 0) {
        observations.forEach((observation: any) => {
          const areaName = observation.cr3ea_where || observation.cr3ea_areaid;
          const criteriaId = observation.cr3ea_criteriaid;
          
          // Set the response
          setChecklistResponses(prev => ({
            ...prev,
            [areaName]: {
              ...prev[areaName],
              [criteriaId]: observation.cr3ea_action
            }
          }));
          
          // Set the comment
          if (observation.cr3ea_observation) {
            setCriteriaComments(prev => ({
              ...prev,
              [areaName]: {
                ...prev[areaName],
                [criteriaId]: observation.cr3ea_observation
              }
            }));
          }
          
          // Set near miss
          if (observation.cr3ea_nearmiss) {
            setCriteriaNearMiss(prev => ({
              ...prev,
              [areaName]: {
                ...prev[areaName],
                [criteriaId]: observation.cr3ea_nearmiss
              }
            }));
          }
        });
      }
      
    } catch (error) {
      console.error('Error fetching existing observations:', error);
    }
  };


  // Function to validate if all sections/areas have been attended
  const validateAllSectionsAttended = () => {
    const groupedCriteria = groupCriteriaByArea();
    const missingSections: string[] = [];
    
    console.log('=== VALIDATING ALL SECTIONS ATTENDED ===');
    console.log('Total sections/areas:', Object.keys(groupedCriteria).length);
    
    Object.entries(groupedCriteria).forEach(([areaName, areaCriteria]: [string, any[]]) => {
      console.log(`Checking section: ${areaName} (${areaCriteria.length} criteria)`);
      
      let hasResponse = false;
      
      // Check if any criteria in this area has a response
      areaCriteria.forEach(criteria => {
        const response = checklistResponses[areaName]?.[criteria.id];
        if (response && (response === 'Approved' || response === 'Rejected' || response === 'Not Applicable')) {
          hasResponse = true;
        }
      });
      
      if (!hasResponse) {
        missingSections.push(areaName);
        console.log(`❌ Section "${areaName}" has no responses`);
      } else {
        console.log(`✅ Section "${areaName}" has responses`);
      }
    });
    
    console.log('Missing sections:', missingSections);
    console.log('Total missing sections:', missingSections.length);
    
    return missingSections;
  };

  // Handle finish tour
  const handleFinishTour = async () => {
    try {
      setIsSaving(true);
      console.log('Finishing tour...');
      console.log('Plant Tour ID:', plantTourId);
      console.log('Is Offline Mode:', isOfflineMode);
      console.log('Comments:', comments);
      
      // Validate plantTourId
      if (!plantTourId) {
        throw new Error('Plant tour ID not found. Please go back and start a plant tour first.');
      }
      
      // Get validation data using existing validateFinishTour function
      const objTempData = validateFinishTour();
      console.log('Validation data:', objTempData);
      
      // Check if any criteria have been selected
      if (objTempData.RejectedCriteria + objTempData.NACriteria + objTempData.ApprovedCriteria === 0) {
        alert("Please do any selection before finishing the tour");
        return;
      }
      
      // Check if all sections/areas have been attended
      const missingSections = validateAllSectionsAttended();
      if (missingSections.length > 0) {
        const sectionList = missingSections.join(', ');
        alert(`Please attend all sections before finishing the tour. Missing sections: ${sectionList}`);
        return;
      }
      
      // Prepare validation data for the service
      const validationData: ValidationData = {
        TotalCriteria: objTempData.TotalCriteria,
        ApprovedCriteria: objTempData.ApprovedCriteria,
        RejectedCriteria: objTempData.RejectedCriteria,
        NACriteria: objTempData.NACriteria,
        IsValidated: true,
        ValidationMsg: ''
      };
      
      console.log('Prepared validation data:', validationData);
      
      let tourScore: string;
      
      if (isOfflineMode) {
        // Offline mode: Store finish data locally
        console.log('Finishing tour in offline mode - storing data locally');
        tourScore = storeFinishTourOffline(plantTourId, validationData, comments);
        console.log('Offline finish tour score:', tourScore);
      } else {
        // Online mode: Make API call
        console.log('Finishing tour in online mode - making API call');
        tourScore = await finishPlantTour(plantTourId, validationData, comments);
        console.log('Online finish tour score:', tourScore);
      }
      
      // Update tour stats
      setTourStats(prev => ({
        ...prev,
        isCompleted: true,
        completionDate: new Date().toLocaleDateString(),
        tourScore: Math.round(parseFloat(tourScore))
      }));
      
      // Show success message
      alert(`Tour completed successfully! Final Score: ${tourScore}%`);
      
      // Redirect to homepage after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (error) {
      console.error('Error finishing tour:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      alert(`Failed to finish tour: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };



  // Group criteria by area
  const groupCriteriaByArea = () => {
    const grouped = criteriaList.reduce((acc: { [key: string]: any[] }, criteria: any) => {
      const area = criteria.Area || 'Uncategorized';
      if (!acc[area]) {
        acc[area] = [];
      }
      acc[area].push(criteria);
      return acc;
    }, {} as { [key: string]: any[] });
    
    // Debug logging for area grouping
    console.log('=== AREA GROUPING DEBUG ===');
    console.log('Total criteria list length:', criteriaList.length);
    console.log('Grouped areas:', Object.keys(grouped));
    console.log('Number of areas:', Object.keys(grouped).length);
    Object.entries(grouped).forEach(([areaName, criteria]) => {
      console.log(`Area "${areaName}": ${criteria.length} criteria`);
    });
    
    // TEMPORARY FIX: If only 1 area and it's for Production - Old Plant, create dummy areas
    if (Object.keys(grouped).length === 1 && 
        employeeDetails?.departmentName?.toLowerCase().includes('production - old plant')) {
      console.log('=== TEMPORARY FIX: CREATING DUMMY AREAS FOR PRODUCTION - OLD PLANT ===');
      
      // Create dummy areas to test if the UI can display multiple areas
      const dummyAreas = [
        'Bulk Handling - Old Plant',
        'Pre-Mixing - Hass',
        'Sieving room',
        'Fermentation room',
        'Syrup preparation',
        'Rework Grinding - Old Plant',
        'Mixing Hass old',
        'Mixing Hass New',
        'Mixing Hass LB',
        'Depositor Hass old',
        'Depositor Hass New',
        'Depositor Hass LB',
        'Oven Hass old',
        'Oven Hass New',
        'Oven Hass LB',
        'Die Washing room Hass',
        'Utencil Washing room L2'
      ];
      
      // Create dummy criteria for each area
      dummyAreas.forEach(areaName => {
        if (!grouped[areaName]) {
          grouped[areaName] = [{
            id: `dummy_${areaName.replace(/\s+/g, '_').toLowerCase()}`,
            Title: `Dummy Criteria for ${areaName}`,
            What: `Sample question for ${areaName}`,
            Criteria: `Sample criteria for ${areaName}`,
            Area: areaName,
            Plant: 'Rajpura',
            Department: 'Production - Old Plant'
          }];
        }
      });
      
      console.log('Created dummy areas:', Object.keys(grouped));
      console.log('Total areas after dummy creation:', Object.keys(grouped).length);
    }
    
    return grouped;
  };

  // Group criteria by category within an area
  const groupCriteriaByCategory = (areaCriteria: any[]) => {
    const grouped = areaCriteria.reduce((acc: { [key: string]: any[] }, criteria: any) => {
      const category = criteria.Category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(criteria);
      return acc;
    }, {} as { [key: string]: any[] });
    
    return grouped;
  };

  // Get section statistics
  const getSectionStats = (areaCriteria: any[], areaName: string) => {
    const total = areaCriteria.length;
    const approved = areaCriteria.filter(criteria => 
      checklistResponses[areaName]?.[criteria.id] === 'Approved'
    ).length;
    const rejected = areaCriteria.filter(criteria => 
      checklistResponses[areaName]?.[criteria.id] === 'Rejected'
    ).length;
    const pending = total - approved - rejected;
    
    return { total, approved, rejected, pending };
  };
  useEffect(() => {
    // Check if we're in offline mode and have cached employee details from planTour slice
    if (isOfflineMode && offlineEmployeeDetails) {
      console.log('=== USING OFFLINE EMPLOYEE DETAILS FROM PLAN TOUR SLICE ===');
      console.log('Offline employee details:', offlineEmployeeDetails);
      dispatch(setEmployeeDetails(offlineEmployeeDetails));
      return;
    }
    
    // If offline mode but no valid cached employee details, skip API call
    if (isOfflineMode && !offlineEmployeeDetails) {
      console.error('=== OFFLINE MODE: NO VALID CACHED EMPLOYEE DETAILS ===');
      console.error('Offline employee details:', offlineEmployeeDetails);
      return;
    }
    
    // Fetch employee details from API (online mode)
    if (accounts.length > 0) {
      console.log('=== FETCHING EMPLOYEE DETAILS FROM API ===');
      instance
        .acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        })
        .then((response) => {
          fetchEmployeeList(response.accessToken, user?.Name).then((res) => {
            // setEmployees(res);
            if (res && res.length > 0) {
              dispatch(setEmployeeDetails(res[0]));
            }
          });
        })
        .catch((error) => {
          console.error("Token acquisition failed", error);
        });
    }
  }, [accounts, instance, user?.Name, isOfflineMode, offlineEmployeeDetails]);

  // Fetch CriteriaMaster list
  const loadCriteriaMasterList = async () => {
    try {
      setIsLoadingCriteria(true);
      console.log('Loading CriteriaMaster list...');
      
      // Check if we're in offline mode and have cached data from planTour slice
      if (isOfflineMode && offlineCriteriaList.length > 0) {
        console.log('=== USING OFFLINE CRITERIA DATA FROM PLAN TOUR SLICE ===');
        console.log('Offline criteria count:', offlineCriteriaList.length);
        console.log('=== OFFLINE CRITERIA LIST DETAILED DEBUG ===');
        console.log('Total offline criteria:', offlineCriteriaList.length);
        
        // Debug the first few items to see the structure
        if (offlineCriteriaList.length > 0) {
          console.log('First offline criteria item structure:', offlineCriteriaList[0]);
          console.log('Sample Area values from first 5 offline items:');
          offlineCriteriaList.slice(0, 5).forEach((item, index) => {
            console.log(`Offline Item ${index + 1}:`, {
              id: item.id,
              Title: item.Title,
              Area: item.Area,
              What: item.What
            });
          });
        }
        
        setCriteriaList(offlineCriteriaList);
        return;
      }
      
      // If offline mode but no valid cached data, show error
      if (isOfflineMode && !offlineCriteriaList.length) {
        console.error('=== OFFLINE MODE: NO VALID CACHED DATA ===');
        console.error('Offline criteria count:', offlineCriteriaList.length);
        alert('No valid offline data available. Please start offline mode with internet connection first.');
        return;
      }
      
      console.log('=== FETCHING CRITERIA FROM API ===');
      console.log('Accounts available:', accounts.length);
      console.log('Instance available:', !!instance);
      
      // Get MSAL access token
      if (accounts.length === 0) {
        console.error('No user accounts found - user may not be logged in');
        return;
      }
      
      console.log('Attempting to acquire token for account:', accounts[0].username);
      
      let response;
      try {
        // Try silent token acquisition first
        response = await instance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        });
        console.log('Silent token acquisition successful');
      } catch (silentError) {
        console.log('Silent token acquisition failed, trying interactive:', silentError);
        // If silent fails, try interactive
        response = await instance.acquireTokenPopup(loginRequest);
        console.log('Interactive token acquisition successful');
      }
      
      console.log('Token response:', response ? 'Token received' : 'No token response');
      
      if (!response || !response.accessToken) {
        console.error('Failed to get access token from MSAL');
        return;
      }
      
      console.log('MSAL access token acquired successfully');
      
      // Get employee details from Redux state
      console.log('Employee details:', employeeDetails);
      
      const plantName = employeeDetails?.plantName || employeeDetails?.PlantName || '';
      const departmentName = employeeDetails?.departmentName || employeeDetails?.DepartmentName || '';
      
      // Debug logging for Production - Old Plant department
      console.log('=== PLANT TOUR SECTION DEBUGGING ===');
      console.log('Plant Name:', plantName);
      console.log('Department Name:', departmentName);
      console.log('Employee Details:', employeeDetails);
      
      // Special debugging for Production - Old Plant
      if (departmentName && departmentName.toLowerCase().includes('production - old plant')) {
        console.log('=== PRODUCTION - OLD PLANT SPECIAL DEBUG ===');
        console.log('Plant Name (exact):', `"${plantName}"`);
        console.log('Department Name (exact):', `"${departmentName}"`);
        console.log('Plant Name length:', plantName.length);
        console.log('Department Name length:', departmentName.length);
        console.log('Plant Name includes "rajpura":', plantName.toLowerCase().includes('rajpura'));
        console.log('Department Name includes "production - old plant":', departmentName.toLowerCase().includes('production - old plant'));
      }
      
      // For Plant Tour Section, we want to show ALL areas for the department, not just the employee's specific area
      // So we pass undefined for areaName to get all areas
      const fetchedCriteriaList = await CriteriaMasterService.fetchCriteriaMasterList(
        response.accessToken,
        plantName,
        departmentName,
        undefined // Don't filter by area - show all areas for the department
      );
      console.log('CriteriaMaster list loaded successfully:', fetchedCriteriaList);
      console.log('=== CRITERIA LIST DETAILED DEBUG ===');
      console.log('Total criteria fetched:', fetchedCriteriaList.length);
      
      // Debug the first few items to see the structure
      if (fetchedCriteriaList.length > 0) {
        console.log('First criteria item structure:', fetchedCriteriaList[0]);
        console.log('Sample Area values from first 5 items:');
        fetchedCriteriaList.slice(0, 5).forEach((item, index) => {
          console.log(`Item ${index + 1}:`, {
            id: item.id,
            Title: item.Title,
            Area: item.Area,
            What: item.What
          });
        });
      }
      
      // Store the fetched criteria list in state
      setCriteriaList(fetchedCriteriaList);
    } catch (error) {
      console.error('Error loading CriteriaMaster list:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
    } finally {
      setIsLoadingCriteria(false);
    }
  };

  // Load CriteriaMaster list on component mount
  useEffect(() => {
    // Check if plant tour ID is available
    if (!plantTourId) {
      console.error('Plant tour ID not found in Redux state');
      alert('Plant tour ID not found. Please go back and start a plant tour first.');
      navigate('/home');
      return;
    }

    console.log('Plant tour ID available:', plantTourId);

    // Only try to load if we have accounts available
    if (accounts.length > 0) {
      loadCriteriaMasterList();
    } else {
      console.log('No accounts available yet, will retry when accounts are loaded');
    }
  }, [accounts.length, plantTourId, navigate]);

  // Retry loading when accounts become available
  useEffect(() => {
    if (accounts.length > 0) {
      console.log('Accounts are now available, loading criteria master list...');
      loadCriteriaMasterList();
    }
  }, [accounts]);

  // Fetch existing observations when criteria list is loaded
  useEffect(() => {
    if (criteriaList.length > 0 && plantTourId) {
      fetchExistingObservations();
    }
  }, [criteriaList, plantTourId]);

  // Load offline data when component mounts in offline mode
  useEffect(() => {
    if (isOfflineMode && offlineCriteriaList.length > 0) {
      console.log('=== LOADING OFFLINE DATA ON COMPONENT MOUNT ===');
      console.log('Offline criteria count:', offlineCriteriaList.length);
      console.log('Offline observations count:', offlineExistingObservations.length);
      
      // The criteria list should already be loaded from the loadCriteriaMasterList function
      // The existing observations will be loaded by the fetchExistingObservations function
      // This useEffect is just for logging and ensuring offline data is available
    }
  }, [isOfflineMode, offlineCriteriaList.length, offlineExistingObservations.length]);

  // Update tour statistics when checklist responses change
  useEffect(() => {
    if (criteriaList.length > 0) {
      updateTourStatistics();
    }
  }, [checklistResponses, criteriaList]);


  return (
    <DashboardLayout>
      {/* Header Section */}
      <div className="bg-white px-3 sm:px-4 md:px-6 py-3 sm:py-4 mb-4 sm:mb-6 border-b border-gray-200 w-full">
        <div className="flex items-center justify-between gap-2">
          {/* Back Button */}
          <button
            onClick={() => {
              console.log('Back button clicked - navigating to home');
              navigate('/home');
            }}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
          >
            <span className="text-lg mr-1">&lt;</span>
            <span className="font-medium text-sm sm:text-base">Back</span>
          </button>
          
          {/* Plant Tour ID and Offline Mode Indicator */}
          <div className="text-right min-w-0 flex-1">
            <div className="flex items-center justify-end gap-3 mb-1">
              {isOfflineMode && (
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-xs font-medium">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span>OFFLINE</span>
                </div>
              )}
              <span className="text-gray-700 text-sm sm:text-base">Plant Tour ID: </span>
              <span className="text-blue-600 font-medium text-sm sm:text-base break-all truncate">{plantTourId || 'N/A'}</span>
            </div>
            {isOfflineMode && offlineDataTimestamp && (
              <div className="text-xs text-gray-500">
                Data cached: {getOfflineDataAge(offlineDataTimestamp) + 'h ago'}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Department Tour Sections */}
      <div className="px-3 sm:px-4 md:px-6 space-y-4">
        {isLoadingCriteria ? (
          <div className="bg-white border border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-center">
              <span className="text-gray-600">Loading criteria...</span>
            </div>
          </div>
        ) : (
          Object.entries(groupCriteriaByArea()).map(([areaName, areaCriteria]: [string, any[]]) => {
            const stats = getSectionStats(areaCriteria, areaName);
            return (
              <div key={areaName} className="bg-white border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-gray-800">{areaName}</span>
                    {/* Section attendance indicator */}
                    {stats.approved + stats.rejected > 0 ? (
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center" title="Section attended">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    ) : (
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center" title="Section not attended">
                        <span className="text-white text-xs">✗</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{stats.approved}</span>
                    </div>
                    <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{stats.rejected}</span>
                    </div>
                    <div className="w-8 h-8 bg-yellow-500 rounded flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{stats.pending}</span>
                    </div>
                    <button
                      onClick={() => handleSectionExpand(areaName)}
                      className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                    >
                      <span className="text-gray-600 text-lg font-bold">
                        {expandedSections[areaName] ? '−' : '+'}
                      </span>
                    </button>
                  </div>
                </div>
          
                
                {/* Expanded Checklist */}
                {expandedSections[areaName] && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="space-y-4">
                      {Object.entries(groupCriteriaByCategory(areaCriteria)).map(([categoryName, categoryCriteria]: [string, any[]]) => (
                        <div key={categoryName} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          {/* Category Header */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-700">{categoryName}</span>
                            <button
                              onClick={() => handleCategoryExpand(areaName, categoryName)}
                              className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                            >
                              <span className="text-gray-600 text-sm font-bold">
                                {expandedCategories[areaName]?.[categoryName] ? '−' : '+'}
                              </span>
                            </button>
                          </div>
                          
                          {/* Expanded Category Content */}
                          {expandedCategories[areaName]?.[categoryName] && (
                            <div className="space-y-3">
                              {categoryCriteria.map((criteria: any, index: number) => (
                                <div key={criteria.id} className={`${index < categoryCriteria.length - 1 ? 'border-b border-gray-100 pb-3' : 'pb-3'}`}>
                                  <p className="text-sm font-medium text-gray-800 mb-2">{criteria.What}</p>
                                  <p className="text-xs text-gray-600 mb-3">{criteria.Criteria}</p>
                          
                          {/* Radio Button Options */}
                          <div className="flex gap-4 mb-4">
                            {['Not Applicable', 'Approved', 'Rejected'].map((option) => (
                              <label key={option} className="flex items-center">
                                <input
                                  type="radio"
                                  name={`criteria-${criteria.id}`}
                                  value={option}
                                  checked={checklistResponses[areaName]?.[criteria.id] === option}
                                  onChange={(e) => handleChecklistResponse(areaName, criteria.id, e.target.value)}
                                  className="mr-2"
                                />
                                <span className={`text-sm ${checklistResponses[areaName]?.[criteria.id] === option ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                                  {option}
                                </span>
                              </label>
                            ))}
                          </div>

                          {/* Show success message when "Not Applicable" is selected */}
                          {checklistResponses[areaName]?.[criteria.id] === 'Not Applicable' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                              <div className="flex items-center">
                                <span className="text-green-600 text-sm font-medium">✓ Not Applicable observation saved successfully</span>
                              </div>
                            </div>
                          )}

                          {/* Show success message when "Approved" is saved via Save button */}
                          {checklistResponses[areaName]?.[criteria.id] === 'Approved' && savedObservations[areaName]?.[criteria.id] === 'Approved' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                              <div className="flex items-center">
                                <span className="text-green-600 text-sm font-medium">✓ Approved observation saved successfully</span>
                              </div>
                            </div>
                          )}

                          {/* Show success message when "Rejected" is saved via Save button */}
                          {checklistResponses[areaName]?.[criteria.id] === 'Rejected' && savedObservations[areaName]?.[criteria.id] === 'Rejected' && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                              <div className="flex items-center">
                                <span className="text-orange-600 text-sm font-medium">✓ Rejected observation saved successfully</span>
                              </div>
                            </div>
                          )}

                          {/* Show Comment and Action Buttons when "Approved" is selected */}
                          {checklistResponses[areaName]?.[criteria.id] === 'Approved' && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                              {/* Comment Section */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                                <textarea
                                  value={criteriaComments[areaName]?.[criteria.id] || ''}
                                  onChange={(e) => handleCommentChange(areaName, criteria.id, e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                  rows={3}
                                  placeholder="Enter your comment here..."
                                />
                              </div>


                              {/* Action Buttons */}
                              <div className="flex justify-start gap-3">
                                <button
                                  onClick={() => handleSaveCriteria(areaName, criteria.id)}
                                  disabled={isSaving}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSaving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => handleClearCriteria(areaName, criteria.id)}
                                  disabled={isSaving}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Show Comment, Near Miss, and Action Buttons when "Rejected" is selected */}
                          {checklistResponses[areaName]?.[criteria.id] === 'Rejected' && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Comment Section */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                                  <textarea
                                    value={criteriaComments[areaName]?.[criteria.id] || ''}
                                    onChange={(e) => handleCommentChange(areaName, criteria.id, e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    rows={4}
                                    placeholder="Enter your comment here..."
                                  />
                                </div>

                                {/* Is Near Miss? Section */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Is Near Miss?</label>
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      id={`near-miss-${criteria.id}`}
                                      checked={criteriaNearMiss[areaName]?.[criteria.id] || false}
                                      onChange={(e) => handleNearMissChange(areaName, criteria.id, e.target.checked)}
                                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor={`near-miss-${criteria.id}`} className="text-sm text-gray-700">
                                      Near Miss
                                    </label>
                                  </div>
                                </div>

                              </div>

                              {/* Action Buttons */}
                              <div className="flex justify-start gap-3">
                                <button
                                  onClick={() => handleSaveCriteria(areaName, criteria.id)}
                                  disabled={isSaving}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSaving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => handleClearCriteria(areaName, criteria.id)}
                                  disabled={isSaving}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                )}
              </div>
            );
          })
        )}




        {/* Department Tour Summary */}
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Department Tour</h3>
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 text-sm font-bold">{tourStats.tourScore}%</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 mb-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Started On:</span> {tourStats.startedDate || new Date().toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Duration(HH:MM):</span> {tourStats.duration}
            </div>
            {tourStats.isCompleted && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Completed On:</span> {tourStats.completionDate}
              </div>
            )}
          </div>

          {/* Tour Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{tourStats.totalCriteria}</div>
              <div className="text-xs text-gray-600">Total Criteria</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{tourStats.approvedCriteria}</div>
              <div className="text-xs text-gray-600">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{tourStats.rejectedCriteria}</div>
              <div className="text-xs text-gray-600">Rejected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{tourStats.pendingCriteria}</div>
              <div className="text-xs text-gray-600">Pending</div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Enter your comments here..."
              disabled={tourStats.isCompleted}
            />
          </div>

          {!tourStats.isCompleted && (
            <div className="flex justify-end gap-3">
              <button
                onClick={handlePauseTour}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Pausing...' : 'Pause Tour'}
              </button>
              {/* Only show Finish Tour button when online (not in offline mode) */}
              {!isOfflineMode && (
                <button
                  onClick={handleFinishTour}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Finishing...' : 'Finish Tour'}
                </button>
              )}
            </div>
          )}
          
          {tourStats.isCompleted && (
            <div className="text-center py-4">
              <div className="text-green-600 font-semibold text-lg">✅ Tour Completed Successfully!</div>
              <div className="text-sm text-gray-600 mt-2">Final Score: {tourStats.tourScore}%</div>
            </div>
          )}
        </div>
      </div>

      {/* Tour Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(87, 87, 87, 0.5)' }}>
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-lg border border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 mb-4">
                The tour is currently paused.
              </div>
              <div className="text-lg text-gray-600 mb-6">
                Current Tour Score: {tourScore.toFixed(2)}%
              </div>
              <button
                onClick={() => {
                  setShowPauseModal(false);
                  navigate('/');
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Continue Tour
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default PlantTourSection;