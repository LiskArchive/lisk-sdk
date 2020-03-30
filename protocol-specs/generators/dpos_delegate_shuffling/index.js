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

const { hash } = require('@liskhq/lisk-cryptography');
const BaseGenerator = require('../base_generator');
const previousDelegateList = require('./delegate_address_list.json').list;

const generateShuffledDelegateList = () => {
	const previousRoundSeed = 'b9acc2f1fda3666bfb34107f1c6dccc4';
	const delegateList = [...previousDelegateList];
	for (const delegate of delegateList) {
		const seedSource = previousRoundSeed + delegate.address;
		delegate.roundHash = hash(seedSource, 'utf8').toString('hex');
	}

	delegateList.sort((delegate1, delegate2) => {
		if (delegate1.roundHash !== delegate2.roundHash) {
			return delegate1.roundHash.localeCompare(delegate2.roundHash);
		}
		return delegate1.address.localeCompare(delegate2.address);
	});

	return {
		input: {
			previousRoundSeed,
			delegateList: previousDelegateList,
		},
		output: {
			delegateList,
		},
	};
};

const uniformlyShuffledDelegateList = () => ({
	title: 'Uniform shuffling of delegate list in each round',
	summary: 'A uniformly shuffled delegate list is generated',
	config: 'devnet',
	runner: 'dpos_delegate_shuffling',
	handler: 'uniformly_shuffled_delegate_list',
	testCases: generateShuffledDelegateList(),
});

module.exports = BaseGenerator.runGenerator('dpos_delegate_shuffling', [
	uniformlyShuffledDelegateList,
]);
