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

import { BaseStore, ImmutableStoreGetter, StoreGetter } from '../../base_store';
import { ModuleConfig } from '../types';
import { getDelegateWeight } from '../utils';
import { DelegateAccount } from './delegate';

export interface EligibleDelegate {
	lastPomHeight: number;
}

export const eligibleDelegatesStoreSchema = {
	$id: '/dpos/eligibleDelegates',
	type: 'object',
	required: ['lastPomHeight'],
	properties: {
		lastPomHeight: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
	},
};

// uint64 + address
const KEY_LENGTH = 8 + 20;

export class EligibleDelegatesStore extends BaseStore<EligibleDelegate> {
	public schema = eligibleDelegatesStoreSchema;

	private _config!: ModuleConfig;

	public init(config: ModuleConfig) {
		this._config = config;
	}

	public getKey(address: Buffer, delegateWeight: bigint): Buffer {
		const buffer = Buffer.alloc(8);
		buffer.writeBigUInt64BE(delegateWeight);
		return Buffer.concat([buffer, address]);
	}

	public async getTop(context: ImmutableStoreGetter, count: number) {
		return this.iterate(context, {
			gte: Buffer.alloc(KEY_LENGTH, 0),
			lte: Buffer.alloc(KEY_LENGTH, 255),
			limit: count,
			reverse: true,
		});
	}

	public async getAll(context: ImmutableStoreGetter) {
		return this.iterate(context, {
			gte: Buffer.alloc(KEY_LENGTH, 0),
			lte: Buffer.alloc(KEY_LENGTH, 255),
			reverse: true,
		});
	}

	public splitKey(key: Buffer): [Buffer, bigint] {
		const weightBytes = key.slice(0, 8);
		const address = key.slice(8);
		return [address, weightBytes.readBigUInt64BE()];
	}

	public async update(
		context: StoreGetter,
		address: Buffer,
		oldWeight: bigint,
		delegate: DelegateAccount,
	): Promise<void> {
		const oldKey = this.getKey(address, oldWeight);
		await this.del(context, oldKey);

		if (delegate.isBanned) {
			return;
		}

		const newWeight = getDelegateWeight(
			BigInt(this._config.factorSelfVotes),
			delegate.selfVotes,
			delegate.totalVotesReceived,
		);
		if (newWeight < this._config.minWeightStandby) {
			return;
		}

		const lastPomHeight = delegate.pomHeights.length
			? delegate.pomHeights[delegate.pomHeights.length - 1]
			: 0;

		await this.set(context, this.getKey(address, newWeight), { lastPomHeight });
	}
}
