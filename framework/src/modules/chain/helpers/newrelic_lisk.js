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
const submodulesToInstrument = {
	'./componentes/cache/cache': {
		identifier: 'components.cache',
		callbackMethods: [
			'getJsonForKey',
			'setJsonForKey',
			'deleteJsonForKey',
			'removeByPattern',
		],
	},
	'./componentes/system': {
		identifier: 'componentes.system',
		callbackMethods: ['update'],
	},
	'./helpers/sequence': {
		identifier: 'helpers.sequence',
		callbackMethods: ['add'],
	},
	'./submodules/blocks': {
		identifier: 'submodules.blocks',
		callbackMethods: ['shared.getBlocks'],
	},
	'./submodules/dapps': {
		identifier: 'submodules.dapps',
		callbackMethods: ['getDapps'],
	},
	'./submodules/delegates': {
		identifier: 'submodules.delegates',
		callbackMethods: ['getForgers', 'getDelegates'],
	},
	'./submodules/loader': {
		identifier: 'submodules.loader',
		callbackMethods: ['getNetwork'],
	},
	'./submodules/peers': {
		identifier: 'submodules.peers',
		callbackMethods: ['shared.getPeers'],
	},
	'./submodules/rounds': {
		identifier: 'submodules.rounds',
		callbackMethods: ['flush'],
	},
	'./submodules/signatures': {
		identifier: 'submodules.signatures',
		callbackMethods: ['shared.postSignature', 'shared.postSignatures'],
	},
	'./submodules/transactions': {
		identifier: 'submodules.transactions',
		callbackMethods: [
			'shared.getTransactionsCount',
			'shared.getTransactionsFromPool',
			'shared.postTransaction',
			'shared.postTransactions',
		],
	},
	'./submodules/transport': {
		identifier: 'submodules.transport',
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

Object.keys(submodulesToInstrument).forEach(submodulePath => {
	newrelicLisk.instrumentCallbackMethods(
		submodulePath,
		submodulesToInstrument[submodulePath].identifier,
		submodulesToInstrument[submodulePath].callbackMethods
	);
});
