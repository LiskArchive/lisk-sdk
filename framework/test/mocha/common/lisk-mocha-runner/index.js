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

/* eslint-disable no-console */

const { cpus } = require('os');
const { getTestFiles } = require('./file_manager');
const processManager = require('./process_manager');

const MAX_TASK_LIMIT = parseInt(process.env.MAX_TASK_LIMIT) || cpus().length;
const timeStart = process.hrtime();

const state = {
	terminated: false,
	mochaCliOptions: [],
	numberOfTestFiles: 0,
	processedCount: 0,
	queue: [],
	tests: {
		passed: {},
		failed: {},
		killed: {},
	},
};

const summary = () => {
	const { processedCount, numberOfTestFiles } = state;
	const { passed, failed, killed } = state.tests;
	const timeEnd = process.hrtime(timeStart);

	console.log('\n================\n');
	console.info('Summary:\n');
	console.info(`Execution time: ${timeEnd[0]}s ${timeEnd[1] / 1000000}ms\n`);
	console.info(`Total Test Files: ${numberOfTestFiles}`);
	console.info(`Processed Test Files: ${processedCount}`);
	console.log('\n\n');
	if (Object.keys(passed).length) {
		console.info(`Passed: ${Object.keys(passed).length}/${processedCount}`);
	}
	if (Object.keys(killed).length) {
		console.info(`Killed: ${Object.keys(killed).length}/${processedCount}`);
	}
	if (Object.keys(failed).length) {
		console.info(`Failed: ${Object.keys(failed).length}/${processedCount}`);
		console.log('\n\n');
		console.log('(Error Code):\tFailed test\n');
		console.log('=============\t===========\n');
		Object.keys(failed).forEach(file => {
			const { code, error } = failed[file];
			console.warn(`(${code}):\t${file}`);
			if (error) {
				console.warn(`\t${error}`);
			}
		});
	}

	console.log('\n\n');
};

const processNext = () => {
	if (!state.queue.length) {
		return null;
	}
	state.processedCount++;

	if (state.terminated) {
		return Promise.reject();
	}

	const file = state.queue[0];
	state.queue = state.queue.slice(1);
	return (
		processManager
			.spawn(file, state.mochaCliOptions)
			// eslint-disable-next-line no-loop-func
			.then(() => {
				state.tests.passed[file] = true;
				return processNext();
			})
			// eslint-disable-next-line no-loop-func
			.catch((code, error) => {
				const status = state.terminated ? 'killed' : 'failed';
				state.tests[status][file] = { code, error };

				console.error(`Test failed: ${file}`);
				if (state.terminated) console.info('\t--> Reason: Killed');
				if (code) console.info(`\t--> Code: ${code}`);
				if (error) console.info(`\t--> Error: ${error}`);

				// If test failed because it was terminated
				// no need to call processNext
				return state.terminated ? null : processNext();
			})
	);
};

const executeTests = async (testType, testPathPattern, mochaCliOptions) => {
	const allTestFiles = getTestFiles(testType, testPathPattern);
	console.log(`${allTestFiles.length} test files were found`);

	state.numberOfTestFiles = allTestFiles.length;
	state.mochaCliOptions = mochaCliOptions;
	state.queue = [...allTestFiles];
	return Promise.all(
		allTestFiles.slice(0, MAX_TASK_LIMIT).map(() => processNext())
	);
};

process.on('SIGINT', () => {
	console.log('Test runner terminated!');
	state.terminated = true;
	processManager.killAll();
	setTimeout(() => process.exit(), 1000);
});

process.on('exit', () => {
	summary();
});

// argv[2] is TestType
// argv[3] can be testPathPattern or mochaCliOptions
// rest is mochaCliOptions
const [, , testType, , ...mochaCliOptions] = process.argv;
let [, , , testPathPattern] = process.argv;

if (testPathPattern && testPathPattern.indexOf('-') === 0) {
	mochaCliOptions.unshift(testPathPattern);
	testPathPattern = null;
}

mochaCliOptions.unshift('--', '--opts', 'framework/test/mocha/mocha.opts');

// Execute lisk mocha runner
executeTests(testType, testPathPattern, mochaCliOptions)
	.then(() => {
		if (
			Object.keys(state.tests.failed).length ||
			Object.keys(state.tests.killed).length
		) {
			console.error('\n\nFAILED: Some tests have failed.');
			process.exit(1);
		}
	})
	.catch(error => {
		console.error('\n\nFAILED: Test runner failed with errors!');
		console.error(error.message);
		process.exit(1);
	});
