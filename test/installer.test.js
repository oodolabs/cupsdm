require("chai").use(require("chai-as-promised"));

const path = require('path');
const {assert} = require('chai');
const Installer = require('../lib/installer');
const s = require('./support');

const INSTALL_SCRIPT_PATH = path.resolve(__dirname, 'fixtures', 'mock-driver', 'install.sh');

describe('Installer', function () {
	this.timeout(30000);

	describe('mock local drivers', () => {
		let installer;

		before(() => {
			installer = new Installer(s.createRegistry());

		});

		after(() => {
			s.restore(installer.registry.findLocal);
		});

		it('should install successful for correct driver library', async () => {
			s.stub(installer.registry, 'findLocal', () => ({
				"id": "MOCK:MODEL;MDL:MOCK-MODEL;",
				"makeAndModel": "Mock Model",
				"lang": "en",
				"driver": "Library/Printers/PPDs/Contents/Resources/Mock Model.gz"
			}));
			const child = await installer.install({
				state: 'supported',
				model: 'Mock Model',
				info: {
					model: 'Mock Model',
					maker: 'Mocker',
					driver: 'Mock_for_CUPS',
					version: '0.1',
					scripts: {
						install: `file://${INSTALL_SCRIPT_PATH}`
					}
				}
			});

			let stdout = '';
			let stderr = '';

			child.stdout.on('data', data => stdout += data.toString());
			child.stderr.on('data', data => stderr += data.toString());

			await child.promise;
			assert.equal('begin\nend\n', stdout);
		});
	});


	it('should throw error for installed a incorrect driver library', async () => {
		const installer = new Installer(s.createRegistry());
		const child = await installer.install({
			state: 'supported',
			model: 'Mock Model',
			info: {
				model: 'Mock Model',
				maker: 'Mocker',
				driver: 'Mock_for_CUPS',
				version: '0.1',
				scripts: {
					install: `file://${INSTALL_SCRIPT_PATH}`
				}
			}
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', data => stdout += data.toString());
		child.stderr.on('data', data => stderr += data.toString());

		return assert.isRejected(child.promise, /not find driver for model/);
	});
});
