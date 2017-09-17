'use strict';

const Manager = require('./lib/manager');

exports.createManger = function () {
	return new Manager(...arguments);
};

exports.Manager = Manager;
