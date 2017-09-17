const {assert} = require('chai');
const _ = require('lodash');
const ncups = require('ncups');
const s = require('./support');
const Manager = require('../lib/manager');

const DEVICES = {
	direct:
		[{
			isDefault: false,
			shared: false,
			defaultMedia: 'A4',
			driverPCL: 'drv:///sample.drv/generpcl.ppd',
			driverPS: 'drv:///sample.drv/generic.ppd',
			driverOrPpd: false,
			name: 'Brother_DCP_1618W',
			uri: undefined,
			options: null,
			uri: 'usb://Brother/DCP-1618W?serial=E74215E7N785260',
			uri_pretty: 'usb://Brother/DCP-1618W?serial=E74215E7N785260',
			protocol: 'usb',
			description: 'Brother DCP-1618W',
			model: 'Brother DCP-1618W',
			location: ''
		}, {
			isDefault: false,
			shared: false,
			defaultMedia: 'A4',
			driverPCL: 'drv:///sample.drv/generpcl.ppd',
			driverPS: 'drv:///sample.drv/generic.ppd',
			driverOrPpd: false,
			name: 'Unsupported_Printer',
			uri: undefined,
			options: null,
			uri: 'usb://Unsupported?serial=E74215E7N785260',
			uri_pretty: 'usb://Unsupported?serial=E74215E7N785260',
			protocol: 'usb',
			description: 'Unsupported',
			model: 'Unsupported',
			location: ''
		}],
	network:
		[{
			isDefault: false,
			shared: false,
			defaultMedia: 'A4',
			driverPCL: 'drv:///sample.drv/generpcl.ppd',
			driverPS: 'drv:///sample.drv/generic.ppd',
			driverOrPpd: false,
			name: 'Brother_DCP_1618W',
			uri: undefined,
			options: null,
			uri: 'dnssd://Brother%20DCP-1618W._pdl-datastream._tcp.local./?uuid=e3248000-80ce-11db-8000-d80f99371c36',
			uri_pretty: 'dnssd://Brother DCP-1618W._pdl-datastream._tcp.local./?uuid=e3248000-80ce-11db-8000-d80f99371c36',
			protocol: 'dnssd',
			description: 'Brother DCP-1618W',
			model: 'Brother DCP-1618W',
			location: ''
		}, {
			isDefault: false,
			shared: false,
			defaultMedia: 'A4',
			driverPCL: 'drv:///sample.drv/generpcl.ppd',
			driverPS: 'drv:///sample.drv/generic.ppd',
			driverOrPpd: false,
			name: 'Brother_DCP_1618W_2',
			uri: undefined,
			options: null,
			uri: 'dnssd://Brother%20DCP-1618W._pdl-datastream._tcp.local./?uuid=e3248000-80ce-11db-8000-d80f99371c37',
			uri_pretty: 'dnssd://Brother DCP-1618W._pdl-datastream._tcp.local./?uuid=e3248000-80ce-11db-8000-d80f99371c37',
			protocol: 'dnssd',
			description: 'Brother DCP-1618W',
			model: 'Brother DCP-1618W',
			location: ''
		}]
};

describe('Manager', function () {
	this.timeout(120000);

	before(() => {
		s.cleanup();
	});

	after(() => {
		s.restore(ncups.discover);
	});

	it('should emit `up` event when discovered printers', done => {
		s.stub(ncups, 'discover', () => DEVICES);

		const manager = new Manager({dir: s.CUPSDM_DIR});
		manager.on('up', nodes => {
			manager.stop();

			_.forEach(nodes, node => {
				if (node.model === 'Unsupported') {
					assert.equal('notfound', node.state);
				} else {
					assert.equal('ready', node.state);
				}
			});

			assert.deepEqual(
				_.flatten(_.values(DEVICES)),
				_.map(nodes, node => node.printer)
			);

			done();
		});

		manager.start();
	});
});
