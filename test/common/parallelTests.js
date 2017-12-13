'use strict';

var child_process = require('child_process');
var find = require('find');

function parallelTests (tag, suite, section) {

	var suiteFolder = null;

	switch (suite) {
		case 'functional':
			switch (section) {
				case 'get':
					suiteFolder = 'test/functional/http/get/';
					break;
				case 'post':
					suiteFolder = 'test/functional/http/post/';
					break;
				case 'ws':
					suiteFolder = 'test/functional/ws/';
					break;
				case 'system':
					suiteFolder = 'test/functional/system/';
					break;
				default:
					console.warn('A section needs to be chosen to run functional suite. Options are: get, post, ws and system.');
					process.exit();
					break;
			};
			break;
		case 'unit':
			suiteFolder = 'test/unit/';
			break;
		default:
			console.warn('A suite among functional or unit needs to be chosen.');
			process.exit();
			break;
	};

	var mochaArguments = [];

	switch (tag) {
		case 'slow':
			mochaArguments.push('--', '--grep', '@slow');
			break;
		case 'unstable':
			mochaArguments.push('--', '--grep', '@unstable');
			break;
		case 'untagged':
			mochaArguments.push('--', '--grep', '@slow|@unstable', '--invert');
			break;
		case 'extensive':
			mochaArguments.push('--', '--grep', '@unstable', '--invert');
			break;
		default:
			mochaArguments.push('--', '--grep', '@slow|@unstable', '--invert');
			break;
	};

	// Looking recursevely for javascript files not containing the word "common"
	var pathfiles = find.fileSync(/^((?!common)[\s\S])*.js$/, suiteFolder);

	var parallelTestsRunning = {};

	pathfiles.forEach(function (test) {
		var coverageArguments = ['cover', '--dir', 'test/.coverage-unit', '--include-pid', 'node_modules/.bin/_mocha', test];
		var istanbulArguments = coverageArguments.concat(mochaArguments);
		
		var child = child_process.spawn('node_modules/.bin/istanbul', istanbulArguments, {
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
				return;
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

parallelTests(process.argv[2], process.argv[3], process.argv[4]);

module.exports = {
	parallelTests: parallelTests
};
