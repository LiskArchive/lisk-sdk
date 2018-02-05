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

var child_process = require('child_process');
var find = require('find');

var maxParallelism = 20;

function parallelTests(tag, suite, section) {
	var suiteFolder = null;

	switch (suite) {
		case 'unit':
			suiteFolder = 'test/unit/';
			break;
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
				case undefined:
					suiteFolder = 'test/functional/';
					break;
				default:
					console.warn(
						'Invalid section argument. Options are: get, post, ws or system'
					);
					process.exit();
					break;
			}
			break;

		default:
			console.warn('Invalid suite argument. Options are: unit or functional');
			process.exit();
			break;
	}

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
	}

	// Looking recursevely for javascript files not containing the word "common"
	var pathfiles = find.fileSync(/^((?!common)[\s\S])*.js$/, suiteFolder);
	var initPathfiles = pathfiles.splice(0, maxParallelism);

	var parallelTestsRunning = {};

	var spawnTest = function(test) {
		var coverageArguments = [
			'cover',
			'--dir',
			'test/.coverage-unit',
			'--include-pid',
			'node_modules/.bin/_mocha',
			test,
		];
		var istanbulArguments = coverageArguments.concat(mochaArguments);

		var child = child_process.spawn(
			'node_modules/.bin/istanbul',
			istanbulArguments,
			{
				cwd: `${__dirname}/../..`,
				detached: true,
				stdio: 'inherit',
			}
		);

		console.log(
			'Running the test:',
			test,
			'as a separate process - pid',
			child.pid
		);
		parallelTestsRunning[child.pid] = child;

		var cleanupRunningTests = function() {
			Object.keys(parallelTestsRunning).forEach(k => {
				parallelTestsRunning[k].kill('SIGTERM');
			});
		};

		child.on('close', code => {
			if (code === 0) {
				console.log('Test finished successfully:', test);
				delete parallelTestsRunning[child.pid];

				if (pathfiles.length) {
					spawnTest(pathfiles.shift());
				}
				if (Object.keys(parallelTestsRunning).length === 0) {
					return console.log('All tests finished successfully.');
				}
				return;
			}

			console.log('Test failed:', test);
			cleanupRunningTests();
			process.exit(code);
		});

		child.on('error', err => {
			console.error(err);
			cleanupRunningTests();
			process.exit();
		});
	};

	initPathfiles.forEach(spawnTest);
}

parallelTests(process.argv[2], process.argv[3], process.argv[4]);

module.exports = {
	parallelTests: parallelTests,
};
