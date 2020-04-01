/*
 * Copyright © 2020 Lisk Foundation
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

const BaseGenerator = require('../base_generator');
const delegateWeightsWithMoreThan2EligibleStandBy = require('./delegate_weight_more_than_2_eligible_standby.json');
const delegateWeightsWithExactly2EligibleStandBy = require('./delegate_weight_exactly_2_eligible_standby.json');
const delegateWeightsWithExactly1EligibleStandBy = require('./delegate_weight_exactly_1_eligible_standby.json');
const delegateWeightsWith0EligibleStandBy = require('./delegate_weight_0_eligible_standby.json');
const delegateWeightsLessThan103 = require('./delegate_weight_less_than_103.json');

const copyAndSort = list => {
	const copiedList = [...list.map(content => ({ ...content }))];
	copiedList.sort((a, b) => {
		const diff = BigInt(b.voteWeight) - BigInt(a.voteWeight);
		if (diff > BigInt(0)) {
			return 1;
		}
		if (diff < BigInt(0)) {
			return -1;
		}
		return a.address.localeCompare(b.address, 'en');
	});
	return copiedList;
};

const generateForgerSelectionWithMoreThan2EligibleStandBy = () => {
	const randomSeed1 = 'b9acc2f1fda3666bfb34107f1c6dccc4';
	const sortedList = copyAndSort(
		delegateWeightsWithMoreThan2EligibleStandBy.list,
	);
	// Select active delegate first
	const result = sortedList.slice(0, 101);
	const candidates = sortedList.slice(101);

	// Calculate for first standby
	const randomSeed1Buffer = Buffer.from(randomSeed1, 'hex');
	const seedNumber1 = randomSeed1Buffer.readBigUInt64BE();
	const totalWeight = candidates.reduce(
		(prev, current) => prev + BigInt(current.voteWeight),
		BigInt(0),
	);

	let randomInt1 = seedNumber1 % totalWeight;
	let selectedIndex = 0;
	for (const candidate of candidates) {
		if (candidate.voteWeight > randomInt1) {
			result.push(candidate);
			break;
		}
		randomInt1 -= BigInt(candidate.voteWeight);
		selectedIndex += 1;
	}
	// Remove selected candidate
	candidates.splice(selectedIndex, 1);

	// Calculate for second standby
	const randomSeed2 = 'fe47a9e4083414c1b50fccbbadec4205';
	const randomSeed2Buffer = Buffer.from(randomSeed2, 'hex');
	const seedNumber2 = randomSeed2Buffer.readBigUInt64BE();
	const totalWeightAfterRemoving = candidates.reduce(
		(prev, current) => prev + BigInt(current.voteWeight),
		BigInt(0),
	);
	let randomInt2 = seedNumber2 % totalWeightAfterRemoving;

	selectedIndex = 0;
	for (const candidate of candidates) {
		if (candidate.voteWeight > randomInt2) {
			result.push(candidate);
			break;
		}
		randomInt2 -= BigInt(candidate.voteWeight);
		selectedIndex += 1;
	}

	return {
		input: {
			randomSeed1,
			randomSeed2,
			voteWeights: delegateWeightsWithMoreThan2EligibleStandBy.list,
		},
		output: {
			selectedForgers: result.map(vw => vw.address),
		},
	};
};

const generateForgerSelectionWithExactly1EligibleStandBy = () => {
	const randomSeed1 = '0a80d262beed565657a45faf13dc7200';
	const randomSeed2 = '554c112294971da0f97b21f91f3b3f93';
	return {
		input: {
			randomSeed1,
			randomSeed2,
			voteWeights: delegateWeightsWithExactly1EligibleStandBy.list,
		},
		output: {
			selectedForgers: copyAndSort(
				delegateWeightsWithExactly1EligibleStandBy.list,
			)
				.map(dw => dw.address)
				.slice(0, 103),
		},
	};
};

const generateForgerSelectionWithExactly2EligibleStandBy = () => {
	const randomSeed1 = 'eb596af61f13f2dcb043ac23b9e48987';
	const randomSeed2 = '5717710b24f9ad4617dc70939fd05c15';
	return {
		input: {
			randomSeed1,
			randomSeed2,
			voteWeights: delegateWeightsWithExactly2EligibleStandBy.list,
		},
		output: {
			selectedForgers: copyAndSort(
				delegateWeightsWithExactly2EligibleStandBy.list,
			)
				.map(dw => dw.address)
				.slice(0, 103),
		},
	};
};

const generateForgerSelectionWithLessThan103Delegates = () => {
	const randomSeed1 = '225723ef50cbad5e11dd4edf23da652c';
	const randomSeed2 = '9c65ff262b4f4ccc6d56bcbf5a6a1957';
	return {
		input: {
			randomSeed1,
			randomSeed2,
			voteWeights: delegateWeightsLessThan103.list,
		},
		output: {
			selectedForgers: copyAndSort(delegateWeightsLessThan103.list)
				.map(dw => dw.address)
				.slice(0, 103),
		},
	};
};

const generateForgerSelectionWithExactly0EligibleStandBy = () => {
	const randomSeed1 = '153b526559a367c9dd9206fc28cb9eb3';
	const randomSeed2 = '3b915b0d57aa557f2291d2c0698017c9';
	return {
		input: {
			randomSeed1,
			randomSeed2,
			voteWeights: delegateWeightsWith0EligibleStandBy.list,
		},
		output: {
			selectedForgers: copyAndSort(delegateWeightsWith0EligibleStandBy.list)
				.map(dw => dw.address)
				.slice(0, 103),
		},
	};
};

const forgerSelectionWithMoreThan2EligibleStandBy = () => ({
	title: 'Forger selection with more than 2 standby delegates',
	summary:
		'A set of voteWeights which include more than 2 eligible standby delegates',
	config: 'devnet',
	runner: 'dpos_forger_selection',
	handler: 'dpos_forger_selection_more_than_2_standby',
	testCases: generateForgerSelectionWithMoreThan2EligibleStandBy(),
});

const forgerSelectionWithExactly2EligibleStandBy = () => ({
	title: 'Forger selection with more than 1 standby delegate',
	summary: 'A set of voteWeights which include 2 eligible standby delegates',
	config: 'devnet',
	runner: 'dpos_forger_selection',
	handler: 'dpos_forger_selection_exactly_2_standby',
	testCases: generateForgerSelectionWithExactly2EligibleStandBy(),
});

const forgerSelectionWithExactly1EligibleStandBy = () => ({
	title: 'Forger selection with exactly 1 standby delegate',
	summary: 'A set of voteWeights which include 1 eligible standby delegate',
	config: 'devnet',
	runner: 'dpos_forger_selection',
	handler: 'dpos_forger_selection_exactly_1_standby',
	testCases: generateForgerSelectionWithExactly1EligibleStandBy(),
});

const forgerSelectionWithExactly0EligibleStandBy = () => ({
	title: 'Forger selection with 0 standby delegates',
	summary: 'A set of voteWeights which include no eligible standby delegates',
	config: 'devnet',
	runner: 'dpos_forger_selection',
	handler: 'dpos_forger_selection_0_standby',
	testCases: generateForgerSelectionWithExactly0EligibleStandBy(),
});

const forgerSelectionWithLessThan103Delegates = () => ({
	title: 'Forger selection with less than 103 delegates',
	summary: 'A set of voteWeights which include less than 103 delegates',
	config: 'devnet',
	runner: 'dpos_forger_selection',
	handler: 'dpos_forger_selection_less_than_103',
	testCases: generateForgerSelectionWithLessThan103Delegates(),
});

module.exports = BaseGenerator.runGenerator('dpos_forger_selection', [
	forgerSelectionWithMoreThan2EligibleStandBy,
	forgerSelectionWithExactly2EligibleStandBy,
	forgerSelectionWithExactly1EligibleStandBy,
	forgerSelectionWithExactly0EligibleStandBy,
	forgerSelectionWithLessThan103Delegates,
]);
