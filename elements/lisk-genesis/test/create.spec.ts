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

import { createGenesisBlock } from '../src';
import { validGenesisBlockParams } from './fixtures';

describe('create', () => {
	it.todo('should create genesis block', () => {
		expect(createGenesisBlock(validGenesisBlockParams)).toMatchSnapshot();
	});

	it.todo('should set "version" to zero');
	it.todo('should set "reward" to zero');
	it.todo('should set "transactionRoot" to empty hash');
	it.todo('should set "generatorPublicKey" to empty buffer');
	it.todo('should set "signature" to empty buffer');
	it.todo('should set "payload" to empty array');
	it.todo('should set "height" to provided height');
	it.todo('should set "timestamp" to provided timestamp');
	it.todo('should set "previousBlockID" to provided previousBlockID');
	it.todo('should fail if "initRounds" is less than 3');

	describe('initDelegates', () => {
		it.todo('should fail if "initDelegates" list is not provided');
		it.todo(
			'should fail if "initDelegates" list provided contains more than ROUND_LENGTH items',
		);
		it.todo(
			'should fail if "initDelegates" list contains account address which is not provided in "accounts"',
		);
		it.todo(
			'should fail if "initDelegates" list contains account address which is not a delegate',
		);
		it.todo('should sort "asset.initDelegates" list lexicographically');
	});

	describe('accounts', () => {
		it.todo('should fail if "accounts" list is not provided');
		it.todo(
			'should create address by "publicKey" for every account which is "address"',
		);
		it.todo(
			'should fail if "address" of any "account" does not matches to associated "publicKey"',
		);
		it.todo(
			'should fail "account.keys" does not validated for every account "keys.numberOfSignatures > 0"',
		);
		it.todo(
			'should sort "asset.accounts" ordered lexicographically by account "address"',
		);
		it.todo(
			'should fail if sum of balance of all accounts is more than "2^63-1"',
		);
	});
});
