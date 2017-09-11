const path = require('path');
const {assert} = require('chai');
const PromiseA = require('bluebird');
const Discovery = require('../lib/discovery');

const PRINTERS_1 = [{
	uri: 'a'
}, {
	uri: 'b'
}];

const PRINTERS_2 = [{
	uri: 'b'
}, {
	uri: 'c'
}];

describe('Discovery', function () {
	this.timeout(20000);

	it('should emit "added" and "removed" event for checking', async () => {
		const added = [];
		const removed = [];

		const discovery = new Discovery({nodeTimeout: 100});
		discovery.on('added', nodes => added.push(...nodes));
		discovery.on('removed', nodes => removed.push(...nodes));

		discovery._discover = () => PRINTERS_1;
		await discovery.check();

		assert.lengthOf(added, 2);
		assert.lengthOf(removed, 0);

		assert.lengthOf(Object.keys(discovery.nodes), 2);

		await PromiseA.delay(200);

		discovery._discover = () => PRINTERS_2;
		await discovery.check();

		assert.lengthOf(added, 3);
		assert.lengthOf(removed, 1);

		assert.lengthOf(Object.keys(discovery.nodes), 2);
	});

	it('should start a check daemon', done => {
		let cycle = 0;
		const added = [];
		const removed = [];

		const discovery = new Discovery({nodeTimeout: 100, checkInterval: 200});
		discovery.on('added', nodes => added.push(...nodes));
		discovery.on('removed', nodes => removed.push(...nodes));
		discovery.on('checked', () => {
			cycle++;
			if (cycle === 1) {
				assert.lengthOf(added, 2);
				assert.lengthOf(removed, 0);
				assert.lengthOf(Object.keys(discovery.nodes), 2);

				discovery._discover = () => PRINTERS_2;
			} else if (cycle === 2) {
				assert.lengthOf(added, 3);
				assert.lengthOf(removed, 1);
				assert.lengthOf(Object.keys(discovery.nodes), 2);
			} else {
				discovery.stop();
				done();
			}
		});

		discovery._discover = () => PRINTERS_1;
		discovery.start();
	});

});
