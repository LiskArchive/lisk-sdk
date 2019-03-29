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

// TOFIX: fix callbackMethods converted to async in #2579
// callBackMethods array only support one level of nesting
const modulesToInstrument = {
	'/framework/src/components/cache/cache': {
		identifier: 'components.cache',
		callbackMethods: [
			'getJsonForKey',
			'setJsonForKey',
			'deleteJsonForKey',
			'removeByPattern',
		],
	},
	'/framework/src/components/system.js': {
		identifier: 'components.system',
		callbackMethods: ['update'],
	},
	'/framework/src/modules/chain/helpers/sequence.js': {
		identifier: 'helpers.sequence',
		callbackMethods: ['add'],
	},
	'/framework/src/modules/chain/submodules/blocks.js': {
		identifier: 'modules.blocks',
		callbackMethods: ['shared.getBlocks'],
	},
	'/framework/src/modules/chain/submodules/dapps.js': {
		identifier: 'modules.dapps',
		callbackMethods: ['getDapps'],
	},
	'/framework/src/modules/chain/submodules/delegates.js': {
		identifier: 'modules.delegates',
		callbackMethods: ['getForgers', 'getDelegates'],
	},
	'/framework/src/modules/chain/submodules/loader.js': {
		identifier: 'modules.loader',
		callbackMethods: ['getNetwork'],
	},
	'/framework/src/modules/chain/submodules/peers.js': {
		identifier: 'modules.peers',
		callbackMethods: ['shared.getPeers'],
	},
	'/framework/src/modules/chain/submodules/rounds.js': {
		identifier: 'modules.rounds',
		callbackMethods: ['flush'],
	},
	'/framework/src/modules/chain/submodules/signatures.js': {
		identifier: 'modules.signatures',
		callbackMethods: ['shared.postSignature', 'shared.postSignatures'],
	},
	'/framework/src/modules/chain/submodules/transactions.js': {
		identifier: 'modules.transactions',
		callbackMethods: [
			'shared.getTransactionsCount',
			'shared.getTransactionsFromPool',
			'shared.postTransaction',
			'shared.postTransactions',
		],
	},
	'/framework/src/modules/chain/submodules/transport.js': {
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
