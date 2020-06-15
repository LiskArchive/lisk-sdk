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

import { getRandomBytes, hash } from '@liskhq/lisk-cryptography';
import {
	createGenesisBlock,
	GenesisAccountState,
	GenesisBlock,
	validateGenesisBlock,
} from '../src';
import { mergeDeep } from '../src/utils';
import { validGenesisBlockParams } from './fixtures';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import shuffle = require('lodash.shuffle');

const genesisBlock = createGenesisBlock(validGenesisBlockParams);

describe('validate', () => {
	it('should fail if "version" is not zero', () => {
		// Arrange
		const gb = mergeDeep({}, genesisBlock, {
			header: { version: 1 },
		}) as GenesisBlock;

		// Act
		const errors = validateGenesisBlock(gb);

		// Assert
		expect(errors).toHaveLength(1);
		expect(errors[0]).toEqual(
			expect.objectContaining({
				message: 'should be equal to constant',
				params: { allowedValue: 0 },
			}),
		);
	});

	it('should fail if "reward" is not zero', () => {
		// Arrange
		const gb = mergeDeep({}, genesisBlock, {
			header: { reward: BigInt(1) },
		}) as GenesisBlock;

		// Act
		const errors = validateGenesisBlock(gb);

		// Assert
		expect(errors).toHaveLength(1);
		expect(errors[0]).toEqual(
			expect.objectContaining({
				message: 'should be equal to constant',
				params: { allowedValue: BigInt(0) },
			}),
		);
	});

	it('should fail if "transactionRoot" is not empty hash', () => {
		// Arrange
		const gb = mergeDeep({}, genesisBlock, {
			header: { transactionRoot: Buffer.from(getRandomBytes(20)) },
		}) as GenesisBlock;

		// Act
		const errors = validateGenesisBlock(gb);

		// Assert
		expect(errors).toHaveLength(1);
		expect(errors[0]).toEqual(
			expect.objectContaining({
				message: 'should be equal to constant',
				params: { allowedValue: hash(Buffer.alloc(0)) },
			}),
		);
	});

	it('should fail if "generatorPublicKey" is not empty buffer', () => {
		// Arrange
		const gb = mergeDeep({}, genesisBlock, {
			header: { generatorPublicKey: Buffer.from(getRandomBytes(20)) },
		}) as GenesisBlock;

		// Act
		const errors = validateGenesisBlock(gb);

		// Assert
		expect(errors).toHaveLength(1);
		expect(errors[0]).toEqual(
			expect.objectContaining({
				message: 'should be equal to constant',
				params: { allowedValue: Buffer.alloc(0) },
			}),
		);
	});

	it('should fail if "signature" is not empty buffer', () => {
		// Arrange
		const gb = mergeDeep({}, genesisBlock, {
			header: { signature: Buffer.from(getRandomBytes(20)) },
		}) as GenesisBlock;

		// Act
		const errors = validateGenesisBlock(gb);

		// Assert
		expect(errors).toHaveLength(1);
		expect(errors[0]).toEqual(
			expect.objectContaining({
				message: 'should be equal to constant',
				params: { allowedValue: Buffer.alloc(0) },
			}),
		);
	});

	it('should fail if "payload" is less not empty array', () => {
		// Arrange
		const gb = mergeDeep({}, genesisBlock, {
			payload: [Buffer.from(getRandomBytes(10))],
		}) as GenesisBlock;

		// Act
		const errors = validateGenesisBlock(gb);

		// Assert
		expect(errors).toHaveLength(1);
		expect(errors[0]).toEqual(
			expect.objectContaining({
				message: 'should be equal to constant',
				params: { allowedValue: [] },
			}),
		);
	});

	it('should fail if "initRounds" is less than 3', () => {
		// Arrange
		const gb = mergeDeep({}, genesisBlock, {
			header: { asset: { initRounds: 2 } },
		}) as GenesisBlock;

		// Act
		const errors = validateGenesisBlock(gb);

		// Assert
		expect(errors).toHaveLength(1);
		expect(errors[0]).toEqual(
			expect.objectContaining({
				keyword: 'minimum',
				message: 'should be >= 3',
				params: { comparison: '>=', exclusive: false, limit: 3 },
				dataPath: '.initRounds',
			}),
		);
	});

	describe('asset.initDelegates', () => {
		it('should fail if "asset.initDelegates" list is not lexicographically ordered', () => {
			// Arrange
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						initDelegates: shuffle(genesisBlock.header.asset.initDelegates),
					},
				},
			}) as GenesisBlock;

			// Act
			const errors = validateGenesisBlock(gb);

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					message: 'should be lexicographically ordered',
					keyword: 'initDelegates',
					dataPath: 'header.asset.initDelegates',
					schemaPath: 'properties.initDelegates',
				}),
			);
		});

		it('should fail if "asset.initDelegates" list contains address which is not in "accounts"', () => {
			// Arrange
			const invalidAddresses = [getRandomBytes(20), getRandomBytes(20)];
			const initDelegates = [
				...genesisBlock.header.asset.initDelegates,
				...invalidAddresses,
			].sort((a, b) => a.compare(b));
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						initDelegates,
					},
				},
			}) as GenesisBlock;

			// Act
			const errors = validateGenesisBlock(gb);

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					message: 'delegate addresses are not present in accounts',
					keyword: 'initDelegates',
					dataPath: 'header.asset.initDelegates',
					schemaPath: 'properties.initDelegates',
					params: {
						invalidAddresses: invalidAddresses.sort((a, b) => a.compare(b)),
					},
				}),
			);
		});

		it('should fail if "asset.initDelegates" list contains address which is not a "delegate" account', () => {
			// Arrange
			const accounts = genesisBlock.header.asset.accounts.map(acc =>
				mergeDeep({}, acc),
			);
			const delegate = accounts.find(a => {
				return genesisBlock.header.asset.initDelegates[0].equals(a.address);
			}) as GenesisAccountState;
			delegate.asset.delegate.username = '';
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts: accounts.sort((a, b) => a.address.compare(b.address)),
					},
				},
			}) as GenesisBlock;

			// Act
			const errors = validateGenesisBlock(gb);

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					message: 'delegate addresses are not present in accounts',
					keyword: 'initDelegates',
					dataPath: 'header.asset.initDelegates',
					schemaPath: 'properties.initDelegates',
					params: { invalidAddresses: [delegate.address] },
				}),
			);
		});
	});

	describe('asset.accounts', () => {
		it('should fail if "asset.accounts" list is not lexicographically ordered by "address"', () => {
			// Arrange
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts: shuffle(genesisBlock.header.asset.accounts),
					},
				},
			}) as GenesisBlock;

			// Act
			const errors = validateGenesisBlock(gb);

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					message: 'should be lexicographically ordered',
					keyword: 'accounts',
					dataPath: 'header.asset.accounts',
					schemaPath: 'properties.accounts',
					params: { orderKey: 'address' },
				}),
			);
		});

		it('should fail if "asset.accounts" list contains an "address" which does not match with "publicKey"', () => {
			// Arrange
			const accounts = genesisBlock.header.asset.accounts.map(acc =>
				mergeDeep({}, acc),
			);
			const account = accounts.find(a => {
				return a.asset.delegate.username === '';
			}) as GenesisAccountState;
			const newAddress = getRandomBytes(20);
			const actualAddress = account.address;
			account.address = newAddress;
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts: accounts.sort((a, b) => a.address.compare(b.address)),
					},
				},
			}) as GenesisBlock;

			// Act
			const errors = validateGenesisBlock(gb);

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					message: 'account addresses not match with publicKey',
					keyword: 'accounts',
					dataPath: 'header.asset.accounts',
					schemaPath: 'properties.accounts',
					params: {
						publicKey: account.publicKey,
						givenAddress: newAddress,
						expectedAddress: actualAddress,
					},
				}),
			);
		});

		it('should fail if sum of balance of all "asset.accounts" is greater than 2^63-1', () => {
			// Arrange
			const accounts = [...genesisBlock.header.asset.accounts];
			accounts[0].balance = BigInt(2 ** 63);
			const gb = mergeDeep({}, genesisBlock, {
				header: {
					asset: {
						accounts: genesisBlock.header.asset.accounts,
					},
				},
			}) as GenesisBlock;

			// Act
			const errors = validateGenesisBlock(gb);

			// Assert
			expect(errors).toHaveLength(1);
			expect(errors[0]).toEqual(
				expect.objectContaining({
					message: 'total balance exceed the limit (2^63)-1',
					keyword: 'accounts',
					dataPath: 'header.asset.accounts[].balance',
					schemaPath: 'properties.accounts[].balance',
				}),
			);
		});
	});

	describe('asset.accounts[].keys if numberOfSignatures > 0', () => {
		it.todo('should fail if "mandatoryKeys" are not ordered lexicographically');

		it.todo('should fail if "optionalKeys" are not ordered lexicographically');

		it.todo('should fail if "mandatoryKeys" are not unique');

		it.todo('should fail if "optionalKeys" are not unique');

		it.todo(
			'should fail if set of "mandatoryKeys" and "optionalKeys" are not unique',
		);

		it.todo(
			'should fail if set of "mandatoryKeys" and "optionalKeys" is empty',
		);

		it.todo(
			'should fail if set of "mandatoryKeys" and "optionalKeys" contains more than 64 elements',
		);

		it.todo(
			'should fail if "numberOfSignatures" is less than length of "mandatoryKeys"',
		);

		it.todo(
			'should fail if "numberOfSignatures" is greater than length of "mandatoryKeys" + "optionalKeys"',
		);
	});
});
