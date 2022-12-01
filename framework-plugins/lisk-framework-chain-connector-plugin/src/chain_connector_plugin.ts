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

import { ChainStatus } from 'lisk-sdk';
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
} from 'lisk-sdk';
import { CCM_BASED_CCU_FREQUENCY, EMPTY_BYTES, LIVENESS_BASED_CCU_FREQUENCY } from './constants';
import { getChainConnectorInfo, getDBInstance, setChainConnectorInfo } from './db';
import { Endpoint } from './endpoint';
import { chainConnectorInfoSchema, configSchema } from './schemas';
import {
	ChainConnectorInfo,
	ChainConnectorPluginConfig,
	SentCCUs,
	CrossChainUpdateTransactionParams,
	InboxUpdate,
	ProveResponse,
} from './types';
import { getActiveValidatorsDiff } from './utils';

interface Data {
	readonly blockHeader: chain.BlockHeaderJSON;
}
interface CCUFrequencyConfig {
	ccm: number;
	liveness: number;
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
	header: chain.BlockHeader;
	hasValidBLSWeightedAggSig?: boolean;
	message: string;
}

export class ChainConnectorPlugin extends BasePlugin<ChainConnectorPluginConfig> {
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

		return undefined;
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

	public async calculateCCUParams(
		sendingChainID: Buffer,
		certificate: Certificate,
		newCertificateThreshold: bigint,
	): Promise<CrossChainUpdateTransactionParams | undefined> {
		let activeBFTValidatorsUpdate: ActiveValidator[];
		let activeValidatorsUpdate: ActiveValidator[] = [];
		let certificateThreshold = newCertificateThreshold;

		const blockHeader = this._chainConnectorState.blockHeaders.find(
			header => header.height === certificate.height,
		)!;

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
			const validatorDataAtCertificate = this._chainConnectorState.validatorsHashPreimage.find(
				data => data.validatorsHash.equals(blockHeader.validatorsHash!),
			)!;

			const validatorDataAtLastCertificate = this._chainConnectorState.validatorsHashPreimage.find(
				data => data.validatorsHash.equals(chainAccount.lastCertificate.validatorsHash),
			)!;

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
				if (!blsKeyToBFTWeight[blsKey]) {
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

	private async _calculateInboxUpdate(sendingChainID: Buffer): Promise<InboxUpdate> {
		// TODO: Fetch as many CCMs as configured in _ccuFrequency.ccm, between lastCertificateHeight and certificateHeight - After #7569
		const serialzedCCMs = this._chainConnectorState.crossChainMessages
			.slice(0, this._ccuFrequency.ccm)
			.map(ccm => codec.encode(ccmSchema, ccm));

		// TODO: should use the store prefix with sendingChainID after issue https://github.com/LiskHQ/lisk-sdk/issues/7631
		const outboxKey = sendingChainID;

		const stateProveResponse = await this._sidechainAPIClient.invoke<ProveResponse>('state_prove', {
			queries: [outboxKey],
		});
		const inclusionProofOutboxRoot: OutboxRootWitness = {
			bitmap: stateProveResponse.proof.queries[0].bitmap,
			siblingHashes: stateProveResponse.proof.siblingHashes,
		};

		const inboxUpdate: InboxUpdate = {
			crossChainMessages: serialzedCCMs,
			messageWitnessHashes: [],
			outboxRootWitness: inclusionProofOutboxRoot,
		};

		return inboxUpdate;
	}

	private async _validateCertificate(
		certificateBytes: Buffer,
		certificate: Certificate,
		blockHeader: chain.BlockHeader,
		chainAccount: ChainAccount,
		sendingChainID: Buffer,
	): Promise<CertificateValidationResult> {
		const result: CertificateValidationResult = {
			status: false,
			chainStatus: chainAccount.status,
			certificate,
			header: blockHeader,
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

		const validatorData = this._chainConnectorState.validatorsHashPreimage.find(data =>
			data.validatorsHash.equals(blockHeader.validatorsHash!),
		);

		if (!validatorData) {
			result.message = 'Block validators are not valid.';

			return result;
		}

		const keysList = validatorData.validators.map(validator => validator.blsKey);

		const weights = validatorData.validators.map(validator => validator.bftWeight);

		const hasValidWeightedAggSig = cryptography.bls.verifyWeightedAggSig(
			keysList,
			certificate.aggregationBits!,
			certificate.signature!,
			MESSAGE_TAG_CERTIFICATE,
			sendingChainID,
			certificateBytes,
			weights,
			validatorData.certificateThreshold as bigint,
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
	private async _cleanup() {}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private async _createCCU() {}
}
