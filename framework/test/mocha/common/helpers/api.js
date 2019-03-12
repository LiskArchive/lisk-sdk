/*
 * Copyright © 2018 Lisk Foundation
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
 */

'use strict';

const {
	transfer,
	registerDelegate: createRegisterDelegate,
	utils: transactionUtils,
} = require('@liskhq/lisk-transactions');
const Promise = require('bluebird');
const accountFixtures = require('../../fixtures/accounts');
const {
	calculateApproval,
} = require('../../../../src/modules/http_api/helpers/utils');
const SwaggerSpec = require('../swagger_spec');

const http = {
	abstractRequest(options, done) {
		const request = __testContext.api[options.verb.toLowerCase()](options.path);

		request.set('Accept', 'application/json');
		request.expect(response => {
			if (
				response.statusCode !== 204 &&
				(!response.headers['content-type'] ||
					response.headers['content-type'].indexOf('json') === -1)
			) {
				return new Error('Unexpected content-type!');
			}

			return null;
		});

		if (options.params) {
			request.send(options.params);
		}

		const verb = options.verb.toUpperCase();
		__testContext.debug(['> Path:'.grey, verb, options.path].join(' '));
		if (verb === 'POST' || verb === 'PUT') {
			__testContext.debug(
				['> Data:'.grey, JSON.stringify(options.params)].join(' ')
			);
		}

		if (done) {
			return request.end((err, res) => {
				__testContext.debug(
					'> Status:'.grey,
					JSON.stringify(res ? res.statusCode : '')
				);
				__testContext.debug(
					'> Response:'.grey,
					JSON.stringify(res ? res.body : err)
				);
				return done(err, res);
			});
		}
		return request;
	},

	// Get the given path
	get(path, done) {
		return this.abstractRequest({ verb: 'GET', path, params: null }, done);
	},

	// Post to the given path
	post(path, params, done) {
		return this.abstractRequest({ verb: 'POST', path, params }, done);
	},

	// Put to the given path
	put(path, params, done) {
		return this.abstractRequest({ verb: 'PUT', path, params }, done);
	},
};

function paramsHelper(url, params) {
	if (
		typeof params !== 'undefined' &&
		params !== null &&
		Array.isArray(params) &&
		params.length > 0
	) {
		// It is an defined array with at least one element
		const queryString = params.join('&');
		url += `?${queryString}`;
	}
	return url;
}

function httpCallbackHelperWithStatus(cb, err, res) {
	if (err) {
		return cb(err);
	}
	return cb(null, {
		status: res.status,
		body: res.body,
	});
}

function httpCallbackHelper(cb, err, res) {
	if (err) {
		return cb(err);
	}
	return cb(null, res.body);
}

function httpResponseCallbackHelper(cb, err, res) {
	if (err) {
		return cb(err);
	}
	return cb(null, res);
}

function getNotFoundEndpoint(cb) {
	http.get(
		'/api/not_found_endpoint',
		httpResponseCallbackHelper.bind(null, cb)
	);
}

function getTransactionById(transactionId, cb) {
	// Get transactionById uses the same /api/transactions endpoint, this is just a helper function
	http.get(
		`/api/transactions?id=${transactionId}`,
		httpResponseCallbackHelper.bind(null, cb)
	);
}

function getTransactions(params, cb) {
	let url = '/api/transactions';
	url = paramsHelper(url, params);

	http.get(url, httpResponseCallbackHelper.bind(null, cb));
}

function getUnconfirmedTransaction(transaction, cb) {
	http.get(
		`/api/node/transactions/unconfirmed?id=${transaction}`,
		httpResponseCallbackHelper.bind(null, cb)
	);
}

function getUnconfirmedTransactions(cb) {
	http.get(
		'/api/node/transactions/unconfirmed',
		httpResponseCallbackHelper.bind(null, cb)
	);
}

function getQueuedTransaction(transaction, cb) {
	http.get(
		`/api/node/transactions/unprocessed?id=${transaction}`,
		httpResponseCallbackHelper.bind(null, cb)
	);
}

function getQueuedTransactions(cb) {
	http.get(
		'/api/node/transactions/unprocessed',
		httpResponseCallbackHelper.bind(null, cb)
	);
}

function getMultisignaturesTransaction(transaction, cb) {
	http.get(
		`/api/node/transactions/unsigned?id=${transaction}`,
		httpResponseCallbackHelper.bind(null, cb)
	);
}

function getMultisignaturesTransactions(cb) {
	http.get(
		'/api/node/transactions/unsigned',
		httpResponseCallbackHelper.bind(null, cb)
	);
}

function getPendingMultisignatures(params, cb) {
	let url = '/api/node/transactions/unsigned';
	url = paramsHelper(url, params);

	http.get(url, httpResponseCallbackHelper.bind(null, cb));
}

const postTransactionsEndpoint = new SwaggerSpec('POST /transactions');

function sendTransactionPromise(transaction, expectedStatusCode) {
	expectedStatusCode = expectedStatusCode || 200;

	return postTransactionsEndpoint.makeRequest(
		{ transaction },
		expectedStatusCode
	);
}

function sendTransactionsPromise(transactions, expectedStatusCode) {
	expectedStatusCode = expectedStatusCode || 200;

	return Promise.map(transactions, transaction =>
		sendTransactionPromise(transaction, expectedStatusCode)
	);
}

function sendSignature(signature, cb) {
	http.post(
		'/api/signatures',
		signature,
		httpResponseCallbackHelper.bind(null, cb)
	);
}

