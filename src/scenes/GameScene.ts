import Phaser from 'phaser';
import { EnemyShip } from '../objects/EnemyShip';
import { Gun } from '../objects/Gun';

interface ShipData {
    name: string;
    maxLife: number;
    currentLife: number;
    guns: Gun[];
    isDead: boolean;
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
    private gunRangeGraphics!: Phaser.GameObjects.Graphics;

    // Ship data
    private shipData: Map<Phaser.Physics.Arcade.Sprite, ShipData> = new Map();
    private ships: Phaser.Physics.Arcade.Sprite[] = [];
    private enemyShips: EnemyShip[] = [];

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
        // Calculate dimensions
        this.sidebarWidth = this.scale.width * 0.2; // 20% of screen
        this.playableWidth = this.scale.width * 0.8; // 80% for gameplay

        // Set physics world bounds to playable area only
        this.physics.world.setBounds(0, 0, this.playableWidth, this.scale.height);

        // Create the sidebar background
        this.sidebar = this.add.rectangle(
            this.playableWidth,
            0,
            this.sidebarWidth,
            this.scale.height,
            0x333333
        );
        this.sidebar.setOrigin(0, 0);
        this.sidebar.setScrollFactor(0);

        // Graphics for gun range
        this.gunRangeGraphics = this.add.graphics();

        // Add a ship to the scene
        const playerShip = this.physics.add.sprite(200, 200, 'ship');
        playerShip.setTint(0x0000ff);
        playerShip.setInteractive();
        playerShip.setCollideWorldBounds(true);
        this.ships.push(playerShip);

        const playerGun = new Gun(200, 30, 0.5, 50);
        this.shipData.set(playerShip, {
            name: 'BR Tamandaré',
            maxLife: 2000,
            currentLife: 1800,
            guns: [playerGun],
            isDead: false
        });

        const enemyShip = new EnemyShip(this, this.playableWidth - 50, this.scale.height - 50, this.playableWidth, this.scale.height);
        this.enemyShips.push(enemyShip);
        const enemyGun = new Gun(200, 30, 0.5, 50);
        this.shipData.set(enemyShip, {
            name: enemyShip.shipName,
            maxLife: enemyShip.life,
            currentLife: enemyShip.life,
            guns: [enemyGun],
            isDead: false
        });

        this.createStatsDisplay();

