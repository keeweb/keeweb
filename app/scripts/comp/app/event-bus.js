import EventEmitter from 'events';

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100);
    }
}

const instance = new EventBus();

export { instance as EventBus };
