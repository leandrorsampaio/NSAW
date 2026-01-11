import Phaser from 'phaser';

export class EnemyShip extends Phaser.Physics.Arcade.Sprite {
    public life: number = 4000;
    public shipName: string = 'USS Constellation';
    public isDead: boolean = false;
    private tween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number, playableWidth: number, gameHeight: number) {
        super(scene, x, y, 'enemy_ship');

        const shipGraphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
        shipGraphics.fillStyle(0xffa500); // Orange color
        shipGraphics.fillRect(0, 0, 32, 32);
        shipGraphics.generateTexture('enemy_ship', 32, 32);
        shipGraphics.destroy();

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setInteractive();
        this.setCollideWorldBounds(true);

        this.startPatrol(playableWidth, gameHeight);
    }

    private startPatrol(playableWidth: number, gameHeight: number) {
        const margin = 100;
        const speed = 20000; // Duration in ms

        const path = new Phaser.Curves.Path(this.x, this.y);
        path.lineTo(playableWidth - margin, margin);
        path.lineTo(margin, margin);
        path.lineTo(margin, gameHeight - margin);
        path.lineTo(this.x, this.y);

        const follower = { t: 0, vec: new Phaser.Math.Vector2() };
        this.tween = this.scene.tweens.add({
            targets: follower,
            t: 1,
            ease: 'Linear',
            duration: speed,
            yoyo: true,
            repeat: -1
        });

        this.scene.events.on('update', () => {
            if (this.isDead) {
                this.tween?.stop();
                return;
            }
            path.getPoint(follower.t, follower.vec);
            this.setPosition(follower.vec.x, follower.vec.y);
        });
    }
}

