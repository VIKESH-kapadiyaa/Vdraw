import { create } from 'zustand';

export type WindowType = 'physics' | 'library' | 'books' | 'toolkit' | 'settings' | 'diagrams' | 'none';

interface AppState {
    // Window Management
    openWindows: WindowType[];
    activeWindow: WindowType | null;
    toggleWindow: (window: WindowType) => void;
    openWindow: (window: WindowType) => void;
    closeWindow: (window: WindowType) => void;
    focusWindow: (window: WindowType) => void;

    // View Modes
    isZenMode: boolean;
    toggleZenMode: () => void;

    // Atmosphere State (Moving form local state to global)
    activePreset: 'none' | 'rain' | 'cyber' | 'zen';
    setActivePreset: (preset: 'none' | 'rain' | 'cyber' | 'zen') => void;

    // Physics State
    isPhysicsPlaying: boolean;
    togglePhysicsParams: (isPlaying?: boolean) => void;

    // Teacher Controls (Synced via Realtime)
    isRoomLocked: boolean; // Students cannot edit
    isFocusMode: boolean; // Students view is locked to Host
    isEyesUpMode: boolean; // Students screen is blacked out

    // Actions (Setters)
    setRoomLock: (locked: boolean) => void;
    setFocusMode: (active: boolean) => void;
    setEyesUpMode: (active: boolean) => void;

    // User/Room
    isHost: boolean;
    setIsHost: (val: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
    openWindows: [],
    activeWindow: null,

    toggleWindow: (window) => set((state) => {
        if (state.openWindows.includes(window)) {
            return {
                openWindows: state.openWindows.filter((w) => w !== window),
                activeWindow: state.activeWindow === window ? null : state.activeWindow
            };
        }
        return {
            openWindows: [...state.openWindows, window],
            activeWindow: window
        };
    }),

    openWindow: (window) => set((state) => {
        if (state.openWindows.includes(window)) return { activeWindow: window };
        return {
            openWindows: [...state.openWindows, window],
            activeWindow: window
        };
    }),

    closeWindow: (window) => set((state) => ({
        openWindows: state.openWindows.filter((w) => w !== window),
        activeWindow: state.activeWindow === window ? null : state.activeWindow
    })),

    focusWindow: (window) => set({ activeWindow: window }),

    isZenMode: false,
    toggleZenMode: () => set((state) => ({ isZenMode: !state.isZenMode })),

    activePreset: 'none',
    setActivePreset: (preset) => set({ activePreset: preset }),

    isPhysicsPlaying: false,
    togglePhysicsParams: (val) => set((state) => ({ isPhysicsPlaying: val !== undefined ? val : !state.isPhysicsPlaying })),

    isRoomLocked: false,
    setRoomLock: (locked) => set({ isRoomLocked: locked }),

    isFocusMode: false,
    setFocusMode: (active) => set({ isFocusMode: active }),

    isEyesUpMode: false,
    setEyesUpMode: (active) => set({ isEyesUpMode: active }),

    isHost: false,
    setIsHost: (val) => set({ isHost: val }),
}));
