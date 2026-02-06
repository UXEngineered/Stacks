"use client";

/**
 * Project Page (/projects/[id])
 * 
 * Displays the Spine Layout - a linear, intent-driven interface
 * for managing sources, syntheses, decisions, and artifacts.
 * 
 * Uses JSON-based persistence for demo-grade data survival.
 * 
 * Read-only mode: Add ?readonly=true to view without editing controls.
 * Useful for sharing internally without granting edit access.
 * 
 * Content visibility: Add ?show=sources,syntheses,artifacts to control
 * which content types are visible in read-only mode.
 */

import { use, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SpineLayout } from "../../components/spine";

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

export type ContentVisibility = {
  sources: boolean;
  syntheses: boolean;
  artifacts: boolean;
};

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  
  // Check for readonly mode via query param
  const isReadOnly = searchParams.get("readonly") === "true";
  
  // Parse visibility settings for read-only mode
  // If no "show" param, default to showing all
  const visibility = useMemo<ContentVisibility>(() => {
    const showParam = searchParams.get("show");
    
    // Default: show everything
    if (!showParam) {
      return { sources: true, syntheses: true, artifacts: true };
    }
    
    // Parse comma-separated list
    const showList = showParam.split(",").map(s => s.trim().toLowerCase());
    return {
      sources: showList.includes("sources"),
      syntheses: showList.includes("syntheses"),
      artifacts: showList.includes("artifacts"),
    };
  }, [searchParams]);

  return (
    <SpineLayout 
      projectId={id} 
      readOnly={isReadOnly} 
      visibility={isReadOnly ? visibility : undefined}
    />
  );
}
