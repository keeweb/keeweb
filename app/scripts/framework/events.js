import EventEmitter from 'events';

class Events extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100);
    }
}

const instance = new Events();

export { instance as Events };
