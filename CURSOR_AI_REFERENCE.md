# PWA-PTMS (Progressive Web App - Plant Tour Management System)

## Project Overview
A comprehensive Progressive Web App for plant tour management with offline capabilities, real-time data synchronization, and multi-department support.

## Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Redux Toolkit + Redux Persist
- **Authentication**: Microsoft MSAL (Azure AD)
- **File Storage**: SharePoint REST API
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **PWA**: Service Workers + Workbox

## Project Structure
```
src/
├── auth/                    # Authentication configuration
├── components/              # React components
├── pages/                   # Page components
├── Services/               # API services and business logic
├── store/                  # Redux store and slices
├── types/                  # TypeScript type definitions
├── utils/                  # Utility functions
└── sw.ts                   # Service worker
```

## Key Features

### 1. Authentication & Authorization
- **MSAL Integration**: Azure AD authentication
- **Token Management**: Automatic token refresh
- **Protected Routes**: Route-level authentication

### 2. Offline-First Architecture
- **Redux Persist**: State persistence across sessions
- **Offline Queue**: Queued operations for sync when online
- **Local Storage**: Critical data cached locally
- **Sync Manager**: Automatic data synchronization

### 3. Multi-Department Support
- **Quality - Rajpura**: Full feature set
- **Production - Bangalore**: Core functionality
- **Department-Specific Logic**: Conditional rendering and behavior

### 4. Plant Tour Management
- **Tour Lifecycle**: Start → Pause → Resume → Finish
- **Criteria Management**: Dynamic checklist system
- **Observation Recording**: Real-time data capture
- **Photo Documentation**: Image upload and storage

## Core Components

### HomePage.tsx
**Purpose**: Main dashboard and sync management
**Key Responsibilities**:
- Plant tour initialization
- Offline mode management
- Data synchronization orchestration
- Department-specific routing

**Critical Functions**:
```typescript
// Main sync functions
handleCancelOffline()                    // Quality - Rajpura sync
handleOtherDepartmentSyncCancelOffline() // Other departments sync

// Offline data counting
totalOfflineCount = useMemo(() => {
  // Counts all offline data across all modules
}, [dependencies])
```

### BakingProcessRecord.tsx
**Purpose**: Baking process data entry and image management
**Key Features**:
- Multi-cycle data entry
- Real-time image capture (camera + gallery)
- Offline image storage with base64 encoding
- Redux state management for images

**Image Upload Flow**:
1. User selects/captures image
2. File converted to base64
3. Stored in Redux with metadata
4. Synced to SharePoint on save/sync

### FileUploadModal.tsx
**Purpose**: Image capture and selection interface
**Features**:
- Camera access with device permissions
- Gallery selection
- Image preview and metadata display
- Delete functionality with confirmation

### EnhancedBakingProcessImageUpload.tsx
**Purpose**: Image management wrapper component
**Features**:
- Redux integration for image state
- Grid display of uploaded images
- Image viewing and deletion
- Modal management

## Redux Store Architecture

### Slices Overview
```typescript
// Main slices
planTourSlice.ts           // Plant tour state
BakingProcessSlice.ts      // Baking process data + images
userSlice.ts              // User authentication
stateSlice.ts             // Global app state

// Department-specific slices
creamPercentageSlice.ts
sieveAndMagnetNewPlantSlice.ts
productMonitoringSlice.ts
// ... more slices
```

### BakingProcessSlice.ts Structure
```typescript
interface OfflineFileData {
  id: string;                    // Unique identifier
  cycleNum: number;              // Cycle number
  fileData: string;              // Base64 encoded file
  fileName: string;              // Original filename
  fileSize: number;              // File size in bytes
  fileType: string;              // MIME type
  timestamp: number;             // Upload timestamp
  qualityTourId: string;         // Tour reference
  previewUrl: string;            // Object URL for preview
  isFromCamera: boolean;         // Source tracking
}

// Actions
addImage(payload: OfflineFileData)
removeImage(imageId: string)
clearCycleImages(cycleNum: number)
```

## Service Layer Architecture

