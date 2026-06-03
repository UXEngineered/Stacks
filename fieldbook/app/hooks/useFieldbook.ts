/**
 * React hook for fieldbook data management
 * 
 * Provides fetching, creating, updating, and deleting of fieldbook data
 * with automatic state management.
 * 
 * Includes reverberation support:
 * - propagateFromSource: Trigger propagation when a source changes
 * - markCalibrated/markIdle: Update recalc status after animation
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { Fieldbook, Source, Synthesis, Artifact, Capture, CalibrationDecision, CreateCapture } from "../lib/db/types";

const API_BASE = "/api/db/fieldbooks";

interface PropagationResult {
  updatedSourceIds: string[];
  updatedSynthesisIds: string[];
  updatedArtifactIds: string[];
}

interface RecordDecisionParams {
  itemId: string;
  itemTitle: string;
  itemType: "synthesis" | "artifact";
  sourceId: string;
  sourceTitle: string;
  suggestion: string;
  decision: "ignored" | "changed";
  targetSection?: string;
}

interface UseFieldbookReturn {
  fieldbook: Fieldbook | null;
  isLoading: boolean;
  error: string | null;
  // Source operations
  createSource: (data: Partial<Source>) => Promise<Source | null>;
  updateSource: (sourceId: string, data: Partial<Source>) => Promise<Source | null>;
  deleteSource: (sourceId: string) => Promise<boolean>;
  // Synthesis operations
  createSynthesis: (data: Partial<Synthesis>) => Promise<Synthesis | null>;
  updateSynthesis: (synthesisId: string, data: Partial<Synthesis>) => Promise<Synthesis | null>;
  deleteSynthesis: (synthesisId: string) => Promise<boolean>;
  // Artifact operations
  createArtifact: (data: Partial<Artifact>) => Promise<Artifact | null>;
  updateArtifact: (artifactId: string, data: Partial<Artifact>) => Promise<Artifact | null>;
  deleteArtifact: (artifactId: string) => Promise<boolean>;
  // Capture operations (Phase 0 minimal artifacts)
  createCapture: (data: CreateCapture) => Promise<Capture | null>;
  updateCapture: (captureId: string, data: Partial<Capture>) => Promise<Capture | null>;
  deleteCapture: (captureId: string) => Promise<boolean>;
  // Fieldbook operations
  updateFieldbook: (data: Partial<Fieldbook>) => Promise<Fieldbook | null>;
  // Reverberation operations
  propagateFromSource: (sourceId: string) => Promise<PropagationResult | null>;
  markCalibrated: () => Promise<void>;
  markIdle: () => Promise<void>;
  updateFact: (factKey: string, factValue: string) => Promise<PropagationResult | null>;
  clearDiff: (itemId: string) => Promise<void>;
  // Calibration history
  calibrationHistory: CalibrationDecision[];
  recordCalibrationDecision: (params: RecordDecisionParams) => Promise<void>;
  // Refresh
  refresh: () => Promise<void>;
}

export function useFieldbook(fieldbookId: string): UseFieldbookReturn {
  const [fieldbook, setFieldbook] = useState<Fieldbook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track propagation timers for cleanup
  const propagationTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Write lock: suppress silent polls while any write or propagation is in flight
  const writeLockRef = useRef(0);

  // Fetch fieldbook data (silent = true skips loading state for background re-polls)
  const fetchFieldbook = useCallback(async (silent = false) => {
    if (!fieldbookId) return;

    if (silent && writeLockRef.current > 0) return;
    
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}`);
      if (!res.ok) {
        if (res.status === 404) {
          // Fieldbook doesn't exist yet, create it
          const createRes = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Untitled" }),
          });
          if (createRes.ok) {
            const newFieldbook = await createRes.json();
            setFieldbook(newFieldbook);
          } else {
            throw new Error("Failed to create fieldbook");
          }
        } else {
          throw new Error("Failed to fetch fieldbook");
        }
      } else {
        const data = await res.json();
        setFieldbook(data);
      }
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [fieldbookId]);

  useEffect(() => {
    fetchFieldbook(); // Initial load shows loading state
    const interval = setInterval(() => fetchFieldbook(true), 3000); // Silent re-polls
    return () => clearInterval(interval);
  }, [fetchFieldbook]);

  // ============================================
  // REVERBERATION / PROPAGATION FUNCTIONS
  // (Defined first so they can be used by source operations)
  // ============================================

  // Internal mark calibrated
  const markCalibratedInternal = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/propagate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "calibrated" }),
      });
      
      if (res.ok) {
        const result = await res.json();
        if (result.fieldbook) {
          setFieldbook(result.fieldbook);
        }
      }
    } catch {
      // Ignore errors for status updates
    }
  }, [fieldbookId]);

  // Internal mark idle
  const markIdleInternal = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/propagate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "idle" }),
      });
      
      if (res.ok) {
        const result = await res.json();
        if (result.fieldbook) {
          setFieldbook(result.fieldbook);
        }
      }
    } catch {
      // Ignore errors for status updates
    }
  }, [fieldbookId]);

  // Internal propagation function (called automatically after source update)
  const propagateFromSourceInternal = useCallback(async (sourceId: string, prevSourceContent?: string) => {
    console.log("[Reverberation] Triggering propagation for source:", sourceId);
    writeLockRef.current++;
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/propagate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, prevSourceContent }),
      });
      
      if (!res.ok) {
        console.error("[Reverberation] Propagation failed:", res.status);
        return null;
      }
      
      const result = await res.json();
      console.log("[Reverberation] Propagation result:", result);
      
      // Update local state with the propagated fieldbook
      if (result.fieldbook) {
        setFieldbook(result.fieldbook);
      }
      
      // Keep the write lock held through the calibration timer so polls
      // don't overwrite recalcStatus before the PATCH completes.
      const calibrateTimer = setTimeout(async () => {
        try {
          console.log("[Reverberation] Marking items as calibrated");
          await markCalibratedInternal();
        } finally {
          writeLockRef.current--;
        }
      }, 1200);
      propagationTimersRef.current.push(calibrateTimer);
      
      return {
        updatedSourceIds: result.updatedSourceIds || [],
        updatedSynthesisIds: result.updatedSynthesisIds || [],
        updatedArtifactIds: result.updatedArtifactIds || [],
      };
    } catch (err) {
      console.error("[Reverberation] Propagation error:", err);
      return null;
    }
  }, [fieldbookId, markCalibratedInternal, markIdleInternal]);

  // Public propagation function (can be called manually)
  const propagateFromSource = useCallback(async (sourceId: string): Promise<PropagationResult | null> => {
    return propagateFromSourceInternal(sourceId);
  }, [propagateFromSourceInternal]);

  // Public mark calibrated
  const markCalibrated = useCallback(async () => {
    await markCalibratedInternal();
  }, [markCalibratedInternal]);

  // Public mark idle
  const markIdle = useCallback(async () => {
    await markIdleInternal();
  }, [markIdleInternal]);

  // Update a fact and propagate changes
  const updateFact = useCallback(async (factKey: string, factValue: string): Promise<PropagationResult | null> => {
    writeLockRef.current++;
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/propagate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newFacts: { [factKey]: factValue } }),
      });
      
      if (!res.ok) return null;
      
      const result = await res.json();
      
      if (result.fieldbook) {
        setFieldbook(result.fieldbook);
      }
      
      // Keep write lock through calibration timer
      const calibrateTimer = setTimeout(async () => {
        try {
          await markCalibratedInternal();
        } finally {
          writeLockRef.current--;
        }
      }, 1200);
      propagationTimersRef.current.push(calibrateTimer);
      
      return {
        updatedSourceIds: result.updatedSourceIds || [],
        updatedSynthesisIds: result.updatedSynthesisIds || [],
        updatedArtifactIds: result.updatedArtifactIds || [],
      };
    } catch {
      return null;
    }
  }, [fieldbookId, markCalibratedInternal, markIdleInternal]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      propagationTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  // Update fieldbook
  const updateFieldbook = useCallback(async (data: Partial<Fieldbook>) => {
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) return null;
      
      const updated = await res.json();
      setFieldbook((prev) => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch {
      return null;
    }
  }, [fieldbookId]);

  // Source operations
  const createSource = useCallback(async (data: Partial<Source>) => {
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) return null;
      
      const source = await res.json();
      setFieldbook((prev) => prev ? {
        ...prev,
        sources: [...prev.sources, source],
      } : prev);
      return source;
    } catch {
      return null;
    }
  }, [fieldbookId]);

  const updateSource = useCallback(async (sourceId: string, data: Partial<Source>) => {
    writeLockRef.current++;
    try {
      // Capture previous content BEFORE the PATCH so propagation can diff
      const prevSource = fieldbook?.sources.find(s => s.id === sourceId);
      const prevSourceContent = prevSource?.content;

      const res = await fetch(`${API_BASE}/${fieldbookId}/sources/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) return null;
      
      const updated = await res.json();
      
      // Update source AND immediately set downstream items to "recalibrating"
      setFieldbook((prev) => {
        if (!prev) return prev;
        
        const affectedSynthesisIds = new Set(
          prev.syntheses
            .filter(s => s.derivedFrom?.includes(sourceId))
            .map(s => s.id)
        );
        
        const affectedArtifactIds = new Set(
          prev.artifacts
            .filter(a => 
              a.informedBy?.includes(sourceId) || 
              a.informedBy?.some(id => affectedSynthesisIds.has(id))
            )
            .map(a => a.id)
        );
        
        return {
          ...prev,
          sources: prev.sources.map((s) => s.id === sourceId ? updated : s),
          syntheses: prev.syntheses.map((s) => 
            affectedSynthesisIds.has(s.id) 
              ? { ...s, recalcStatus: "recalibrating" as const }
              : s
          ),
          artifacts: prev.artifacts.map((a) => 
            affectedArtifactIds.has(a.id)
              ? { ...a, recalcStatus: "recalibrating" as const }
              : a
          ),
        };
      });
      
      // Await propagation so disk is written before polls can read stale data.
      // propagateFromSourceInternal holds its own write lock through calibration.
      console.log("[useFieldbook] Source updated, triggering propagation...");
      await propagateFromSourceInternal(sourceId, prevSourceContent);
      
      return updated;
    } catch {
      return null;
    } finally {
      writeLockRef.current--;
    }
  }, [fieldbookId, fieldbook?.sources, propagateFromSourceInternal]);

  const deleteSource = useCallback(async (sourceId: string) => {
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/sources/${sourceId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) return false;
      
      setFieldbook((prev) => prev ? {
        ...prev,
        sources: prev.sources.filter((s) => s.id !== sourceId),
      } : prev);
      return true;
    } catch {
      return false;
    }
  }, [fieldbookId]);

  // Synthesis operations
  const createSynthesis = useCallback(async (data: Partial<Synthesis>) => {
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/syntheses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) return null;
      
      const synthesis = await res.json();
      setFieldbook((prev) => prev ? {
        ...prev,
        syntheses: [...prev.syntheses, synthesis],
      } : prev);
      return synthesis;
    } catch {
      return null;
    }
  }, [fieldbookId]);

  const updateSynthesis = useCallback(async (synthesisId: string, data: Partial<Synthesis>) => {
    writeLockRef.current++;
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/syntheses/${synthesisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) return null;
      
      const updated = await res.json();
      setFieldbook((prev) => prev ? {
        ...prev,
        syntheses: prev.syntheses.map((s) => s.id === synthesisId ? updated : s),
      } : prev);
      return updated;
    } catch {
      return null;
    } finally {
      writeLockRef.current--;
    }
  }, [fieldbookId]);

  const deleteSynthesis = useCallback(async (synthesisId: string) => {
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/syntheses/${synthesisId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) return false;
      
      setFieldbook((prev) => prev ? {
        ...prev,
        syntheses: prev.syntheses.filter((s) => s.id !== synthesisId),
      } : prev);
      return true;
    } catch {
      return false;
    }
  }, [fieldbookId]);

  // Artifact operations
  const createArtifact = useCallback(async (data: Partial<Artifact>) => {
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) return null;
      
      const artifact = await res.json();
      setFieldbook((prev) => prev ? {
        ...prev,
        artifacts: [...prev.artifacts, artifact],
      } : prev);
      return artifact;
    } catch {
      return null;
    }
  }, [fieldbookId]);

  const updateArtifact = useCallback(async (artifactId: string, data: Partial<Artifact>) => {
    writeLockRef.current++;
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/artifacts/${artifactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) return null;
      
      const updated = await res.json();
      setFieldbook((prev) => prev ? {
        ...prev,
        artifacts: prev.artifacts.map((a) => a.id === artifactId ? updated : a),
      } : prev);
      return updated;
    } catch {
      return null;
    } finally {
      writeLockRef.current--;
    }
  }, [fieldbookId]);

  const deleteArtifact = useCallback(async (artifactId: string) => {
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/artifacts/${artifactId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) return false;
      
      setFieldbook((prev) => prev ? {
        ...prev,
        artifacts: prev.artifacts.filter((a) => a.id !== artifactId),
      } : prev);
      return true;
    } catch {
      return false;
    }
  }, [fieldbookId]);

  // Capture operations (Phase 0 minimal artifacts)
  const createCapture = useCallback(async (data: CreateCapture) => {
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/captures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) return null;
      
      const capture = await res.json();
      setFieldbook((prev) => prev ? {
        ...prev,
        captures: [...(prev.captures || []), capture],
      } : prev);
      return capture;
    } catch {
      return null;
    }
  }, [fieldbookId]);

  const updateCapture = useCallback(async (captureId: string, data: Partial<Capture>) => {
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/captures/${captureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) return null;
      
      const updated = await res.json();
      setFieldbook((prev) => prev ? {
        ...prev,
        captures: (prev.captures || []).map((c) => c.id === captureId ? updated : c),
      } : prev);
      return updated;
    } catch {
      return null;
    }
  }, [fieldbookId]);

  const deleteCapture = useCallback(async (captureId: string) => {
    try {
      const res = await fetch(`${API_BASE}/${fieldbookId}/captures/${captureId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) return false;
      
      setFieldbook((prev) => prev ? {
        ...prev,
        captures: (prev.captures || []).filter((c) => c.id !== captureId),
      } : prev);
      return true;
    } catch {
      return false;
    }
  }, [fieldbookId]);

  // Clear the lastDiff from a synthesis or artifact (when user accepts/ignores the change)
  // Also resets recalcStatus to idle since the user has made their decision.
  const clearDiff = useCallback(async (itemId: string) => {
    const synthesis = fieldbook?.syntheses.find(s => s.id === itemId);
    const artifact = fieldbook?.artifacts.find(a => a.id === itemId);
    
    writeLockRef.current++;
    try {
      if (synthesis) {
        const res = await fetch(`${API_BASE}/${fieldbookId}/syntheses/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastDiff: null, recalcStatus: "idle" }),
        });
        
        if (res.ok) {
          setFieldbook((prev) => prev ? {
            ...prev,
            syntheses: prev.syntheses.map((s) => 
              s.id === itemId ? { ...s, lastDiff: null, recalcStatus: "idle" } : s
            ),
          } : prev);
        }
      } else if (artifact) {
        const res = await fetch(`${API_BASE}/${fieldbookId}/artifacts/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastDiff: null, recalcStatus: "idle" }),
        });
        
        if (res.ok) {
          setFieldbook((prev) => prev ? {
            ...prev,
            artifacts: prev.artifacts.map((a) => 
              a.id === itemId ? { ...a, lastDiff: null, recalcStatus: "idle" } : a
            ),
          } : prev);
        }
      }
    } finally {
      writeLockRef.current--;
    }
  }, [fieldbookId, fieldbook?.syntheses, fieldbook?.artifacts]);

  // Record a calibration decision (ignore or change)
  const recordCalibrationDecision = useCallback(async (params: RecordDecisionParams) => {
    const decision: CalibrationDecision = {
      id: `cal-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...params,
    };
    
    // Update local state immediately
    setFieldbook((prev) => {
      if (!prev) return prev;
      const existing = prev.calibrationHistory || [];
      return {
        ...prev,
        calibrationHistory: [...existing, decision],
      };
    });
    
    // Persist to database
    try {
      await fetch(`${API_BASE}/${fieldbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calibrationHistory: [...(fieldbook?.calibrationHistory || []), decision],
        }),
      });
    } catch (err) {
      console.error("Failed to save calibration decision:", err);
    }
  }, [fieldbookId, fieldbook?.calibrationHistory]);

  // Get calibration history
  const calibrationHistory = fieldbook?.calibrationHistory || [];

  return {
    fieldbook,
    isLoading,
    error,
    createSource,
    updateSource,
    deleteSource,
    createSynthesis,
    updateSynthesis,
    deleteSynthesis,
    createArtifact,
    updateArtifact,
    deleteArtifact,
    // Captures (Phase 0)
    createCapture,
    updateCapture,
    deleteCapture,
    updateFieldbook,
    // Reverberation
    propagateFromSource,
    markCalibrated,
    markIdle,
    updateFact,
    clearDiff,
    // Calibration history
    calibrationHistory,
    recordCalibrationDecision,
    refresh: fetchFieldbook,
  };
}

// Hook for listing all fieldbooks
export function useFieldbooks() {
  const [fieldbooks, setFieldbooks] = useState<Fieldbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFieldbooks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error("Failed to fetch fieldbooks");
      const data = await res.json();
      setFieldbooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFieldbooks();
  }, [fetchFieldbooks]);

  const createFieldbook = useCallback(async (name: string, description?: string) => {
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      
      if (!res.ok) return null;
      
      const fieldbook = await res.json();
      setFieldbooks((prev) => [...prev, fieldbook]);
      return fieldbook;
    } catch {
      return null;
    }
  }, []);

  const updateFieldbook = useCallback(async (id: string, data: Partial<Fieldbook>) => {
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) return null;
      
      const updated = await res.json();
      setFieldbooks((prev) => prev.map((fb) => fb.id === id ? updated : fb));
      return updated;
    } catch {
      return null;
    }
  }, []);

  const deleteFieldbook = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) return false;
      
      setFieldbooks((prev) => prev.filter((fb) => fb.id !== id));
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    fieldbooks,
    isLoading,
    error,
    createFieldbook,
    updateFieldbook,
    deleteFieldbook,
    refresh: fetchFieldbooks,
  };
}
