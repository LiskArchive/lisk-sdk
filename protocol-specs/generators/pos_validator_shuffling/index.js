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

const { utils } = require('@liskhq/lisk-cryptography');
const BaseGenerator = require('../base_generator');
const previousDelegateList = require('./validator_address_list.json').validatorList;

const generateShuffledDelegateList = () => {
	const previousRoundSeed1 = 'b9acc2f1fda3666bfb34107f1c6dccc4';
	const validatorList = [...previousDelegateList].map(validator => ({
		address: Buffer.from(validator.address, 'hex'),
	}));
	for (const validator of validatorList) {
		const seedSource = Buffer.concat([Buffer.from(previousRoundSeed1, 'hex'), validator.address]);
		validator.roundHash = utils.hash(seedSource);
	}

	validatorList.sort((validator1, validator2) => {
		const diff = validator1.roundHash.compare(validator2.roundHash);
		if (diff !== 0) {
			return diff;
		}
		return validator1.address.compare(validator2.address);
	});

	return {
		input: {
			previousRoundSeed1,
			validatorList: previousDelegateList.map(validator => validator.address),
		},
		output: {
			validatorList: validatorList.map(validator => validator.address),
		},
	};
};

const uniformlyShuffledDelegateList = () => ({
	title: 'Uniform shuffling of validator list in each round',
	summary: 'A uniformly shuffled validator list is generated',
	config: 'devnet',
	runner: 'pos_validator_shuffling',
	handler: 'uniformly_shuffled_validator_list',
	testCases: generateShuffledDelegateList(),
});

module.exports = BaseGenerator.runGenerator('pos_validator_shuffling', [
	uniformlyShuffledDelegateList,
]);
