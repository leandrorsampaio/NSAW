# Bug Summary: Ship Selection and Movement Issue

## Project Context
- **Tech Stack**: Phaser.js 3.90.0, TypeScript, Vite
- **Game Type**: 2D top-down naval strategy game
- **Current Feature**: Click to select a ship, then click on the map to move it

## Expected Behavior
1. User clicks on the ship → ship turns green (selected), stats appear in right sidebar
2. User clicks on the map → ship immediately moves to that location, turns blue (deselected), stats hide

## Actual Bug
1. User clicks on the ship → ship turns green (selected), stats appear ✅ WORKS
2. User clicks on the map → **NOTHING HAPPENS** ❌ BUG
3. User clicks on the map AGAIN → ship moves ✅ WORKS

**The ship requires TWO clicks on the map to move, but it should only need ONE click.**

## Root Cause Analysis

When clicking the ship, Phaser fires TWO event handlers in sequence:
1. Ship's `pointerdown` event (the ship-specific handler)
2. Scene's global `pointerdown` event (the background handler)

We tried to prevent the background handler from firing when clicking the ship using:
- `event.stopPropagation()` - **DOESN'T WORK** in Phaser
- A flag `justClickedShip` to ignore the immediate background event - **PARTIALLY WORKS** but creates the two-click bug

## Current Implementation

### Ship Click Handler (GameScene.ts ~line 90)
```typescript
ship.on('pointerdown', (pointer, localX, localY, event) => {
    if (pointer.button === 0) {
        this.justClickedShip = true; // Set flag
        this.selectShip(ship);
        body.velocity.setTo(0, 0);
        this.movingShip = null;
        event.stopPropagation(); // Doesn't actually work
    }
});
```

### Background Click Handler (GameScene.ts ~line 113)
```typescript
this.input.on('pointerdown', (pointer) => {
    // If flag is TRUE, ignore this click (it's from the ship click)
    if (this.justClickedShip) {
        this.justClickedShip = false; // Reset flag
        return; // Ignore this event
    }

    if (pointer.button === 0 && !pointer.targetObject) {
        if (pointer.x < this.playableWidth) {
            if (this.selectedShip) {
                // Move the ship
                this.destination.set(pointer.worldX, pointer.worldY);
                this.physics.moveTo(this.selectedShip, pointer.worldX, pointer.worldY, this.shipSpeed);
                this.movingShip = this.selectedShip;
                this.deselectShip();
            }
        }
    }
});
```

## Latest Console Logs

```
🟦 SHIP CLICKED! Button: 0 Flag BEFORE: false Time: 1768050519012
🟦 Processing ship click - setting flag to TRUE
🟦 Flag is now: true
selectShip() called with ship
🟦 Ship stopped, velocity: Vector2 {x: 0, y: 0}
🟦 Event propagation stopped, flag still: true

🟨 BACKGROUND HANDLER CALLED #1 - Button: 0 Target: undefined Position: 638 245 Flag: true Time: 1768050519896
🟨 IGNORING - Flag is TRUE (just clicked ship), resetting flag NOW

🟨 BACKGROUND HANDLER CALLED #2 - Button: 0 Target: undefined Position: 715 183 Flag: true Time: 1768050520573
🟨 IGNORING - Flag is TRUE (just clicked ship), resetting flag NOW

🟨 BACKGROUND HANDLER CALLED #3 - Button: 0 Target: undefined Position: 740 593 Flag: true Time: 1768050520918
🟨 IGNORING - Flag is TRUE (just clicked ship), resetting flag NOW
```

**Notice**: The flag stays TRUE across multiple clicks, meaning the reset (`this.justClickedShip = false`) isn't working as expected.

## What We've Tried

1. ✗ `event.stopPropagation()` - Doesn't prevent background handler in Phaser
2. ✗ Checking `pointer.targetObject` - It's `undefined` for both ship and background clicks
3. ✗ Flag with immediate reset - Creates two-click requirement
4. ✗ Flag with delayed reset using `this.time.delayedCall(0, ...)` - Same issue
5. ✗ Resetting flag when ignoring click - Flag stays TRUE somehow

## Possible Solutions to Explore

1. Use a different Phaser event system (scene-level vs sprite-level)
2. Check pointer coordinates to determine if click is on ship bounds
3. Use `setInteractive()` with priority or different input plugin configuration
4. Separate the "selection" action from the background handler entirely
5. Use a frame counter instead of a boolean flag

## File Location
- Main game scene: `/src/scenes/GameScene.ts`
- Entry point: `/src/main.ts`

## How to Test
1. Start dev server: `npm run dev`
2. Open http://localhost:5173/
3. Click blue square (ship) - should turn green
4. Click anywhere on black area - ship should move immediately (but requires 2 clicks currently)

## Additional Notes
- The ship has a 20% sidebar on the right that shows stats when ship is selected
- Ship movement stopping logic works fine (stops at destination)
- The issue is purely with the event handling during selection
