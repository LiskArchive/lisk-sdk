/*
 * Copyright © 2021 Lisk Foundation
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

import { Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { Broadcaster } from '../../../../src/engine/generator/broadcaster';
import { postTransactionsAnnouncementSchema } from '../../../../src/engine/generator/schemas';
import { Network } from '../../../../src/engine/network';
import { fakeLogger } from '../../../utils/mocks';

describe('broadcaster', () => {
	const logger = fakeLogger;
	const defaultBroadcastInterval = 5000;
	const defaultReleaseLimit = 25;
	const tx = new Transaction({
		params: Buffer.alloc(20),
		command: 'transfer',
		fee: BigInt(100000),
		module: 'token',
		nonce: BigInt(0),
		senderPublicKey: Buffer.alloc(32),
		signatures: [Buffer.alloc(64)],
	});

	let broadcaster: Broadcaster;
	let network: Network;
	let pool: TransactionPool;

	beforeEach(() => {
		// Arrange
		network = {
			broadcast: jest.fn(),
		} as never;
		pool = {
			contains: jest.fn().mockReturnValue(true),
		} as never;
		broadcaster = new Broadcaster({
			interval: defaultBroadcastInterval,
			limit: defaultReleaseLimit,
			network,
			transactionPool: pool,
		});
		jest.useFakeTimers();
		broadcaster.init({
			logger,
		});
		broadcaster.start();
	});

	describe('when a transaction is given', () => {
		it('should enqueue to the broadcaster', () => {
			// Act
			broadcaster.enqueueTransactionId(tx.id);

			// Assert
			expect(broadcaster['_transactionIdQueue']).toHaveLength(1);
		});

		it('should broadcast after 5 sec', () => {
			// Arrange
			broadcaster.enqueueTransactionId(tx.id);

			// Act
			jest.advanceTimersByTime(defaultBroadcastInterval);
			const transactionIdsBuffer = codec.encode(postTransactionsAnnouncementSchema, {
				transactionIds: [tx.id],
			});

			// Assert
			expect(network.broadcast).toHaveBeenCalledTimes(1);
			expect(network.broadcast).toHaveBeenCalledWith({
				event: 'postTransactionsAnnouncement',
				data: transactionIdsBuffer,
			});
		});
	});

	describe('when a duplicate transaction is given', () => {
		it('should not enqueue to the broadcaster', () => {
			// Arrange
			broadcaster['_transactionIdQueue'] = [];
			// Act
			broadcaster.enqueueTransactionId(tx.id);
			broadcaster.enqueueTransactionId(tx.id);

			// Assert
			expect(broadcaster['_transactionIdQueue']).toHaveLength(1);
		});
	});

	describe('when the transaction is not in the pool', () => {
		it('should not broadcast after 5 sec', () => {
			// Arrange
			broadcaster.enqueueTransactionId(tx.id);

			// Act
			(pool.contains as jest.Mock).mockReturnValue(false);
			jest.advanceTimersByTime(defaultBroadcastInterval);

			// Assert
			expect(network.broadcast).not.toHaveBeenCalled();
		});
	});

	describe('when 25 transactions are given', () => {
		it('should enqueue to the broadcaster', () => {
			// Arrange
			// Act
			for (let i = 0; i < 25; i += 1) {
				broadcaster.enqueueTransactionId(utils.getRandomBytes(32));
			}

			// Assert
			expect(broadcaster['_transactionIdQueue']).toHaveLength(25);
		});

		it('should broadcast all after 5 sec', () => {
			// Arrange
			const ids = [];
			for (let i = 0; i < 25; i += 1) {
				ids.push(utils.getRandomBytes(32));
			}
			const transactionIdsBuffer = codec.encode(postTransactionsAnnouncementSchema, {
				transactionIds: ids,
			});

			// Act
			for (const id of ids) {
				broadcaster.enqueueTransactionId(id);
			}
			jest.advanceTimersByTime(defaultBroadcastInterval);

			// Assert
			expect(network.broadcast).toHaveBeenCalledWith({
				event: 'postTransactionsAnnouncement',
				data: transactionIdsBuffer,
			});
			expect(broadcaster['_transactionIdQueue']).toHaveLength(0);
		});
	});

	describe('when double ids of release limit are given', () => {
		it('should enqueue to the broadcaster', () => {
			// Arrange
			const ids = [];
			for (let i = 0; i < 50; i += 1) {
				ids.push(utils.getRandomBytes(32));
			}

			// Act
			for (const id of ids) {
				broadcaster.enqueueTransactionId(id);
			}

			// Assert
			expect(broadcaster['_transactionIdQueue']).toHaveLength(50);
		});

		it('should broadcast all after 10 sec', () => {
			// Arrange
			const ids = [];
			for (let i = 0; i < 50; i += 1) {
				ids.push(utils.getRandomBytes(32));
			}
			const transactionIdsBuffer = codec.encode(postTransactionsAnnouncementSchema, {
				transactionIds: ids.slice(0, defaultReleaseLimit),
			});

			// Act
			for (const id of ids) {
				broadcaster.enqueueTransactionId(id);
			}
			jest.advanceTimersByTime(defaultBroadcastInterval * 2);

			// Assert
			expect(network.broadcast).toHaveBeenCalledWith({
				event: 'postTransactionsAnnouncement',
				data: transactionIdsBuffer,
			});
			expect(network.broadcast).toHaveBeenCalledTimes(2);
			expect(broadcaster['_transactionIdQueue']).toHaveLength(0);
		});
	});
});
