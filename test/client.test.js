const {assert} = require('chai');
const Client = require('../lib/client');

describe('Client', () => {

	it('should find latest release', () => {
		const client = new Client();
		return client.latestRelease().then(release => {
			assert.isObject(release);
			assert.ok(release.builtAt);
		});
	});

	it('should find latest drivers by model', () => {
		const client = new Client();
		return client.latestDrivers('Brother DCP-1618W').then(drivers => {
			assert.lengthOf(drivers, 1);
		});
	});

	it('should find latest drivers match model', () => {
		const client = new Client();
		return client.latestDrivers({model: {like: 'Brother'}}).then(drivers => {
			assert.ok(drivers.length);
			drivers.forEach(driver => assert.include(driver.model, 'Brother'));
		});
	});
});
