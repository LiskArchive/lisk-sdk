/*
 * Copyright © 2023 Lisk Foundation
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

import { rmSync } from 'fs-extra';
import * as sdk from 'lisk-sdk';
import { chain, db as liskDB, blockHeaderSchema, codec, BlockHeader } from 'lisk-sdk';
import { getContradictingBlockHeader, saveBlockHeaders } from '../../src/db';

describe('db', () => {
	const dbPath = 'test-lisk-framework-report-misbehavior-plugin.db';
	const db = new liskDB.Database(dbPath);

	const random20Bytes = Buffer.from('40ff452fae2affe6eeef3c30e53e9eac35a1bc43', 'hex');
	const random32Bytes = Buffer.from(
		'3d1b5dd1ef4ff7b22359598ebdf58966a51adcc03e02ad356632743e65898990',
		'hex',
	);
	const header1 = new chain.BlockHeader({
		height: 100,
		aggregateCommit: {
			aggregationBits: Buffer.alloc(0),
			certificateSignature: Buffer.alloc(0),
			height: 0,
		},
		impliesMaxPrevotes: false,
		generatorAddress: random20Bytes,
		maxHeightGenerated: 0,
		maxHeightPrevoted: 50,
		previousBlockID: random32Bytes,
		timestamp: 100,
		version: 2,
		assetRoot: random32Bytes,
		eventRoot: random32Bytes,
		stateRoot: random32Bytes,
		transactionRoot: random32Bytes,
		validatorsHash: random32Bytes,
		signature: random32Bytes,
	});

	const headerBytes1 = codec.encode(blockHeaderSchema, header1);

	afterAll(async () => {
		await db.clear();

		db.close();

		rmSync(dbPath, {
			recursive: true,
			force: true,
		});
	});

	describe('getContradictingBlockHeader', () => {
		const headerClone = BlockHeader.fromBytes(headerBytes1);

		const header2 = new chain.BlockHeader({
			id: Buffer.from('ff', 'hex'),
			height: 100,
			aggregateCommit: {
				aggregationBits: Buffer.alloc(0),
				certificateSignature: Buffer.alloc(0),
				height: 0,
			},
			impliesMaxPrevotes: false,
			generatorAddress: random20Bytes,
			maxHeightGenerated: 0,
			maxHeightPrevoted: 32,
			previousBlockID: random32Bytes,
			timestamp: 100,
			version: 2,
			assetRoot: random32Bytes,
			eventRoot: random32Bytes,
			stateRoot: random32Bytes,
			transactionRoot: random32Bytes,
			validatorsHash: random32Bytes,
			signature: random32Bytes,
		});

		beforeEach(async () => {
			await saveBlockHeaders(db, headerBytes1);
		});

		it('should return undefined if plugin database is empty', async () => {
			await expect(getContradictingBlockHeader(db, headerClone)).resolves.toBeUndefined();
		});

		it('should return undefined if block headers have same id', async () => {
			await expect(getContradictingBlockHeader(db, headerClone)).resolves.toBeUndefined();
		});

		it('should return undefined if block headers are not contradicting', async () => {
			jest.spyOn(sdk, 'areDistinctHeadersContradicting').mockImplementation(() => false);

			await expect(getContradictingBlockHeader(db, header2)).resolves.toBeUndefined();
		});

		it('should return the block in plugin db if blocks are contradicting', async () => {
			jest.spyOn(sdk, 'areDistinctHeadersContradicting').mockImplementation(() => true);

			await expect(getContradictingBlockHeader(db, header2)).resolves.toEqual(headerClone);
		});
	});
});
