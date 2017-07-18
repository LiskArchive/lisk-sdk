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

var LiskJS = {};
LiskJS.crypto = require('../transactions/crypto');
LiskJS.dapp = require('../transactions/dapp');
LiskJS.multisignature = require('../transactions/multisignature');
LiskJS.signature = require('../transactions/signature');
LiskJS.delegate = require('../transactions/delegate');
LiskJS.transaction = require('../transactions/transaction');
LiskJS.transfer = require('../transactions/transfer');
LiskJS.vote = require('../transactions/vote');

/**
 * ParseOfflineRequest module provides automatic routing of new transaction requests which can be signed locally, and then broadcast without any passphrases being transmitted.
 *
 * @method ParseOfflineRequest
 * @param requestType
 * @param options
 * @main lisk
 */

function ParseOfflineRequest (requestType, options) {
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

ParseOfflineRequest.prototype.checkDoubleNamedAPI = function (requestType, options) {
	if (requestType === 'transactions' || requestType === 'accounts/delegates') {
		if (options && !options.hasOwnProperty('secret')) {
			requestType = 'getTransactions';
		}
	}

	return requestType;
};

/**
 * @method httpGETPUTorPOST
 * @param requestType string
 * @return string
 */

ParseOfflineRequest.prototype.httpGETPUTorPOST = function (requestType) {
	requestType = this.checkDoubleNamedAPI(requestType, this.options);

	var requestMethod;
	var requestIdentification =  {
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
		'transactions': 'PUT',
		'signatures': 'PUT',
		'delegates': 'PUT',
		'dapps': 'PUT',
		'multisignatures': 'POST'
	};

	if (!requestIdentification[requestType]) {
		requestMethod = 'GET';
	} else {
		requestMethod = requestIdentification[requestType];
	}

	return requestMethod;
};

/**
 * @method checkOfflineRequestBefore
 *
 * @return {object}
 */

ParseOfflineRequest.prototype.checkOfflineRequestBefore = function () {
	if (this.options && this.options.hasOwnProperty('secret')) {
		var accountKeys = LiskJS.crypto.getKeys(this.options['secret']);
		var accountAddress = LiskJS.crypto.getAddress(accountKeys.publicKey);
	}

	var OfflineRequestThis = this;
	var requestIdentification =  {
		'accounts/open': function () {
			return {
				requestMethod: 'GET',
				requestUrl: 'accounts?address='+accountAddress
			};
		},
		'accounts/generatePublicKey': function () {
			return {
				requestMethod: 'GET',
				requestUrl: 'accounts?address='+accountAddress
			};
		},
		'delegates/forging/enable': 'POST',
		'delegates/forging/disable': 'POST',
		'dapps/install': 'POST',
		'dapps/uninstall': 'POST',
		'dapps/launch': 'POST',
		'dapps/stop': 'POST',
		'multisignatures/sign': function () {
			var transaction = LiskJS.multisignature.signTransaction(OfflineRequestThis.options['transaction'], OfflineRequestThis.options['secret']);

			return {
				requestMethod: 'POST',
				requestUrl: 'signatures',
				params: { signature: transaction }
			};
		},
		'accounts/delegates': function () {
			var transaction = LiskJS.vote.createVote(OfflineRequestThis.options['secret'], OfflineRequestThis.options['delegates'], OfflineRequestThis.options['secondSecret'], OfflineRequestThis.options['timeOffset']);

			return {
				requestMethod: 'POST',
				requestUrl: 'transactions',
				params: { transaction: transaction }
			};
		},
		'transactions': function () {
			var transaction = LiskJS.transaction.createTransaction(OfflineRequestThis.options['recipientId'], OfflineRequestThis.options['amount'], OfflineRequestThis.options['secret'], OfflineRequestThis.options['secondSecret'], OfflineRequestThis.options['timeOffset']);

			return {
				requestMethod: 'POST',
				requestUrl: 'transactions',
				params: { transaction: transaction }
			};
		},
		'signatures': function () {
			var transaction = LiskJS.signature.createSignature(OfflineRequestThis.options['secret'], OfflineRequestThis.options['secondSecret'], OfflineRequestThis.options['timeOffset']);

			return {
				requestMethod: 'POST',
				requestUrl: 'transactions',
				params: { transaction: transaction }
			};
		},
		'delegates': function () {
			var transaction = LiskJS.delegate.createDelegate(OfflineRequestThis.options['secret'], OfflineRequestThis.options['username'], OfflineRequestThis.options['secondSecret'], OfflineRequestThis.options['timeOffset']);
			return {
				requestMethod: 'POST',
				requestUrl: 'transactions',
				params: { transaction: transaction }
			};
		},
		'dapps': function () {
			var DappOptions = {
				category: OfflineRequestThis.options['category'],
				name: OfflineRequestThis.options['name'],
				description: OfflineRequestThis.options['description'],
				tags: OfflineRequestThis.options['tags'],
				type: OfflineRequestThis.options['type'],
				link: OfflineRequestThis.options['link'],
				icon: OfflineRequestThis.options['icon'],
				secret: OfflineRequestThis.options['secret'],
				secondSecret: OfflineRequestThis.options['secondSecret']
			};

			var transaction = LiskJS.dapp.createDapp(DappOptions);

			return {
				requestMethod: 'POST',
				requestUrl: 'transactions',
				params: { transaction: transaction }
			};
		},
		'multisignatures': function () {
			var transaction = LiskJS.multisignature.createMultisignature(OfflineRequestThis.options['secret'], OfflineRequestThis.options['secondSecret'], OfflineRequestThis.options['keysgroup'], OfflineRequestThis.options['lifetime'], OfflineRequestThis.options['min'], OfflineRequestThis.options['timeOffset']);

			return {
				requestMethod: 'POST',
				requestUrl: 'transactions',
				params: { transaction: transaction }
			};
		}
	};

	return requestIdentification[this.requestType]();
};

/**
 * @method transactionOutputAfter
 * @param requestAnswer
 *
 * @return {object}
 */

ParseOfflineRequest.prototype.transactionOutputAfter = function (requestAnswer) {
	if (this.options['secret']) {
		var accountKeys = LiskJS.crypto.getKeys(this.options['secret']);
		var accountAddress = LiskJS.crypto.getAddress(accountKeys.publicKey);
	}

	var transformAnswer;
	var requestIdentification =  {
		'accounts/open': function () {
			if (requestAnswer.error === 'Account not found') {
				transformAnswer = {
					success: 'true',
					'account': {
						'address': accountAddress,
						'unconfirmedBalance': '0',
						'balance': '0',
						'publicKey': accountKeys.publicKey,
						'unconfirmedSignature': '0',
						'secondSignature': '0',
						'secondPublicKey': null,
						'multisignatures': null,
						'u_multisignatures': null
					}
				};
			} else {
				transformAnswer = requestAnswer;
			}

			return transformAnswer;
		},
		'accounts/generatePublicKey': function () {
			return {
				'success': 'true',
				'publicKey': accountKeys.publicKey
			};
		},
		'delegates/forging/enable': function () {
			return {
				'success': 'false',
				'error': 'Forging not available via offlineRequest'
			};
		},
		'delegates/forging/disable': function () {
			return {
				'success': 'false',
				'error': 'Forging not available via offlineRequest'
			};
		},
		'dapps/install': function () {
			return {
				'success': 'false',
				'error': 'Install dapp not available via offlineRequest'
			};
		},
		'dapps/uninstall': function () {
			return {
				'success': 'false',
				'error': 'Uninstall dapp not available via offlineRequest'
			};
		},
		'dapps/launch': function () {
			return {
				'success': 'false',
				'error': 'Launch dapp not available via offlineRequest'
			};
		},
		'dapps/stop': function () {
			return {
				'success': 'false',
				'error': 'Stop dapp not available via offlineRequest'
			};
		},
		'multisignatures/sign': function () {
			return requestAnswer;
		},
		'accounts/delegates': function () {
			return requestAnswer;
		},
		'transactions': function () {
			return requestAnswer;
		},
		'signatures': function () {
			return requestAnswer;
		},
		'delegates': function () {
			return requestAnswer;
		},
		'dapps': function () {
			return requestAnswer;
		},
		'multisignatures': function () {
			return requestAnswer;
		}
	};

	return requestIdentification[this.requestType]();
};

module.exports = ParseOfflineRequest;
