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
	LIVENESS_LIMIT,
	ChainAccount,
	OutboxRootWitness,
	MESSAGE_TAG_CERTIFICATE,
	ActiveValidator,
	certificateSchema,
	cryptography,
	ccmSchema,
	CCMsg,
	JSONObject,
	ChainStatus,
	Schema,
	OwnChainAccountJSON,
} from 'lisk-sdk';
import {
	CCU_FREQUENCY,
	MODULE_NAME_INTEROPERABILITY,
	CCM_SEND_SUCCESS,
	DB_KEY_SIDECHAIN,
} from './constants';
import { ChainConnectorStore, getDBInstance } from './db';
import { Endpoint } from './endpoint';
import { configSchema } from './schemas';
import {
	ChainConnectorPluginConfig,
	SentCCUs,
	CrossChainUpdateTransactionParams,
	InboxUpdate,
	ProveResponse,
	BlockHeader,
} from './types';
import { getActiveValidatorsDiff } from './utils';

interface Data {
	readonly blockHeader: chain.BlockHeaderJSON;
}

interface LivenessValidationResult {
	status: boolean;
	isLive: boolean;
	chainID: Buffer;
	certificateTimestamp: number;
	blockTimestamp: number;
}

interface CertificateValidationResult {
	status: boolean;
	livenessValidationResult?: LivenessValidationResult;
	chainStatus: number;
	certificate: Certificate;
	blockHeader: BlockHeader;
	hasValidBLSWeightedAggSig?: boolean;
	message: string;
}

type ModuleMetadata = [{ stores: { key: string; data: Schema }[]; name: string }];

export class ChainConnectorPlugin extends BasePlugin<ChainConnectorPluginConfig> {
	public endpoint = new Endpoint();
	public configSchema = configSchema;
	private _chainConnectorPluginDB!: liskDB.Database;
	private _sidechainChainConnectorStore!: ChainConnectorStore;
	private _lastCertifiedHeight!: number;
	private _ccuFrequency!: number;
	private _mainchainAPIClient!: apiClient.APIClient;
	private _sidechainAPIClient!: apiClient.APIClient;
	private readonly _sentCCUs: SentCCUs = [];

