const debug = require('debug')('cupsdm:registry');
const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const _ = require('lodash');
const ncups = require('ncups');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const Client = require('./client');

const ONE_DAY = 24 * 60 * 60 * 1000;

class Registry {
	constructor(dir, options) {
		if (typeof dir === 'object') {
			options = dir;
			dir = null;
		}
		options = options || {};
		this.ttl = options.ttl || ONE_DAY;
		this.dir = dir = dir || options.dir || path.resolve(os.homedir, '.cupsdm');
		fs.ensureDirSync(dir);
		// create models database
		this.cache = this._loadCache(dir);
		// create cupsdm api client
		this.client = new Client(options.client);
	}

	_loadCache(dir) {
		const cache = low(new FileSync(path.resolve(dir, 'cache.json')));
		if (!cache.has('models').value()) {
			cache.set('models', {}).write();
		}
		if (!cache.has('release').value()) {
			cache.set('release', {}).write();
		}
		return cache;
	}

	_getModel(name) {
		return this.cache.get('models').get(name).value();
	}

	_setModel(name, data) {
		Object.assign(data, {ts: Date.now()});
		this.cache.get('models').set(name, data).write();
	}

	async findLocal(model) {
		const drivers = await ncups.findDrivers(model);
		if (_.isArray(drivers)) {
			return drivers[0];
		}
	}

	async findRemote(model) {
		const infos = await this.client.latestDrivers({model: {like: model}});
		if (_.isArray(infos)) {
			return infos[0];
		}
	}

	async update(model, state, status) {
		assert(model, 'model is required');
		const name = _.isString(model) ? model : model.model;
		if (_.isObject(model)) {
			model.state = state;
			model.status = status;
		}
		const data = this._getModel(name) || {};
		Object.assign(data, {state, status});
		this._setModel(name, data);
	}

	async lookup(model, options) {
		debug('lookup', '-', model,);
		// 1. lookup from cache
		debug('lookup', '-', model, '-', 'lookup from cache');
		if (_.isBoolean(options)) {
			options = {force: options};
		}
		options = options || {};
		const {force} = options;

		const item = this._getModel(model);
		if (item) {
			const timeout = !item.ts || (Date.now() - item.ts > this.ttl);
			debug('lookup', '-', model, '-', 'hit from cache' + (timeout ? ', but it\'s timeout' : ''));
			if (!timeout) {
				if (['ready', 'resolving', 'supported', 'installing'].includes(item.state)) {
					return item;
				}

				if (!force && item.state === 'unsupported') {
					return item;
				}
			}
		}

		let answer;

		// 2. lookup from local driver
		debug('lookup', '-', model, '-', 'lookup from installed drivers');
		let driver = await this.findLocal(model);
		if (driver) {
			debug('lookup', '-', model, '-', 'found driver', driver);
				answer = {state: 'ready', model, driver};
			this._setModel(model, answer);
			return answer;
		}

		// 3. lookup from cupsdm service
		debug('lookup', '-', model, '-', 'lookup from cupsdm service');
		answer = {state: 'resolving', ts: Date.now()};
		this._setModel(model, answer);

		const info = await this.findRemote(model);
		if (info) {
			debug('lookup', '-', model, '-', 'found driver info');
			Object.assign(answer, {state: 'supported', model, info});
			if (info.compatible) {
				answer.compatible = info.compatible;
				driver = await this.findLocal(model);
				if (driver) {
					Object.assign(answer, {state: 'ready', driver});
				}
			}
			Object.assign(answer, {ts: Date.now()});
			this._setModel(model, answer);
			return answer;
		}

		debug('lookup', '-', model, '-', 'unsupported');
		Object.assign(answer, {state: 'unsupported', ts: Date.now()});
		this._setModel(model, answer);

		return answer;
	}

}

module.exports = Registry;
