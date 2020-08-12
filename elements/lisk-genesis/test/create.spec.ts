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
import { objects } from '@liskhq/lisk-utils';
import { Account } from '@liskhq/lisk-chain';
import { createGenesisBlock } from '../src';
import { validGenesisBlockParams } from './fixtures';

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
		const initDelegates = objects.cloneDeep(validGenesisBlockParams.initDelegates);
		const initDelegatesSorted = objects.cloneDeep(initDelegates) as Buffer[];
		const initDelegatesUnSorted = objects.cloneDeep(initDelegates) as Buffer[];
		initDelegatesSorted.sort((a, b) => a.compare(b));
		initDelegatesUnSorted.sort((a, b) => b.compare(a));

		// Act
		const genesisBlock = createGenesisBlock({
			...validGenesisBlockParams,
			initDelegates: initDelegatesUnSorted,
		});

		// Assert
		expect(genesisBlock.header.asset.initDelegates).toEqual(initDelegatesSorted);
	});

	it('should set "accounts" ordering lexicographically by "address"', () => {
		// Arrange
		const accounts = objects.cloneDeep(validGenesisBlockParams.accounts) as Account[];
		accounts.sort((a, b) => b.address.compare(a.address));

		const accountsSortedAddresses = accounts.map(a => a.address).sort((a, b) => a.compare(b));

		// Act
		const genesisBlock = createGenesisBlock({
			...validGenesisBlockParams,
			accounts,
		});

		// Assert
		expect(genesisBlock.header.asset.accounts.map(a => a.address)).toEqual(accountsSortedAddresses);
	});
});
