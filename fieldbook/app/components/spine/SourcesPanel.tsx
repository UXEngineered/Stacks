"use client";

/**
 * SourcesPanel - Left column navigation
 * 
 * Displays all items organized by type in a hierarchical list.
 * Dense, scannable, with clear type distinctions.
 * 
 * Includes basic search to re-find items by title/content.
 */

import { useState, useMemo, useCallback } from "react";
import type { SpineItem, SourceItem, SynthesisItem, DecisionItem, ArtifactItem } from "./types";
import { useTheme } from "../ThemeProvider";
import { statusColor } from "../SemanticPills";
import { labelFor } from "../../lib/catalog";
// RecalibrationIndicator removed — recalibration state now shown as dot on icon

// =============================================================================
// Theme Toggle Component (bottom of sidebar)
// =============================================================================

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-7 h-7 inline-flex items-center justify-center rounded-md cursor-pointer"
      style={{ 
        color: isDark ? '#a3a3a3' : '#525252',
        backgroundColor: 'transparent',
        border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
        transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      )}
    </button>
  );
}

// =============================================================================
// Node Type Icons - Triangle (source), Diamond (synthesis), Diamond+Triangle (artifact)
// =============================================================================

interface NodeTypeIconProps {
  type: "source" | "synthesis" | "artifact";
  className?: string;
  color?: string;
  /** When type is "source", set to true for link/external sources */
  isLink?: boolean;
}

export function NodeTypeIcon({ type, className = "w-3 h-3", color = "#737373", isLink }: NodeTypeIconProps) {
  const svgTransition: React.CSSProperties = { transition: "stroke 150ms ease, fill 150ms ease" };

  if (type === "source") {
    // Triangle pointing up, with optional link chain overlay
    return (
      <svg className={className} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1" style={svgTransition}>
        <path d="M6 2 L10.5 9.5 L1.5 9.5 Z" strokeLinejoin="round" />
        {isLink && (
          <g stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" style={svgTransition}>
            <path d="M5 6.8 L4.2 7.6a1.1 1.1 0 0 0 1.55 1.55L6.6 8.3" />
            <path d="M7 7.2 L7.8 6.4a1.1 1.1 0 0 0-1.55-1.55L5.4 5.7" />
          </g>
        )}
      </svg>
    );
  }
  if (type === "synthesis") {
    // Diamond (rotated square)
    return (
      <svg className={className} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1" style={svgTransition}>
        <path d="M6 1.5 L10.5 6 L6 10.5 L1.5 6 Z" strokeLinejoin="round" />
      </svg>
    );
  }
  // Artifact - Diamond outline with top half filled
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1" style={svgTransition}>
      {/* Diamond outline */}
      <path d="M6 1.5 L10.5 6 L6 10.5 L1.5 6 Z" strokeLinejoin="round" />
      {/* Filled top half: triangle from top vertex to left-mid and right-mid */}
      <path d="M6 1.5 L10.5 6 L1.5 6 Z" fill={color} stroke="none" style={svgTransition} />
    </svg>
  );
}

export type ContentVisibility = {
  sources: boolean;
  syntheses: boolean;
  artifacts: boolean;
};

interface SourcesPanelProps {
  sources: SourceItem[];
  syntheses: SynthesisItem[];
  decisions: DecisionItem[];
  artifacts: ArtifactItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddSource: () => void;
  onAddLink: () => void;
  onAddSynthesis: () => void;
  onAddDecision: () => void;
  onAddArtifact: () => void;
  /** When true, hides all add/edit controls */
  readOnly?: boolean;
  /** Controls which content types are visible (only used in readOnly mode) */
  visibility?: ContentVisibility;
}

