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

import { BasePluginEndpoint, PluginEndpointContext, db as liskDB } from 'lisk-sdk';
import { getChainConnectorInfo } from './db';
import { AggregateCommitJSON, SentCCUs, SentCCUsJSON, ValidatorsDataJSON } from './types';
import { aggregateCommitToJSON, validatorsHashPreimagetoJSON } from './utils';

export class Endpoint extends BasePluginEndpoint {
	private _db!: liskDB.Database;
	private _sentCCUs!: SentCCUs;

	public init(db: liskDB.Database, sentCCUs: SentCCUs) {
		this._db = db;
		this._sentCCUs = sentCCUs;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getSentCCUs(_context: PluginEndpointContext): Promise<SentCCUsJSON> {
		return this._sentCCUs.map(transaction => transaction.toJSON());
	}

	public async getAggregateCommits(
		_context: PluginEndpointContext,
	): Promise<AggregateCommitJSON[]> {
		const chainConnectorInfo = await getChainConnectorInfo(this._db);
		return chainConnectorInfo.aggregateCommits.map(aggregateCommit =>
			aggregateCommitToJSON(aggregateCommit),
		);
	}

	public async getValidatorsInfoFromPreimage(
		_context: PluginEndpointContext,
	): Promise<ValidatorsDataJSON[]> {
		const chainConnectorInfo = await getChainConnectorInfo(this._db);
		return validatorsHashPreimagetoJSON(chainConnectorInfo.validatorsHashPreimage);
	}
}
