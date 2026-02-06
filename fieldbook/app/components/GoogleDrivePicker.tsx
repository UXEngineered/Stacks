"use client";

/**
 * GoogleDrivePicker - Import documents from Google Drive
 * 
 * Uses Google Picker API for client-side file selection.
 * No backend OAuth needed - picker handles auth.
 */

import { useEffect, useCallback, useState } from "react";
import { useTheme } from "./ThemeProvider";

// Types for Google Picker API
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: { apiKey: string; discoveryDocs: string[] }) => Promise<void>;
        docs: {
          documents: {
            get: (params: { documentId: string }) => Promise<{ result: { body: { content: unknown[] } } }>;
          };
        };
      };
    };
    google: {
      picker: {
        PickerBuilder: new () => GooglePickerBuilder;
        ViewId: { DOCS: string; DOCUMENTS: string };
        Action: { PICKED: string; CANCEL: string };
        Feature: { NAV_HIDDEN: boolean; MULTISELECT_ENABLED: boolean };
      };
    };
  }
}

interface GooglePickerBuilder {
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setCallback: (callback: (data: GooglePickerResponse) => void) => GooglePickerBuilder;
  addView: (view: unknown) => GooglePickerBuilder;
  enableFeature: (feature: unknown) => GooglePickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
}

interface GooglePickerResponse {
  action: string;
  docs?: Array<{
    id: string;
    name: string;
    mimeType: string;
    url: string;
  }>;
}

interface GoogleDrivePickerProps {
  onSelect: (title: string, content: string) => void;
  onCancel?: () => void;
}

// Check if Google API credentials are configured
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleDrivePicker({ onSelect, onCancel }: GoogleDrivePickerProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);

  // Check if configured
  const isConfigured = GOOGLE_API_KEY && GOOGLE_CLIENT_ID;

  // Load Google API scripts
  useEffect(() => {
    if (!isConfigured) return;

    const loadGoogleApi = () => {
      // Load Google API client
      if (!document.getElementById("google-api-script")) {
        const gapiScript = document.createElement("script");
        gapiScript.id = "google-api-script";
        gapiScript.src = "https://apis.google.com/js/api.js";
        gapiScript.async = true;
        gapiScript.defer = true;
        gapiScript.onload = () => {
          window.gapi.load("picker", () => {
            setIsApiLoaded(true);
          });
        };
        document.body.appendChild(gapiScript);
      } else if (window.gapi) {
        window.gapi.load("picker", () => {
          setIsApiLoaded(true);
        });
      }

      // Load Google Identity Services
      if (!document.getElementById("google-gsi-script")) {
        const gsiScript = document.createElement("script");
        gsiScript.id = "google-gsi-script";
        gsiScript.src = "https://accounts.google.com/gsi/client";
        gsiScript.async = true;
        gsiScript.defer = true;
        document.body.appendChild(gsiScript);
      }
    };

    loadGoogleApi();
  }, [isConfigured]);

  const handlePickerCallback = useCallback(async (data: GooglePickerResponse) => {
    if (data.action === "cancel") {
      onCancel?.();
      return;
    }

    if (data.action === "picked" && data.docs && data.docs.length > 0) {
      const doc = data.docs[0];
      setIsLoading(true);
      setError(null);

      try {
        // Fetch document content via our API route
        const response = await fetch("/api/integrations/google-drive/document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: doc.id }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch document");
        }

        const { title, content } = await response.json();
        onSelect(title || doc.name, content);
      } catch (err) {
        setError("Failed to import document. Try copying and pasting instead.");
        console.error("Google Drive import error:", err);
      } finally {
        setIsLoading(false);
      }
    }
  }, [onSelect, onCancel]);

  const openPicker = useCallback(() => {
    if (!isApiLoaded || !GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) return;

    setError(null);

    // Use Google Identity Services for token
    const tokenClient = (window as { google?: { accounts?: { oauth2?: { initTokenClient: (config: {
      client_id: string;
      scope: string;
      callback: (response: { access_token?: string; error?: string }) => void;
    }) => { requestAccessToken: () => void } } } } }).google?.accounts?.oauth2?.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      callback: (response) => {
        if (response.error || !response.access_token) {
          setError("Failed to authenticate with Google");
          return;
        }

        const picker = new window.google.picker.PickerBuilder()
          .setOAuthToken(response.access_token)
          .setDeveloperKey(GOOGLE_API_KEY)
          .addView(window.google.picker.ViewId.DOCUMENTS)
          .setCallback(handlePickerCallback)
          .build();

        picker.setVisible(true);
      },
    });

    tokenClient?.requestAccessToken();
  }, [isApiLoaded, handlePickerCallback]);

  // Not configured - show setup instructions
  if (!isConfigured) {
    return (
      <div 
        className="p-4 text-center"
        style={{ 
          backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
          border: `1px solid ${isDark ? "#333" : "#e5e5e5"}`,
        }}
      >
        <p 
          className="text-xs mb-2"
          style={{ color: isDark ? "#737373" : "#737373" }}
        >
          Google Drive import requires configuration.
        </p>
        <p 
          className="text-[10px]"
          style={{ color: isDark ? "#525252" : "#a3a3a3" }}
        >
          Add NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={openPicker}
        disabled={!isApiLoaded || isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm transition-colors"
        style={{
          backgroundColor: isDark ? "#262626" : "#f5f5f5",
          color: isDark ? "#d4d4d4" : "#404040",
          border: `1px solid ${isDark ? "#404040" : "#e5e5e5"}`,
          opacity: !isApiLoaded || isLoading ? 0.5 : 1,
          cursor: !isApiLoaded || isLoading ? "wait" : "pointer",
        }}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Importing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.01-.02-1.708-3.001-3.774-6.62l-3.76-6.574h-3.76zm-5.26 6.574c-2.082 0-3.754.02-3.743.047.01.027 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.01-.027-1.708-3.001-3.774-6.62l-3.76-6.574h-3.76zm-5.26 6.574L1.473 14.68c-.01.027 1.689 3.007 3.755 6.627l3.768 6.58h3.76l.003-.047c.003-.02-1.685-3-3.758-6.62l-3.76-6.574h-.742z" />
            </svg>
            Import from Google Drive
          </>
        )}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}
