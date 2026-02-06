/**
 * Mock data for Fieldbook prototype
 * 
 * Assumptions:
 * - Folders contain projects (but we're not implementing nesting for now)
 * - Projects have a name, artifact count, and placeholder preview images
 * - IDs are simple strings for easy URL routing
 */

export interface Folder {
  id: string;
  name: string;
  projectCount: number;
}

export interface Project {
  id: string;
  name: string;
  sourceCount: number;
  synthesisCount: number;
  artifactCount: number;
  // Placeholder colors to simulate preview thumbnails
  previewColors: string[];
}

export const folders: Folder[] = [
  { id: "folder-1", name: "Client Work", projectCount: 12 },
  { id: "folder-2", name: "Internal", projectCount: 8 },
  { id: "folder-3", name: "Archive", projectCount: 24 },
];

export const projects: Project[] = [
  {
    id: "proj-1",
    name: "FSR Discovery",
    sourceCount: 6,
    synthesisCount: 3,
    artifactCount: 2,
    previewColors: ["#E5E7EB", "#D1D5DB", "#9CA3AF"],
  },
];

/**
 * Helper to get a project by ID
 */
export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}
