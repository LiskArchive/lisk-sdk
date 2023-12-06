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
import { getValidatorWeight } from '../utils';
import { ValidatorAccount } from './validator';

export interface EligibleValidator {
	lastReportMisbehaviorHeight: number;
}

export const eligibleValidatorsStoreSchema = {
	$id: '/pos/eligibleValidators',
	type: 'object',
	required: ['lastReportMisbehaviorHeight'],
	properties: {
		lastReportMisbehaviorHeight: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
	},
};

// uint64 + address
const KEY_LENGTH = 8 + 20;

export class EligibleValidatorsStore extends BaseStore<EligibleValidator> {
	public schema = eligibleValidatorsStoreSchema;

	private _config!: ModuleConfig;

	public init(config: ModuleConfig) {
		this._config = config;
	}

	public getKey(address: Buffer, validatorWeight: bigint): Buffer {
		const buffer = Buffer.alloc(8);
		buffer.writeBigUInt64BE(validatorWeight);
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
		const weightBytes = key.subarray(0, 8);
		const address = key.subarray(8);
		return [address, weightBytes.readBigUInt64BE()];
	}

	public async update(
		context: StoreGetter,
		address: Buffer,
		oldWeight: bigint,
		validator: ValidatorAccount,
	): Promise<void> {
		const oldKey = this.getKey(address, oldWeight);
		await this.del(context, oldKey);

		if (validator.isBanned) {
			return;
		}

		const newWeight = getValidatorWeight(
			this._config.factorSelfStakes,
			validator.selfStake,
			validator.totalStake,
		);

		if (newWeight < this._config.minWeightStandby) {
			return;
		}

		const lastReportMisbehaviorHeight = validator.reportMisbehaviorHeights.length
			? validator.reportMisbehaviorHeights[validator.reportMisbehaviorHeights.length - 1]
			: 0;

		await this.set(context, this.getKey(address, newWeight), { lastReportMisbehaviorHeight });
	}
}
