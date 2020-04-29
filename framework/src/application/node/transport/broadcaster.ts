/*
 * Copyright © 2019 Lisk Foundation
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

import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { Logger, Channel } from '../../../types';

const ENDPOINT_BROADCAST_TRANSACTIONS = 'postTransactionsAnnouncement';

interface BroadcasterConfig {
	readonly releaseLimit: number;
	readonly interval: number;
}

export interface BroadcasterConstructor extends BroadcasterConfig {
	readonly transactionPool: TransactionPool;
	readonly logger: Logger;
	readonly channel: Channel;
}

export class Broadcaster {
	private readonly channel: Channel;
	private readonly logger: Logger;
	private readonly transactionPool: TransactionPool;
	private readonly config: BroadcasterConfig;
	private transactionIdQueue: string[];

	constructor({
		transactionPool,
		releaseLimit,
		interval,
		logger,
		channel,
	}: BroadcasterConstructor) {
		this.channel = channel;
		this.logger = logger;
		this.transactionPool = transactionPool;
		this.config = {
			releaseLimit,
			interval,
		};
		this.transactionIdQueue = [];

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		setInterval(async () => {
			try {
				await this._broadcast();
			} catch (err) {
				this.logger.error({ err }, 'Failed to broadcast information');
			}
		}, this.config.interval);
	}

	enqueueTransactionId(transactionId: string): boolean {
		if (
			this.transactionIdQueue.find(id => id === transactionId) !== undefined
		) {
			return false;
		}
		this.transactionIdQueue.push(transactionId);

		return true;
	}

	async _broadcast(): Promise<void> {
		this.transactionIdQueue = this.transactionIdQueue.filter(id =>
			this.transactionPool.contains(id),
		);
		if (this.transactionIdQueue.length > 0) {
			const transactionIds = this.transactionIdQueue.slice(
				0,
				this.config.releaseLimit,
			);

			await this.channel.publishToNetwork('broadcastToNetwork', {
				event: ENDPOINT_BROADCAST_TRANSACTIONS,
				data: {
					transactionIds,
				},
			});

			this.transactionIdQueue = this.transactionIdQueue.filter(
				id => !transactionIds.includes(id),
			);
		}
	}
}
