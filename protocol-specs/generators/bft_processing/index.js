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
		const maxHeightPrevoted = parseInt(rows[i][3], 10);
		const delegateMinHeightActive =
			(parseInt(rows[i][4], 10) - 1) * activeDelegates + 1;
		const height = parseInt(rows[i][5], 10);

		const blockHeader = generateBlockHeader({
			delegateName,
			height,
			maxHeightPreviouslyForged,
			maxHeightPrevoted,
			delegateMinHeightActive,
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
			description: `When block with height ${height} is forged`,
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
const invalidMaxHeightPrevoted = activeDelegates => {
	// We need minimum three rounds to perform verification of block headers
	const blockHeaders = generateBlockHeadersSeries({
		activeDelegates,
		count: activeDelegates * 3 + 1,
	});

	const blockHeader = blockHeaders.pop();

	// It's an invalid block header as the value for "maxHeightPrevoted"
	// didn't match with one BFT compute for this particular height
	// which is normally incremented in sequence if same delegates keep forging
	const invalidBlockHeader = {
		...blockHeader,
		maxHeightPrevoted: blockHeader.maxHeightPrevoted + 10,
	};

	return {
		description: 'Invalid max height prevoted',
		config: {
			blockHeaders,
		},
		input: invalidBlockHeader,
		// input will not be added to list, hence output will be same as initial state
		output: {
			blockHeaders,
		},
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
		description: 'Invalid same height block',
		config: {
			blockHeaders,
		},
		input: invalidBlockHeader,
		// input will not be added to list, hence output will be same as initial state
		output: { blockHeaders },
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
		description: 'Invalid lower height block',
		config: {
			blockHeaders,
		},
		input: invalidBlockHeader,
		// input will not be added to list, hence output will be same as initial state
		output: { blockHeaders },
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
		description: 'Invalid previously forged height',
		config: {
			blockHeaders,
		},
		input: invalidBlockHeader,
		// input will not be added to list, hence output will be same as initial state
		output: { blockHeaders },
	};
};

/**
 * This will generate a test step when block is forged on a lower chain
 *
 * @param {int} activeDelegates
 * @return {{output: *, input: *, initialState: *}}
 */
const invalidLowerMaxHeightPrevoted = activeDelegates => {
	// We need minimum three rounds to perform verification of block headers
	const blockHeaders = generateBlockHeadersSeries({
		activeDelegates,
		count: activeDelegates * 3 + 1,
	});

	const blockHeader = blockHeaders.pop();
	const delegateLastBlockHeader = blockHeaders[activeDelegates * 2];

	// If delegate last forged block have higher maxHeightPrevoted
	// value that means it moved to different chain
	delegateLastBlockHeader.maxHeightPrevoted = blockHeader.maxHeightPrevoted + 1;
	const invalidBlockHeader = {
		...blockHeader,
	};

	return {
		description: 'Invalid lower max height prevoted',
		config: {
			blockHeaders,
		},
		input: invalidBlockHeader,
		// input will not be added to list, hence output will be same as initial state
		output: { blockHeaders },
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
		invalidMaxHeightPrevoted(activeDelegates),
		invalidSameHeightBlock(activeDelegates),
		invalidLowerHeightBlock(activeDelegates),

		// TODO: Once we remove this line we can uncomment this generator
		// https://github.com/LiskHQ/lisk-sdk/blob/037f9e8160372908aea52fffa5a3b1a9f3dd3ebd/framework/src/modules/chain/bft/finality_manager.js#L93

		// invalidPreviouslyForgedHeight(activeDelegates),

		invalidLowerMaxHeightPrevoted(activeDelegates),
	],
});

const FORK_STATUS_IDENTICAL_BLOCK = 1;
const FORK_STATUS_VALID_BLOCK = 2;
const FORK_STATUS_DOUBLE_FORGING = 3;
const FORK_STATUS_TIE_BREAK = 4;
const FORK_STATUS_DIFFERENT_CHAIN = 5;
const FORK_STATUS_DISCARD = 6;

const bftForkChoiceTestSuiteGenerator = () => {
	const blockInterval = 10;
	const lastBlockHeight = 10;
	const epochTime = Math.floor(new Date('2016-05-24T17:00:00.000Z').getTime());

	// All times are epoch time
	const lastBlock = {
		id: '4787605425910193884',
		height: lastBlockHeight,
		version: 2,
		generatorPublicKey:
			'774660271a533e02f13699d17e6fb2fccd48023685a47fd04b3eec0acf2a9534',
		maxHeightPrevoted: 1,
		timestamp: (lastBlockHeight - 1) * blockInterval, // Block slot time was height * blockInterval
		receivedAt: (lastBlockHeight - 1) * blockInterval + 2, // Block received 2 seconds after its slot time started
		previousBlockId: '10639113266773617352',
	};

	const receivedBlock = {
		id: '5687604425910193884',
		height: lastBlockHeight + 1,
		version: 2,
		generatorPublicKey:
			'544670271b533e02f13699d17e6fb2fccd48023685a47fd04b3eec0acf2a9435',
		maxHeightPrevoted: 1,
		timestamp: lastBlockHeight * blockInterval, // Block slot time was height * blockInterval
		receivedAt: lastBlockHeight * blockInterval + 2, // Block received 2 seconds after
		previousBlockId: '4787605425910193884',
	};

	const initialState = {
		blockInterval,
		lastBlock,
		epochTime,
	};

	return {
		title: 'BFT processing generation',
		summary: 'Generate set of blocks to verify fork choice rules',
		config: {
			...initialState,
			forkStatuses: {
				FORK_STATUS_IDENTICAL_BLOCK,
				FORK_STATUS_VALID_BLOCK,
				FORK_STATUS_DOUBLE_FORGING,
				FORK_STATUS_TIE_BREAK,
				FORK_STATUS_DIFFERENT_CHAIN,
				FORK_STATUS_DISCARD,
			},
		},
		runner: 'bft_processing',
		handler: 'bft_fork_choice_rules',
		testCases: [
			{
				description:
					'IDENTICAL_BLOCK: Received identical block, as described as "Case 1" in the LIP',
				input: {
					// Block id is the only check to match identical blocks
					receivedBlock: { ...lastBlock },
				},
				output: {
					forkStatus: FORK_STATUS_IDENTICAL_BLOCK,
				},
			},
			{
				description:
					'VALID_BLOCK: Received valid block, as described as "Case 2" in the LIP',
				input: {
					// Valid blocks are always one step ahead and linked to previous block
					receivedBlock,
				},
				output: {
					forkStatus: FORK_STATUS_VALID_BLOCK,
				},
			},
			{
				description:
					'DISCARD: Received invalid block for current state of chain',
				input: {
					// Any block with lower height than last block is invalid to current
					// state of chain if maxHeightPrevoted is less or same
					receivedBlock: {
						...receivedBlock,
						height: lastBlock.height - 1,
						maxHeightPrevoted: lastBlock.maxHeightPrevoted,
					},
				},
				output: {
					forkStatus: FORK_STATUS_DISCARD,
				},
			},
			{
				description:
					'DOUBLE_FORGING: Received double forging block, as described as "Case 3" in the LIP',
				input: {
					// Double forging block identified when following conditions meet
					// when compared with last block in chain
					//
					// - same height
					// - same maxHeightPrevoted
					// - same previousBlockId
					// - same generatorPublicKey
					// - different block id
					//

					receivedBlock: {
						...receivedBlock,
						height: lastBlock.height,
						maxHeightPrevoted: lastBlock.maxHeightPrevoted,
						previousBlockId: lastBlock.previousBlockId,
						generatorPublicKey: lastBlock.generatorPublicKey,
					},
				},
				output: {
					forkStatus: FORK_STATUS_DOUBLE_FORGING,
				},
			},
			{
				description:
					'TIE_BREAK: Received a block turn to a tie break with last block, as described as "Case 4" in the LIP',
				config: {
					lastBlock: {
						...lastBlock,
						...{ timestamp: lastBlock.timestamp - 5 }, // last block received in earlier slot
					},
					epochTime,
					blockInterval,
				},
				input: {
					// Received block to tie break identified when following conditions meet
					// when compared with last block in chain
					//
					// - same height
					// - same maxHeightPrevoted
					// - same previousBlockId
					// - different block id
					// - received block slot is higher than last applied block slot
					// - received block is received within forging slot time
					// - last block in chain was not received within its forging slot time
					//

					receivedBlock: {
						...receivedBlock,
						height: lastBlock.height,
						maxHeightPrevoted: lastBlock.maxHeightPrevoted,
						previousBlockId: lastBlock.previousBlockId,
						timestamp: lastBlock.timestamp, // Latest block time
						receivedAt: lastBlock.receivedAt,
					},
				},
				output: {
					forkStatus: FORK_STATUS_TIE_BREAK,
				},
			},

			{
				description:
					'DIFFERENT_CHAIN: Received a block from a different chain, as described as "Case 5" in the LIP',
				input: {
					// Block identified from different chain if following conditions meet
					// when compared with last block in chain
					//
					// - Not met the condition of valid block and
					// - maxHeightPrevoted of last block is less than received block maxHeightPrevoted
					//

					receivedBlock: {
						...receivedBlock,
						maxHeightPrevoted: lastBlock.maxHeightPrevoted + 5,
						previousBlockId: '18084359649202066469',
					},
				},
				output: {
					forkStatus: FORK_STATUS_DIFFERENT_CHAIN,
				},
			},

			{
				description:
					'DIFFERENT_CHAIN: Received a block from a different chain, as described as "Case 5" in the LIP',
				input: {
					// Block identified from different chain if following conditions meet
					// when compared with last block in chain
					//
					// - Not met the condition of a valid block and
					// - last block height less than current block height and
					// - maxHeightPrevoted is same for both blocks
					//

					receivedBlock: {
						...receivedBlock,
						height: lastBlock.height + 1,
						maxHeightPrevoted: lastBlock.maxHeightPrevoted,
						previousBlockId: '18084359649202066469',
					},
				},
				output: {
					forkStatus: FORK_STATUS_DIFFERENT_CHAIN,
				},
			},
		],
	};
};

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
	bftForkChoiceTestSuiteGenerator,
]);
