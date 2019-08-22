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

const path = require('path');
const BaseGenerator = require('../base_generator');
const {
	loadCSVFile,
	generateBlockHeader,
	generateBlockHeadersSeries,
} = require('../../utils/bft');

const bftFinalityStepsGenerator = ({ activeDelegates, filePath }) => {
	const rows = loadCSVFile(path.join(__dirname, filePath));

	const threshold = Math.ceil((activeDelegates * 2) / 3);

	const steps = [];

	for (let i = 1; i < rows.length - 1; i += 2) {
		const delegateName = rows[i][1];
		const maxHeightPreviouslyForged = parseInt(rows[i][2], 10);
		const prevotedConfirmedUptoHeight = parseInt(rows[i][3], 10);
		const activeSinceRound = parseInt(rows[i][4], 10);
		const height = parseInt(rows[i][5], 10);

		const blockHeader = generateBlockHeader({
			delegateName,
			height,
			maxHeightPreviouslyForged,
			activeSinceRound,
			prevotedConfirmedUptoHeight,
		});

		const input = { delegateName, blockHeader };

		const preCommitsRow = rows[i].slice(7).map(Number);
		const preVotesRow = rows[i + 1].slice(7).map(Number);

		// In CSV votes and commits are mentioned as array
		// In BFT we manage as object so need to convert array to object
		// input format: [1, 2, 0, 0, 3, 0, 0,,,,,,]
		// output format: {1: 1, 2: 2, 5: 3}
		const preCommits = preCommitsRow.reduce((acc, val, index) => {
			if (val !== 0) {
				acc[index + 1] = val;
			}
			return acc;
		}, {});

		const preVotes = preVotesRow.reduce((acc, val, index) => {
			if (val !== 0) {
				acc[index + 1] = val;
			}
			return acc;
		}, {});

		// Get the maximum height in pre-commits which have more
		// then threshold commits
		// input format: [1, 2, 0, 0, 3, 0, 0,,,,,,]
		// output format: 5
		const highestHeightPreCommit = preCommitsRow
			.slice(0)
			.reverse()
			.findIndex(val => val >= threshold);
		const finalizedHeight =
			highestHeightPreCommit > 0
				? preCommitsRow.length - highestHeightPreCommit
				: 0;

		const highestHeightPreVoted = preVotesRow
			.slice(0)
			.reverse()
			.findIndex(val => val >= threshold);
		const preVotedConfirmedHeight =
			highestHeightPreVoted > 0
				? preVotesRow.length - highestHeightPreVoted
				: 0;

		// Since BFT only keep track of 5 rounds
		Object.keys(preVotes)
			.slice(0, -1 * activeDelegates * 5)
			.forEach(key => {
				delete preVotes[key];
			});

		Object.keys(preCommits)
			.slice(0, -1 * activeDelegates * 5)
			.forEach(key => {
				delete preCommits[key];
			});

		const output = {
			finalizedHeight,
			preVotedConfirmedHeight,
			preVotes,
			preCommits,
		};

		steps.push({
			input,
			output,
		});
	}

	return steps;
};

const bftFinalityTestSuiteGenerator = ({
	activeDelegates,
	title,
	filePath,
}) => () => ({
	title: 'BFT processing generation',
	summary:
		'Generate status of pre-votes, pre-commits, finalized height and pre-voted height  as per BFT specification',
	config: { activeDelegates, finalizedHeight: 0 },
	runner: 'bft_processing',
	handler: title,
	testCases: bftFinalityStepsGenerator({ activeDelegates, filePath }),
});

/**
 *	This will generate a test step where we have invalid header attribute passed
 *
 * @param {int} activeDelegates
 * @return {{output: *, input: *, initialState: *}}
 */
const invalidPreVotedConfirmedUptoHeight = activeDelegates => {
	// We need minimum three rounds to perform verification of block headers
	const blockHeaders = generateBlockHeadersSeries({
		activeDelegates,
		count: activeDelegates * 3 + 1,
	});

	const blockHeader = blockHeaders.pop();

	// It's an invalid block header as the value for "prevotedConfirmedUptoHeight"
	// didn't match with one BFT compute for this particular height
	// which is normally incremented in sequence if same delegates keep forging
	const invalidBlockHeader = {
		...blockHeader,
		prevotedConfirmedUptoHeight: blockHeader.prevotedConfirmedUptoHeight + 10,
	};

	return {
		initialState: blockHeaders,
		input: invalidBlockHeader,
		// input will not be added to list, hence output will be same as initial state
		output: blockHeaders,
	};
};

/**
 * This will generate a test step when delegated moved on different chain
 *
 * @param {int} activeDelegates
 * @return {{output: *, input: *, initialState: *}}
 */
const invalidSameHeightBlock = activeDelegates => {
	// We need minimum three rounds to perform verification of block headers
	const blockHeaders = generateBlockHeadersSeries({
		activeDelegates,
		count: activeDelegates * 3 + 1,
	});

	const blockHeader = blockHeaders.pop();
	const delegateLastBlockHeader = blockHeaders[activeDelegates * 2];

	// If a block header have same height as previously forged block
	const invalidBlockHeader = {
		...blockHeader,
		// This delegate has forged block at first block of second round
		maxHeightPreviouslyForged:
			delegateLastBlockHeader.maxHeightPreviouslyForged,
		height: delegateLastBlockHeader.height,
	};

	return {
		initialState: blockHeaders,
		input: invalidBlockHeader,
		// input will not be added to list, hence output will be same as initial state
		output: blockHeaders,
	};
};

