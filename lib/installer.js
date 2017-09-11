const debug = require('debug')('cupsdm:installer');
const path = require('path');
const fs = require('fs-extra');
const assert = require("assert");
const _ = require('lodash');
const {spawn} = require('child_process');
const download = require('download');
const PromiseA = require('bluebird');
const errs = require('errs');

const INSTALLINGS = {};

class Installer {
	constructor(registry) {
		this.registry = registry;
	}

	async _fetchScript(info, name) {
		const dir = path.resolve(this.registry.dir, info.maker, info.driver);
		const filename = path.resolve(dir, `${name}`);
		const url = info.scripts[name];
		let data;
		if (_.startsWith(url, 'file://')) {
			data = fs.readFileSync(url.substr(7));
		} else {
			data = await download(info.scripts[name]);
		}

		fs.ensureDirSync(dir);
		fs.writeFileSync(filename, data);
		return filename;
	}

	async _install(model) {
		let status = {task: 'fetch', ts: Date.now()};
		this.registry.update(model, 'installing', status);


		debug('install', '-', model.model, '-', 'fetching installation script');
		const file = await this._fetchScript(model.info, 'install');

		debug('install', '-', model.model, '-', 'running installation script');
		const start = Date.now();
		status = {task: 'run', ts: start, start};
		this.registry.update(model, 'installing', status);

		const child = spawn('bash', [file]);

		child.promise = new PromiseA((resolve, reject) => {
			let lastUpdate = start;
			child.stdout.on('data', async () => {
				Object.assign(status, {ts: Date.now(), lastUpdate});
				await this.registry.update(model, 'installing', status);
				lastUpdate = Date.now();
			});

			let stderr = '';
			child.stderr.on('data', data => stderr += data.toString());
			child.on('close', async code => {
				if (code) { // fail
					const error = {
						code: 'INSTALL_FAIL',
						message: stderr
					};
					this.registry.update(model, 'error', error);
					debug('install', '-', model.model, '-', error);
					return reject(errs.create(error));
				}

				const modelToUse = model.info.compatible || model.model;
				const driver = await this.registry.findLocal(modelToUse);
				if (!driver) {
					const tag = model.info.compatible ? '[compatible]' : '';
					const message = `The driver library has been installed, but can not find driver for model ${modelToUse} ${tag}`;
					const error = {
						code: 'MODEL_MISSING',
						message
					};
					this.registry.update(model, 'error', error);
					debug('install', '-', model.model, '-', error);
					return reject(errs.create(error));
				}

				this.registry.update(model, 'ready');
				debug('install', '-', model.model, '-', 'installed');
				resolve();
			});
		});

		return child;
	}

	/**
	 * Install driver for model
	 *
	 * @param {Object} model The model name or model object
	 * @returns {Promise.<ChildProcess>|undefined}
	 */
	async install(model) {
		assert(model, 'model is required');

		if (_.isString(model)) {
			model = await this.registry.lookup(model);
		}

		if (INSTALLINGS[model.model]) {
			debug('install', '-', model.model, '-', 'hit installing model');
			return INSTALLINGS[model.model];
		}

		if (!model.state || ['ready', 'unsupported'].includes(model.state) || !model.info) {
			debug('install', '-', model.model, '-', model.state);
			return;
		}

		if (!_.has(model.info, 'scripts.install')) {
			throw new Error(`No install script found for model "${model.model}"`);
		}

		const promise = PromiseA.resolve(this._install(model));
		INSTALLINGS[model.model] = promise;
		promise.finally(() => delete INSTALLINGS[model.model]);
		return promise;
	}

}

module.exports = Installer;
