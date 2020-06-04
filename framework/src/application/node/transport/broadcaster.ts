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
import { Logger } from '../../logger';
import { InMemoryChannel } from '../../../controller/channels';

const ENDPOINT_BROADCAST_TRANSACTIONS = 'postTransactionsAnnouncement';

interface BroadcasterConfig {
	readonly releaseLimit: number;
	readonly interval: number;
}

export interface BroadcasterConstructor extends BroadcasterConfig {
	readonly transactionPool: TransactionPool;
	readonly logger: Logger;
	readonly channel: InMemoryChannel;
}

export class Broadcaster {
	private readonly _channel: InMemoryChannel;
	private readonly _logger: Logger;
	private readonly _transactionPool: TransactionPool;
	private readonly _config: BroadcasterConfig;
	private _transactionIdQueue: Buffer[];

	public constructor({
		transactionPool,
		releaseLimit,
		interval,
		logger,
		channel,
	}: BroadcasterConstructor) {
		this._channel = channel;
		this._logger = logger;
		this._transactionPool = transactionPool;
		this._config = {
			releaseLimit,
			interval,
		};
		this._transactionIdQueue = [];

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		setInterval(async () => {
			try {
				await this._broadcast();
			} catch (err) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				this._logger.error({ err }, 'Failed to broadcast information');
			}
		}, this._config.interval);
	}

	public enqueueTransactionId(transactionId: Buffer): boolean {
		if (
			this._transactionIdQueue.find(id => id.equals(transactionId)) !==
			undefined
		) {
			return false;
		}
		this._transactionIdQueue.push(transactionId);

		return true;
	}

	private async _broadcast(): Promise<void> {
		this._transactionIdQueue = this._transactionIdQueue.filter(id =>
			this._transactionPool.contains(id),
		);
		if (this._transactionIdQueue.length > 0) {
			const transactionIds = this._transactionIdQueue.slice(
				0,
				this._config.releaseLimit,
			);

			await this._channel.publishToNetwork('broadcastToNetwork', {
				event: ENDPOINT_BROADCAST_TRANSACTIONS,
				data: {
					transactionIds: transactionIds.map(id => id.toString('base64')),
				},
			});

			this._transactionIdQueue = this._transactionIdQueue.filter(
				id => !transactionIds.includes(id),
			);
		}
	}
}
