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

import { BasePluginEndpoint, PluginEndpointContext, db as liskDB, AggregateCommit } from 'lisk-sdk';
import { getChainConnectorInfo } from './db';
import { SentCCUs, ValidatorsData } from './types';

export class Endpoint extends BasePluginEndpoint {
	private _db!: liskDB.Database;
	private _sentCCUs!: SentCCUs;

	public init(db: liskDB.Database, sentCCUs: SentCCUs) {
		this._db = db;
		this._sentCCUs = sentCCUs;
	}

	public getSentCCUs(_context: PluginEndpointContext): SentCCUs {
		return this._sentCCUs;
	}

	public async getAggregateCommits(_context: PluginEndpointContext): Promise<AggregateCommit[]> {
		const chainConnectorInfo = await getChainConnectorInfo(this._db);
		return chainConnectorInfo.aggregateCommits;
	}

	public async getValidatorsInfoFromPreimage(
		_context: PluginEndpointContext,
	): Promise<ValidatorsData[]> {
		const chainConnectorInfo = await getChainConnectorInfo(this._db);
		return chainConnectorInfo.validatorsHashPreimage;
	}
}
