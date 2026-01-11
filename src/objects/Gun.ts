export class Gun {
    public range: number;
    public fireRate: number; // shots per minute
    public accuracy: number; // 0 to 1
    public damage: number;
    private lastShotTime: number = 0;

    constructor(range: number, fireRate: number, accuracy: number, damage: number) {
        this.range = range;
        this.fireRate = fireRate;
        this.accuracy = accuracy;
        this.damage = damage;
    }

    canFire(currentTime: number): boolean {
        const timeSinceLastShot = currentTime - this.lastShotTime;
        const fireInterval = 60000 / this.fireRate; // in milliseconds
        return timeSinceLastShot >= fireInterval;
    }

    fire(currentTime: number) {
        this.lastShotTime = currentTime;
    }
}
