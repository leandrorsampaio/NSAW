import Phaser from 'phaser';
import { EnemyShip } from '../objects/EnemyShip';

interface ShipData {
    name: string;
    maxLife: number;
    currentLife: number;
}

export class GameScene extends Phaser.Scene {
    private selectedShip: Phaser.Physics.Arcade.Sprite | null = null;
    private movingShip: Phaser.Physics.Arcade.Sprite | null = null; // Track ship that's moving
    private shipSpeed: number = 200; // pixels per second
    private destination: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);

    // UI elements
    private sidebarWidth: number = 0;
    private playableWidth: number = 0;
    private sidebar!: Phaser.GameObjects.Rectangle;
    private statsContainer!: Phaser.GameObjects.Container;

    // Ship data
    private shipData: Map<Phaser.Physics.Arcade.Sprite, ShipData> = new Map();
    private ships: Phaser.Physics.Arcade.Sprite[] = [];
    private enemyShips: EnemyShip[] = [];

    // Flag to prevent background click when clicking on ship
    // private justClickedShip: boolean = false; // This is removed

    constructor() {
        super('GameScene');
    }

    preload() {
        // Create a simple white square texture for the ship (so tints work properly)
        const shipGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        shipGraphics.fillStyle(0xffffff); // White
        shipGraphics.fillRect(0, 0, 32, 32);
        shipGraphics.generateTexture('ship', 32, 32);
    }

    create() {
        console.log('GameScene create() called');

        // Calculate dimensions
        this.sidebarWidth = this.scale.width * 0.2; // 20% of screen
        this.playableWidth = this.scale.width * 0.8; // 80% for gameplay

        // Set physics world bounds to playable area only
        this.physics.world.setBounds(0, 0, this.playableWidth, this.scale.height);

        // Create the sidebar background
        this.sidebar = this.add.rectangle(
            this.playableWidth, // x position (starts at 80%)
            0, // y position
            this.sidebarWidth, // width
            this.scale.height, // height
            0x333333 // dark gray color
        );
        this.sidebar.setOrigin(0, 0); // Align to top-left
        this.sidebar.setScrollFactor(0); // Fixed to camera (UI element)

        console.log('Sidebar created at x:', this.playableWidth, 'width:', this.sidebarWidth);
        console.log('Playable area width:', this.playableWidth);

        // Add a ship to the scene
        const ship = this.physics.add.sprite(200, 200, 'ship');
        ship.setTint(0x0000ff); // Make it blue by default
        console.log('Ship created at:', ship.x, ship.y, 'visible:', ship.visible, 'active:', ship.active);

        ship.setInteractive(); // Make it clickable
        ship.setCollideWorldBounds(true); // Don't let it go off-screen
        this.ships.push(ship); // Add to our list of ships

        // Set ship data
        this.shipData.set(ship, {
            name: 'BR Tamandaré',
            maxLife: 2000,
            currentLife: 1800
        });

        const enemyShip = new EnemyShip(this, this.playableWidth - 50, this.scale.height - 50);
        this.enemyShips.push(enemyShip);

        this.shipData.set(enemyShip, {
            name: enemyShip.shipName,
            maxLife: enemyShip.life,
            currentLife: enemyShip.life
        });


        // Enable world bounds events
        const body = ship.body as Phaser.Physics.Arcade.Body;
        body.onWorldBounds = true;

        console.log('Ship body:', body, 'velocity:', body.velocity);

        // Create stats container (initially hidden)
        this.createStatsDisplay();

        // --- Event Handlers ---

        // Event: Click on the ship to select it
        ship.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            console.log('🟦 SHIP CLICKED! Button:', pointer.button, 'Time:', Date.now());
            if (pointer.button === 0) { // 0 = left mouse button
                this.selectShip(ship);
                // Stop the ship if it's moving
                body.velocity.setTo(0, 0);
                this.movingShip = null; // Clear moving ship
                console.log('🟦 Ship stopped, velocity:', body.velocity);
            }
        });

        enemyShip.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.button === 0) {
                this.selectShip(enemyShip);
            }
        });

        // Event: Click on the background to move or deselect the ship
        let bgHandlerCallCount = 0;
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            bgHandlerCallCount++;
            console.log(`🟨 BACKGROUND HANDLER CALLED #${bgHandlerCallCount} - Button:`, pointer.button, 'Position:', pointer.worldX, pointer.worldY, 'Time:', Date.now());

            if (pointer.button !== 0) {
                return;
            }

            // Check if the click was on any ship. If so, the ship's own handler will deal with it.
            const clickWasOnShip = this.ships.some(s => s.getBounds().contains(pointer.worldX, pointer.worldY));
            if (clickWasOnShip) {
                console.log('🟨 Click was on a ship, ignoring in background handler.');
                return;
            }

            const clickWasOnEnemyShip = this.enemyShips.some(s => s.getBounds().contains(pointer.worldX, pointer.worldY));
            if (clickWasOnEnemyShip) {
                console.log('🟨 Click was on an enemy ship, ignoring in background handler.');
                return;
            }

            console.log('🟨 Processing background click (was not on a ship)');

            // Check if click is in playable area or sidebar
            if (pointer.x < this.playableWidth) {
                // Click in playable area
                if (this.selectedShip && !this.enemyShips.includes(this.selectedShip as EnemyShip)) {
                    // Store the destination
                    this.destination.set(pointer.worldX, pointer.worldY);
                    console.log('🟨 ✅ MOVING SHIP TO:', pointer.worldX, pointer.worldY);
                    // Move the selected ship to the clicked point
                    this.physics.moveTo(this.selectedShip, pointer.worldX, pointer.worldY, this.shipSpeed);
                    // Track this as the moving ship
                    this.movingShip = this.selectedShip;
                    // Deselect after giving move command
                    this.deselectShip();
                } else {
                    console.log('🟨 ❌ No ship selected - select a ship first');
                }
            } else {
                // Click in sidebar - deselect ship
                console.log('🟨 Clicked in sidebar - deselecting');
                this.deselectShip();
            }
        });

        this.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
            // Stop the ship when it hits the world bounds
            body.velocity.setTo(0, 0);
            console.log('Ship hit world bounds, stopping');
            // Clear moving ship tracker if this is the moving ship
            if (this.movingShip && this.movingShip.body === body) {
                this.movingShip = null;
            }
        });
    }

    update() {
        // Stop the ship if it has reached its destination
        if (this.movingShip && this.movingShip.body) {
            const body = this.movingShip.body as Phaser.Physics.Arcade.Body;

            if (body.velocity.length() > 0) {
                const distance = Phaser.Math.Distance.Between(
                    this.movingShip.x,
                    this.movingShip.y,
                    this.destination.x,
                    this.destination.y
                );

                // Only log occasionally to avoid spam
                if (Math.random() < 0.01) {
                    console.log('Ship moving - Position:', this.movingShip.x, this.movingShip.y, 'Velocity:', body.velocity.length(), 'Distance to dest:', distance);
                }

                if (distance < 4) {
                    console.log('Ship reached destination, stopping');
                    body.velocity.setTo(0, 0);
                    this.movingShip = null; // Clear moving ship tracker
                }
            }
        }

        this.enemyShips.forEach(enemy => enemy.update());
    }

    // --- Helper Functions ---

    private selectShip(ship: Phaser.Physics.Arcade.Sprite) {
        console.log('selectShip() called with ship:', ship, 'at position:', ship.x, ship.y);
        // If there's already a selected ship, deselect it first
        if (this.selectedShip) {
            console.log('Clearing tint from previous ship');
            if (this.enemyShips.includes(this.selectedShip as EnemyShip)) {
                this.selectedShip.clearTint();
            } else {
                this.selectedShip.setTint(0x0000ff); // Back to blue
            }
        }

        // Select the new ship and apply a tint to show it's selected
        this.selectedShip = ship;
        this.selectedShip.setTint(0x00ff00); // Green tint
        console.log('Ship selected and tinted green. Visible:', ship.visible, 'Alpha:', ship.alpha, 'Tint:', ship.tintTopLeft.toString(16));

        // Show ship stats
        this.updateStatsDisplay(ship);
    }

    private deselectShip() {
        if (this.selectedShip) {
            console.log('Deselecting ship');
            if (this.enemyShips.includes(this.selectedShip as EnemyShip)) {
                this.selectedShip.clearTint();
            } else {
                this.selectedShip.setTint(0x0000ff); // Back to blue
            }
            this.selectedShip = null;
            this.hideStatsDisplay();
        }
    }

    private createStatsDisplay() {
        // Create a container for all stats UI elements
        this.statsContainer = this.add.container(this.playableWidth + 20, 50);
        this.statsContainer.setScrollFactor(0); // Fixed to camera
        this.statsContainer.setVisible(false); // Hidden by default

        // Ship name text
        const nameText = this.add.text(0, 0, '', {
            fontSize: '20px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        nameText.setName('nameText');

        // Life label
        const lifeLabel = this.add.text(0, 50, 'Life:', {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });

        // Life bar background (red - represents max life)
        const lifeBarBg = this.add.rectangle(0, 85, 200, 20, 0xff0000);
        lifeBarBg.setOrigin(0, 0);
        lifeBarBg.setName('lifeBarBg');

        // Life bar foreground (green - represents current life)
        const lifeBarFg = this.add.rectangle(0, 85, 200, 20, 0x00ff00);
        lifeBarFg.setOrigin(0, 0);
        lifeBarFg.setName('lifeBarFg');

        // Life text (shows current/max)
        const lifeText = this.add.text(0, 110, '', {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
        lifeText.setName('lifeText');

        // Add all to container
        this.statsContainer.add([nameText, lifeLabel, lifeBarBg, lifeBarFg, lifeText]);

        console.log('Stats display created');
    }

    private updateStatsDisplay(ship: Phaser.Physics.Arcade.Sprite) {
        const data = this.shipData.get(ship);
        if (!data) return;

        console.log('Updating stats display for ship:', data.name);

        // Update name
        const nameText = this.statsContainer.getByName('nameText') as Phaser.GameObjects.Text;
        nameText.setText(data.name);

        // Calculate life percentage
        const lifePercentage = data.currentLife / data.maxLife;

        // Update life bar
        const lifeBarFg = this.statsContainer.getByName('lifeBarFg') as Phaser.GameObjects.Rectangle;
        lifeBarFg.width = 200 * lifePercentage;

        // Update life text
        const lifeText = this.statsContainer.getByName('lifeText') as Phaser.GameObjects.Text;
        lifeText.setText(`${data.currentLife} / ${data.maxLife}`);

        // Show the container
        this.statsContainer.setVisible(true);
    }

    private hideStatsDisplay() {
        console.log('Hiding stats display');
        this.statsContainer.setVisible(false);
    }
}