export function SourcesPanel({
  sources,
  syntheses,
  decisions,
  artifacts,
  selectedId,
  onSelect,
  onAddSource,
  onAddLink,
  onAddSynthesis,
  onAddDecision,
  onAddArtifact,
  readOnly = false,
  visibility,
}: SourcesPanelProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const borderColor = isDark ? "#404040" : "#e5e5e5";
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Search helper: extract text from JSON content
  const extractTextFromContent = useCallback((content: string): string => {
    if (!content) return "";
    try {
      const parsed = JSON.parse(content);
      if (parsed.type === "doc" && Array.isArray(parsed.content)) {
        return parsed.content
          .map((block: { content?: Array<{ text?: string }> }) => 
            block.content?.map((node) => node.text || "").join(" ") || ""
          )
          .join(" ");
      }
    } catch {
      // Not JSON, use raw content
      return content;
    }
    return content;
  }, []);
  
  // Filter items based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const query = searchQuery.toLowerCase().trim();
    const results: Array<{ item: SpineItem; type: "source" | "synthesis" | "artifact"; matchField: string }> = [];
    
    // Search sources
    sources.forEach((item) => {
      const titleMatch = item.title.toLowerCase().includes(query);
      const contentText = extractTextFromContent(item.content);
      const contentMatch = contentText.toLowerCase().includes(query);
      const noteMatch = item.note?.toLowerCase().includes(query);
      const domainMatch = item.domain?.toLowerCase().includes(query);
      
      if (titleMatch || contentMatch || noteMatch || domainMatch) {
        results.push({
          item,
          type: "source",
          matchField: titleMatch ? "title" : contentMatch ? "content" : noteMatch ? "note" : "domain",
        });
      }
    });
    
    // Search syntheses
    syntheses.forEach((item) => {
      const titleMatch = item.title.toLowerCase().includes(query);
      const contentText = extractTextFromContent(item.content);
      const contentMatch = contentText.toLowerCase().includes(query);
      
      if (titleMatch || contentMatch) {
        results.push({
          item,
          type: "synthesis",
          matchField: titleMatch ? "title" : "content",
        });
      }
    });
    
    // Search artifacts
    artifacts.forEach((item) => {
      const titleMatch = item.title.toLowerCase().includes(query);
      const contentText = extractTextFromContent(item.content);
      const contentMatch = contentText.toLowerCase().includes(query);
      
      if (titleMatch || contentMatch) {
        results.push({
          item,
          type: "artifact",
          matchField: titleMatch ? "title" : "content",
        });
      }
    });
    
    return results;
  }, [searchQuery, sources, syntheses, artifacts, extractTextFromContent]);
  
  const isSearching = searchQuery.trim().length > 0;

  return (
    <aside 
      className="w-64 h-full flex flex-col shrink-0"
    >
      {/* Search input - fills entire container area */}
      <div 
        className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{ 
          borderBottom: `1px solid ${borderColor}`,
          backgroundColor: isDark 
            ? (isSearchFocused ? "#1f1f1f" : "transparent") 
            : (isSearchFocused ? "#fafafa" : "transparent"),
          transition: "background-color 0.15s ease",
        }}
      >
        <svg 
          className="w-3.5 h-3.5 shrink-0" 
          fill="none" 
          stroke={isDark ? "#737373" : "#a3a3a3"} 
          viewBox="0 0 24 24" 
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder="Search..."
          className="flex-1 bg-transparent border-none outline-none text-xs"
          style={{ 
            color: isDark ? "#e5e5e5" : "#171717",
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
            style={{ color: isDark ? "#737373" : "#a3a3a3" }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {/* Search Results */}
        {isSearching ? (
          <SearchResults
            results={searchResults || []}
            query={searchQuery}
            selectedId={selectedId}
            onSelect={onSelect}
            isDark={isDark}
            borderColor={borderColor}
          />
        ) : (
        <>
        {/* Sources Section - hidden if visibility.sources is false */}
        {(!visibility || visibility.sources) && (
          <SourcesSection
            title="SOURCES"
            count={sources.length}
            onAddSource={onAddSource}
            onAddLink={onAddLink}
            borderColor={borderColor}
            isDark={isDark}
            readOnly={readOnly}
          >
            {sources.length === 0 ? (
              <EmptyState isDark={isDark}>No sources</EmptyState>
            ) : (
              sources.map((item) => (
                <SourceListItem
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onSelect={() => onSelect(item.id)}
                  isDark={isDark}
                />
              ))
            )}
          </SourcesSection>
        )}

        {/* Syntheses Section - hidden if visibility.syntheses is false */}
        {(!visibility || visibility.syntheses) && (
          <Section
            title="SYNTHESES"
            count={syntheses.length}
            onAdd={onAddSynthesis}
            addLabel="New synthesis"
            borderColor={borderColor}
            isDark={isDark}
            readOnly={readOnly}
          >
            {syntheses.length === 0 ? (
              <EmptyState isDark={isDark}>No syntheses</EmptyState>
            ) : (
              syntheses.map((item) => (
                <SynthesisListItem
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onSelect={() => onSelect(item.id)}
                  isDark={isDark}
                />
              ))
            )}
          </Section>
        )}

        {/* Decisions Section - Hidden for now, code preserved */}
        {/* <Section
          title="DECISIONS"
          count={decisions.length}
          onAdd={onAddDecision}
          addLabel="New decision"
          borderColor={borderColor}
          isDark={isDark}
        >
          {decisions.length === 0 ? (
            <EmptyState isDark={isDark}>No decisions</EmptyState>
          ) : (
            decisions.map((item) => (
              <DecisionListItem
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onSelect={() => onSelect(item.id)}
                isDark={isDark}
              />
            ))
          )}
        </Section> */}

        {/* Artifacts Section - hidden if visibility.artifacts is false */}
        {(!visibility || visibility.artifacts) && (
          <Section
            title="ARTIFACTS"
            count={artifacts.length}
            onAdd={onAddArtifact}
            addLabel="New artifact"
            borderColor={borderColor}
            isDark={isDark}
            isLast={true}
            readOnly={readOnly}
          >
            {artifacts.length === 0 ? (
              <EmptyState isDark={isDark}>No artifacts</EmptyState>
            ) : (
              artifacts.map((item) => (
                <ArtifactListItem
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onSelect={() => onSelect(item.id)}
                  isDark={isDark}
                />
              ))
            )}
          </Section>
        )}
        </>
        )}
      </div>
      
      {/* Footer with theme toggle */}
      <div className="px-3 py-2 shrink-0 flex items-center">
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      </div>
    </aside>
  );
}

// =============================================================================
// Search Results Component
// =============================================================================

interface SearchResultItem {
  item: SpineItem;
  type: "source" | "synthesis" | "artifact";
  matchField: string;
}

interface SearchResultsProps {
  results: SearchResultItem[];
  query: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isDark: boolean;
  borderColor: string;
}

function SearchResults({ results, query, selectedId, onSelect, isDark, borderColor }: SearchResultsProps) {
  const typeLabels: Record<string, string> = {
    source: "Source",
    synthesis: "Synthesis",
    artifact: "Artifact",
  };
  
  
  if (results.length === 0) {
    return (
      <div className="px-3 py-6 text-center">
        <div 
          className="text-xs"
          style={{ color: isDark ? "#737373" : "#737373" }}
        >
          No results for "{query}"
        </div>
        <div 
          className="text-[10px] mt-1"
          style={{ color: isDark ? "#525252" : "#a3a3a3" }}
        >
          Try different keywords
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div 
        className="px-3 py-2"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <span 
          className="text-[10px] font-semibold tracking-wider uppercase"
          style={{ color: isDark ? "#a3a3a3" : "#525252" }}
        >
          Results
        </span>
        <span 
          className="text-[10px] ml-2"
          style={{ color: isDark ? "#525252" : "#a3a3a3" }}
        >
          {results.length}
        </span>
      </div>
      <div className="pb-2">
        {results.map(({ item, type, matchField }) => (
          <SearchResultItem
            key={item.id}
            item={item}
            type={type}
            matchField={matchField}
            typeLabel={typeLabels[type]}
            isSelected={selectedId === item.id}
            onSelect={() => onSelect(item.id)}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
}

interface SearchResultItemProps {
  item: SpineItem;
  type: "source" | "synthesis" | "artifact";
  matchField: string;
  typeLabel: string;
  isSelected: boolean;
  onSelect: () => void;
  isDark: boolean;
}

function SearchResultItem({ 
  item, 
  type, 
  matchField, 
  typeLabel, 
  isSelected, 
  onSelect, 
  isDark 
}: SearchResultItemProps) {
  const hoverBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const selectedBg = isDark ? "#262626" : "#f5f5f5";
  
  return (
    <button
      onClick={onSelect}
      className="w-full text-left px-3 py-1.5 flex items-start gap-2 transition-colors cursor-pointer"
      style={{
        backgroundColor: isSelected ? selectedBg : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      <span className="shrink-0 mt-0.5">
        <NodeTypeIcon type={type} color={isDark ? "#737373" : "#737373"} />
      </span>
      <div className="min-w-0 flex-1">
        <div 
          className="text-xs truncate"
          style={{ 
            fontWeight: isSelected ? 500 : 400,
            color: isSelected 
              ? (isDark ? "#f5f5f5" : "#171717")
              : (isDark ? "#d4d4d4" : "#404040"),
          }}
        >
          {item.title}
        </div>
        <div 
          className="text-[10px] mt-0.5 flex items-center gap-1"
          style={{ color: isDark ? "#737373" : "#737373" }}
        >
          <span>{typeLabel}</span>
          {matchField !== "title" && (
            <>
              <span>·</span>
              <span className="italic">match in {matchField}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// Section Component
// =============================================================================

interface SectionProps {
  title: string;
  count: number;
  onAdd: () => void;
  addLabel: string;
  children: React.ReactNode;
  borderColor: string;
  isDark: boolean;
  isLast?: boolean;
  readOnly?: boolean;
}

function Section({ title, count, onAdd, addLabel, children, borderColor, isDark, isLast, readOnly }: SectionProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const svg = e.currentTarget.querySelector('svg');
    if (svg) {
      svg.style.transform = 'rotate(90deg)';
      setTimeout(() => {
        svg.style.transform = 'rotate(0deg)';
      }, 150);
    }
    onAdd();
  };

  return (
    <div style={{ borderBottom: isLast ? 'none' : `1px solid ${borderColor}` }}>
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span 
            className="text-[10px] font-semibold tracking-wider uppercase"
            style={{ color: isDark ? "#a3a3a3" : "#525252" }}
          >
            {title}
          </span>
          {count > 0 && (
            <span 
              className="text-[10px]"
              style={{ color: isDark ? "#525252" : "#a3a3a3" }}
            >
              {count}
            </span>
          )}
        </div>
        {!readOnly && (
          <button
            onClick={handleClick}
            className="p-1 cursor-pointer"
            style={{ 
              color: isDark ? "#a3a3a3" : "#737373",
              transition: "color 150ms",
            }}
            title={addLabel}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isDark ? "#ffffff" : "#171717";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDark ? "#a3a3a3" : "#737373";
            }}
          >
            <svg 
              className="w-3.5 h-3.5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              strokeWidth={2}
              style={{ transition: "transform 150ms ease-out" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        )}
      </div>
      <div className="pb-2">
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// Sources Section (with both Add and Link buttons)
// =============================================================================

interface SourcesSectionProps {
  title: string;
  count: number;
  onAddSource: () => void;
  onAddLink: () => void;
  children: React.ReactNode;
  borderColor: string;
  isDark: boolean;
  readOnly?: boolean;
}

function SourcesSection({ title, count, onAddSource, onAddLink, children, borderColor, isDark, readOnly }: SourcesSectionProps) {
  const handleIconClick = (e: React.MouseEvent<HTMLButtonElement>, callback: () => void) => {
    const svg = e.currentTarget.querySelector('svg');
    if (svg) {
      svg.style.transform = 'rotate(90deg)';
      setTimeout(() => {
        svg.style.transform = 'rotate(0deg)';
      }, 150);
    }
    callback();
  };

  return (
    <div style={{ borderBottom: `1px solid ${borderColor}` }}>
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span 
            className="text-[10px] font-semibold tracking-wider uppercase"
            style={{ color: isDark ? "#a3a3a3" : "#525252" }}
          >
            {title}
          </span>
          {count > 0 && (
            <span 
              className="text-[10px]"
              style={{ color: isDark ? "#525252" : "#a3a3a3" }}
            >
              {count}
            </span>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1">
            {/* Add Link button */}
            <button
              onClick={(e) => handleIconClick(e, onAddLink)}
              className="p-1 cursor-pointer"
              style={{ 
                color: isDark ? "#a3a3a3" : "#737373",
                transition: "color 150ms",
              }}
              title="Add link reference"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isDark ? "#ffffff" : "#171717";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isDark ? "#a3a3a3" : "#737373";
              }}
            >
              <svg 
                className="w-3.5 h-3.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                strokeWidth={2}
                style={{ transition: "transform 150ms ease-out" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            </button>
            {/* Add Source button */}
            <button
              onClick={(e) => handleIconClick(e, onAddSource)}
              className="p-1 cursor-pointer"
              style={{ 
                color: isDark ? "#a3a3a3" : "#737373",
                transition: "color 150ms",
              }}
              title="Add source"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isDark ? "#ffffff" : "#171717";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isDark ? "#a3a3a3" : "#737373";
              }}
            >
              <svg 
                className="w-3.5 h-3.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                strokeWidth={2}
                style={{ transition: "transform 150ms ease-out" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <div className="pb-2">
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <div 
      className="px-3 py-2 text-xs italic"
      style={{ color: isDark ? "#737373" : "#737373" }}
    >
      {children}
    </div>
  );
}

// =============================================================================
// List Item Components
// =============================================================================

interface ListItemProps<T extends SpineItem> {
  item: T;
  isSelected: boolean;
  onSelect: () => void;
  isDark: boolean;
}

function SourceListItem({ item, isSelected, onSelect, isDark }: ListItemProps<SourceItem>) {
  const isExternalLink = item.kind === "external_link";

  const hoverBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const selectedBg = isDark ? "#262626" : "#f5f5f5";

  return (
    <button
      onClick={onSelect}
      className="w-full text-left px-3 py-1.5 flex items-start gap-2 transition-colors cursor-pointer"
      style={{
        backgroundColor: isSelected ? selectedBg : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      <span className="shrink-0 mt-0.5 relative">
        <NodeTypeIcon type="source" isLink={isExternalLink} color={statusColor(item.nodeStatus || "canonical")} />
        {/* Recalibration dot — only during active recalibration */}
        {(item.recalcStatus === "recalibrating" || item.recalcStatus === "calibrated") && (
          <span 
            className="absolute -top-0.5 -right-1 w-[6px] h-[6px] rounded-full"
            style={{
              backgroundColor: isDark ? "#8b5cf6" : "#7c3aed",
              animation: "recalIconDotIn 300ms cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div 
            className="text-xs truncate flex-1"
            style={{ 
              fontWeight: isSelected ? 500 : 400,
              color: isSelected 
                ? (isDark ? "#f5f5f5" : "#171717")
                : (isDark ? "#d4d4d4" : "#404040"),
            }}
          >
            {item.title}
          </div>
          <span className="text-[9px] flex-shrink-0" style={{ color: isDark ? "#525252" : "#a3a3a3" }}>
            {labelFor(item.kind === "external_link" ? "external_link" : item.kind === "document" ? "doc" : item.kind)}
          </span>
        </div>
        {/* Show domain for external links instead of highlights */}
        {isExternalLink && item.domain && (
          <div 
            className="text-[10px] mt-0.5 truncate"
            style={{ color: isDark ? "#737373" : "#737373" }}
          >
            {item.domain}
          </div>
        )}
        {!isExternalLink && item.highlights && item.highlights.length > 0 && (
          <div 
            className="text-[10px] mt-0.5"
            style={{ color: isDark ? "#737373" : "#737373" }}
          >
            {item.highlights.length} highlight{item.highlights.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </button>
  );
}

function SynthesisListItem({ item, isSelected, onSelect, isDark }: ListItemProps<SynthesisItem>) {
  // Show pending diff dot if there's any lastDiff (even if before/after are empty)
  const hasPendingDiff = !!item.lastDiff;
  const isGenerating = item.generatingState === "generating";
  const isDraft = item.status === "draft";
  
  const hoverBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const selectedBg = isDark ? "#262626" : "#f5f5f5";

  return (
    <button
      onClick={onSelect}
      disabled={isGenerating}
      className="w-full text-left px-3 py-1.5 flex items-start gap-2 transition-colors cursor-pointer"
      style={{
        backgroundColor: isSelected ? selectedBg : "transparent",
        opacity: isGenerating ? 0.7 : 1,
        cursor: isGenerating ? "default" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!isSelected && !isGenerating) {
          e.currentTarget.style.backgroundColor = hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      <span className="shrink-0 mt-0.5 relative">
        {isGenerating ? (
          // Animated generating indicator
          <svg 
            className="w-3 h-3 animate-spin" 
            viewBox="0 0 12 12" 
            fill="none" 
            stroke={isDark ? "#737373" : "#737373"} 
            strokeWidth="1.5"
          >
            <circle cx="6" cy="6" r="4" strokeOpacity="0.3" />
            <path d="M6 2a4 4 0 0 1 4 4" strokeLinecap="round" />
          </svg>
        ) : (
          <NodeTypeIcon type="synthesis" color={statusColor(item.nodeStatus || "draft")} />
        )}
        {/* Recalibration dot — only during active recalibration */}
        {!isGenerating && (item.recalcStatus === "recalibrating" || item.recalcStatus === "calibrated") && (
          <span 
            className="absolute -top-0.5 -right-1 w-[6px] h-[6px] rounded-full"
            style={{
              backgroundColor: isDark ? "#8b5cf6" : "#7c3aed",
              animation: "recalIconDotIn 300ms cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div 
            className="text-xs truncate flex-1"
            style={{ 
              fontWeight: isSelected ? 500 : 400,
              color: isGenerating
                ? (isDark ? "#737373" : "#a3a3a3")
                : isSelected 
                  ? (isDark ? "#f5f5f5" : "#171717")
                  : (isDark ? "#d4d4d4" : "#404040"),
            }}
          >
            {item.title}
          </div>
          {!isGenerating && (
            <span className="text-[9px] flex-shrink-0" style={{ color: isDark ? "#525252" : "#a3a3a3" }}>
              {labelFor(item.synthesisType || "insight")}
            </span>
          )}
        </div>
        {isGenerating && (
          <div 
            className="text-[10px] mt-0.5"
            style={{ color: isDark ? "#737373" : "#737373" }}
          >
            Generating...
          </div>
        )}
      </div>
    </button>
  );
}

function DecisionListItem({ item, isSelected, onSelect, isDark }: ListItemProps<DecisionItem>) {
  const statusIndicator = {
    proposed: "○",
    accepted: "●",
    rejected: "✕",
    revisiting: "↻",
  }[item.status];

  const hoverBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const selectedBg = isDark ? "#262626" : "#f5f5f5";

  return (
    <button
      onClick={onSelect}
      className="w-full text-left px-3 py-1.5 flex items-start gap-2 transition-colors cursor-pointer"
      style={{
        backgroundColor: isSelected ? selectedBg : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      <span 
        className="text-xs shrink-0 mt-0.5"
        style={{ color: isDark ? "#737373" : "#737373" }}
      >{statusIndicator}</span>
      <div className="min-w-0 flex-1">
        <div 
          className="text-xs truncate"
          style={{ 
            fontWeight: isSelected ? 500 : 400,
            color: isSelected 
              ? (isDark ? "#f5f5f5" : "#171717")
              : (isDark ? "#d4d4d4" : "#404040"),
          }}
        >
          {item.title}
        </div>
        <div 
          className="text-[10px] mt-0.5 uppercase tracking-wide"
          style={{ color: isDark ? "#737373" : "#737373" }}
        >
          {item.confidence} confidence
        </div>
      </div>
    </button>
  );
}

function ArtifactListItem({ item, isSelected, onSelect, isDark }: ListItemProps<ArtifactItem>) {
  const statusLabel = {
    draft: "Draft",
    review: "In Review",
    final: "Final",
  }[item.status];
  
  // Show pending diff dot if there's any lastDiff (even if before/after are empty)
  const hasPendingDiff = !!item.lastDiff;

  const hoverBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const selectedBg = isDark ? "#262626" : "#f5f5f5";

  return (
    <button
      onClick={onSelect}
      className="w-full text-left px-3 py-1.5 flex items-start gap-2 transition-colors cursor-pointer"
      style={{
        backgroundColor: isSelected ? selectedBg : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      <span className="shrink-0 mt-0.5 relative">
        <NodeTypeIcon type="artifact" color={statusColor(item.nodeStatus || "draft")} />
        {/* Recalibration dot — only during active recalibration */}
        {(item.recalcStatus === "recalibrating" || item.recalcStatus === "calibrated") && (
          <span 
            className="absolute -top-0.5 -right-1 w-[6px] h-[6px] rounded-full"
            style={{
              backgroundColor: isDark ? "#8b5cf6" : "#7c3aed",
              animation: "recalIconDotIn 300ms cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div 
            className="text-xs truncate flex-1"
            style={{ 
              fontWeight: isSelected ? 500 : 400,
              color: isSelected 
                ? (isDark ? "#f5f5f5" : "#171717")
                : (isDark ? "#d4d4d4" : "#404040"),
            }}
          >
            {item.title}
          </div>
          <span className="text-[9px] flex-shrink-0" style={{ color: isDark ? "#525252" : "#a3a3a3" }}>
            {labelFor(item.artifactType)}
          </span>
        </div>
      </div>
    </button>
  );
}

