import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DrillKind, DrillPayload } from '@/lib/drilldown-types';

interface UserDrillDataState {
  // Pinned Previews
  pinnedPreviews: Array<{
    id: string;
    kind: DrillKind;
    payload: DrillPayload;
    position: { x: number; y: number };
  }>;
  pinPreview: (kind: DrillKind, payload: DrillPayload, position?: { x: number; y: number }) => void;
  unpinPreview: (id: string) => void;
  updatePinPosition: (id: string, x: number, y: number) => void;

  // Bookmarks
  bookmarks: Array<{
    id: string;
    label: string;
    kind: DrillKind;
    payload: DrillPayload;
    createdAt: number;
    tags?: string[];
  }>;
  addBookmark: (label: string, kind: DrillKind, payload: DrillPayload, tags?: string[]) => void;
  removeBookmark: (id: string) => void;

  // Onboarding
  onboarding: {
    hasSeenOnboarding: boolean;
    hasSeenFirstInteractionHint: boolean;
    completedTourSteps: string[];
    tourDismissedAt: number | null;
  };
  markOnboardingComplete: () => void;
  markFirstInteractionHintSeen: () => void;
  markTourStepComplete: (stepId: string) => void;
  dismissTour: () => void;
  resetOnboarding: () => void;
}

export const useDrillUserData = create<UserDrillDataState>()(
  persist(
    (set, get) => ({
      // Pinned
      pinnedPreviews: [],
      pinPreview: (kind, payload, position = { x: 100, y: 100 }) => set((state) => {
         if (state.pinnedPreviews.length >= 3) return state;
         const pinned = {
           id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
           kind,
           payload,
           position
         };
         return { pinnedPreviews: [...state.pinnedPreviews, pinned] };
      }),
      unpinPreview: (id) => set((state) => ({
        pinnedPreviews: state.pinnedPreviews.filter(p => p.id !== id)
      })),
      updatePinPosition: (id, x, y) => set((state) => ({
        pinnedPreviews: state.pinnedPreviews.map(p => 
          p.id === id ? { ...p, position: { x, y } } : p
        )
      })),

      // Bookmarks
      bookmarks: [],
      addBookmark: (label, kind, payload, tags) => set((state) => ({
        bookmarks: [...state.bookmarks, {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          label,
          kind,
          payload,
          createdAt: Date.now(),
          tags
        }]
      })),
      removeBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.filter(b => b.id !== id)
      })),

      // Onboarding
      onboarding: {
        hasSeenOnboarding: false,
        hasSeenFirstInteractionHint: false,
        completedTourSteps: [],
        tourDismissedAt: null
      },
      markOnboardingComplete: () => set((state) => ({
        onboarding: { ...state.onboarding, hasSeenOnboarding: true }
      })),
      markFirstInteractionHintSeen: () => set((state) => ({
        onboarding: { ...state.onboarding, hasSeenFirstInteractionHint: true }
      })),
      markTourStepComplete: (stepId) => set((state) => {
        if (state.onboarding.completedTourSteps.includes(stepId)) return state;
        return {
          onboarding: { 
            ...state.onboarding, 
            completedTourSteps: [...state.onboarding.completedTourSteps, stepId]
          }
        };
      }),
      dismissTour: () => set((state) => ({
        onboarding: { ...state.onboarding, tourDismissedAt: Date.now() }
      })),
      resetOnboarding: () => set({
        onboarding: {
          hasSeenOnboarding: false,
          hasSeenFirstInteractionHint: false,
          completedTourSteps: [],
          tourDismissedAt: null
        }
      })
    }),
    {
      name: 'drill-user-data', // key in localStorage
    }
  )
);
