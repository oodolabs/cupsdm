const {assert} = require('chai');
const s = require('./support');

describe('Registry', function () {
	this.timeout(30000);

	it('should lookup supported model', async () => {
		const registry = s.createRegistry();
		const result = await registry.lookup('HP Deskjet 5820 Series');
		console.log(result);
		assert.equal(result.state, 'supported');
	});

	it('should lookup notfound model', async function () {
		const registry = s.createRegistry();
		const r1 = await registry.lookup('Unknown Printer');
		console.log(r1);
		assert.equal('notfound', r1.state);
		const r2 = await registry.lookup('Unknown Printer');
		console.log(r2);
		assert.equal('notfound', r2.state);
		assert.equal(r1.ts, r2.ts);
		const r3 = await registry.lookup('Unknown Printer', true);
		console.log(r3);
		assert.equal('notfound', r3.state);
		assert.ok(r3.ts > r2.ts);
	});
});
