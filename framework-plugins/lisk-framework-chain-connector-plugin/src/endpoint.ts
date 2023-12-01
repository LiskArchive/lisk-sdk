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
	chain,
	BlockHeaderJSON,
	validator as liskValidator,
} from 'lisk-sdk';
import { ChainConnectorStore } from './db';
import {
	AggregateCommitJSON,
	CCMsFromEventsJSON,
	ChainConnectorPluginConfig,
	LastSentCCMWithHeightJSON,
	SentCCUsJSON,
	ValidatorsDataJSON,
} from './types';
import { aggregateCommitToJSON, ccmsFromEventsToJSON, validatorsHashPreimagetoJSON } from './utils';
import { authorizeRequestSchema } from './schemas';

// disabled for type annotation
// eslint-disable-next-line prefer-destructuring
const validator: liskValidator.LiskValidator = liskValidator.validator;

export class Endpoint extends BasePluginEndpoint {
	private _chainConnectorStore!: ChainConnectorStore;
	private _config!: ChainConnectorPluginConfig;

	public load(config: ChainConnectorPluginConfig, store: ChainConnectorStore) {
		this._config = config;
		this._chainConnectorStore = store;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getSentCCUs(_context: PluginEndpointContext): Promise<SentCCUsJSON> {
		const sentCCUs = await this._chainConnectorStore.getListOfCCUs();
		return sentCCUs.map(transaction => new chain.Transaction(transaction).toJSON());
	}

	public async getAggregateCommits(
		_context: PluginEndpointContext,
	): Promise<AggregateCommitJSON[]> {
		const aggregateCommits = await this._chainConnectorStore.getAggregateCommits();
		return aggregateCommits.map(aggregateCommit => aggregateCommitToJSON(aggregateCommit));
	}

	public async getBlockHeaders(_context: PluginEndpointContext): Promise<BlockHeaderJSON[]> {
		const blockHeaders = await this._chainConnectorStore.getBlockHeaders();

		return blockHeaders.map(blockHeader => new chain.BlockHeader(blockHeader).toJSON());
	}

	public async getCrossChainMessages(
		_context: PluginEndpointContext,
	): Promise<CCMsFromEventsJSON[]> {
		const ccmsAndInclusionProofs = await this._chainConnectorStore.getCrossChainMessages();
		return ccmsAndInclusionProofs.map(ccmsAndInclusionProof =>
			ccmsFromEventsToJSON(ccmsAndInclusionProof),
		);
	}

	public async getLastSentCCM(_context: PluginEndpointContext): Promise<LastSentCCMWithHeightJSON> {
		const lastSentCCM = await this._chainConnectorStore.getLastSentCCM();
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

	public async getValidatorsInfoFromPreimage(
		_context: PluginEndpointContext,
	): Promise<ValidatorsDataJSON[]> {
		const validatorsHashPreimage = await this._chainConnectorStore.getValidatorsHashPreimage();
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
			await this._chainConnectorStore.deletePrivateKey(this._config.encryptedPrivateKey, password);
			return {
				result,
			};
		}

		await this._chainConnectorStore.setPrivateKey(this._config.encryptedPrivateKey, password);
		return {
			result,
		};
	}
}
