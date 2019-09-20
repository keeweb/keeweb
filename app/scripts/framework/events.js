import EventEmitter from 'events';

class Events extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(1000);
    }
}

const instance = new Events();

global.Events = instance;

export { instance as Events };
