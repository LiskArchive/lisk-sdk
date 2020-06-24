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

import { hash, getRandomBytes } from '@liskhq/lisk-cryptography';
import {
	createGenesisBlock,
	DefaultAccountAsset,
	GenesisAccountState,
} from '../src';
import { mergeDeep } from '../src/utils';
import { validGenesisBlockParams } from './fixtures';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import cloneDeep = require('lodash.clonedeep');

describe('create', () => {
	it('should create genesis block', () => {
		// Arrange & Act
		const genesisBlock = createGenesisBlock(validGenesisBlockParams);

		// Assert
		expect(genesisBlock).toMatchSnapshot();
	});

	it('should set "version" to zero', () => {
		// Arrange & Act
		const genesisBlock = createGenesisBlock(validGenesisBlockParams);

		// Assert
		expect(genesisBlock.header.version).toEqual(0);
	});

	it('should set "reward" to zero', () => {
		// Arrange & Act
		const genesisBlock = createGenesisBlock(validGenesisBlockParams);

		// Assert
		expect(genesisBlock.header.reward).toEqual(BigInt(0));
	});

	it('should set "transactionRoot" to empty hash', () => {
		// Arrange & Act
		const genesisBlock = createGenesisBlock(validGenesisBlockParams);

		// Assert
		expect(genesisBlock.header.transactionRoot).toEqual(hash(Buffer.alloc(0)));
	});

	it('should set "generatorPublicKey" to empty buffer', () => {
		// Arrange & Act
		const genesisBlock = createGenesisBlock(validGenesisBlockParams);

		// Assert
		expect(genesisBlock.header.generatorPublicKey).toEqual(Buffer.alloc(0));
	});

	it('should set "signature" to empty buffer', () => {
		// Arrange & Act
		const genesisBlock = createGenesisBlock(validGenesisBlockParams);

		// Assert
		expect(genesisBlock.header.signature).toEqual(Buffer.alloc(0));
	});

	it('should set "payload" to empty array', () => {
		// Arrange & Act
		const genesisBlock = createGenesisBlock(validGenesisBlockParams);

		// Assert
		expect(genesisBlock.payload).toEqual([]);
	});

	it('should set "height" to provided height', () => {
		// Arrange
		const height = 10;

		// Act
		const genesisBlock = createGenesisBlock({
			...validGenesisBlockParams,
			height,
		});

		// Assert
		expect(genesisBlock.header.height).toEqual(height);
	});

	it('should set "timestamp" to provided timestamp', () => {
		// Arrange
		const timestamp = 1592227157;

		// Act
		const genesisBlock = createGenesisBlock({
			...validGenesisBlockParams,
			timestamp,
		});

		// Assert
		expect(genesisBlock.header.timestamp).toEqual(timestamp);
	});

	it('should set "previousBlockID" to provided previousBlockID', () => {
		// Arrange
		const previousBlockID = getRandomBytes(20);

		// Act
		const genesisBlock = createGenesisBlock({
			...validGenesisBlockParams,
			previousBlockID,
		});

		// Assert
		expect(genesisBlock.header.previousBlockID).toEqual(previousBlockID);
	});

	it('should set "initRounds" ordering lexicographically', () => {
		// Arrange
		const initDelegates = cloneDeep(validGenesisBlockParams.initDelegates);
		const initDelegatesSorted = cloneDeep(initDelegates);
		const initDelegatesUnSorted = cloneDeep(initDelegates);
		initDelegatesSorted.sort((a, b) => a.compare(b));
		initDelegatesUnSorted.sort((a, b) => b.compare(a));

		// Act
		const genesisBlock = createGenesisBlock({
			...validGenesisBlockParams,
			initDelegates: initDelegatesUnSorted,
		});

		// Assert
		expect(genesisBlock.header.asset.initDelegates).toEqual(
			initDelegatesSorted,
		);
	});

	it('should set "accounts" ordering lexicographically by "address"', () => {
		// Arrange
		const accounts = cloneDeep(validGenesisBlockParams.accounts);
		accounts.sort((a, b) => b.address.compare(a.address));

		const accountsSortedAddresses = accounts
			.map(a => a.address)
			.sort((a, b) => a.compare(b));

		// Act
		const genesisBlock = createGenesisBlock({
			...validGenesisBlockParams,
			accounts,
		});

		// Assert
		expect(genesisBlock.header.asset.accounts.map(a => a.address)).toEqual(
			accountsSortedAddresses,
		);
	});

	it('should set "accounts[].keys.mandatoryKeys" ordering lexicographically', () => {
		// Arrange
		const [account, ...accounts] = cloneDeep(
			validGenesisBlockParams.accounts.sort((a, b) =>
				a.address.compare(b.address),
			),
		);
		accounts.sort((a, b) => a.address.compare(b.address));
		const mandatoryKeysUnsorted = [
			getRandomBytes(32),
			getRandomBytes(32),
			getRandomBytes(32),
		].sort((a, b) => b.compare(a));
		const mandatoryKeysSorted = cloneDeep(mandatoryKeysUnsorted).sort((a, b) =>
			a.compare(b),
		);
		const newAccount = mergeDeep(account, {
			keys: {
				optionalKeys: [],
				mandatoryKeys: mandatoryKeysUnsorted,
				numberOfSignatures: 3,
			},
		}) as GenesisAccountState<DefaultAccountAsset>;

		// Act
		const genesisBlock = createGenesisBlock({
			...validGenesisBlockParams,
			accounts: [newAccount, ...accounts],
		});

		// Assert
		expect(genesisBlock.header.asset.accounts[0].keys.mandatoryKeys).toEqual(
			mandatoryKeysSorted,
		);
	});

	it('should set "accounts[].keys.optionalKeys" ordering lexicographically', () => {
		// Arrange
		const [account, ...accounts] = cloneDeep(
			validGenesisBlockParams.accounts.sort((a, b) =>
				a.address.compare(b.address),
			),
		);
		const optionalKeysUnsorted = [
			getRandomBytes(32),
			getRandomBytes(32),
			getRandomBytes(32),
		].sort((a, b) => b.compare(a));
		const optionalKeysSorted = cloneDeep(optionalKeysUnsorted).sort((a, b) =>
			a.compare(b),
		);
		const newAccount = mergeDeep(account, {
			keys: {
				optionalKeys: optionalKeysUnsorted,
				mandatoryKeys: [],
				numberOfSignatures: 3,
			},
		}) as GenesisAccountState<DefaultAccountAsset>;

		// Act
		const genesisBlock = createGenesisBlock({
			...validGenesisBlockParams,
			accounts: [newAccount, ...accounts],
		});

		// Assert
		expect(genesisBlock.header.asset.accounts[0].keys.optionalKeys).toEqual(
			optionalKeysSorted,
		);
	});
});