### BakingProcessFileUpload.ts
**Purpose**: Dedicated service for baking process file operations
**Key Functions**:
```typescript
// File conversion utilities
fileToBase64(file: File): Promise<string>
base64ToFile(base64: string, fileName: string, mimeType: string): File

// Offline storage
storeFileOffline(cycleNum: number, file: File, qualityTourId: string, isFromCamera: boolean): Promise<void>

// SharePoint integration
uploadFileToSharePointWithAuth(file: File, qualityTourId: string, cycleNum: number, accessToken: string): Promise<SaveResponse>
uploadFileFromRedux(fileData: OfflineFileData, accessToken: string): Promise<SaveResponse>

// Batch operations
uploadCycleImages(cycleNum: number, accessToken: string): Promise<SaveResponse>
syncOfflineFiles(accessToken: string): Promise<SaveResponse>

// Authentication helper
getMsalToken(instance: any, accounts: any[]): Promise<string | null>
```

### SharePoint Integration
**Authentication Flow**:
1. Get MSAL token from React component
2. Pass token to service functions
3. Include token in Authorization header
4. Handle token refresh automatically

**Upload Process**:
1. Get SharePoint context info
2. Upload file to document library
3. Update list item metadata
4. Return success/error response

## Offline Synchronization Strategy

### Data Flow
```
User Action (Offline) → Redux State → Local Storage → Sync Queue
                                                ↓
User Goes Online → Sync Manager → API Calls → Clear Queue
```

### Sync Triggers
- **Manual**: "Sync & Cancel Offline" button
- **Automatic**: Network status change
- **On Save**: Immediate sync if online

### Sync Order
1. Plant Tour Section data
2. Pause/Finish data
3. Baking Process data
4. **Baking Process images** ← Recently fixed
5. Other department data
6. Clear offline state

## Error Handling Patterns

### Authentication Errors
```typescript
try {
  const accessToken = await getMsalToken(instance, accounts);
  if (!accessToken) {
    throw new Error('Authentication failed');
  }
} catch (error) {
  console.error('Auth error:', error);
  alert('Please log in again');
}
```

### File Upload Errors
```typescript
try {
  const result = await uploadFileToSharePointWithAuth(file, tourId, cycle, token);
  if (!result.success) {
    throw new Error(result.error);
  }
} catch (error) {
  console.error('Upload error:', error);
  // Store for retry
}
```

### Offline Sync Errors
```typescript
try {
  await syncOfflineFiles(accessToken);
  totalSynced++;
} catch (error) {
  console.error('Sync error:', error);
  totalErrors++;
}
```

## Recent Fixes & Improvements

### 1. Baking Process Image Sync Fix (Latest)
**Issue**: Images not syncing in offline mode
**Solution**: Added sync logic to both sync functions
```typescript
// In handleCancelOffline() and handleOtherDepartmentSyncCancelOffline()
const bakingOfflineFiles = state.bakingProcess.offlineFiles;
if (bakingOfflineFiles.length > 0) {
  const accessToken = await getMsalToken(instance, accounts);
  await syncOfflineFiles(accessToken);
}
```

### 2. Camera Availability Check Fix
**Issue**: "This condition will always return true" warning
**Solution**: Proper function type check
```typescript
// Before (incorrect)
const isCameraAvailable = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

// After (correct)
const isCameraAvailable = navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';
```

### 3. Redux Serialization Fix
**Issue**: Non-serializable File objects in Redux
**Solution**: Convert to base64 strings
```typescript
// Store base64 instead of File objects
const base64Data = await fileToBase64(file);
dispatch(addImage({ ...imageData, fileData: base64Data }));
```

