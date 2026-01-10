import Phaser from 'phaser';

export class EnemyShip extends Phaser.Physics.Arcade.Sprite {
    public life: number = 4000;
    public shipName: string = 'USS Constellation';
    private path: Phaser.Math.Vector2[];
    private currentTarget: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, playableWidth: number, gameHeight: number) {
        super(scene, x, y, 'enemy_ship');

        const shipGraphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
        shipGraphics.fillStyle(0xffa500); // Orange color
        shipGraphics.fillRect(0, 0, 32, 32);
        shipGraphics.generateTexture('enemy_ship', 32, 32);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setInteractive();
        this.setCollideWorldBounds(true);

        this.path = this.generateZPath(playableWidth, gameHeight);
        this.moveToNextPoint();
    }

    private generateZPath(playableWidth: number, gameHeight: number): Phaser.Math.Vector2[] {
        const path = [];
        
        // Start at bottom right
        path.push(new Phaser.Math.Vector2(playableWidth - 50, gameHeight - 50));
        // Top right
        path.push(new Phaser.Math.Vector2(playableWidth - 50, 50));
        // Top left
        path.push(new Phaser.Math.Vector2(50, 50));
        // Bottom left
        path.push(new Phaser.Math.Vector2(50, gameHeight - 50));
        // Bottom right
        path.push(new Phaser.Math.Vector2(playableWidth - 50, gameHeight - 50));

        // Z back
        // Bottom left
        path.push(new Phaser.Math.Vector2(50, gameHeight - 50));
        // Top left
        path.push(new Phaser.Math.Vector2(50, 50));
        // Top right
        path.push(new Phaser.Math.Vector2(playableWidth - 50, 50));
        // Start at bottom right
        path.push(new Phaser.Math.Vector2(playableWidth - 50, gameHeight - 50));

        return path;
    }

    private moveToNextPoint() {
        if (this.currentTarget >= this.path.length) {
            this.currentTarget = 0;
        }

        const target = this.path[this.currentTarget];
        this.scene.physics.moveTo(this, target.x, target.y, 100);
        this.currentTarget++;
    }

    update() {
        if (this.body && this.body.velocity.length() > 0) {
            const distance = Phaser.Math.Distance.Between(
                this.x,
                this.y,
                this.path[this.currentTarget - 1].x,
                this.path[this.currentTarget - 1].y
            );

            if (distance < 4) {
                this.moveToNextPoint();
            }
        }
    }
}
