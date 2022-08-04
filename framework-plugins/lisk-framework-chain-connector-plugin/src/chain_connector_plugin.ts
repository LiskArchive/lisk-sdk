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
	BasePlugin,
	PluginInitContext,
	apiClient,
	computeCertificateFromBlockHeader,
	AggregateCommit,
	Certificate,
	BFTHeights,
	db as liskDB,
} from 'lisk-sdk';
import { ChainConnectorPluginConfig, SentCCUs } from './types';
import { configSchema } from './schemas';
import { CCM_BASED_CCU_FREQUENCY, LIVENESS_BASED_CCU_FREQUENCY } from './constants';
import { Endpoint } from './endpoint';
import { getChainConnectorInfo, getDBInstance } from './db';

interface CCUFrequencyConfig {
	ccm: number;
	liveness: number;
}

export class ChainConnectorPlugin extends BasePlugin<ChainConnectorPluginConfig> {
	public name = 'chainConnector';
	public endpoint = new Endpoint();
	public configSchema = configSchema;
	private _chainConnectorPluginDB!: liskDB.Database;
	private _lastCertifiedHeight!: number;
	private _ccuFrequency!: CCUFrequencyConfig;
	private _mainchainAPIClient!: apiClient.APIClient;
	private _sidechainAPIClient!: apiClient.APIClient;
	private readonly _sentCCUs: SentCCUs = [];

	// eslint-disable-next-line @typescript-eslint/prefer-readonly
	private _chainConnectorDB!: liskDB.Database;

	public get nodeModulePath(): string {
		return __filename;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(context: PluginInitContext): Promise<void> {
		await super.init(context);
		this.endpoint.init(this._chainConnectorPluginDB, this._sentCCUs);
		this._ccuFrequency = {
			ccm: this.config.ccmBasedFrequency || CCM_BASED_CCU_FREQUENCY,
			liveness: this.config.livenessBasedFrequency || LIVENESS_BASED_CCU_FREQUENCY,
		};
	}

	public async load(): Promise<void> {
		this._chainConnectorPluginDB = await getDBInstance(this.dataPath);
		this._mainchainAPIClient = await apiClient.createIPCClient(this.config.mainchainIPCPath);
		if (this.config.sidechainIPCPath) {
			this._sidechainAPIClient = await apiClient.createIPCClient(this.config.sidechainIPCPath);
		} else {
			this._sidechainAPIClient = this.apiClient;
		}
		// TODO: After DB issue we need to fetch the last sent CCUs and assign it to _sentCCUs
		// eslint-disable-next-line no-console
		console.log(this._lastCertifiedHeight, this._sentCCUs, this._ccuFrequency);
		this._chainConnectorDB = await getDBInstance(this.dataPath);

		// TODO: Fetch the certificate height from last sent CCU and update the height
		this._lastCertifiedHeight = 0;
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async unload(): Promise<void> {
		await this._mainchainAPIClient.disconnect();
		if (this._sidechainAPIClient) {
			await this._sidechainAPIClient.disconnect();
		}
	}

	public async getCertificateFromAggregateCommit(
		aggregateCommit: AggregateCommit,
	): Promise<Certificate> {
		const chainConnectorInfo = await getChainConnectorInfo(this._chainConnectorDB);

		const blockHeader = chainConnectorInfo.blockHeaders.find(
			header => header.height === aggregateCommit.height,
		)!;

		const certificate = computeCertificateFromBlockHeader(blockHeader);
		certificate.aggregationBits = blockHeader.aggregateCommit.aggregationBits;
		certificate.signature = aggregateCommit.certificateSignature;

		return certificate;
	}

	public async getNextCertificateFromAggregateCommits(
		lastCertifiedHeight: number,
		aggregateCommits: AggregateCommit[],
	): Promise<Certificate | undefined> {
		const chainConnectorInfo = await getChainConnectorInfo(this._chainConnectorDB);

		const blockHeader = chainConnectorInfo.blockHeaders.find(
			header => header.height === lastCertifiedHeight,
		)!;

		const validatorData = chainConnectorInfo.validatorsHashPreimage.find(
			data => data.validatorsHash === blockHeader.validatorsHash!,
		)!;

		const blsKeyToBFTWeight: Record<string, bigint> = {};

		for (const validator of validatorData.validators) {
			blsKeyToBFTWeight[validator.blsKey.toString('hex')] = validator.bftWeight;
		}

		const bftHeights = await this._mainchainAPIClient.invoke<BFTHeights>('consensus_getBFTHeights');

		let height = bftHeights.maxHeightCertified;

		while (height > lastCertifiedHeight) {
			if (aggregateCommits[height] !== undefined) {
				const valid = await this.checkChainOfTrust(
					blockHeader.validatorsHash!,
					blsKeyToBFTWeight,
					validatorData.certificateThreshold,
					aggregateCommits[height],
				);

				if (valid) {
					return this.getCertificateFromAggregateCommit(aggregateCommits[height]);
				}
			}

			height -= 1;
		}

		return undefined;
	}

	public async checkChainOfTrust(
		lastValidatorsHash: Buffer,
		blsKeyToBFTWeight: Record<string, bigint>,
		lastCertificateThreshold: BigInt,
		aggregateCommit: AggregateCommit,
	): Promise<boolean> {
		const chainConnectorInfo = await getChainConnectorInfo(this._chainConnectorDB);

		const blockHeader = chainConnectorInfo.blockHeaders.find(
			header => BigInt(header.height) === lastCertificateThreshold,
		)!;

		if (lastValidatorsHash === blockHeader.validatorsHash) {
			return true;
		}

		let aggregateBFTWeight = BigInt(0);

		const validatorData = chainConnectorInfo.validatorsHashPreimage.find(
			data => data.validatorsHash === blockHeader.validatorsHash!,
		)!;

		for (let i = 0; i < validatorData.validators.length; i += 1) {
			if (aggregateCommit.aggregationBits[i] === 1) {
				const blsKey = validatorData.validators[i].blsKey.toString('hex');
				if (blsKeyToBFTWeight[blsKey] === undefined) {
					return false;
				}

				aggregateBFTWeight += blsKeyToBFTWeight[blsKey];
			}
		}

		if (aggregateBFTWeight >= lastCertificateThreshold) {
			return true;
		}

		return false;
	}
}