### 4. Production Environment Fix
**Issue**: Checklist not showing in production
**Solution**: Corrected SharePoint site URL
```typescript
// Changed from PTMS_UAT to PTMS_PRD
const url = `https://bectors.sharepoint.com/sites/PTMS_PRD/_api/web/lists/...`;
```

## Configuration Files

### Environment Variables
```typescript
// env.example
VITE_CLIENT_ID=your_msal_client_id
VITE_AUTHORITY=https://login.microsoftonline.com/your_tenant
VITE_REDIRECT_URI=http://localhost:5173
VITE_SCOPE=https://graph.microsoft.com/.default
```

### MSAL Configuration
```typescript
// authConfig.tsx
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_CLIENT_ID,
    authority: import.meta.env.VITE_AUTHORITY,
    redirectUri: import.meta.env.VITE_REDIRECT_URI,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};
```

## Development Guidelines

### Code Organization
- **Components**: Keep components focused and reusable
- **Services**: Separate API logic from UI logic
- **Types**: Define interfaces for all data structures
- **Redux**: Use RTK Query for server state when possible

### Error Handling
- Always wrap async operations in try-catch
- Provide user-friendly error messages
- Log errors for debugging
- Implement retry mechanisms for network operations

### Performance Considerations
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Optimize image sizes before upload
- Use base64 encoding for offline storage

### Testing Strategy
- Unit tests for utility functions
- Integration tests for API services
- E2E tests for critical user flows
- Manual testing for offline scenarios

## Common Issues & Solutions

### 1. Token Expiration
**Symptom**: 401 Unauthorized errors
**Solution**: Implement automatic token refresh in MSAL

### 2. File Upload Failures
**Symptom**: Images not uploading to SharePoint
**Solution**: Check token validity and SharePoint permissions

### 3. Offline Data Loss
**Symptom**: Data not persisting between sessions
**Solution**: Verify Redux Persist configuration

### 4. Sync Conflicts
**Symptom**: Duplicate data in backend
**Solution**: Implement conflict resolution logic

## Deployment Information

### Build Process
```bash
npm run build          # Production build
npm run preview        # Preview build locally
npm run dev           # Development server
```

### PWA Configuration
- **Manifest**: Located in `public/manifest.json`
- **Service Worker**: Auto-generated by Vite PWA plugin
- **Offline Support**: Cached resources for offline use

### SharePoint Integration
- **Site**: `https://bectors.sharepoint.com/sites/PTMS_PRD`
- **Document Library**: Used for file uploads
- **Lists**: Used for metadata storage

## API Endpoints

### SharePoint REST API
```
POST /_api/contextinfo                    # Get context info
POST /_api/web/lists/getbytitle('...')/items  # Create list items
POST /_api/web/getfolderbyserverrelativeurl('...')/files/add(...)  # Upload files
```

### Custom APIs
```
POST /api/plant-tours                     # Plant tour operations
POST /api/baking-process                  # Baking process data
POST /api/sync                           # Data synchronization
```

## Security Considerations

### Data Protection
- All API calls use HTTPS
- Sensitive data encrypted in transit
- Tokens stored securely in localStorage
- File uploads validated for type and size

### Authentication
- Multi-factor authentication via Azure AD
- Token-based authorization
- Automatic session management
- Role-based access control

## Monitoring & Logging

### Console Logging
- Structured logging for debugging
- Error tracking and reporting
- Performance metrics
- User action tracking

### Error Reporting
- Client-side error capture
- Network failure handling
- User feedback collection
- Automatic retry mechanisms

## Future Enhancements

### Planned Features
- Real-time collaboration
- Advanced analytics dashboard
- Mobile app version
- Offline conflict resolution
- Bulk data import/export

### Technical Improvements
- Implement React Query for server state
- Add comprehensive test coverage
- Optimize bundle size
- Implement code splitting
- Add performance monitoring

---

## Quick Reference Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start development server
npm run build           # Build for production
npm run preview         # Preview production build
```

### Debugging
```bash
# Check Redux state
console.log(store.getState());

# Check offline data
console.log(localStorage.getItem('persist:root'));

# Clear all offline data
localStorage.clear();
```

### Common Debug Points
1. **Authentication**: Check MSAL token validity
2. **File Upload**: Verify SharePoint permissions
3. **Offline Sync**: Check Redux state and localStorage
4. **Network**: Monitor network requests in DevTools

This reference document should provide comprehensive context for any Cursor AI assistant working on this project.

