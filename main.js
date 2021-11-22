'use strict';

const utils = require('@iobroker/adapter-core');
const { throws } = require('assert');
const FreeAtHomeApi = require('./lib/freeathome');

class Freeathome extends utils.Adapter {
    constructor(options) {
        super({
            ...options,
            name: 'freeathome',
        });
        this._registered = false;
        this._connected = false;
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        this._api = new FreeAtHomeApi(this);
        await this._api.start();
        this._connected = true;

        this.subscribeStates('*');
        this._interval = setInterval(function() {registerAllDevices()} ,8000);
    }

    onUnload(callback) {
        try {
            clearInterval(this._interval);
            this._api.stop();
            callback();
        } catch (e) {
            callback();
        }
    }

    async registerAllDevices() {
        if (this._connected && !this._registered) {
            const devices = await this._api.getAllDevices();

            if (Object.keys(devices).length > 0) {
                this._registered = true;
                for (const identifier in devices) {
                    const device = devices[identifier];
                    this.log.debug('Adding device to ioBroker: ' + JSON.stringify(device));
                    this._api.addDeviceToioBroker(device);
                }
            }
        }
    }

    async onStateChange(id, state) {
        if (state) {
            this.registerAllDevices();
            if (!state.ack) {
                const actuator = id.split('.');
                // TODO: I need to add logic here, to see what should really happen?
                // complete up, complete down or something in between
                this._api.set(actuator[2], actuator[3], actuator[4], state.val);
            }
            this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            this.log.debug(`state ${id} deleted`);
        }
    }
}

if (module.parent) {
    module.exports = (options) => new Freeathome(options);
} else {
    new Freeathome();
}