        // --- Event Handlers ---
        playerShip.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.button === 0) {
                this.selectShip(playerShip);
                const body = playerShip.body as Phaser.Physics.Arcade.Body;
                body.velocity.setTo(0, 0);
                this.movingShip = null;
            }
        });

        enemyShip.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.button === 0) {
                this.selectShip(enemyShip);
            }
        });

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.button !== 0) {
                return;
            }

            const clickWasOnShip = this.ships.some(s => s.getBounds().contains(pointer.worldX, pointer.worldY));
            const clickWasOnEnemyShip = this.enemyShips.some(s => s.getBounds().contains(pointer.worldX, pointer.worldY));

            if (clickWasOnShip || clickWasOnEnemyShip) {
                return;
            }

            if (pointer.x < this.playableWidth) {
                if (this.selectedShip && !this.enemyShips.includes(this.selectedShip as EnemyShip)) {
                    const shipData = this.shipData.get(this.selectedShip);
                    if (shipData && !shipData.isDead) {
                        this.destination.set(pointer.worldX, pointer.worldY);
                        this.physics.moveTo(this.selectedShip, pointer.worldX, pointer.worldY, this.shipSpeed);
                        this.movingShip = this.selectedShip;
                        this.deselectShip();
                    }
                }
            } else {
                this.deselectShip();
            }
        });

        this.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
            body.velocity.setTo(0, 0);
            if (this.movingShip && this.movingShip.body === body) {
                this.movingShip = null;
            }
        });
    }

    update(time: number) {
        if (this.movingShip && this.movingShip.body) {
            const body = this.movingShip.body as Phaser.Physics.Arcade.Body;
            if (body.velocity.length() > 0) {
                const distance = Phaser.Math.Distance.Between(
                    this.movingShip.x,
                    this.movingShip.y,
                    this.destination.x,
                    this.destination.y
                );
                if (distance < 4) {
                    body.velocity.setTo(0, 0);
                    this.movingShip = null;
                }
            }
        }

        this.ships.forEach(ship => {
            this.enemyShips.forEach(enemy => {
                this.handleShooting(ship, enemy, time);
                this.handleShooting(enemy, ship, time);
            });
        });
    }

    handleShooting(shooter: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite, time: number) {
        const shooterData = this.shipData.get(shooter);
        const targetData = this.shipData.get(target);

        if (!shooterData || !targetData || shooterData.isDead || targetData.isDead) {
            return;
        }

        const distance = Phaser.Math.Distance.Between(shooter.x, shooter.y, target.x, target.y);

        shooterData.guns.forEach(gun => {
            if (distance <= gun.range && gun.canFire(time)) {
                gun.fire(time);
                if (Math.random() < gun.accuracy) {
                    this.applyDamage(target, gun.damage);
                }
            }
        });
    }

    applyDamage(ship: Phaser.Physics.Arcade.Sprite, damage: number) {
        const shipData = this.shipData.get(ship);
        if (shipData && !shipData.isDead) {
            shipData.currentLife -= damage;
            if (shipData.currentLife <= 0) {
                shipData.currentLife = 0;
                this.killShip(ship);
            }
            this.updateStatsDisplay(ship);
        }
    }

    killShip(ship: Phaser.Physics.Arcade.Sprite) {
        const shipData = this.shipData.get(ship);
        if (shipData) {
            shipData.isDead = true;
            ship.setTint(0x808080); // Gray
            ship.disableInteractive();

            if (this.enemyShips.includes(ship as EnemyShip)) {
                (ship as EnemyShip).destroy();
            } else {
                const body = ship.body as Phaser.Physics.Arcade.Body;
                body.velocity.setTo(0, 0);
            }
        }
    }

    private selectShip(ship: Phaser.Physics.Arcade.Sprite) {
        const shipData = this.shipData.get(ship);
        if (shipData && shipData.isDead) {
            this.deselectShip();
            return;
        }

        if (this.selectedShip) {
            this.deselectShip();
        }

        this.selectedShip = ship;
        this.selectedShip.setTint(0x00ff00);

        this.updateStatsDisplay(ship);
        this.drawGunRange(ship);
    }

    private deselectShip() {
        this.gunRangeGraphics.clear();
        if (this.selectedShip) {
            const shipData = this.shipData.get(this.selectedShip);
            if (shipData && !shipData.isDead) {
                if (this.enemyShips.includes(this.selectedShip as EnemyShip)) {
                    this.selectedShip.clearTint();
                } else {
                    this.selectedShip.setTint(0x0000ff);
                }
            }
            this.selectedShip = null;
            this.hideStatsDisplay();
        }
    }

    private drawGunRange(ship: Phaser.Physics.Arcade.Sprite) {
        const shipData = this.shipData.get(ship);
        if (shipData && shipData.guns.length > 0) {
            this.gunRangeGraphics.clear();
            this.gunRangeGraphics.lineStyle(1, 0xff0000, 0.5);
            this.gunRangeGraphics.strokeCircle(ship.x, ship.y, shipData.guns[0].range);
        }
    }

    private createStatsDisplay() {
        this.statsContainer = this.add.container(this.playableWidth + 20, 50);
        this.statsContainer.setScrollFactor(0);
        this.statsContainer.setVisible(false);

        const nameText = this.add.text(0, 0, '', { fontSize: '20px', color: '#ffffff', fontFamily: 'Arial' });
        nameText.setName('nameText');

        const lifeLabel = this.add.text(0, 50, 'Life:', { fontSize: '16px', color: '#ffffff', fontFamily: 'Arial' });

        const lifeBarBg = this.add.rectangle(0, 85, 200, 20, 0xff0000);
        lifeBarBg.setOrigin(0, 0);
        lifeBarBg.setName('lifeBarBg');

        const lifeBarFg = this.add.rectangle(0, 85, 200, 20, 0x00ff00);
        lifeBarFg.setOrigin(0, 0);
        lifeBarFg.setName('lifeBarFg');

        const lifeText = this.add.text(0, 110, '', { fontSize: '14px', color: '#ffffff', fontFamily: 'Arial' });
        lifeText.setName('lifeText');

        this.statsContainer.add([nameText, lifeLabel, lifeBarBg, lifeBarFg, lifeText]);
    }

    private updateStatsDisplay(ship: Phaser.Physics.Arcade.Sprite) {
        const data = this.shipData.get(ship);
        if (!data) return;

        const nameText = this.statsContainer.getByName('nameText') as Phaser.GameObjects.Text;
        nameText.setText(data.name);

        const lifePercentage = data.currentLife / data.maxLife;
        const lifeBarFg = this.statsContainer.getByName('lifeBarFg') as Phaser.GameObjects.Rectangle;
        lifeBarFg.width = 200 * lifePercentage;

        const lifeText = this.statsContainer.getByName('lifeText') as Phaser.GameObjects.Text;
        lifeText.setText(`${data.currentLife} / ${data.maxLife}`);

        this.statsContainer.setVisible(true);
    }

    private hideStatsDisplay() {
        this.statsContainer.setVisible(false);
    }
}
