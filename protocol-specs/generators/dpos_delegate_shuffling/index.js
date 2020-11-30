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
const previousDelegateList = require('./delegate_address_list.json').delegateList;

const generateShuffledDelegateList = () => {
	const previousRoundSeed1 = 'b9acc2f1fda3666bfb34107f1c6dccc4';
	const delegateList = [...previousDelegateList].map(delegate => ({
		address: Buffer.from(delegate.address, 'hex'),
	}));
	for (const delegate of delegateList) {
		const seedSource = Buffer.concat([Buffer.from(previousRoundSeed1, 'hex'), delegate.address]);
		delegate.roundHash = hash(seedSource);
	}

	delegateList.sort((delegate1, delegate2) => {
		const diff = delegate1.roundHash.compare(delegate2.roundHash);
		if (diff !== 0) {
			return diff;
		}
		return delegate1.address.compare(delegate2.address);
	});

	return {
		input: {
			previousRoundSeed1,
			delegateList: previousDelegateList.map(delegate => delegate.address),
		},
		output: {
			delegateList: delegateList.map(delegate => delegate.address.toString('hex')),
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
