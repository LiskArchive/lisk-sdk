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
/* eslint-disable class-methods-use-this */

import {
	GenesisConfig,
	AccountSchema,
	TransactionApplyContext,
	AfterBlockApplyContext,
	BeforeBlockApplyContext,
	AfterGenesisBlockApplyContext,
	Reducers,
	Actions,
	BaseModuleDataAccess,
} from '../types';
import { BaseAsset } from './base_asset';
import { Logger } from '../logger/logger';

export interface BaseModuleChannel {
	publish(name: string, data?: Record<string, unknown>): void;
}

export abstract class BaseModule {
	public readonly config: GenesisConfig;
	public transactionAssets: BaseAsset[] = [];
	public reducers: Reducers = {};
	public actions: Actions = {};
	public events: string[] = [];
	public accountSchema?: AccountSchema;
	protected _logger!: Logger;
	protected _channel!: BaseModuleChannel;
	protected _dataAccess!: BaseModuleDataAccess;
	public abstract name: string;
	public abstract id: number;

	public constructor(genesisConfig: GenesisConfig) {
		this.config = genesisConfig;
	}

	public init(input: {
		channel: BaseModuleChannel;
		dataAccess: BaseModuleDataAccess;
		logger: Logger;
	}): void {
		this._channel = input.channel;
		this._dataAccess = input.dataAccess;
		this._logger = input.logger;
	}

	public async beforeTransactionApply?(context: TransactionApplyContext): Promise<void>;
	public async afterTransactionApply?(context: TransactionApplyContext): Promise<void>;
	public async afterGenesisBlockApply?(context: AfterGenesisBlockApplyContext): Promise<void>;
	public async beforeBlockApply?(context: BeforeBlockApplyContext): Promise<void>;
	public async afterBlockApply?(context: AfterBlockApplyContext): Promise<void>;
}
