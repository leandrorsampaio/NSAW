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
                ship.body!.velocity.setTo(0, 0);
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
                (this.physics.world as any).destination.x,
                (this.physics.world as any).destination.y
            );

            if (this.selectedShip.body!.velocity.length() > 0 && distance < 4) {
                this.selectedShip.body!.velocity.setTo(0, 0);
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
