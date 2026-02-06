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
import { RecalibrationIndicator } from "../RecalibrationIndicator";

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
}: SourcesPanelProps) {
  const { theme } = useTheme();
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
      {/* Search input */}
      <div 
        className="px-3 py-2 shrink-0"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <div 
          className="flex items-center gap-2 px-2 py-1.5 rounded"
          style={{ 
            backgroundColor: isDark 
              ? (isSearchFocused ? "#262626" : "#1a1a1a") 
              : (isSearchFocused ? "#f5f5f5" : "#fafafa"),
            border: `1px solid ${isSearchFocused ? (isDark ? "#525252" : "#d4d4d4") : "transparent"}`,
            transition: "all 0.15s ease",
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
        {/* Sources Section */}
        <SourcesSection
          title="SOURCES"
          count={sources.length}
          onAddSource={onAddSource}
          onAddLink={onAddLink}
          borderColor={borderColor}
          isDark={isDark}
        >
          {sources.length === 0 ? (
            <EmptyState isDark={isDark}>No sources yet</EmptyState>
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

        {/* Syntheses Section */}
        <Section
          title="SYNTHESES"
          count={syntheses.length}
          onAdd={onAddSynthesis}
          addLabel="New synthesis"
          borderColor={borderColor}
          isDark={isDark}
        >
          {syntheses.length === 0 ? (
            <EmptyState isDark={isDark}>No syntheses yet</EmptyState>
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
            <EmptyState isDark={isDark}>No decisions yet</EmptyState>
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

        {/* Artifacts Section */}
        <Section
          title="ARTIFACTS"
          count={artifacts.length}
          onAdd={onAddArtifact}
          addLabel="New artifact"
          borderColor={borderColor}
          isDark={isDark}
          isLast={true}
        >
          {artifacts.length === 0 ? (
            <EmptyState isDark={isDark}>No artifacts yet</EmptyState>
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
        </>
        )}
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
  
  const typeIcons: Record<string, string> = {
    source: "📄",
    synthesis: "◇",
    artifact: "▤",
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
            typeIcon={typeIcons[type]}
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
  type: string;
  matchField: string;
  typeLabel: string;
  typeIcon: string;
  isSelected: boolean;
  onSelect: () => void;
  isDark: boolean;
}

function SearchResultItem({ 
  item, 
  type, 
  matchField, 
  typeLabel, 
  typeIcon, 
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
      <span 
        className="text-xs shrink-0 mt-0.5"
        style={{ color: isDark ? "#737373" : "#737373" }}
      >
        {typeIcon}
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
}

function Section({ title, count, onAdd, addLabel, children, borderColor, isDark, isLast }: SectionProps) {
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
        <button
          onClick={onAdd}
          className="p-1 transition-colors"
          style={{ color: isDark ? "#a3a3a3" : "#737373" }}
          title={addLabel}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
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
}

function SourcesSection({ title, count, onAddSource, onAddLink, children, borderColor, isDark }: SourcesSectionProps) {
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
        <div className="flex items-center gap-1">
          {/* Add Link button */}
          <button
            onClick={onAddLink}
            className="p-1 transition-colors"
            style={{ color: isDark ? "#a3a3a3" : "#737373" }}
            title="Add link reference"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </button>
          {/* Add Source button */}
          <button
            onClick={onAddSource}
            className="p-1 transition-colors"
            style={{ color: isDark ? "#a3a3a3" : "#737373" }}
            title="Add source"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
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
  
  const kindIcon = {
    document: "📄",
    url: "🔗",
    file: "📎",
    note: "📝",
    external_link: "🔗",
  }[item.kind] || "📄";

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
      <span className="text-xs shrink-0 mt-0.5 grayscale opacity-60">{kindIcon}</span>
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
          {/* Reference badge for external links */}
          {isExternalLink && (
            <span 
              className="text-[8px] px-1 py-0.5 rounded font-medium shrink-0"
              style={{ 
                backgroundColor: isDark ? "#1e3a5f" : "#dbeafe",
                color: isDark ? "#93c5fd" : "#1d4ed8",
              }}
              title="External reference - declared influence, not analyzed content"
            >
              Ref
            </span>
          )}
          <RecalibrationIndicator status={item.recalcStatus} compact />
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
        className="text-xs shrink-0 mt-0.5 relative"
        style={{ color: isDark ? "#737373" : "#737373" }}
      >
        ◇
        {/* Pending diff indicator dot */}
        {hasPendingDiff && (
          <span 
            className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full"
            style={{ backgroundColor: "#818cf8" }}
            title="Has pending upstream change"
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
          <RecalibrationIndicator status={item.recalcStatus} compact />
        </div>
        <div 
          className="text-[10px] mt-0.5"
          style={{ color: isDark ? "#737373" : "#737373" }}
        >
          From {item.sourceCount} source{item.sourceCount !== 1 ? "s" : ""}
        </div>
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
      <span 
        className="text-xs shrink-0 mt-0.5 relative"
        style={{ color: isDark ? "#737373" : "#737373" }}
      >
        ▤
        {/* Pending diff indicator dot */}
        {hasPendingDiff && (
          <span 
            className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full"
            style={{ backgroundColor: "#818cf8" }}
            title="Has pending upstream change"
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
          <RecalibrationIndicator status={item.recalcStatus} compact />
        </div>
        <div 
          className="text-[10px] mt-0.5"
          style={{ color: isDark ? "#737373" : "#737373" }}
        >
          {statusLabel} · v{item.version}
        </div>
      </div>
    </button>
  );
}

