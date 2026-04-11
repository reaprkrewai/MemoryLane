import { create } from "zustand";

export type ActiveView = "timeline" | "editor" | "calendar" | "search";
export type NavigateSource = "timeline" | "sidebar" | null;

interface ViewState {
  activeView: ActiveView;
  navigateSource: NavigateSource;
  dateFilter: string | null; // ISO date "YYYY-MM-DD", null = no filter
  timelineScrollY: number;   // preserved scroll position on back navigation

  setView: (view: ActiveView, source?: NavigateSource) => void;
  setDateFilter: (date: string | null) => void;
  navigateToEditor: (source: NavigateSource) => void;
  navigateBack: () => void;
  setTimelineScrollY: (y: number) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  activeView: "timeline",
  navigateSource: null,
  dateFilter: null,
  timelineScrollY: 0,

  setView: (view, source = null) => set({ activeView: view, navigateSource: source }),
  setDateFilter: (date) => set({ dateFilter: date }),
  navigateToEditor: (source) => set({ activeView: "editor", navigateSource: source }),
  // navigateBack: return to timeline but preserve dateFilter (Pitfall 3 in RESEARCH.md)
  navigateBack: () => set({ activeView: "timeline", navigateSource: null }),
  setTimelineScrollY: (y) => set({ timelineScrollY: y }),
}));
