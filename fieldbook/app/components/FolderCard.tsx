/**
 * Folder card component for the projects list
 * 
 * Simple card showing folder name and project count
 * Non-clickable for this prototype (folders don't navigate anywhere)
 */

import { FolderIcon } from "./icons";
import type { Folder } from "../data/mockData";

interface FolderCardProps {
  folder: Folder;
}

export function FolderCard({ folder }: FolderCardProps) {
  return (
    <div className="group p-4 border border-neutral-200 rounded-lg hover:border-neutral-300 hover:shadow-sm transition-all cursor-pointer bg-white">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-neutral-100 rounded-md text-neutral-500 group-hover:bg-neutral-200 transition-colors">
          <FolderIcon className="w-5 h-5" />
        </div>
        <div>
          <div className="font-medium text-neutral-900">{folder.name}</div>
          <div className="text-sm text-neutral-500">
            {folder.projectCount} projects
          </div>
        </div>
      </div>
    </div>
  );
}
