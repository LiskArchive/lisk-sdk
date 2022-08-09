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
	codec,
	chain,
	BFTParameters,
} from 'lisk-sdk';
import { CCM_BASED_CCU_FREQUENCY, EMPTY_BYTES, LIVENESS_BASED_CCU_FREQUENCY } from './constants';
import { getChainConnectorInfo, getDBInstance, setChainConnectorInfo } from './db';
import { Endpoint } from './endpoint';
import { chainConnectorInfoSchema, configSchema } from './schemas';
import { ChainConnectorInfo, ChainConnectorPluginConfig, SentCCUs } from './types';

interface Data {
	readonly blockHeader: chain.BlockHeaderJSON;
}
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
	private _chainConnectorState!: ChainConnectorInfo;
	private readonly _sentCCUs: SentCCUs = [];

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
		const chainConnectorInfo = await getChainConnectorInfo(this._chainConnectorPluginDB);
		this._chainConnectorState = {
			crossChainMessages: chainConnectorInfo.crossChainMessages,
			aggregateCommits: chainConnectorInfo.aggregateCommits,
			blockHeaders: chainConnectorInfo.blockHeaders,
			validatorsHashPreimage: chainConnectorInfo.validatorsHashPreimage,
		};

		this._mainchainAPIClient = await apiClient.createIPCClient(this.config.mainchainIPCPath);
		if (this.config.sidechainIPCPath) {
			this._sidechainAPIClient = await apiClient.createIPCClient(this.config.sidechainIPCPath);
		} else {
			this._sidechainAPIClient = this.apiClient;
		}
		// TODO: After DB issue we need to fetch the last sent CCUs and assign it to _sentCCUs
		// eslint-disable-next-line no-console
		console.log(this._sentCCUs);
		// TODO: Fetch the certificate height from last sent CCU and update the height
		this._lastCertifiedHeight = 0;

		// TODO: CCM should be collected and stored via events
		if (this._sidechainAPIClient) {
			this._sidechainAPIClient.subscribe('chain_newBlock', async (data?: Record<string, unknown>) =>
				this._newBlockhandler(data),
			);
			this._sidechainAPIClient.subscribe(
				'network_newBlock',
				async (data?: Record<string, unknown>) => this._newBlockhandler(data),
			);
		}
	}

	public async getNextCertificateFromAggregateCommits(
		lastCertifiedHeight: number,
		aggregateCommits: AggregateCommit[],
	): Promise<Certificate | undefined> {
		const chainConnectorInfo = await getChainConnectorInfo(this._chainConnectorPluginDB);

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

		const bftHeights = await this._sidechainAPIClient.invoke<BFTHeights>('consensus_getBFTHeights');

		let height = bftHeights.maxHeightCertified;

		while (height > lastCertifiedHeight) {
			if (aggregateCommits[height] !== undefined) {
				const valid = await this._checkChainOfTrust(
					blockHeader.validatorsHash!,
					blsKeyToBFTWeight,
					validatorData.certificateThreshold,
					aggregateCommits[height],
				);

				if (valid) {
					return this._getCertificateFromAggregateCommit(aggregateCommits[height]);
				}
			}

			height -= 1;
		}

		// eslint-disable-next-line no-useless-return, consistent-return
		return;
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async unload(): Promise<void> {
		await this._mainchainAPIClient.disconnect();
		if (this._sidechainAPIClient) {
			await this._sidechainAPIClient.disconnect();
		}
		// Save all the state to the DB
		if (this._chainConnectorState) {
			await this._chainConnectorPluginDB.set(
				EMPTY_BYTES,
				codec.encode(chainConnectorInfoSchema, this._chainConnectorState),
			);
		}
		this._chainConnectorPluginDB.close();
	}

	public async deleteBlockHeaders() {
		const chainConnectorInfo = await getChainConnectorInfo(this._chainConnectorPluginDB);

		chainConnectorInfo.blockHeaders = chainConnectorInfo.blockHeaders.filter(
			blockHeader => blockHeader.height >= this._lastCertifiedHeight,
		);

		await setChainConnectorInfo(this._chainConnectorPluginDB, chainConnectorInfo);
	}

	public async deleteAggregateCommits() {
		const chainConnectorInfo = await getChainConnectorInfo(this._chainConnectorPluginDB);

		chainConnectorInfo.aggregateCommits = chainConnectorInfo.aggregateCommits.filter(
			aggregateCommit => aggregateCommit.height >= this._lastCertifiedHeight,
		);

		await setChainConnectorInfo(this._chainConnectorPluginDB, chainConnectorInfo);
	}

	public async deleteValidatorsHashPreimage() {
		const chainConnectorInfo = await getChainConnectorInfo(this._chainConnectorPluginDB);

		chainConnectorInfo.validatorsHashPreimage = chainConnectorInfo.validatorsHashPreimage.filter(
			validatorsHashPreimage =>
				validatorsHashPreimage.certificateThreshold >= BigInt(this._lastCertifiedHeight),
		);

		await setChainConnectorInfo(this._chainConnectorPluginDB, chainConnectorInfo);
	}

	private async _newBlockhandler(data?: Record<string, unknown>) {
		const { blockHeader: receivedBlock } = (data as unknown) as Data;
		const newBlockHeader = chain.BlockHeader.fromJSON(receivedBlock);
		const {
			blockHeaders: savedBlockHeaders,
			aggregateCommits: savedAggregateCommits,
			validatorsHashPreimage: savedValidatorsHashPreimage,
			crossChainMessages: savedCrossChainMessages,
		} = this._chainConnectorState;

		const indexBlockHeader = savedBlockHeaders.findIndex(
			header => header.height === newBlockHeader.height,
		);
		if (indexBlockHeader > -1) {
			savedBlockHeaders[indexBlockHeader] = newBlockHeader;
		} else {
			savedBlockHeaders.push(newBlockHeader);
		}
		const bftParameters = await this._sidechainAPIClient.invoke<BFTParameters>(
			'consensus_getBFTParameters',
			{ height: newBlockHeader.height },
		);

		const indexValidatorsData = savedValidatorsHashPreimage.findIndex(v =>
			v.validatorsHash.equals(bftParameters?.validatorsHash),
		);
		if (indexValidatorsData > -1) {
			savedValidatorsHashPreimage[indexValidatorsData] = {
				certificateThreshold: bftParameters?.certificateThreshold,
				validators: bftParameters?.validators,
				validatorsHash: bftParameters?.validatorsHash,
			};
		} else {
			savedValidatorsHashPreimage.push({
				certificateThreshold: bftParameters?.certificateThreshold,
				validators: bftParameters?.validators,
				validatorsHash: bftParameters?.validatorsHash,
			});
		}

		if (newBlockHeader.aggregateCommit) {
			const indexAggregateCommit = savedAggregateCommits.findIndex(
				commit => commit.height === newBlockHeader.aggregateCommit.height,
			);
			if (indexAggregateCommit > -1) {
				savedAggregateCommits[indexAggregateCommit] = newBlockHeader.aggregateCommit;
			} else {
				savedAggregateCommits.push(newBlockHeader.aggregateCommit);
			}
		}

		// When # of CCMs are there on the outbox to be sent or # of blocks passed from last certified height
		if (
			this._ccuFrequency.ccm >= savedCrossChainMessages.length ||
			this._ccuFrequency.liveness >= newBlockHeader.height - this._lastCertifiedHeight
		) {
			// TODO: _createCCU needs to be implemented which will create and send the CCU transaction
			await this._createCCU();
			// if the transaction is successfully submitted then update the last certfied height and do the cleanup
			// TODO: also check if the state is growing, delete everything from the inMemory state if it goes beyond last 3 rounds
			await this._cleanup();
		}
	}

	private async _getCertificateFromAggregateCommit(
		aggregateCommit: AggregateCommit,
	): Promise<Certificate> {
		const chainConnectorInfo = await getChainConnectorInfo(this._chainConnectorPluginDB);

		const blockHeader = chainConnectorInfo.blockHeaders.find(
			header => header.height === aggregateCommit.height,
		)!;

		const certificate = computeCertificateFromBlockHeader(blockHeader);
		certificate.aggregationBits = blockHeader.aggregateCommit.aggregationBits;
		certificate.signature = aggregateCommit.certificateSignature;

		return certificate;
	}

	private async _checkChainOfTrust(
		lastValidatorsHash: Buffer,
		blsKeyToBFTWeight: Record<string, bigint>,
		lastCertificateThreshold: BigInt,
		aggregateCommit: AggregateCommit,
	): Promise<boolean> {
		const chainConnectorInfo = await getChainConnectorInfo(this._chainConnectorPluginDB);

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

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private async _createCCU() {}
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private async _cleanup() {}
}
