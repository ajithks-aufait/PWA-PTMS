import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector,useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import DashboardLayout from './DashboardLayout';
import * as PlantTourService from '../Services/PlantTourService';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../auth/authConfig';
import {setEmployeeDetails} from '../store/planTourSlice';
import { fetchEmployeeList } from '../Services/getEmployeeDetails';

const PlantTourSection: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { plantTourId, employeeDetails } = useSelector((state: RootState) => state.planTour);
  const user = useSelector((state: any) => state.user.user);
  const { instance, accounts } = useMsal();

  // State for comments
  const [comments, setComments] = useState('');
  
  // State for expanded sections
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  
  // State for checklist responses
  const [checklistResponses, setChecklistResponses] = useState<{ [key: string]: { [questionId: string]: string } }>({});
  
  // State for criteria master list
  const [criteriaList, setCriteriaList] = useState<any[]>([]);
  const [isLoadingCriteria, setIsLoadingCriteria] = useState(false);
  
  // State for comments and attachments for each criteria
  const [criteriaComments, setCriteriaComments] = useState<{ [key: string]: { [questionId: string]: string } }>({});
  const [criteriaAttachments, setCriteriaAttachments] = useState<{ [key: string]: { [questionId: string]: File[] } }>({});
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
  
  


  // Handle section expansion
  const handleSectionExpand = (sectionName: string) => {
    console.log(`Expanding section: ${sectionName}`);
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Handle checklist response change
  const handleChecklistResponse = (sectionName: string, questionId: string, response: string) => {
    setChecklistResponses(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [questionId]: response
      }
    }));
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

  // Handle file attachment
  const handleFileAttachment = (sectionName: string, questionId: string, files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      setCriteriaAttachments(prev => ({
        ...prev,
        [sectionName]: {
          ...prev[sectionName],
          [questionId]: fileArray
        }
      }));
    }
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
      
      const tokenResponse = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      
      // Prepare data for API
      const observationData = {
        cr3ea_title: `${employeeDetails?.roleName || 'User'}_${new Date().toLocaleDateString('en-US')}`,
        cr3ea_observedbyrole: employeeDetails?.roleName || 'User',
        cr3ea_plantid: employeeDetails?.plantId || '',
        cr3ea_departmentid: employeeDetails?.departmentId || '',
        cr3ea_departmenttourid: plantTourId,
        cr3ea_areaid: criteria.Area || sectionName,
        cr3ea_criteriaid: questionId,
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
      
      // Save to backend API
      await saveObservationToAPI(tokenResponse.accessToken, observationData);
      
      // Update local statistics
      updateTourStatistics();
      
      console.log('Criteria data saved successfully:', observationData);
      alert('Criteria data saved successfully!');
      
    } catch (error) {
      console.error('Error saving criteria data:', error);
      alert('Failed to save criteria data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle clear criteria data
  const handleClearCriteria = (sectionName: string, questionId: string) => {
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
    
    setCriteriaAttachments(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [questionId]: []
      }
    }));
    
    setCriteriaNearMiss(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        [questionId]: false
      }
    }));
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

  // API function to save observation data
  const saveObservationToAPI = async (accessToken: string, observationData: any) => {
    const environmentUrl = 'https://bectors.crm.dynamics.com'; // Update with your environment URL
    const tableName = 'cr3ea_prod_observationses';
    const apiVersion = '9.2';
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Prefer': 'return=representation',
      'Authorization': `Bearer ${accessToken}`
    };
    
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(observationData)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return await response.json();
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
      
      if (accounts.length === 0) {
        console.error('No user accounts found');
        return;
      }
      
      const tokenResponse = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      
      const environmentUrl = 'https://bectors.crm.dynamics.com'; // Update with your environment URL
      const tableName = 'cr3ea_prod_observationses';
      const apiVersion = '9.2';
      const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}?$filter=cr3ea_departmenttourid eq '${plantTourId}'`;
      
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Authorization': `Bearer ${tokenResponse.accessToken}`
      };
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Existing observations:', data.value);
      
      // Populate existing data
      if (data.value && data.value.length > 0) {
        data.value.forEach((observation: any) => {
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

  // Handle pause tour
  const handlePauseTour = async () => {
    try {
      setIsSaving(true);
      console.log('Pausing tour...');
      
      // Validate that at least one criteria is selected
      const hasAnySelection = Object.values(checklistResponses).some(areaResponses => 
        Object.values(areaResponses).some(response => response !== '')
      );
      
      if (!hasAnySelection) {
        alert('Please do any selection before pausing the tour');
        return;
      }
      
      // Update tour status to "In Progress"
      await updateTourStatus('In Progress');
      
      alert('Tour paused successfully!');
      
    } catch (error) {
      console.error('Error pausing tour:', error);
      alert('Failed to pause tour. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle finish tour
  const handleFinishTour = async () => {
    try {
      setIsSaving(true);
      console.log('Finishing tour...');
      
      // Validate all criteria are completed
      const validationResult = validateTourCompletion();
      if (!validationResult.isValid) {
        alert(validationResult.message);
        return;
      }
      
      // Update tour status to "Completed"
      await updateTourStatus('Completed');
      
      setTourStats(prev => ({
        ...prev,
        isCompleted: true,
        completionDate: new Date().toLocaleDateString()
      }));
      
      alert('Tour completed successfully!');
      
    } catch (error) {
      console.error('Error finishing tour:', error);
      alert('Failed to finish tour. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Function to validate tour completion
  const validateTourCompletion = () => {
    const groupedCriteria = groupCriteriaByArea();
    let totalCriteria = 0;
    let completedCriteria = 0;
    let missingComments = [];
    
    Object.entries(groupedCriteria).forEach(([areaName, areaCriteria]: [string, any[]]) => {
      areaCriteria.forEach(criteria => {
        totalCriteria++;
        const response = checklistResponses[areaName]?.[criteria.id];
        
        if (!response) {
          return { isValid: false, message: 'Please take action on each criteria' };
        }
        
        completedCriteria++;
        
        // Check if rejected criteria have comments
        if (response === 'Rejected') {
          const comment = criteriaComments[areaName]?.[criteria.id];
          if (!comment || comment.trim() === '') {
            missingComments.push(criteria.What);
          }
        }
      });
    });
    
    if (missingComments.length > 0) {
      return {
        isValid: false,
        message: 'Please enter comment for all Observations / Near Miss'
      };
    }
    
    return { isValid: true, message: 'Tour validation successful' };
  };

  // Function to update tour status
  const updateTourStatus = async (status: string) => {
    if (accounts.length === 0) {
      console.error('No user accounts found');
      return;
    }
    
    const tokenResponse = await instance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });
    
    const environmentUrl = 'https://bectors.crm.dynamics.com'; // Update with your environment URL
    const tableName = 'cr3ea_prod_departmenttours';
    const apiVersion = '9.2';
    const apiUrl = `${environmentUrl}/api/data/v${apiVersion}/${tableName}(${plantTourId})`;
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Prefer': 'return=representation',
      'Authorization': `Bearer ${tokenResponse.accessToken}`
    };
    
    const dataToSave = {
      cr3ea_finalcomment: comments,
      cr3ea_totalcriterias: tourStats.totalCriteria,
      cr3ea_totalobservations: tourStats.rejectedCriteria,
      cr3ea_totalnacriterias: 0, // Not Applicable count
      cr3ea_totalcompliances: tourStats.approvedCriteria,
      cr3ea_tourscore: tourStats.tourScore,
      cr3ea_tourcompletiondate: new Date().toLocaleString(),
      cr3ea_status: status
    };
    
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(dataToSave)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return await response.json();
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
    
    return grouped;
  };

  // Get section statistics
  const getSectionStats = (areaCriteria: any[]) => {
    const total = areaCriteria.length;
    const approved = areaCriteria.filter(criteria => 
      checklistResponses[areaCriteria[0]?.Area]?.[criteria.id] === 'Approved'
    ).length;
    const rejected = areaCriteria.filter(criteria => 
      checklistResponses[areaCriteria[0]?.Area]?.[criteria.id] === 'Rejected'
    ).length;
    const pending = total - approved - rejected;
    
    return { total, approved, rejected, pending };
  };
  useEffect(() => {
    if (accounts.length > 0) {
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
  }, [accounts, instance, user?.Name]);

  // Fetch CriteriaMaster list
  const loadCriteriaMasterList = async () => {
    try {
      setIsLoadingCriteria(true);
      console.log('Loading CriteriaMaster list...');
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
      const areaName = employeeDetails?.areaName || employeeDetails?.AreaName || '';
      
      const fetchedCriteriaList = await PlantTourService.fetchCriteriaMasterList(
        response.accessToken,
        plantName,
        departmentName,
        areaName
      );
      console.log('CriteriaMaster list loaded successfully:', fetchedCriteriaList);
      
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
    // Only try to load if we have accounts available
    if (accounts.length > 0) {
      loadCriteriaMasterList();
    } else {
      console.log('No accounts available yet, will retry when accounts are loaded');
    }
  }, [accounts.length]);

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
          
          {/* Plant Tour ID */}
          <div className="text-right min-w-0 flex-1">
            <span className="text-gray-700 text-sm sm:text-base">Plant Tour ID: </span>
            <span className="text-blue-600 font-medium text-sm sm:text-base break-all truncate">{plantTourId || 'N/A'}</span>
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
            const stats = getSectionStats(areaCriteria);
            return (
              <div key={areaName} className="bg-white border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-gray-800">{areaName}</span>
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
                      {areaCriteria.map((criteria: any, index: number) => (
                        <div key={criteria.id} className={`${index < areaCriteria.length - 1 ? 'border-b border-gray-100 pb-4' : 'pb-4'}`}>
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

                          {/* Show Comment, Attachment, and Action Buttons when "Approved" is selected */}
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

                              {/* Attachments Section */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                                <div className="flex items-center gap-3">
                                  <input
                                    type="file"
                                    id={`attachment-${criteria.id}`}
                                    multiple
                                    onChange={(e) => handleFileAttachment(areaName, criteria.id, e.target.files)}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`attachment-${criteria.id}`}
                                    className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-teal-600 transition-colors"
                                  >
                                    <span className="text-white text-lg font-bold">+</span>
                                  </label>
                                  <span className="text-sm text-gray-600">choose the file</span>
                                  {criteriaAttachments[areaName]?.[criteria.id]?.length > 0 && (
                                    <span className="text-xs text-blue-600">
                                      ({criteriaAttachments[areaName][criteria.id].length} file(s) selected)
                                    </span>
                                  )}
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

                          {/* Show Comment, Near Miss, Attachment, and Action Buttons when "Rejected" is selected */}
                          {checklistResponses[areaName]?.[criteria.id] === 'Rejected' && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                                {/* Attachments Section */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="file"
                                      id={`attachment-rejected-${criteria.id}`}
                                      multiple
                                      onChange={(e) => handleFileAttachment(areaName, criteria.id, e.target.files)}
                                      className="hidden"
                                    />
                                    <label
                                      htmlFor={`attachment-rejected-${criteria.id}`}
                                      className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-teal-600 transition-colors"
                                    >
                                      <span className="text-white text-lg font-bold">+</span>
                                    </label>
                                    <span className="text-sm text-gray-600">choose the file</span>
                                  </div>
                                  {criteriaAttachments[areaName]?.[criteria.id]?.length > 0 && (
                                    <div className="mt-2">
                                      <span className="text-xs text-blue-600">
                                        ({criteriaAttachments[areaName][criteria.id].length} file(s) selected)
                                      </span>
                                    </div>
                                  )}
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
              <button
                onClick={handleFinishTour}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Finishing...' : 'Finish Tour'}
              </button>
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

    </DashboardLayout>
  );
};

export default PlantTourSection;