/**
 * Simple avatar component
 * Shows initials on a neutral background
 * 
 * Assumption: For the prototype, we use a static placeholder.
 * In production, this would accept a user prop with name/image.
 */

interface AvatarProps {
  initials?: string;
  size?: "sm" | "md";
}

export function Avatar({ initials = "JW", size = "md" }: AvatarProps) {
  const sizeClasses = size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm";

  return (
    <div
      className={`${sizeClasses} rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-medium`}
    >
      {initials}
    </div>
  );
}
