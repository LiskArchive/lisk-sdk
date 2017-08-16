'use strict';

module.exports = {
	INVALID_HEADERS: 4100,
	INCOMPATIBLE_NONCE: 4101,
	INCOMPATIBLE_NETWORK: 4102,
	INCOMPATIBLE_VERSION: 4103,
	ALREADY_ADDED: 4104,
	DIFFERENT_CONN_ID: 4105,
	ON_MASTER_ERROR: 4106
};

module.exports.errorMessages = {
	4100: 'Invalid headers',
	4101: 'Request is made by itself',
	4102: 'Request is made on the wrong network',
	4103: 'Request is made from incompatible version',
	4104: 'Attempt to insert already active peer',
	4105: 'Attempt to change peer data from different connection',
	4106: 'Error occurred during update on master process'
};