	public get nodeModulePath(): string {
		return __filename;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(context: PluginInitContext): Promise<void> {
		await super.init(context);
		this.endpoint.init(this._sentCCUs);
		this._ccuFrequency = this.config.ccuFrequency ?? CCU_FREQUENCY;
	}

	public async load(): Promise<void> {
		this._chainConnectorPluginDB = await getDBInstance(this.dataPath);
		this._sidechainChainConnectorStore = new ChainConnectorStore(
			this._chainConnectorPluginDB,
			DB_KEY_SIDECHAIN,
		);
		this.endpoint.load(this._sidechainChainConnectorStore);

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
				this._newBlockHandler(data),
			);
		}
	}

	public async getNextCertificateFromAggregateCommits(
		lastCertifiedHeight: number,
		aggregateCommits: AggregateCommit[],
	): Promise<Certificate | undefined> {
		const blockHeaders = await this._sidechainChainConnectorStore.getBlockHeaders();
		const blockHeader = blockHeaders.find(header => header.height === lastCertifiedHeight);

		if (!blockHeader) {
			throw new Error(`No blockHeader found for lastCertifiedHeight: ${lastCertifiedHeight}`);
		}

		const validatorsHashPreimage =
			await this._sidechainChainConnectorStore.getValidatorsHashPreimage();
		const validatorsData = validatorsHashPreimage.find(
			data => data.validatorsHash === blockHeader.validatorsHash,
		);

		if (!validatorsData) {
			throw new Error(
				`No Validators data found for the given validatorsHash: ${blockHeader.validatorsHash.toString(
					'hex',
				)}.`,
			);
		}

		const blsKeyToBFTWeight: Record<string, bigint> = {};

		for (const validator of validatorsData.validators) {
			blsKeyToBFTWeight[validator.blsKey.toString('hex')] = validator.bftWeight;
		}

		const bftHeights = await this._sidechainAPIClient.invoke<BFTHeights>('consensus_getBFTHeights');

		let height = bftHeights.maxHeightCertified;

		while (height > lastCertifiedHeight) {
			if (aggregateCommits[height] !== undefined && blockHeader.validatorsHash) {
				const valid = await this._checkChainOfTrust(
					blockHeader.validatorsHash,
					blsKeyToBFTWeight,
					validatorsData.certificateThreshold,
					aggregateCommits[height],
				);

				if (valid) {
					return this._getCertificateFromAggregateCommit(aggregateCommits[height]);
				}
			}

			height -= 1;
		}

		return undefined;
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async unload(): Promise<void> {
		await this._mainchainAPIClient.disconnect();
		if (this._sidechainAPIClient) {
			await this._sidechainAPIClient.disconnect();
		}

		this._sidechainChainConnectorStore.close();
	}

	public async deleteBlockHeaders() {
		const blockHeaders = await this._sidechainChainConnectorStore.getBlockHeaders();

		await this._sidechainChainConnectorStore.setBlockHeaders(
			blockHeaders.filter(blockHeader => blockHeader.height >= this._lastCertifiedHeight),
		);
	}

	public async deleteAggregateCommits() {
		const aggregateCommits = await this._sidechainChainConnectorStore.getAggregateCommits();

		await this._sidechainChainConnectorStore.setAggregateCommits(
			aggregateCommits.filter(
				aggregateCommit => aggregateCommit.height >= this._lastCertifiedHeight,
			),
		);
	}

	public async deleteValidatorsHashPreimage() {
		const validatorsHashPreimage =
			await this._sidechainChainConnectorStore.getValidatorsHashPreimage();

		await this._sidechainChainConnectorStore.setValidatorsHashPreimage(
			validatorsHashPreimage.filter(
				validatorsData => validatorsData.certificateThreshold >= BigInt(this._lastCertifiedHeight),
			),
		);
	}

	public async calculateCCUParams(
		sendingChainID: Buffer,
		certificate: Certificate,
		newCertificateThreshold: bigint,
	): Promise<CrossChainUpdateTransactionParams | undefined> {
		let activeBFTValidatorsUpdate: ActiveValidator[];
		let activeValidatorsUpdate: ActiveValidator[] = [];
		let certificateThreshold = newCertificateThreshold;

		const blockHeaders = await this._sidechainChainConnectorStore.getBlockHeaders();

		const blockHeader = blockHeaders.find(header => header.height === certificate.height);

		if (!blockHeader) {
			throw new Error(
				`No block header found for the given certificate height ${certificate.height}.`,
			);
		}

		const chainAccount = await this._mainchainAPIClient.invoke<ChainAccount>(
			'interoperability_getChainAccount',
			{ chainID: sendingChainID },
		);

		const certificateBytes = codec.encode(certificateSchema, certificate);

		const certificateValidationResult = await this._validateCertificate(
			certificateBytes,
			certificate,
			blockHeader,
			chainAccount,
			sendingChainID,
		);
		if (!certificateValidationResult.status) {
			this.logger.error(certificateValidationResult, 'Certificate validation failed');

			return undefined;
		}

		if (!chainAccount.lastCertificate.validatorsHash.equals(certificate.validatorsHash)) {
			const validatorsHashPreimage =
				await this._sidechainChainConnectorStore.getValidatorsHashPreimage();

			const validatorDataAtCertificate = validatorsHashPreimage.find(validatorsData =>
				validatorsData.validatorsHash.equals(blockHeader.validatorsHash),
			);

			if (!validatorDataAtCertificate) {
				throw new Error(
					`No validators data for given validatorsHash at certificate height: ${certificate.height}.`,
				);
			}

			const validatorDataAtLastCertificate = validatorsHashPreimage.find(validatorsData =>
				validatorsData.validatorsHash.equals(chainAccount.lastCertificate.validatorsHash),
			);

			if (!validatorDataAtLastCertificate) {
				throw new Error(
					`No validators data for the given validatorsHash: ${chainAccount.lastCertificate.validatorsHash.toString(
						'hex',
					)} at last certified height: ${chainAccount.lastCertificate.height}.`,
				);
			}

			if (
				validatorDataAtCertificate.certificateThreshold ===
				validatorDataAtLastCertificate.certificateThreshold
			) {
				certificateThreshold = BigInt(0);
			}

			activeBFTValidatorsUpdate = getActiveValidatorsDiff(
				validatorDataAtLastCertificate.validators,
				validatorDataAtCertificate.validators,
			);

			activeValidatorsUpdate = activeBFTValidatorsUpdate.map(
				validator =>
					({
						blsKey: validator.blsKey,
						bftWeight: validator.bftWeight,
					} as ActiveValidator),
			);
		}

		const inboxUpdate = await this._calculateInboxUpdate(sendingChainID);

		return {
			sendingChainID,
			certificate: certificateBytes,
			activeValidatorsUpdate,
			certificateThreshold,
			inboxUpdate,
		};
	}

	private async _newBlockHandler(data?: Record<string, unknown>) {
		const { blockHeader: receivedBlock } = data as unknown as Data;
		const newBlockHeader = chain.BlockHeader.fromJSON(receivedBlock).toObject();
		const blockHeaders = await this._sidechainChainConnectorStore.getBlockHeaders();
		const aggregateCommits = await this._sidechainChainConnectorStore.getAggregateCommits();
		const validatorsHashPreimage =
			await this._sidechainChainConnectorStore.getValidatorsHashPreimage();

		const blockHeaderIndex = blockHeaders.findIndex(
			header => header.height === newBlockHeader.height,
		);
		if (blockHeaderIndex > -1) {
			blockHeaders[blockHeaderIndex] = newBlockHeader;
		} else {
			blockHeaders.push(newBlockHeader);
		}
		const bftParameters = await this._sidechainAPIClient.invoke<BFTParameters>(
			'consensus_getBFTParameters',
			{ height: newBlockHeader.height },
		);

		const events = await this._sidechainAPIClient.invoke<JSONObject<chain.EventAttr[]>>(
			'chain_getEvents',
			{ height: newBlockHeader.height },
		);
		if (events && events.length > 0) {
			const ccmSendSuccessEvents = events.filter(
				eventAttr =>
					eventAttr.name === CCM_SEND_SUCCESS && eventAttr.module === MODULE_NAME_INTEROPERABILITY,
			);

			const ccmsFromEvents = [];
			for (const e of ccmSendSuccessEvents) {
				ccmsFromEvents.push(codec.decode<CCMsg>(ccmSchema, Buffer.from(e.data, 'hex')));
			}

			const { modules } = await this._sidechainAPIClient.invoke<{ modules: ModuleMetadata }>(
				'system_getMetadata',
			);
			const interopModuleMetadata = modules.find(m => m.name === MODULE_NAME_INTEROPERABILITY);
			const store = interopModuleMetadata?.stores.find(
				s => s.data.$id === '/modules/interoperability/outbox',
			);

			const { chainID } = await this._sidechainAPIClient.invoke<OwnChainAccountJSON>(
				'interoperability_ownChainAccount',
			);

			const outboxKey = Buffer.concat([
				Buffer.from(store?.key as string, 'hex'),
				Buffer.from(chainID, 'hex'),
			]);
			const stateProveResponse = await this._sidechainAPIClient.invoke<ProveResponse>(
				'state_prove',
				{
					queries: [outboxKey],
				},
			);
			const inclusionProofOutboxRoot: OutboxRootWitness = {
				bitmap: stateProveResponse.proof.queries[0].bitmap,
				siblingHashes: stateProveResponse.proof.siblingHashes,
			};
			const crossChainMessages = await this._sidechainChainConnectorStore.getCrossChainMessages();
			crossChainMessages.push({
				ccms: ccmsFromEvents,
				height: newBlockHeader.height,
				inclusionProof: inclusionProofOutboxRoot,
			});

			await this._sidechainChainConnectorStore.setCrossChainMessages(crossChainMessages);
		}

		const validatorsDataIndex = validatorsHashPreimage.findIndex(v =>
			v.validatorsHash.equals(bftParameters?.validatorsHash),
		);
		const validatorsHashPreimageData = {
			certificateThreshold: bftParameters?.certificateThreshold,
			validators: bftParameters?.validators,
			validatorsHash: bftParameters?.validatorsHash,
		};
		if (validatorsDataIndex > -1) {
			validatorsHashPreimage[validatorsDataIndex] = validatorsHashPreimageData;
		} else {
			validatorsHashPreimage.push(validatorsHashPreimageData);
		}

		if (newBlockHeader.aggregateCommit) {
			const aggregateCommitIndex = aggregateCommits.findIndex(
				commit => commit.height === newBlockHeader.aggregateCommit.height,
			);
			if (aggregateCommitIndex > -1) {
				aggregateCommits[aggregateCommitIndex] = newBlockHeader.aggregateCommit;
			} else {
				aggregateCommits.push(newBlockHeader.aggregateCommit);
			}
		}

		// Save all the data
		await this._sidechainChainConnectorStore.setBlockHeaders(blockHeaders);
		await this._sidechainChainConnectorStore.setAggregateCommits(aggregateCommits);
		await this._sidechainChainConnectorStore.setValidatorsHashPreimage(validatorsHashPreimage);

		// When # of CCMs are there on the outbox to be sent or # of blocks passed from last certified height
		if (this._ccuFrequency >= newBlockHeader.height - this._lastCertifiedHeight) {
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
		const blockHeaders = await this._sidechainChainConnectorStore.getBlockHeaders();
		const blockHeader = blockHeaders.find(header => header.height === aggregateCommit.height);

		if (!blockHeader) {
			throw new Error('No Block header found for the given aggregate height.');
		}

		const certificate = computeCertificateFromBlockHeader(new chain.BlockHeader(blockHeader));
		certificate.aggregationBits = blockHeader.aggregateCommit.aggregationBits;
		certificate.signature = aggregateCommit.certificateSignature;

		return certificate;
	}

	private async _checkChainOfTrust(
		lastValidatorsHash: Buffer,
		blsKeyToBFTWeight: Record<string, bigint>,
		lastCertificateThreshold: bigint,
		aggregateCommit: AggregateCommit,
	): Promise<boolean> {
		const blockHeaders = await this._sidechainChainConnectorStore.getBlockHeaders();

		const blockHeader = blockHeaders.find(header => header.height === aggregateCommit.height - 1);

		if (!blockHeader) {
			throw new Error(
				`No Block header found for the given (aggregateCommit.height -1): ${
					aggregateCommit.height - 1
				}.`,
			);
		}

		// Certificate signers and certificate threshold for aggregateCommit are those authenticated by the last certificate
		if (lastValidatorsHash === blockHeader.validatorsHash) {
			return true;
		}

		let aggregateBFTWeight = BigInt(0);

		const validatorsHashPreimage =
			await this._sidechainChainConnectorStore.getValidatorsHashPreimage();
		const validatorData = validatorsHashPreimage.find(
			data => data.validatorsHash === blockHeader.validatorsHash,
		);

		if (!validatorData) {
			throw new Error('No Validators data found for the given validatorsHash.');
		}

		for (let i = 0; i < validatorData.validators.length; i += 1) {
			if (aggregateCommit.aggregationBits[i] === 1) {
				const blsKey = validatorData.validators[i].blsKey.toString('hex');
				if (!blsKeyToBFTWeight[blsKey]) {
					return false;
				}

				aggregateBFTWeight += blsKeyToBFTWeight[blsKey];
			}
		}

		return aggregateBFTWeight >= lastCertificateThreshold;
	}

	private async _calculateInboxUpdate(sendingChainID: Buffer): Promise<InboxUpdate> {
		// TODO: Fetch as many CCMs as configured in _ccuFrequency.ccm, between lastCertificateHeight and certificateHeight - After #7569
		const crossChainMessages = await this._sidechainChainConnectorStore.getCrossChainMessages();
		const serialzedCCMs = crossChainMessages.map(ccm => codec.encode(ccmSchema, ccm));

		// TODO: should use the store prefix with sendingChainID after issue https://github.com/LiskHQ/lisk-sdk/issues/7631
		const outboxKey = sendingChainID;

		const stateProveResponse = await this._sidechainAPIClient.invoke<ProveResponse>('state_prove', {
			queries: [outboxKey],
		});
		const inclusionProofOutboxRoot: OutboxRootWitness = {
			bitmap: stateProveResponse.proof.queries[0].bitmap,
			siblingHashes: stateProveResponse.proof.siblingHashes,
		};

		return {
			crossChainMessages: serialzedCCMs,
			messageWitnessHashes: [],
			outboxRootWitness: inclusionProofOutboxRoot,
		};
	}

	private async _validateCertificate(
		certificateBytes: Buffer,
		certificate: Certificate,
		blockHeader: BlockHeader,
		chainAccount: ChainAccount,
		sendingChainID: Buffer,
	): Promise<CertificateValidationResult> {
		const result: CertificateValidationResult = {
			status: false,
			chainStatus: chainAccount.status,
			certificate,
			blockHeader,
			message: 'Certificate validation failed.',
		};

		if (chainAccount.status === ChainStatus.TERMINATED) {
			result.message = 'Sending chain is terminated.';
			return result;
		}

		if (certificate.height <= chainAccount.lastCertificate.height) {
			result.message = 'Certificate height is higher than last certified height.';
			return result;
		}

		const certificateLivenessValidationResult = await this._verifyLiveness(
			sendingChainID,
			certificate.timestamp,
			blockHeader.timestamp,
		);

		result.livenessValidationResult = certificateLivenessValidationResult;

		if (!certificateLivenessValidationResult.status) {
			result.message = 'Liveness validation failed.';
			return result;
		}

		if (chainAccount.status === ChainStatus.ACTIVE) {
			result.status = true;

			return result;
		}

		const validatorsHashPreimage =
			await this._sidechainChainConnectorStore.getValidatorsHashPreimage();
		const validatorData = validatorsHashPreimage.find(data =>
			data.validatorsHash.equals(blockHeader.validatorsHash),
		);

		if (!validatorData) {
			result.message = 'Block validators are not valid.';

			return result;
		}

		const keysList = validatorData.validators.map(validator => validator.blsKey);

		const weights = validatorData.validators.map(validator => validator.bftWeight);

		const hasValidWeightedAggSig = cryptography.bls.verifyWeightedAggSig(
			keysList,
			certificate.aggregationBits as Buffer,
			certificate.signature as Buffer,
			MESSAGE_TAG_CERTIFICATE,
			sendingChainID,
			certificateBytes,
			weights,
			validatorData.certificateThreshold,
		);
		if (hasValidWeightedAggSig) {
			result.hasValidBLSWeightedAggSig = true;
			result.status = false;
			return result;
		}

		result.message = 'Weighted aggregate signature is not valid.';

		return result;
	}

	private async _verifyLiveness(
		chainID: Buffer,
		certificateTimestamp: number,
		blockTimestamp: number,
	): Promise<LivenessValidationResult> {
		const isLive = await this._mainchainAPIClient.invoke<boolean>('interoperability_isLive', {
			chainID,
			timestamp: certificateTimestamp,
		});

		const result: LivenessValidationResult = {
			status: true,
			isLive,
			chainID,
			certificateTimestamp,
			blockTimestamp,
		};

		if (isLive && blockTimestamp - certificateTimestamp < LIVENESS_LIMIT / 2) {
			return result;
		}

		result.status = false;

		return result;
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private async _cleanup() {
		const crossChainMessages = await this._sidechainChainConnectorStore.getCrossChainMessages();
		const index = crossChainMessages.findIndex(ccm => ccm.height === this._lastCertifiedHeight);
		crossChainMessages.splice(index, 1);
		await this._sidechainChainConnectorStore.setCrossChainMessages(crossChainMessages);
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private async _createCCU() {}
}
