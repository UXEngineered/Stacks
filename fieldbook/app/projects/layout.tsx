"use client";

/**
 * Projects Layout
 * 
 * Provides a consistent navigation experience across all project pages.
 * The GlobalNav persists and animates between states.
 */

import { Suspense } from "react";
import { useTheme } from "../components/ThemeProvider";
import { NavProvider, useNavContext } from "../components/NavContext";
import { GlobalNav } from "../components/GlobalNav";

function ProjectsLayoutInner({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { navState } = useNavContext();
  
  return (
    <div 
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: isDark ? '#171717' : '#ffffff' }}
    >
      <Suspense>
        <GlobalNav
          projectId={navState.projectId}
          projectName={navState.projectName}
          onProjectNameChange={navState.onProjectNameChange}
          onDeleteProject={navState.onDeleteProject}
          isDeleteConfirm={navState.isDeleteConfirm}
          readOnly={navState.readOnly}
          movement={navState.movement}
          onMovementNavigate={navState.onMovementNavigate}
        />
      </Suspense>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NavProvider>
      <ProjectsLayoutInner>{children}</ProjectsLayoutInner>
    </NavProvider>
  );
}
