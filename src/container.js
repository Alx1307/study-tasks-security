export class Container {
    constructor() {
        this.services = new Map();
    }

    register(name, service) {
        this.services.set(name, service);
    }

    get(name) {
        if (!this.services.has(name)) {
            throw new Error(`Служба ${name} не зарегистрирована`);
        }
        return this.services.get(name);
    }
    
    has(name) {
        return this.services.has(name);
    }
}