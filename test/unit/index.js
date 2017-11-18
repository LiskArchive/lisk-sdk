'use strict';

var parallelTests = require('../common/parallelTests').parallelTests;

var pathFiles = [
	'./api/ws/workers/connectionsTable.js',
	'./api/ws/workers/peersUpdateRules.js',
	'./api/ws/workers/rules.js',
	'./api/ws/workers/slaveToMasterSender.js',

	'./helpers/apiError.js',
	'./helpers/ed.js',
	'./helpers/jobs-queue.js',
	'./helpers/peersManager.js',
	'./helpers/request-limiter.js',
	'./helpers/RPC.js',
	'./helpers/slots.js',
	'./helpers/wsApi.js',
	'./helpers/z_schema.js',
	'./helpers/sort_by.js',

	'./logic/account.js',
	'./logic/blockReward.js', // @slow
	'./logic/delegate.js',
	'./logic/inTransfer.js',
	'./logic/peer.js',
	'./logic/peers.js',
	'./logic/multisignature.js',
	'./logic/transaction.js',
	'./logic/transactionPool.js',
	'./logic/transfer.js',
	'./logic/vote.js',
	'./logic/outTransfer.js',

	'./modules/accounts.js',
	'./modules/app.js',
	'./modules/blocks.js',
	'./modules/blocks/process.js',
	'./modules/blocks/verify.js',
	'./modules/cache.js',
	'./modules/dapps.js',
	'./modules/delegates.js',
	'./modules/loader.js',
	'./modules/node.js',
	'./modules/peers.js',
	'./modules/voters.js',
	'./modules/transactions.js',

	'./sql/blockRewards.js', // @slow
	'./sql/delegatesList.js',
	'./sql/rounds.js',

	'./schema/delegates.js'
];

parallelTests(pathFiles, 'test/unit/');
