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

// eslint-disable-next-line import/order
const newrelic = require('newrelic');
const newrelicLisk = require('lisk-newrelic')(newrelic, {
	exitOnFailure: true,
	rootPath: process.cwd(),
});

newrelicLisk.instrumentWeb();
newrelicLisk.instrumentDatabase();
newrelicLisk.instrumentBackgroundJobs();

// callBackMethods array only support one level of nesting
const modulesToInstrument = {
	'./helpers/sequence.js': {
		identifier: 'helpers.sequence',
		callbackMethods: ['add'],
	},
	'./modules/node.js': {
		identifier: 'modules.node',
		callbackMethods: ['shared.getStatus', 'shared.getConstants'],
	},
	'./modules/accounts.js': {
		identifier: 'modules.accounts',
		callbackMethods: ['shared.getAccounts'],
	},
	'./modules/blocks.js': {
		identifier: 'modules.blocks',
		callbackMethods: ['shared.getBlocks'],
	},
	'./modules/cache.js': {
		identifier: 'modules.cache',
		callbackMethods: [
			'onNewBlock',
			'onFinishRound',
			'onTransactionsSaved',
			'getJsonForKey',
			'setJsonForKey',
			'deleteJsonForKey',
			'removeByPattern',
		],
	},
	'./modules/dapps.js': {
		identifier: 'modules.dapps',
		callbackMethods: ['getDapps'],
	},
	'./modules/delegates.js': {
		identifier: 'modules.delegates',
		callbackMethods: ['getForgers', 'getDelegates'],
	},
	'./modules/loader.js': {
		identifier: 'modules.loader',
		callbackMethods: ['getNetwork'],
	},
	'./modules/multisignatures.js': {
		identifier: 'modules.multisignatures',
		callbackMethods: ['shared.getGroups', 'shared.getMemberships'],
	},
	'./modules/peers.js': {
		identifier: 'modules.peers',
		callbackMethods: ['shared.getPeers'],
	},
	'./modules/rounds.js': {
		identifier: 'modules.rounds',
		callbackMethods: ['flush'],
	},
	'./modules/signatures.js': {
		identifier: 'modules.signatures',
		callbackMethods: ['shared.postSignature', 'shared.postSignatures'],
	},
	'./modules/system.js': {
		identifier: 'modules.system',
		callbackMethods: ['update'],
	},
	'./modules/transactions.js': {
		identifier: 'modules.transactions',
		callbackMethods: [
			'shared.getTransactions',
			'shared.getTransactionsCount',
			'shared.getUnProcessedTransactions',
			'shared.getMultisignatureTransactions',
			'shared.getUnconfirmedTransactions',
			'shared.postTransaction',
			'shared.postTransactions',
		],
	},
	'./modules/transport.js': {
		identifier: 'modules.transport',
		callbackMethods: [
			'broadcastHeaders',
			'shared.blocksCommon',
			'shared.blocks',
			'shared.list',
			'shared.height',
			'shared.status',
			'shared.postSignature',
			'shared.getSignatures',
			'shared.getTransactions',
			'shared.postTransaction',
			'internal.updatePeer',
		],
	},
};

Object.keys(modulesToInstrument).forEach(modulePath => {
	newrelicLisk.instrumentCallbackMethods(
		modulePath,
		modulesToInstrument[modulePath].identifier,
		modulesToInstrument[modulePath].callbackMethods
	);
});
