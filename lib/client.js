const axios = require('axios');

class Client {
	constructor(options) {
		if (typeof options === 'string') {
			options = {baseURL: options};
		}
		options = options || {};
		options.baseURL = options.baseURL || 'https://cupsdm.dolink.io/api';
		this.request = axios.create(options);
	}

	findRelease(where) {
		if (typeof where === 'string') {
			where = {model: where};
		}
		where = where || {};
		return this.request.get('releases', {params: {filter: {where}}}).then(res => res.data);
	}

	findDrivers(where) {
		if (typeof where === 'string') {
			where = {model: where};
		}
		where = where || {};
		return this.request.get('drivers', {params: {filter: {where}}}).then(res => res.data);
	}

	latestRelease() {
		return this.request.get('releases/latest').then(res => res.data);
	}

	latestDrivers(where) {
		if (typeof where === 'string') {
			where = {model: where};
		}
		where = where || {};
		return this.request.get('drivers/latest', {params: {filter: {where}}}).then(res => res.data);
	}

}

module.exports = Client;
