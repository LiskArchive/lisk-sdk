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

import { BasePluginEndpoint, PluginEndpointContext } from 'lisk-sdk';
import { ChainConnectorStore } from './db';
import { AggregateCommitJSON, SentCCUs, SentCCUsJSON, ValidatorsDataJSON } from './types';
import { aggregateCommitToJSON, validatorsHashPreimagetoJSON } from './utils';

export class Endpoint extends BasePluginEndpoint {
	private _chainConnectorStore!: ChainConnectorStore;
	private _sentCCUs!: SentCCUs;

	public init(sentCCUs: SentCCUs) {
		this._sentCCUs = sentCCUs;
	}

	public load(store: ChainConnectorStore) {
		this._chainConnectorStore = store;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getSentCCUs(_context: PluginEndpointContext): Promise<SentCCUsJSON> {
		return this._sentCCUs.map(transaction => transaction.toJSON());
	}

	public async getAggregateCommits(
		_context: PluginEndpointContext,
	): Promise<AggregateCommitJSON[]> {
		const aggregateCommits = await this._chainConnectorStore.getAggregateCommits();
		return aggregateCommits.map(aggregateCommit => aggregateCommitToJSON(aggregateCommit));
	}

	public async getValidatorsInfoFromPreimage(
		_context: PluginEndpointContext,
	): Promise<ValidatorsDataJSON[]> {
		const validatorsHashPreimage = await this._chainConnectorStore.getValidatorsHashPreimage();
		return validatorsHashPreimagetoJSON(validatorsHashPreimage);
	}
}
