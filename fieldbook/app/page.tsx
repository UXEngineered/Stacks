import { redirect } from "next/navigation";

/**
 * Root page redirects to /projects
 * 
 * Assumption: The main entry point for Field Library is the field books list.
 * This redirect ensures users always start at the field books view.
 */
export default function Home() {
  redirect("/projects");
}