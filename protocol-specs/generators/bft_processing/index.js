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
const { loadCSVFile, generateBlockHeader } = require('../../utils/bft');

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
]);
