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

import {
	BasePluginEndpoint,
	PluginEndpointContext,
	BlockHeader,
	BlockHeaderJSON,
	validator as liskValidator,
} from 'lisk-sdk';
import {
	AggregateCommitJSON,
	CCMWithHeightJSON,
	LastSentCCMWithHeightJSON,
	ValidatorsDataHeightJSON,
} from './types';
import { aggregateCommitToJSON, ccmsWithHeightToJSON, validatorsHashPreimagetoJSON } from './utils';
import { authorizeRequestSchema } from './schemas';
import { ChainConnectorDB } from './db';

// disabled for type annotation
// eslint-disable-next-line prefer-destructuring
const validator: liskValidator.LiskValidator = liskValidator.validator;

export class ChainConnectorEndpoint extends BasePluginEndpoint {
	private db!: ChainConnectorDB;
	private _encryptedPrivateKey!: string;

	public load(encryptedPrivateKey: string, store: ChainConnectorDB) {
		this._encryptedPrivateKey = encryptedPrivateKey;
		this.db = store;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getSentCCUs(
		_context: PluginEndpointContext,
	): Promise<{ list: Record<string, unknown>[]; total: number }> {
		return this.db.getListOfCCUs();
	}

	public async getAggregateCommits(context: PluginEndpointContext): Promise<AggregateCommitJSON[]> {
		const { from, to } = context.params as { from: number; to: number };
		const aggregateCommits = await this.db.getAggregateCommitBetweenHeights(from, to);
		return aggregateCommits.map(aggregateCommit => aggregateCommitToJSON(aggregateCommit));
	}

	public async getBlockHeaders(context: PluginEndpointContext): Promise<BlockHeaderJSON[]> {
		const { from, to } = context.params as { from: number; to: number };
		const blockHeaders = await this.db.getBlockHeadersBetweenHeights(from, to);

		return blockHeaders.map(blockHeader => new BlockHeader(blockHeader).toJSON());
	}

	public async getCrossChainMessages(context: PluginEndpointContext): Promise<CCMWithHeightJSON[]> {
		const { from, to } = context.params as { from: number; to: number };

		const ccms = await this.db.getCCMsBetweenHeights(from, to);

		return ccmsWithHeightToJSON(ccms);
	}

	public async getLastSentCCM(_context: PluginEndpointContext): Promise<LastSentCCMWithHeightJSON> {
		const lastSentCCM = await this.db.getLastSentCCM();
		if (!lastSentCCM) {
			throw new Error('No CCM was sent so far.');
		}
		return {
			...lastSentCCM,
			fee: lastSentCCM.fee.toString(),
			height: lastSentCCM.height,
			receivingChainID: lastSentCCM.receivingChainID.toString('hex'),
			sendingChainID: lastSentCCM.sendingChainID.toString('hex'),
			nonce: lastSentCCM.nonce.toString(),
			params: lastSentCCM.params.toString('hex'),
		};
	}

	public async getAllValidatorsData(
		_context: PluginEndpointContext,
	): Promise<ValidatorsDataHeightJSON[]> {
		const validatorsHashPreimage = await this.db.getAllValidatorsData();
		return validatorsHashPreimagetoJSON(validatorsHashPreimage);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async authorize(context: PluginEndpointContext): Promise<{ result: string }> {
		validator.validate<{ enable: boolean; password: string }>(
			authorizeRequestSchema,
			context.params,
		);

		const { enable, password } = context.params;
		const result = `Successfully ${enable ? 'enabled' : 'disabled'} the chain connector plugin.`;

		if (!enable) {
			await this.db.deletePrivateKey(this._encryptedPrivateKey, password);
			return {
				result,
			};
		}

		await this.db.setPrivateKey(this._encryptedPrivateKey, password);
		return {
			result,
		};
	}
}
