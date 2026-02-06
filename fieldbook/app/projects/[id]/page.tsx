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
 */

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { SpineLayout } from "../../components/spine";

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  
  // Check for readonly mode via query param
  const isReadOnly = searchParams.get("readonly") === "true";

  return (
    <SpineLayout projectId={id} readOnly={isReadOnly} />
  );
}
