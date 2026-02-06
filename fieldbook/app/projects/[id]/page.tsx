"use client";

/**
 * Project Page (/projects/[id])
 * 
 * Displays the Spine Layout - a linear, intent-driven interface
 * for managing sources, syntheses, decisions, and artifacts.
 * 
 * Uses JSON-based persistence for demo-grade data survival.
 */

import { use } from "react";
import { SpineLayout } from "../../components/spine";

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);

  return (
    <SpineLayout projectId={id} />
  );
}
