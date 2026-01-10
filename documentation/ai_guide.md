# AI Developer Guide: Phaser Naval Game

This document provides a step-by-step guide to initialize the project and implement the first user story.

## 1. Environment Setup

Execute the following commands in the project root directory to set up the Vite project and install Phaser.

1.  **Initialize Vite Project:**
    ```bash
    npm create vite@latest . -- --template vanilla-ts
    ```
    *(Note: The `.` creates the project in the current directory. Agree to overwrite any conflicting files like `.gitignore` if prompted.)*

2.  **Install Dependencies:**
    ```bash
    npm install && npm install phaser
    ```

3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    *The basic environment is now running. The following steps will implement the actual game.*

---

## 2. First Milestone: Select and Move Ship

**User Story:** As a player, I want to select a ship by clicking on it. Then, I want to click a destination on the map, and the ship should move to that point.

### Step 2.1: Clean up `index.html`

Replace the content of `index.html` with this minimal structure for the game.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Naval Strategy Game</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #000000;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### Step 2.2: Clean up the `src` directory

Delete the following unnecessary files from the `src/` directory:
- `counter.ts`
- `style.css`
- `typescript.svg`

### Step 2.3: Create the Main Game Scene (`src/scenes/GameScene.ts`)

Create a new file at `src/scenes/GameScene.ts` and add the following code. This scene will handle the core logic.

```typescript
import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    private selectedShip: Phaser.Physics.Arcade.Sprite | null = null;
    private shipSpeed: number = 200; // pixels per second

    constructor() {
        super('GameScene');
    }

    preload() {
        // Create a simple blue square texture for the ship
        const shipGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        shipGraphics.fillStyle(0x0000ff);
        shipGraphics.fillRect(0, 0, 32, 32);
        shipGraphics.generateTexture('ship', 32, 32);
    }

    create() {
        // Add a ship to the scene
        const ship = this.physics.add.sprite(200, 200, 'ship');
        ship.setInteractive(); // Make it clickable
        ship.setCollideWorldBounds(true); // Don't let it go off-screen

        // --- Event Handlers ---

        // Event: Click on the ship to select it
        ship.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown()) {
                this.selectShip(ship);
                // Stop the ship if it's moving
                ship.body.velocity.setTo(0, 0);
            }
        });

        // Event: Click on the background to deselect or move the ship
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown()) {
                // If the click is not on any interactive object
                if (pointer.targetObject === null) {
                    if (this.selectedShip) {
                        // Move the selected ship to the clicked point
                        this.physics.moveTo(this.selectedShip, pointer.worldX, pointer.worldY, this.shipSpeed);
                    }
                }
            }
        });

        this.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
            // Stop the ship when it hits the world bounds
            body.gameObject.body.velocity.setTo(0, 0);
        });
    }

    update() {
        // Stop the ship if it has reached its destination
        if (this.selectedShip) {
            const distance = Phaser.Math.Distance.Between(
                this.selectedShip.x,
                this.selectedShip.y,
                this.physics.world.destination.x,
                this.physics.world.destination.y
            );

            if (this.selectedShip.body.velocity.length() > 0 && distance < 4) {
                this.selectedShip.body.velocity.setTo(0, 0);
            }
        }
    }

    // --- Helper Functions ---

    private selectShip(ship: Phaser.Physics.Arcade.Sprite) {
        // If there's already a selected ship, deselect it first
        if (this.selectedShip) {
            this.selectedShip.clearTint();
        }

        // Select the new ship and apply a tint to show it's selected
        this.selectedShip = ship;
        this.selectedShip.setTint(0x00ff00); // Green tint
    }
}
```

### Step 2.4: Create the Game Entry Point (`src/main.ts`)

Replace the content of `src/main.ts` with the following code to configure and launch the Phaser game.

```typescript
import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'app',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
      // A trick to give a destination to the moveTo method
      destination: new Phaser.Math.Vector2()
    }
  },
  scene: [GameScene]
};

new Phaser.Game(config);
```

After completing these steps, the development server should show a black screen with a blue square. You can click the square (it will turn green) and then click anywhere else on the screen to make it move to that point.
