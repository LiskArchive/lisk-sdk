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

import { codec } from '@liskhq/lisk-codec';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { NETWORK_EVENT_POST_TRANSACTIONS_ANNOUNCEMENT } from './constants';

import { Logger } from '../../logger';
import { Network } from '../network';
import { postTransactionsAnnouncementSchema } from './schemas';

interface BroadcasterConfig {
	readonly limit: number;
	readonly interval: number;
}

export interface BroadcasterConstructor extends BroadcasterConfig {
	readonly transactionPool: TransactionPool;
	readonly network: Network;
}

interface BroadcasterInitArgs {
	readonly logger: Logger;
}

export class Broadcaster {
	private readonly _transactionPool: TransactionPool;
	private readonly _network: Network;
	private readonly _config: BroadcasterConfig;
	private _transactionIdQueue: Buffer[];

	private _logger!: Logger;
	private _loopID?: NodeJS.Timer;

	public constructor({ transactionPool, limit, interval, network }: BroadcasterConstructor) {
		this._transactionPool = transactionPool;
		this._network = network;
		this._config = {
			limit,
			interval,
		};
		this._transactionIdQueue = [];
	}

	public init(args: BroadcasterInitArgs): void {
		this._logger = args.logger;
	}

	public start(): void {
		this._loopID = setInterval(() => {
			try {
				this._broadcast();
			} catch (err) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				this._logger.error({ err }, 'Failed to broadcast information');
			}
		}, this._config.interval);
	}

	public stop(): void {
		if (this._loopID) {
			clearInterval(this._loopID);
		}
	}

	public enqueueTransactionId(transactionId: Buffer): boolean {
		if (this._transactionIdQueue.find(id => id.equals(transactionId)) !== undefined) {
			return false;
		}
		this._transactionIdQueue.push(transactionId);

		return true;
	}

	private _broadcast(): void {
		this._transactionIdQueue = this._transactionIdQueue.filter(id =>
			this._transactionPool.contains(id),
		);
		if (this._transactionIdQueue.length > 0) {
			const transactionIds = this._transactionIdQueue.slice(0, this._config.limit);
			const data = codec.encode(postTransactionsAnnouncementSchema, { transactionIds });
			this._network.broadcast({
				event: NETWORK_EVENT_POST_TRANSACTIONS_ANNOUNCEMENT,
				data,
			});

			this._transactionIdQueue = this._transactionIdQueue.filter(
				id => transactionIds.find(sentID => sentID.equals(id)) === undefined,
			);
		}
	}
}
