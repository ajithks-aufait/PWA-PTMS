// Page State Management for Offline Navigation
export class PageStateManager {
  private static readonly CURRENT_PAGE_KEY = 'pwa_current_page'
  private static readonly PAGE_STATE_KEY = 'pwa_page_state'

  /**
   * Save the current page state for offline navigation
   */
  static saveCurrentPage(pathname: string, state?: any): void {
    try {
      // Save current page path
      localStorage.setItem(this.CURRENT_PAGE_KEY, pathname)
      
      // Save page state if provided
      if (state) {
        localStorage.setItem(`${this.PAGE_STATE_KEY}_${pathname}`, JSON.stringify(state))
      }
      
      console.log(`Saved page state for: ${pathname}`)
    } catch (error) {
      console.warn('Failed to save page state:', error)
    }
  }

  /**
   * Get the last saved page for offline navigation
   */
  static getLastSavedPage(): string | null {
    try {
      return localStorage.getItem(this.CURRENT_PAGE_KEY)
    } catch (error) {
      console.warn('Failed to get last saved page:', error)
      return null
    }
  }

  /**
   * Get saved state for a specific page
   */
  static getPageState(pathname: string): any {
    try {
      const state = localStorage.getItem(`${this.PAGE_STATE_KEY}_${pathname}`)
      return state ? JSON.parse(state) : null
    } catch (error) {
      console.warn('Failed to get page state:', error)
      return null
    }
  }

  /**
   * Clear saved page state
   */
  static clearPageState(pathname?: string): void {
    try {
      if (pathname) {
        localStorage.removeItem(`${this.PAGE_STATE_KEY}_${pathname}`)
      } else {
        // Clear all page states
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(this.PAGE_STATE_KEY)) {
            localStorage.removeItem(key)
          }
        })
      }
    } catch (error) {
      console.warn('Failed to clear page state:', error)
    }
  }

  /**
   * Check if we should redirect to the last saved page (for offline scenarios)
   */
  static shouldRedirectToLastPage(): boolean {
    const lastPage = this.getLastSavedPage()
    const currentPage = window.location.pathname
    
    // If we're on the home page and have a saved page, redirect
    if (currentPage === '/' && lastPage && lastPage !== '/') {
      return true
    }
    
    return false
  }

  /**
   * Navigate to the last saved page
   */
  static navigateToLastPage(): void {
    const lastPage = this.getLastSavedPage()
    if (lastPage && lastPage !== window.location.pathname) {
      window.history.pushState(null, '', lastPage)
      // Trigger a custom event to notify the app of the navigation
      window.dispatchEvent(new CustomEvent('pwa-navigation', { 
        detail: { pathname: lastPage } 
      }))
    }
  }

  /**
   * Setup automatic page state saving
   */
  static setupAutoSave(): () => void {
    const handleNavigation = () => {
      this.saveCurrentPage(window.location.pathname)
    }

    // Save on navigation
    window.addEventListener('popstate', handleNavigation)
    
    // Save on initial load
    handleNavigation()

    // Return cleanup function
    return () => {
      window.removeEventListener('popstate', handleNavigation)
    }
  }

  /**
   * Preload and cache important pages for offline use
   */
  static async preloadPages(): Promise<void> {
    if (!navigator.onLine) return // Skip if already offline

    const importantPages = ['/tasks', '/create', '/welcome']
    
    try {
      for (const page of importantPages) {
        // Preload each page by making a request
        await fetch(page, { 
          method: 'HEAD',
          cache: 'force-cache'
        })
      }
      console.log('Preloaded pages for offline use')
    } catch (error) {
      console.warn('Failed to preload pages:', error)
    }
  }
}

// Export convenience functions
export const saveCurrentPage = PageStateManager.saveCurrentPage.bind(PageStateManager)
export const getLastSavedPage = PageStateManager.getLastSavedPage.bind(PageStateManager)
export const getPageState = PageStateManager.getPageState.bind(PageStateManager)
export const setupAutoSave = PageStateManager.setupAutoSave.bind(PageStateManager)
export const preloadPages = PageStateManager.preloadPages.bind(PageStateManager)
