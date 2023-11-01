/* eslint-disable max-classes-per-file */
/*
 * Copyright © 2022 Lisk Foundation
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

import { InMemoryDatabase } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { LegacyEndpoint } from '../../../../src/engine/legacy/endpoint';
import { blockFixtures } from './fixtures';
import {
	blockSchemaV2,
	blockHeaderSchemaV2,
	transactionSchemaV2,
} from '../../../../src/engine/legacy/schemas';
import { LegacyBlockJSON, LegacyTransactionJSON } from '../../../../src/engine/legacy/types';
import { Storage } from '../../../../src/engine/legacy/storage';

const bufferToHex = (b: Buffer) => Buffer.from(b).toString('hex');
const randomSnapshotBlockID = utils.getRandomBytes(20);
const expectedSnapshotBlockID = utils.getRandomBytes(20);

describe('Legacy endpoint', () => {
	const { header, payload } = blockFixtures[0];
	let encodedBlock: Buffer;
	let legacyEndpoint: LegacyEndpoint;

	beforeEach(() => {
		legacyEndpoint = new LegacyEndpoint({
			db: new InMemoryDatabase() as any,
			legacyConfig: {
				sync: true,
				brackets: [
					{
						startHeight: 0,
						snapshotBlockID: randomSnapshotBlockID.toString('hex'),
						snapshotHeight: 100,
					},
					{
						startHeight: 16270306,
						snapshotBlockID: expectedSnapshotBlockID.toString('hex'),
						snapshotHeight: 16270316,
					},
				],
			},
		});
		encodedBlock = codec.encode(blockSchemaV2, {
			header: codec.encode(blockHeaderSchemaV2, header),
			payload,
		});

		jest.spyOn(legacyEndpoint.storage, 'getBlockByID').mockResolvedValue(encodedBlock);
		jest.spyOn(legacyEndpoint.storage, 'getBlockByHeight').mockResolvedValue(encodedBlock);
	});

	describe('LegacyEndpoint', () => {
		const matchBlockExpectations = (block: LegacyBlockJSON) => {
			expect(block.header.id).toEqual(bufferToHex(header.id));
			expect(block.header.version).toEqual(header.version);
			expect(block.header.timestamp).toEqual(header.timestamp);
			expect(block.header.height).toEqual(header.height);
			expect(block.header.previousBlockID).toEqual(bufferToHex(header.previousBlockID));
			expect(block.header.transactionRoot).toEqual(bufferToHex(header.transactionRoot));
			expect(block.header.generatorPublicKey).toEqual(bufferToHex(header.generatorPublicKey));
			expect(BigInt(block.header.reward as number)).toEqual(header.reward);
			expect(block.header.asset).toEqual(bufferToHex(header.asset));
			expect(block.header.signature).toEqual(bufferToHex(header.signature));

			expect(block.payload).toHaveLength(payload.length);
			expect(block.payload[0]).toEqual(bufferToHex(payload[0]));
		};

		const matchTxExpectations = (
			transaction: LegacyTransactionJSON,
			inputTx: Buffer,
			inputTxId: string,
		): void => {
			expect(transaction.id).toEqual(inputTxId);
			expect(codec.encodeJSON(transactionSchemaV2, transaction)).toEqual(inputTx);

			expect(
				codec.encodeJSON(transactionSchemaV2, {
					...transaction,
					moduleID: transaction.moduleID - 1,
				} as LegacyTransactionJSON),
			).not.toEqual(inputTx);
		};

		it('getBlockByID', async () => {
			const block = await legacyEndpoint.getBlockByID({
				params: { id: bufferToHex(header.id) },
			} as any);

			matchBlockExpectations(block);
		});

		it('getBlockByHeight', async () => {
			const block = await legacyEndpoint.getBlockByHeight({
				params: { height: header.height },
			} as any);

			matchBlockExpectations(block);
		});

		it('getTransactionByID', async () => {
			const tx = payload[0];
			jest.spyOn(legacyEndpoint['storage'], 'getTransactionByID').mockResolvedValue(tx);

			const txId = utils.hash(tx).toString('hex');
			const transaction = await legacyEndpoint.getTransactionByID({
				params: { id: txId },
			} as any);

			matchTxExpectations(transaction, tx, txId);
		});

		it('getTransactionsByBlockID', async () => {
			const blockId = header.id;
			const tx = payload[0];
			const txId = utils.hash(tx).toString('hex');

			jest.spyOn(legacyEndpoint['storage'], 'getTransactionsByBlockID').mockResolvedValue([tx]);

			const transactions = await legacyEndpoint.getTransactionsByBlockID({
				params: { id: blockId.toString('hex') },
			} as any);

			expect(transactions).toBeArray();
			matchTxExpectations(transactions[0], tx, txId);
		});

		it('getLegacyBrackets', async () => {
			const blockId = header.id;
			const legacyConfig = {
				sync: true,
				brackets: [
					{
						startHeight: header.height - 200,
						snapshotBlockID: blockId.toString('hex'),
						snapshotHeight: header.height,
					},
				],
			};

			const legacyStorage = new Storage(new InMemoryDatabase() as any);
			await legacyStorage.setBracketInfo(blockId, {
				startHeight: header.height - 200,
				lastBlockHeight: header.height - 100,
				snapshotBlockHeight: header.height,
			});
			legacyEndpoint = new LegacyEndpoint({
				db: legacyStorage as any,
				legacyConfig,
			});

			(legacyEndpoint as any)['storage'] = legacyStorage;

			const brackets = await legacyEndpoint.getLegacyBrackets({} as any);

			expect(brackets).toEqual([
				{
					startHeight: legacyConfig.brackets[0].startHeight,
					snapshotBlockID: legacyConfig.brackets[0].snapshotBlockID,
					snapshotBlockHeight: header.height,
					lastBlockHeight: header.height - 100,
				},
			]);
		});
	});
});
