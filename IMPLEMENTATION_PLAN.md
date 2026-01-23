# Vdraw: India's "Spatial Whiteboard" Implementation Plan

## 1. File Structure Overview & Changes

### **New Components & Utilities**
*   `components/PhysicsCanvas.tsx`: The overlay/engine for `matter-js` physics interactions.
*   `components/CommandDock.tsx`: new floating bottom toolbar replacing the standard Excalidraw UI.
*   `lib/hooks/useBandwidth.ts`: Custom hook to detect network quality and trigger "Weightless Sync".
*   `lib/physicsEngine.ts`: Helper functions for `matter-js` configuration and state management.

### **Modified Files**
*   `app/globals.css`: Add "Weightless Antigravity" particle background and glassmorphism tokens.
*   `components/Whiteboard.tsx`:
    *   Integrate `PhysicsCanvas`.
    *   Implement "Teacher Master Control" logic (listen for Supabase room state).
    *   Replace UI elements with `CommandDock`.
    *   Handle "Low Bandwidth" toggle.
*   `app/pricing/page.tsx`: Add "Daily Pass" and "Exam Season Pass".
*   `lib/supabaseClient.ts`: Ensure Realtime subscriptions handle new room states (Locked/Unlocked).

---

## 2. Execution Phases

### **Phase 1: The "Indian Classroom" Engine (Core Mechanics)**
**Objective:** Enable Physics interactions and Teacher control.

1.  **Physics Lab (`matter-js`)**: [x]
    *   Create `components/PhysicsCanvas.tsx`.
    *   Initialize `matter-js` Engine, World, and Runner.
    *   Map Excalidraw elements (rectangles, circles) to Matter.js bodies.
    *   Implement "Gravity Toggle": Right-click menu option or specific tool to "awaken" an object.
    *   Sync physics positions back to Excalidraw elements (so all users see the fall/collision).

2.  **Teacher Master Control**: [x]
    *   **Supabase Schema Update**: Add `is_locked` boolean column to `rooms` table.
    *   **Host Logic**: Only the creator (Host) sees the "Lock Room" button.
    *   **Client Logic**:
        *   Subscribe to `rooms` changes in `Whiteboard.tsx`.
        *   If `is_locked === true` AND `!isHost`, force `viewModeEnabled: true` in Excalidraw API.
        *   Show visual indicator: "Classroom Locked by Teacher".

3.  **NCERT Diagram Archive**: [x]
    *   Create `components/NCERTLibrary.tsx` with educational SVG diagrams.
    *   Integrate into `Whiteboard.tsx`.

### **Phase 2: Visual Overhaul ("Spatial Glassmorphism")**
**Objective:** Transform the look and feel.

1.  **Global Atmosphere**: [x]
    *   Update `globals.css` with deep space/aurora gradients.
    *   Enhance `AtmosphereController` to react to cursor velocity (brighter trails on fast movement).
2.  **Command Dock**: [x]
    *   Build `CommandDock.tsx` using Framer Motion.
    *   Floating properties: `backdrop-blur-xl`, `bg-white/5`, `border-white/10`.
    *   Animation: Dock items magnify slightly on hover (macOS style).

### **Phase 3: Business & Logic ("Sachet Pricing" & Auth)**
**Objective:** Monetize effectively for the Indian market.

1.  **Pricing Update**: [x]
    *   Modify `app/pricing/page.tsx`.
    *   Add "Daily Pass" (₹9/day) and "Exam Pass" (₹499/3 months).
    *   Update Razorpay integration handles.
2.  **Hybrid Auth**: [x]
    *   Created `app/auth/page.tsx` for Magic Link login. Allows persistent accounts.

### **Phase 4: Optimization ("Weightless Sync")**
**Objective:** Performance on low bandwidth.

1.  **Bandwidth Detection**: [x]
    *   `useBandwidth` hook using `navigator.connection.downlink`.
2.  **Throttling**: [x]
    *   If `downlink < 2Mbps`, increase the `debounce` time on broadcasting `cursor` movements.
    *   Disable incoming particle effects from `AtmosphereController`.

---

## 3. Sprint 1 Details (Immediate Actions)

We will start immediately with **Phase 1**:
1.  **Teacher Lock**: Verify Supabase schema for `rooms` and implement the locking mechanism.
2.  **Physics**: Scaffold the `PhysicsEngine`.