/**
 * This will generate a test step when delegated moved on different chain
 *
 * @param {int} activeDelegates
 * @return {{output: *, input: *, initialState: *}}
 */
const invalidLowerHeightBlock = activeDelegates => {
	// We need minimum three rounds to perform verification of block headers
	const blockHeaders = generateBlockHeadersSeries({
		activeDelegates,
		count: activeDelegates * 3 + 1,
	});

	const blockHeader = blockHeaders.pop();
	const delegateLastBlockHeader = blockHeaders[activeDelegates * 2];

	// If a block header have height lower then previously forged height
	const invalidBlockHeader = {
		...blockHeader,
		// This delegate has forged block at first block of second round
		// so we make it 1 less as last block of second round
		maxHeightPreviouslyForged:
			delegateLastBlockHeader.maxHeightPreviouslyForged,
		height: delegateLastBlockHeader.height - 1,
	};

	return {
		initialState: blockHeaders,
		input: invalidBlockHeader,
		// input will not be added to list, hence output will be same as initial state
		output: blockHeaders,
	};
};

/**
 * This will generate a test step we found a missing block in the chain
 *
 * @param {int} activeDelegates
 * @return {{output: *, input: *, initialState: *}}
 */
// eslint-disable-next-line no-unused-vars
const invalidPreviouslyForgedHeight = activeDelegates => {
	// We need minimum three rounds to perform verification of block headers
	const blockHeaders = generateBlockHeadersSeries({
		activeDelegates,
		count: activeDelegates * 3 + 1,
	});

	const blockHeader = blockHeaders.pop();
	const delegateLastBlockHeader = blockHeaders[activeDelegates * 2];

	// If a block header have height lower then previously forged height
	const invalidBlockHeader = {
		...blockHeader,
		// This delegate has forged block at first block of second round
		// so we make it 1 less as last block of second round
		maxHeightPreviouslyForged: delegateLastBlockHeader.height - 1,
	};

	return {
		initialState: blockHeaders,
		input: invalidBlockHeader,
		// input will not be added to list, hence output will be same as initial state
		output: blockHeaders,
	};
};

/**
 * This will generate a test step when block is forged on a lower chain
 *
 * @param {int} activeDelegates
 * @return {{output: *, input: *, initialState: *}}
 */
const invalidLowerPreVotedConfirmedUptoHeight = activeDelegates => {
	// We need minimum three rounds to perform verification of block headers
	const blockHeaders = generateBlockHeadersSeries({
		activeDelegates,
		count: activeDelegates * 3 + 1,
	});

	const blockHeader = blockHeaders.pop();
	const delegateLastBlockHeader = blockHeaders[activeDelegates * 2];

	// If delegate last forged block have higher prevotedConfirmedUptoHeight
	// value that means it moved to different chain
	delegateLastBlockHeader.prevotedConfirmedUptoHeight =
		blockHeader.prevotedConfirmedUptoHeight + 1;
	const invalidBlockHeader = {
		...blockHeader,
	};

	return {
		initialState: blockHeaders,
		input: invalidBlockHeader,
		// input will not be added to list, hence output will be same as initial state
		output: blockHeaders,
	};
};

const bftInvalidBlockHeaderTestSuiteGenerator = ({
	activeDelegates,
}) => () => ({
	title: 'BFT processing generation',
	summary: 'Generate set of invalid blocks headers for BFT',
	config: { activeDelegates, finalizedHeight: 0 },
	runner: 'bft_processing',
	handler: 'bft_invalid_block_headers',
	testCases: [
		invalidPreVotedConfirmedUptoHeight(activeDelegates),
		invalidSameHeightBlock(activeDelegates),
		invalidLowerHeightBlock(activeDelegates),

		// TODO: Once we remove this line we can uncomment this generator
		// https://github.com/LiskHQ/lisk-sdk/blob/037f9e8160372908aea52fffa5a3b1a9f3dd3ebd/framework/src/modules/chain/bft/finality_manager.js#L93

		// invalidPreviouslyForgedHeight(activeDelegates),

		invalidLowerPreVotedConfirmedUptoHeight(activeDelegates),
	],
});

BaseGenerator.runGenerator('bft_finality_processing', [
	bftFinalityTestSuiteGenerator({
		activeDelegates: 4,
		title: '4_delegates_missed_slots',
		filePath: '4_delegates_missed_slots.csv',
	}),
	bftFinalityTestSuiteGenerator({
		activeDelegates: 4,
		title: '4_delegates_simple',
		filePath: '4_delegates_simple.csv',
	}),
	bftFinalityTestSuiteGenerator({
		activeDelegates: 5,
		title: '5_delegates_switched_completely',
		filePath: '5_delegates_switched_completely.csv',
	}),
	bftFinalityTestSuiteGenerator({
		activeDelegates: 7,
		title: '7_delegates_partial_switch',
		filePath: '7_delegates_partial_switch.csv',
	}),
	bftFinalityTestSuiteGenerator({
		activeDelegates: 11,
		title: '11_delegates_partial_switch',
		filePath: '11_delegates_partial_switch.csv',
	}),
	bftInvalidBlockHeaderTestSuiteGenerator({ activeDelegates: 5 }),
]);
