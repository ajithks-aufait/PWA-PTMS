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
  const handleSaveCriteria = (sectionName: string, questionId: string) => {
    const response = checklistResponses[sectionName]?.[questionId];
    const comment = criteriaComments[sectionName]?.[questionId] || '';
    const attachments = criteriaAttachments[sectionName]?.[questionId] || [];
    const isNearMiss = criteriaNearMiss[sectionName]?.[questionId] || false;
    
    console.log('Saving criteria data:', {
      sectionName,
      questionId,
      response,
      comment,
      attachments: attachments.map(f => f.name),
      isNearMiss
    });
    
    // TODO: Implement actual save logic to backend
    alert('Criteria data saved successfully!');
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

  // Handle pause tour
  const handlePauseTour = () => {
    console.log('Pausing tour...');
    // TODO: Implement pause tour logic
  };

  // Handle finish tour
  const handleFinishTour = () => {
    console.log('Finishing tour...');
    // TODO: Implement finish tour logic
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
                                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => handleClearCriteria(areaName, criteria.id)}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
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
                                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => handleClearCriteria(areaName, criteria.id)}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
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
              <span className="text-gray-600 text-sm font-bold">0%</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 mb-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Started On:</span> 10-Sep-25
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Duration(HH:MM):</span> 06:43
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
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handlePauseTour}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Pause Tour
            </button>
            <button
              onClick={handleFinishTour}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Finish Tour
            </button>
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
};

export default PlantTourSection;