const debug = require('debug')('cupsdm:discovery');
const _ = require('lodash');
const ncups = require('ncups');
const EventEmitter = require('events').EventEmitter;


const defaults = {
	checkInterval: 5 * 1000,
	nodeTimeout: 20 * 1000,
};

class Discovery extends EventEmitter {

	constructor(options) {
		super();
		this.settings = Object.assign({}, defaults, options);
		this.nodes = {};
	}

	async check() {
		debug('check begin');

		const nodes = this.nodes;
		let items = await ncups.discover({flat: true});

		const added = [];
		_.forEach(items, item => {
			let node = nodes[item.uri];
			if (!node) {
				node = nodes[item.uri] = {uri: item.uri, model: item.model, printer: item};
				added.push(node);
				debug('check', '-', 'up', node.uri);
			}
			node.lastSeen = Date.now();
		});

		if (!_.isEmpty(added)) {
			this.emit('up', added);
		}

		const outdated = [];
		_.forEach(nodes, (node, key) => {
			if (Date.now() - node.lastSeen > this.settings.nodeTimeout) {
				delete nodes[key];
				outdated.push(node);
				debug('check', '-', 'down', node.uri);
			}
		});

		if (!_.isEmpty(outdated)) {
			this.emit('down', outdated);
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
