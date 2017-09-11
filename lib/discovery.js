const debug = require('debug')('cupsdm:discovery');
const _ = require('lodash');
const ncups = require('ncups');
const EventEmitter = require('events').EventEmitter;


const defaults = {
	checkInterval: 2 * 1000,
	nodeTimeout: 10 * 1000,
};

class Discovery extends EventEmitter {

	constructor(options) {
		super();
		this.settings = Object.assign({}, defaults, options);
		this.nodes = {};
	}

	async _discover() {
		const result = await ncups.discover();
		return _.flatten(_.values(result));
	}

	async check() {
		debug('check begin');

		const nodes = this.nodes;
		let items = await this._discover();

		const added = [];
		_.forEach(items, item => {
			let node = nodes[item.uri];
			if (!node) {
				node = nodes[item.uri] = {uri: item.uri, model: item.model, printer: item};
				added.push(node);
				debug('check', '-', 'add', node.uri);
			}
			node.lastSeen = Date.now();
		});

		if (!_.isEmpty(added)) {
			this.emit('added', added);
		}

		const outdated = [];
		_.forEach(nodes, (node, key) => {
			if (Date.now() - node.lastSeen > this.settings.nodeTimeout) {
				delete nodes[key];
				outdated.push(node);
				debug('check', '-', 'remove', node.uri);
			}
		});

		if (!_.isEmpty(outdated)) {
			this.emit('removed', outdated);
		}

		this.emit('checked', nodes, this);
		debug('check end');
	}

	_loopCheck() {
		this.checkTimer = setTimeout(async () => {
			this.checkTimer = null;

			await this.check();

			if (this._running) {
				this._loopCheck();
			}
		}, this.settings.checkInterval);
	}

	start() {
		if (this._running)
			return false;
		this._running = true;

		this._loopCheck();
	}

	stop() {
		if (!this._running) {
			return false;
		}
		this._running = false;

		if (this.checkTimer) {
			clearTimeout(this.checkTimer);
		}
	}
}

module.exports = Discovery;
