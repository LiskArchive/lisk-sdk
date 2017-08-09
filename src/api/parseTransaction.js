/*
 * Copyright © 2017 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */

/**
 * ParseOfflineRequest module provides automatic routing of new transaction requests which can be
 * signed locally, and then broadcast without any passphrases being transmitted.
 *
 * @method ParseOfflineRequest
 * @param requestType
 * @param options
 * @main lisk
 */

function ParseOfflineRequest(requestType, options) {
	if (!(this instanceof ParseOfflineRequest)) {
		return new ParseOfflineRequest(requestType, options);
	}

	this.requestType = requestType;
	this.options = options;
	this.requestMethod = this.httpGETPUTorPOST(requestType);
	this.params = '';

	return this;
}

/**
 * @method checkDoubleNamedAPI
 * @param requestType string
 * @param options
 * @return string
 */

ParseOfflineRequest.prototype.checkDoubleNamedAPI = function checkDoubleNamedAPI(
	requestType, options,
) {
	return (
		(requestType === 'transactions' || requestType === 'accounts/delegates')
		&& options && !options.secret
	)
		? 'getTransactions'
		: requestType;
};

/**
 * @method httpGETPUTorPOST
 * @param requestType string
 * @return string
 */

ParseOfflineRequest.prototype.httpGETPUTorPOST = function httpGETPUTorPOST(providedRequestType) {
	const requestType = this.checkDoubleNamedAPI(providedRequestType, this.options);

	let requestMethod;
	const requestIdentification = {
		'accounts/open': 'POST',
		'accounts/generatePublicKey': 'POST',
		'delegates/forging/enable': 'NOACTION',
		'delegates/forging/disable': 'NOACTION',
		'dapps/install': 'NOACTION',
		'dapps/uninstall': 'NOACTION',
		'dapps/launch': 'NOACTION',
		'dapps/stop': 'NOACTION',
		'multisignatures/sign': 'POST',
		'accounts/delegates': 'PUT',
		transactions: 'PUT',
		signatures: 'PUT',
		delegates: 'PUT',
		dapps: 'PUT',
		multisignatures: 'POST',
	};

	if (!requestIdentification[requestType]) {
		requestMethod = 'GET';
	} else {
		requestMethod = requestIdentification[requestType];
	}

	return requestMethod;
};

module.exports = ParseOfflineRequest;
