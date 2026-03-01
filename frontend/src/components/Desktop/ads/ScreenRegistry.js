export class ScreenRegistry {
    constructor(model) {
        this.screens = new Map();
        this._traverseAndDetect(model);
    }

    _traverseAndDetect(model) {
        model.traverse((child) => {
            if (child.isMesh && child.name && child.name.startsWith('ad_screen_')) {
                // Ensure unique material per screen so they don't share textures accidentally
                child.material = child.material.clone();
                this.screens.set(child.name, child);
            }
        });
    }

    getScreen(name) {
        return this.screens.get(name);
    }

    getAllScreens() {
        return Array.from(this.screens.values());
    }
}