function creditAccount(address, amount, cb) {
	const transaction = transfer({
		amount,
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: address,
	});
	sendTransactionPromise(transaction).then(cb);
}

function getCount(param, cb) {
	http.get(`/api/${param}/count`, httpCallbackHelper.bind(null, cb));
}

function registerDelegate(account, cb) {
	const transaction = createRegisterDelegate({
		passphrase: account.passphrase,
		username: account.username,
	});
	sendTransactionPromise(transaction).then(cb);
}

function getForgingStatus(params, cb) {
	let url = '/api/delegates/forging';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function getDelegates(params, cb) {
	let url = '/api/delegates';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function getDelegateVoters(params, cb) {
	let url = '/api/delegates/voters';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function getVoters(params, cb) {
	let url = '/api/voters';
	url = paramsHelper(url, params);

	http.get(url, httpResponseCallbackHelper.bind(null, cb));
}

function searchDelegates(params, cb) {
	let url = '/api/delegates/search';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function putForgingDelegate(params, cb) {
	http.put('/api/delegates/forging', params, httpCallbackHelper.bind(null, cb));
}

function getForgedByAccount(params, cb) {
	let url = '/api/delegates/forging/getForgedByAccount';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function getForgers(params, cb) {
	let url = '/api/delegates/forgers';
	url = paramsHelper(url, params);

	http.get(url, httpCallbackHelper.bind(null, cb));
}

function getAccounts(params, cb) {
	http.get(
		`/api/accounts?${params}`,
		httpCallbackHelperWithStatus.bind(null, cb)
	);
}

function getBlocks(params, cb) {
	let url = '/api/blocks';
	url = paramsHelper(url, params);

	http.get(url, httpResponseCallbackHelper.bind(null, cb));
}

/**
 * Validate if the validation response contains error for a specific param
 *
 * @param {object} res - Response object got from server
 * @param {string} param - Param name to check
 */
function expectSwaggerParamError(res, param) {
	expect(res.body.message).to.be.eql('Validation errors');
	expect(res.body.errors.map(p => p.name)).to.contain(param);
}

/**
 * Create a signature object for POST /api/signatures endpoint
 *
 * @param {Object} transaction - Transaction object
 * @param {Object} signer - Signer object including public key and passphrase
 * @return {{signature: string, transactionId: string, publicKey: string}}
 */
function createSignatureObject(transaction, signer) {
	return {
		transactionId: transaction.id,
		publicKey: signer.publicKey,
		signature: transactionUtils.multiSignTransaction(
			transaction,
			signer.passphrase
		),
	};
}

const getTransactionByIdPromise = Promise.promisify(getTransactionById);
const getTransactionsPromise = Promise.promisify(getTransactions);
const getQueuedTransactionPromise = Promise.promisify(getQueuedTransaction);
const getQueuedTransactionsPromise = Promise.promisify(getQueuedTransactions);
const getUnconfirmedTransactionPromise = Promise.promisify(
	getUnconfirmedTransaction
);
const getUnconfirmedTransactionsPromise = Promise.promisify(
	getUnconfirmedTransactions
);
const getMultisignaturesTransactionPromise = Promise.promisify(
	getMultisignaturesTransaction
);
const getMultisignaturesTransactionsPromise = Promise.promisify(
	getMultisignaturesTransactions
);
const getPendingMultisignaturesPromise = Promise.promisify(
	getPendingMultisignatures
);
const creditAccountPromise = Promise.promisify(creditAccount);
const sendSignaturePromise = Promise.promisify(sendSignature);
const getCountPromise = Promise.promisify(getCount);
const registerDelegatePromise = Promise.promisify(registerDelegate);
const getForgingStatusPromise = Promise.promisify(getForgingStatus);
const getDelegatesPromise = Promise.promisify(getDelegates);
const getDelegateVotersPromise = Promise.promisify(getDelegateVoters);
const getVotersPromise = Promise.promisify(getVoters);
const searchDelegatesPromise = Promise.promisify(searchDelegates);
const putForgingDelegatePromise = Promise.promisify(putForgingDelegate);
const getForgedByAccountPromise = Promise.promisify(getForgedByAccount);
const getForgersPromise = Promise.promisify(getForgers);
const getAccountsPromise = Promise.promisify(getAccounts);
const getBlocksPromise = Promise.promisify(getBlocks);
const getNotFoundEndpointPromise = Promise.promisify(getNotFoundEndpoint);

module.exports = {
	getTransactionByIdPromise,
	getTransactionsPromise,
	getUnconfirmedTransactionPromise,
	getUnconfirmedTransactionsPromise,
	getQueuedTransactionPromise,
	getQueuedTransactionsPromise,
	getMultisignaturesTransactionPromise,
	getMultisignaturesTransactionsPromise,
	getPendingMultisignaturesPromise,
	sendSignaturePromise,
	sendTransactionPromise,
	sendTransactionsPromise,
	creditAccount,
	creditAccountPromise,
	getCount,
	getCountPromise,
	registerDelegatePromise,
	getForgingStatus,
	getForgingStatusPromise,
	getDelegates,
	getDelegatesPromise,
	getVoters,
	getDelegateVotersPromise,
	getVotersPromise,
	searchDelegatesPromise,
	putForgingDelegatePromise,
	getForgedByAccountPromise,
	getForgersPromise,
	getAccounts,
	getAccountsPromise,
	getBlocksPromise,
	expectSwaggerParamError,
	createSignatureObject,
	getNotFoundEndpointPromise,
	calculateApproval,
};
