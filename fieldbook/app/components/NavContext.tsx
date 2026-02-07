"use client";

/**
 * NavContext - Shares navigation state between layout and pages
 * 
 * Allows child pages to update the global nav with their context
 * (e.g., project name, actions) without remounting the nav.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface NavState {
  projectId?: string;
  projectName?: string;
  onProjectNameChange?: (name: string) => void;
  onDeleteProject?: () => void;
  isDeleteConfirm?: boolean;
  /** When true, viewing in read-only mode (no edit controls) */
  readOnly?: boolean;
}

interface NavContextType {
  navState: NavState;
  setNavState: (state: NavState) => void;
  clearNavState: () => void;
  /** Signal that navigation is in progress (for coordinated transitions) */
  isNavigating: boolean;
  setIsNavigating: (value: boolean) => void;
}

const NavContext = createContext<NavContextType | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [navState, setNavStateInternal] = useState<NavState>({});
  const [isNavigating, setIsNavigating] = useState(false);
  
  const setNavState = useCallback((state: NavState) => {
    setNavStateInternal(state);
  }, []);
  
  const clearNavState = useCallback(() => {
    setNavStateInternal({});
  }, []);
  
  return (
    <NavContext.Provider value={{ navState, setNavState, clearNavState, isNavigating, setIsNavigating }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNavContext() {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error("useNavContext must be used within a NavProvider");
  }
  return context;
}
