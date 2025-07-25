import EventEmitter from 'events';

class Events extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(1000);
    }
}

const instance = new Events();

export { instance as Events };
