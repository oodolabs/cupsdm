const debug = require('debug')('cupsdm:manager');
const _ = require('lodash');
const ncups = require('ncups');
const EventEmitter = require('events').EventEmitter;
const Registry = require('./registry');
const Discovery = require('./discovery');
const Installer = require('./installer');

class Manager extends EventEmitter {

	/**
	 *
	 * @param {Object} [options]
	 * @param {Boolean} [options.auto] Whether auto install printer after the driver has been installed
	 * @param {Object} [options.discovery] The options for registry creation
	 */
	constructor(options) {
		super();
		options = options || {};

		this.autoAddPrinters = options.autoAddPrinters;

		this.registry = new Registry(options);
		this.installer = new Installer(this.registry);
		this.discovery = new Discovery(options.discovery);

		this.discovery.on('up', async nodes => await this._up(nodes));
		this.discovery.on('down', async nodes => await this._down(nodes));

		this.on('up', nodes => this.autoAddPrinters && this._addPrinters(nodes));
	}

	async _install(model) {
		const child = await this.installer.install(model);
		return child.promise;
	}

	async _up(nodes) {
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];

			debug(`lookup ${node.model}`);
			const model = await this.registry.lookup(node.model);
			if (!model.state) return;

			Object.assign(node, _.pick(model, ['state', 'status', 'driver']));
			// state: ready, installing, resolving, supported, notfound, error
			if (['installing', 'supported'].includes(model.state)) {
				debug(`discovered - ${node.model} -`, 'trying install driver');
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

	async _down(nodes) {
		this.emit('down', nodes);
	}

	async _addPrinters(nodes) {
		const printers = await ncups.list();
		const currents = _.map(printers, p => p.connection);
		const names = _.map(printers, p => p.name);
		nodes = nodes.filter(node => node.state === 'ready').filter(n => !currents.includes(n.printer.connection));
		debug('Adding new printers', nodes.map(n => n.printer.name));

		const installed = [];
		for (let i = 0; i < nodes.length; i++) {
			const n = nodes[i];
			const p = n.printer;
			const name = uniqueName(p.name, names);
			try {
				await ncups.install(p, {
					name,
					shared: true,
					driver: n.driver.driver
				});
				names.push(name);
				installed.push(p.name);
			} catch (e) {
			}
		}

		debug('Added new printers', installed);

		if (installed.length > 0) {
			this.emit('addPrinters', installed);
		}

		return installed;
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

function uniqueName(name, exists, num) {
	if (_.isEmpty(exists)) return name;
	const fixedName = num ? name + '-' + num : name;
	if (exists.includes(fixedName)) {
		return uniqueName(name, exists, num ? num + 1 : 1);
	}
	return fixedName;
}

module.exports = Manager;
