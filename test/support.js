const path = require('path');
const fs = require('fs-extra');
const Registry = require('../lib/registry');

const CUPSDM_DIR = exports.CUPSDM_DIR = path.resolve(__dirname, '.cupsdm');

exports.cleanup = () => fs.removeSync(CUPSDM_DIR);

exports.createRegistry = options => new Registry(CUPSDM_DIR, options);

exports.stub = (subject, method, fn) => {
	const m = subject[method];
	if (!m) throw new Error(`Not found method "${method}" on subject`);
	const stub = function () {
		return fn(...arguments);
	};
	stub.__original__ = m.__original__ || m;
	stub.restore = () => subject[method] = stub.__original__;
	subject[method] = stub;
};

exports.restore = fn => fn && fn.restore && fn.restore();
