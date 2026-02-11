"use client";

/**
 * NavContext - Shares navigation state between layout and pages
 * 
 * Allows child pages to update the global nav with their context
 * (e.g., project name, actions) without remounting the nav.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

import type { MovementEvent } from "@/app/lib/movement/types";

/** @deprecated Use MovementEvent from @/app/lib/movement/types instead */
export interface ActivityEvent {
  id: string;
  type: "source_added" | "synthesis_committed" | "artifact_created";
  title: string;
  timestamp: string;
}

/** @deprecated Use movement.events from NavState instead */
export interface ActivityData {
  recentEvents: ActivityEvent[];
}

/** Movement data for the right-side Movement drawer */
export interface MovementData {
  events: MovementEvent[];
}

interface NavState {
  projectId?: string;
  projectName?: string;
  onProjectNameChange?: (name: string) => void;
  onDeleteProject?: () => void;
  isDeleteConfirm?: boolean;
  /** When true, viewing in read-only mode (no edit controls) */
  readOnly?: boolean;
  /** @deprecated Use movement instead */
  activity?: ActivityData;
  /** Movement events for the right-side drawer (significant shifts only) */
  movement?: MovementData;
  /** Callback when user navigates from Movement drawer to a node */
  onMovementNavigate?: (nodeId: string) => void;
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
