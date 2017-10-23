'use strict';

var cluster = require('cluster');
var child_process = require('child_process');

var paths = [
	'./accounts',
	'./blocks',
	'./dapps',
	'./delegates',
	'./loader',
	'./multisignatures',
	'./multisignatures.post',
	'./node',
	'./peers',
	'./transactions',
];

var parallelTestsRunning = {};

paths.forEach(function (test) {
	var coverageArguments = ['cover', '--dir', 'test/.coverage-unit', '--include-pid', 'node_modules/.bin/_mocha', 'test/functional/http/get/' + test];
	if (process.argv[2] !== '@slow') {
		coverageArguments.push('--', '--grep', '@slow', '--invert');
	};
	var child = child_process.spawn('node_modules/.bin/istanbul', coverageArguments, {
		cwd: __dirname + '/../../../..',
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
