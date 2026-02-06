"use client";

/**
 * Project card component for the projects list
 * 
 * Editorial, restrained design:
 * - No rounded corners
 * - No playful colors
 * - Dense, typographic hierarchy
 */

import Link from "next/link";
import type { Project } from "../data/mockData";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block p-4 border border-neutral-200 hover:border-neutral-400 transition-colors bg-white"
    >
      {/* Project info */}
      <div className="font-medium text-neutral-900 group-hover:text-neutral-700 transition-colors">
        {project.name}
      </div>
      <div className="text-xs text-neutral-500 mt-1">
        {project.artifactCount} artifacts
      </div>
      
      {/* Subtle indicator bar */}
      <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center gap-2">
        <div className="flex -space-x-1">
          {project.previewColors.slice(0, 3).map((_, index) => (
            <div
              key={index}
              className="w-2 h-2 bg-neutral-300 border border-white"
            />
          ))}
        </div>
        <span className="text-[10px] text-neutral-400 uppercase tracking-wide">
          {project.previewColors.length} items
        </span>
      </div>
    </Link>
  );
}
