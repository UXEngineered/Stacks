"use client";

/**
 * usePresence - Hook for managing document edit presence
 * 
 * Features:
 * - Start edit session when opening a document
 * - Heartbeat every 30 seconds
 * - End session on unmount or explicit end
 * - Check if someone else is editing
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { EditSession, User } from "../lib/auth";

const HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds

interface UsePresenceOptions {
  fieldBookId: string;
  documentId: string;
  documentType: "source" | "synthesis" | "artifact";
  enabled?: boolean;
}

interface UsePresenceResult {
  isEditing: boolean;
  currentEditor: User | null;
  isBlocked: boolean;
  startEditing: () => Promise<boolean>;
  stopEditing: () => void;
  error: string | null;
}

export function usePresence({
  fieldBookId,
  documentId,
  documentType,
  enabled = true,
}: UsePresenceOptions): UsePresenceResult {
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditor, setCurrentEditor] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isEditingRef = useRef(false);

  // Check if blocked by another user
  const isBlocked = currentEditor !== null && !isEditing;

  // Start editing session
  const startEditing = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false;

    try {
      const res = await fetch(`/api/fieldbooks/${fieldBookId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, documentType }),
      });

      const data = await res.json();

      if (data.success) {
        setIsEditing(true);
        setCurrentEditor(null);
        isEditingRef.current = true;
        setError(null);
        return true;
      } else {
        if (data.currentEditor) {
          setCurrentEditor(data.currentEditor);
        }
        setError(data.error || "Could not start editing");
        return false;
      }
    } catch (err) {
      setError("Failed to start edit session");
      return false;
    }
  }, [fieldBookId, documentId, documentType, enabled]);

  // Heartbeat to maintain session
  const sendHeartbeat = useCallback(async () => {
    if (!isEditingRef.current) return;

    try {
      const res = await fetch(`/api/fieldbooks/${fieldBookId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, documentType, action: "heartbeat" }),
      });

      const data = await res.json();

      if (!data.success) {
        // Session lost, try to reclaim
        const reclaimed = await startEditing();
        if (!reclaimed) {
          setIsEditing(false);
          isEditingRef.current = false;
        }
      }
    } catch (err) {
      console.error("Heartbeat failed:", err);
    }
  }, [fieldBookId, documentId, documentType, startEditing]);

  // Stop editing session
  const stopEditing = useCallback(async () => {
    if (!isEditingRef.current) return;

    isEditingRef.current = false;
    setIsEditing(false);

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    try {
      await fetch(
        `/api/fieldbooks/${fieldBookId}/presence?documentId=${documentId}`,
        { method: "DELETE" }
      );
    } catch (err) {
      console.error("Failed to end edit session:", err);
    }
  }, [fieldBookId, documentId]);

  // Check current editor on mount
  useEffect(() => {
    if (!enabled) return;

    const checkCurrentEditor = async () => {
      try {
        const res = await fetch(
          `/api/fieldbooks/${fieldBookId}/presence?documentIds=${documentId}`
        );
        const data = await res.json();
        
        if (data.sessions?.length > 0) {
          const session = data.sessions[0];
          setCurrentEditor(session.user || null);
        } else {
          setCurrentEditor(null);
        }
      } catch (err) {
        console.error("Failed to check presence:", err);
      }
    };

    checkCurrentEditor();
  }, [fieldBookId, documentId, enabled]);

  // Start heartbeat when editing
  useEffect(() => {
    if (isEditing && enabled) {
      heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    }

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [isEditing, enabled, sendHeartbeat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isEditingRef.current) {
        // Fire and forget - we're unmounting
        fetch(
          `/api/fieldbooks/${fieldBookId}/presence?documentId=${documentId}`,
          { method: "DELETE" }
        ).catch(() => {});
      }
    };
  }, [fieldBookId, documentId]);

  return {
    isEditing,
    currentEditor,
    isBlocked,
    startEditing,
    stopEditing,
    error,
  };
}
