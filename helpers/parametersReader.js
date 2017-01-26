'use strict';

var parametersReader = {};

parametersReader.convertToAddressList = function (addresses, optPort) {
	return typeof addresses !== 'string' ? [] :
		addresses.split(',').map(function (address) {
			address = address.split(':');
			return {
				ip: address.shift(),
				port: address.shift() || optPort
			};
		});
};

module.exports = parametersReader;
