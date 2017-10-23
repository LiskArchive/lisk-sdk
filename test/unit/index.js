'use strict';

var child_process = require('child_process');

var paths = [
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
	'./modules/transactions.js',

	'./sql/blockRewards.js', // @slow
	'./sql/delegatesList.js',
	'./sql/rounds.js',

	'./schema/delegates.js'
];

var parallelTestsRunning = {};

paths.forEach(function (test) {
	var coverageArguments = ['cover', '--dir', 'test/.coverage-unit', '--include-pid', 'node_modules/.bin/_mocha', 'test/unit/' + test, '--', '--timeout', (8 * 60 * 1000).toString()];
	if (process.argv[2] !== '@slow') {
		coverageArguments.push('--grep', '@slow', '--invert');
	};
	var child = child_process.spawn('node_modules/.bin/istanbul', coverageArguments, {
		cwd: __dirname + '/../..',
		detached: true,
		stdio: 'inherit'
	});
	console.log('Running the test:', test, 'as a separate process - pid', child.pid);
	parallelTestsRunning[child.pid] = test;
	child.on('close', function (code) {
		if (code === 0) {
			console.log('Test finished successfully:', test);
			delete parallelTestsRunning[child.pid];
			if (Object.keys(parallelTestsRunning).length === 0) {
				return console.log('All tests finished successfully.');
			}
			return console.log('Still running: ', parallelTestsRunning);
		}
		console.log('Test failed:', test);
		process.exit(code);
	});

	child.on('error', function (err) {
		console.error(err);
		process.exit();
	});
});
