const debug = require('debug')('cupsdm:manager');
const _ = require('lodash');
const EventEmitter = require('events').EventEmitter;
const Registry = require('./registry');
const Discovery = require('./discovery');
const Installer = require('./installer');

class Manager extends EventEmitter {

	constructor(options) {
		super();
		options = options || {};

		this.registry = new Registry(options);
		this.installer = new Installer(this.registry);
		this.discovery = new Discovery(options.discovery);

		this.discovery.on('added', async nodes => await this._discovered(nodes));
		this.discovery.on('removed', async nodes => await this._disappeared(nodes));
	}

	async _install(model) {
		const child = await this.installer.install(model);
		//
		return child.promise;
	}

	async _discovered(nodes) {
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];

			debug(`lookup ${node.model}`);
			const model = await this.registry.lookup(node.model);
			if (!model.state) return;

			node.state = model.state;
			node.status = model.status;
			// state: ready, installing, resolving, supported, unsupported, error
			if (['installing', 'supported'].includes(model.state)) {
				debug(`discovered - ${node.model} -`, 'trying install driver for', );
				node.state = 'installing';
				node.status = null;
				try {
					await this._install(model);
					node.state = 'ready';
				} catch (e) {
					node.state = 'error';
					node.status = {message: e.message};
				}
			} else {
				debug(`discovered - ${node.model} -`, node.state);
			}
		}

		this.emit('up', nodes);
	}

	async _disappeared(node) {
		// no-op
	}

	start() {
		debug('start');
		return this.discovery.start();
	}

	stop() {
		debug('stop');
		return this.discovery.stop();
	}

}

module.exports = Manager;
