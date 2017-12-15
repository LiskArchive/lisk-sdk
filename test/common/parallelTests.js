'use strict';

var child_process = require('child_process');
var find = require('find');

function parallelTests (suite, tag) {

	var suiteFolder = null;

	switch (suite) {
		case 'functional-http-get':
			suiteFolder = 'test/functional/http/get/';
			break;
		case 'functional-http-post':
			suiteFolder = 'test/functional/http/post/';
			break;
		case 'functional-ws':
			suiteFolder = 'test/functional/ws/';
			break;
		case 'unit':
			suiteFolder = 'test/unit/';
			break;
		case 'functional-system':
			suiteFolder = 'test/functional/system/';
			break;
	};

	// Looking recursevely for javascript files not containing the word "common"
	var pathfiles = find.fileSync(/^((?!common)[\s\S])*.js$/, suiteFolder);

	var parallelTestsRunning = {};

	pathfiles.forEach(function (test) {
		var coverageArguments = ['cover', '--dir', 'test/.coverage-unit', '--include-pid', 'node_modules/.bin/_mocha', test];
		
		if (tag !== '@slow') {
			coverageArguments.push('--', '--grep', '@slow', '--invert');
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
}

parallelTests(process.argv[2], process.argv[3]);

module.exports = {
	parallelTests: parallelTests
};
