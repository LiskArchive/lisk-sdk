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

ParseOfflineRequest.prototype.checkDoubleNamedAPI = function (requestType, options) {

	if (requestType === 'transactions' || requestType === 'accounts/delegates') {
		if (options && !options.hasOwnProperty('secret')) {
			requestType = 'getTransactions';
		}
	}

	return requestType;

};

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
		'multisignatures/sign': 'NOACTION',
		'accounts/delegates': 'PUT',
		'transactions': 'PUT',
		'signatures': 'PUT',
		'delegates': 'PUT',
		'dapps': 'PUT',
		'multisignatures': 'NOACTION'
	};

	if (!requestIdentification[requestType]) {
		requestMethod = 'GET';
	} else {
		requestMethod = requestIdentification[requestType];
	}

	return requestMethod;
};

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
			return {
				requestMethod: 'GET',
				requestUrl: 'transactions/get?id=' + this.options['transactionId']
			};
		},
		'accounts/delegates': function () {
			var transaction = LiskJS.vote.createVote(OfflineRequestThis.options['secret'], OfflineRequestThis.options['delegates'], OfflineRequestThis.options['secondSecret'] );
			OfflineRequestThis.params = { transaction };

			return {
				requestMethod: 'POST',
				requestUrl: 'transactions',
				params: { transaction }
			};
		},
		'transactions': function () {
			var transaction = LiskJS.transaction.createTransaction(OfflineRequestThis.options['recipientId'], OfflineRequestThis.options['amount'], OfflineRequestThis.options['secret'], OfflineRequestThis.options['secondSecret']);

			OfflineRequestThis.params = { transaction };

			return {
				requestMethod: 'POST',
				requestUrl: 'transactions',
				params: { transaction }
			};
		},
		'signatures': function () {
			var transaction = LiskJS.signature.createSignature(OfflineRequestThis.options['secret'], OfflineRequestThis.options['secondSecret']);

			OfflineRequestThis.params = { transaction };

			return {
				requestMethod: 'POST',
				requestUrl: 'transactions',
				params: { transaction }
			};
		},
		'delegates': function () {
			var transaction = LiskJS.delegate.createDelegate(OfflineRequestThis.options['secret'], OfflineRequestThis.options['username'], OfflineRequestThis.options['secondSecret']);

			OfflineRequestThis.params = { transaction };

			return {
				requestMethod: 'POST',
				requestUrl: 'transactions',
				params: { transaction }
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

			OfflineRequestThis.params = { transaction };

			return {
				requestMethod: 'POST',
				requestUrl: 'transactions',
				params: { transaction }
			};
		},
		'multisignatures': 'PUT'
	};

	return requestIdentification[this.requestType]();
};

ParseOfflineRequest.prototype.transactionOutputAfter = function (requestAnswer) {
	if (this.options['secret']) {
		var accountKeys = LiskJS.crypto.getKeys(this.options['secret']);
		var accountAddress = LiskJS.crypto.getAddress(accountKeys.publicKey);
	}

	var transformAnswer;
	var OfflineRequestThis = this;

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
			}

			return transformAnswer;
		},
		'accounts/generatePublicKey': function () {
			transformAnswer = {
				'success': 'true',
				'publicKey': accountKeys.publicKey
			};
			return transformAnswer;
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
			var transactionObj = requestAnswer.transaction;

			var multiSigSignature = LiskJS.multisignature.signTransaction(transactionObj, OfflineRequestThis.options['secondSecret']);
			console.log(multiSigSignature);
		},
		'accounts/delegates': function () {
			return {
				request: requestAnswer
			};
		},
		'transactions': function () {
			return {
				request: requestAnswer
			};
		},
		'signatures': function () {
			return {
				request: requestAnswer
			};
		},
		'delegates': function () {
			return {
				request: requestAnswer
			};
		},
		'dapps': function () {
			return {
				request: requestAnswer
			};
		},
		'multisignatures': function () {
			console.log(OfflineRequestThis.options);

			var multisigTransction = LiskJS.multisignature.createMultisignature(OfflineRequestThis.options['secret'], OfflineRequestThis.options['secondSecret'], OfflineRequestThis.options['keysgroup'], OfflineRequestThis.options['lifetime'], OfflineRequestThis.options['min']);
			console.log(multisigTransction);

			return {
				'success': 'trying',
				'error': multisigTransction
			};
		}
	};

	return requestIdentification[this.requestType]();
};

module.exports = ParseOfflineRequest;
