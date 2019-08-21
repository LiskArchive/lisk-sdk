/*
 * Copyright © 2019 Lisk Foundation
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
const path = require('path');
const newrelicLisk = require('lisk-newrelic')(newrelic, {
	exitOnFailure: true,
	rootPath: path.join(path.dirname(__filename), '..'),
});

newrelicLisk.instrumentBackgroundJobs();

// TOFIX: fix callbackMethods converted to async in #2579
// callBackMethods array only support one level of nesting
const modulesToInstrument = {
	'./utils/sequence.js': {
		identifier: 'utils.sequence',
		callbackMethods: ['add'],
	},
	'../submodules/blocks': {
		identifier: 'modules.chain.submodules.blocks',
		callbackMethods: ['shared.getBlocks'],
	},
	'../submodules/delegates': {
		identifier: 'modules.chain.submodules.delegates',
		callbackMethods: ['getForgers'],
	},
	'../submodules/loader': {
		identifier: 'modules.chain.submodules.loader',
		callbackMethods: ['getNetwork'],
	},
	'../submodules/rounds': {
		identifier: 'modules.chain.submodules.rounds',
		callbackMethods: ['flush'],
	},
	'../submodules/transactions': {
		identifier: 'modules.chain.submodules.transactions',
		callbackMethods: [
			'shared.getTransactionsCount',
			'shared.getTransactionsFromPool',
			'shared.postTransaction',
			'shared.postTransactions',
		],
	},
	'../submodules/transport': {
		identifier: 'modules.chain.submodules.transport',
		callbackMethods: [
			'shared.blocksCommon',
			'shared.blocks',
			'shared.postSignature',
			'shared.getSignatures',
			'shared.getTransactions',
			'shared.postTransaction',
		],
	},
};

Object.keys(modulesToInstrument).forEach(modulePath => {
	newrelicLisk.instrumentCallbackMethods(
		modulePath,
		modulesToInstrument[modulePath].identifier,
		modulesToInstrument[modulePath].callbackMethods,
	);
});
