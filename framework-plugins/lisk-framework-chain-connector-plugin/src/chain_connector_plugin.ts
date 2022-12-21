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

import { crossChainUpdateTransactionParams } from 'lisk-sdk';
import {
	BasePlugin,
	PluginInitContext,
	apiClient,
	Certificate,
	BFTHeights,
	db as liskDB,
	codec,
	chain,
	LIVENESS_LIMIT,
	ChainAccount,
	OutboxRootWitness,
	MESSAGE_TAG_CERTIFICATE,
	ActiveValidator,
	cryptography,
	ccmSchema,
	ChainStatus,
	OwnChainAccountJSON,
	LastCertificate,
	LastCertificateJSON,
	CCMsg,
	tree,
	CrossChainUpdateTransactionParams,
	certificateSchema,
} from 'lisk-sdk';
import { calculateActiveValidatorsUpdate } from './active_validators_update';
import { getNextCertificateFromAggregateCommits } from './certificate_generation';
import { LIVENESS_BASED_CCU_FREQUENCY, DB_KEY_SIDECHAIN } from './constants';
import { ChainConnectorStore, getDBInstance } from './db';
import { Endpoint } from './endpoint';
import { configSchema } from './schemas';
import {
	ChainConnectorPluginConfig,
	SentCCUs,
	InboxUpdate,
	BlockHeader,
	CrossChainMessagesFromEvents,
} from './types';
import { NewBlockHandler } from './new_block_handler';

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
	header: BlockHeader;
	hasValidBLSWeightedAggSig?: boolean;
	message: string;
}

export class ChainConnectorPlugin extends BasePlugin<ChainConnectorPluginConfig> {
	public endpoint = new Endpoint();
	public configSchema = configSchema;
	private _chainConnectorPluginDB!: liskDB.Database;
	private _sidechainChainConnectorStore!: ChainConnectorStore;
	private _lastCertificate!: LastCertificate;
	private _ccuFrequency!: number;
	private _mainchainAPIClient!: apiClient.APIClient;
	private _sidechainAPIClient!: apiClient.APIClient;
	private _ownChainID!: Buffer;
	private readonly _sentCCUs: SentCCUs = [];

	public get nodeModulePath(): string {
		return __filename;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(context: PluginInitContext): Promise<void> {
		await super.init(context);
		this.endpoint.init(this._sentCCUs);
		this._ccuFrequency = this.config.livenessBasedFrequency ?? LIVENESS_BASED_CCU_FREQUENCY;
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

		// TODO: CCM should be collected and stored via events
		if (this._sidechainAPIClient) {
			this._ownChainID = Buffer.from(
				(
					await this._sidechainAPIClient.invoke<OwnChainAccountJSON>(
						'interoperability_getOwnChainAccount',
					)
				).chainID,
				'hex',
			);
			// Fetch last certificate from the receiving chain and update the _lastCertificate
			const lastCertificate = await this._mainchainAPIClient.invoke<LastCertificateJSON>(
				'interoperability_getChainAccount',
				{ chainID: this._ownChainID },
			);
			this._lastCertificate = {
				height: lastCertificate.height,
				stateRoot: Buffer.from(lastCertificate.stateRoot, 'hex'),
				timestamp: lastCertificate.timestamp,
				validatorsHash: Buffer.from(lastCertificate.validatorsHash, 'hex'),
			};
			// On a new block start with CCU creation process
			this._sidechainAPIClient.subscribe('chain_newBlock', async (data?: Record<string, unknown>) =>
				this._newBlockHandler(data),
			);
		}
	}

	private async _newBlockHandler(data?: Record<string, unknown>) {
		const { blockHeader: receivedBlock } = data as unknown as Data;
		const newBlockHeader = chain.BlockHeader.fromJSON(receivedBlock).toObject();
		// Save block header, aggregateCommit, validatorsData and cross chain messages if any.
		try {
			// await this._saveDataOnNewBlock(newBlockHeader);
			const h = new NewBlockHandler(
				this._sidechainChainConnectorStore,
				this._sidechainAPIClient,
				this._ownChainID,
			);
			await h.handleNewBlock(newBlockHeader);
		} catch (error) {
			this.logger.error(error, 'Failed during saving data on new block event.');

			return;
		}

		// When all the relevant data is saved successfully then try to create CCU
		// When # of CCMs are there on the outbox to be sent or # of blocks passed from last certified height
		if (this._ccuFrequency >= newBlockHeader.height - this._lastCertificate.height) {
			await this._calculateCCUParams();
			// if the transaction is successfully submitted then update the last certfied height and do the cleanup
			// TODO: also check if the state is growing, delete everything from the inMemory state if it goes beyond last 3 rounds
			await this._cleanup();
		}
	}

	public async _calculateCCUParams(): Promise<void> {
		const blockHeaders = await this._sidechainChainConnectorStore.getBlockHeaders();
		const aggregateCommits = await this._sidechainChainConnectorStore.getAggregateCommits();
		const validatorsHashPreimages =
			await this._sidechainChainConnectorStore.getValidatorsHashPreImage();
		const bftHeights = await this._sidechainAPIClient.invoke<BFTHeights>('consensus_getBFTHeights');
		// Calculate certificate
		const certificate = getNextCertificateFromAggregateCommits(
			blockHeaders,
			aggregateCommits,
			validatorsHashPreimages,
			bftHeights,
			this._lastCertificate,
		);
		if (!certificate) {
			throw new Error('No certificate found in the ccu creation process.');
		}
		// Calculate activeValidatorsUpdate
		let activeValidatorsUpdate: ActiveValidator[] = [];
		let certificateThreshold = BigInt(0);
		const blockHeader = blockHeaders.find(header => header.height === certificate.height);
		if (!blockHeader) {
			throw new Error('No block header found for the given certificate height.');
		}
		if (!this._lastCertificate.validatorsHash.equals(certificate.validatorsHash)) {
			const validatorsUpdateResult = calculateActiveValidatorsUpdate(
				blockHeader,
				validatorsHashPreimages,
				this._lastCertificate,
			);
			activeValidatorsUpdate = validatorsUpdateResult.activeValidatorsUpdate;
			certificateThreshold = validatorsUpdateResult.certificateThreshold;
		}
		// Calculate inboxUpdate
		const inboxUpdates = await this._calculateInboxUpdate(blockHeader);

		// Now create CCUs for all the inboxUpdates handling full or partial updates
		for (const inboxUpdate of inboxUpdates) {
			const serializedCertificate = codec.encode(certificateSchema, certificate);
			const serializedCCUParams = codec.encode(crossChainUpdateTransactionParams, {
				sendingChainID: this._ownChainID,
				activeValidatorsUpdate,
				certificate: serializedCertificate,
				certificateThreshold,
				inboxUpdate,
			} as CrossChainUpdateTransactionParams);
			await this._createCCU(serializedCCUParams);
		}
	}

	public async unload(): Promise<void> {
		await this._mainchainAPIClient.disconnect();
		if (this._sidechainAPIClient) {
			await this._sidechainAPIClient.disconnect();
		}

		this._sidechainChainConnectorStore.close();
	}

	private async _calculateInboxUpdate(newBlockHeader: BlockHeader): Promise<InboxUpdate[]> {
		const ccmsFromEvents = await this._sidechainChainConnectorStore.getCrossChainMessages();
		const ccmsListOfList = this._getListOfCCMs(ccmsFromEvents, newBlockHeader);

		if (ccmsListOfList.length === 1) {
			const ccms = ccmsListOfList[0];
			const crossChainMessages = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			// Take the inclusion proof of the last ccm height
			const { inclusionProof } = ccms[ccms.length - 1];

			return [
				{
					crossChainMessages,
					messageWitnessHashes: [],
					outboxRootWitness: inclusionProof,
				},
			];
		}

		// Calculate list of inboxUpdates to be sent by multiple CCUs
		const inboxUpdates = [];
		for (const subList of ccmsListOfList) {
			const crossChainMessages = subList.map(ccm => codec.encode(ccmSchema, ccm));
			// Take the inclusion proof of the last ccm height
			const { inclusionProof } = subList[subList.length - 1];

			// Calculate message witnesses

			const merkleTree = new tree.MerkleTree({ db: this._chainConnectorPluginDB });
			for (const ccm of crossChainMessages) {
				await merkleTree.append(ccm);
			}
			const messageWitnessHashes = await merkleTree.generateRightWitness(crossChainMessages.length);

			inboxUpdates.push({
				crossChainMessages,
				messageWitnessHashes,
				outboxRootWitness: inclusionProof,
			});
		}

		return inboxUpdates;
	}

	//
	private _getListOfCCMs(
		_crossChainMessages: CrossChainMessagesFromEvents[],
		_newBlockHeader: BlockHeader,
	): {
		ccm: CCMsg;
		height: number;
		inclusionProof: OutboxRootWitness;
	}[][] {
		return [[]];
	}

	public async validateCertificate(
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

		const validatorsHashPreimages =
			await this._sidechainChainConnectorStore.getValidatorsHashPreImage();
		const validatorData = validatorsHashPreimages.find(data =>
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

	private async _deleteBlockHeaders() {
		const blockHeaders = await this._sidechainChainConnectorStore.getBlockHeaders();

		await this._sidechainChainConnectorStore.setBlockHeaders(
			blockHeaders.filter(blockHeader => blockHeader.height >= this._lastCertificate.height),
		);
	}

	private async _deleteAggregateCommits() {
		const aggregateCommits = await this._sidechainChainConnectorStore.getAggregateCommits();

		await this._sidechainChainConnectorStore.setAggregateCommits(
			aggregateCommits.filter(
				aggregateCommit => aggregateCommit.height >= this._lastCertificate.height,
			),
		);
	}

	private async _deleteValidatorsHashPreimage() {
		const validatorsHashPreimages =
			await this._sidechainChainConnectorStore.getValidatorsHashPreImage();

		await this._sidechainChainConnectorStore.setValidatorsHashPreImage(
			validatorsHashPreimages.filter(
				validatorsHashPreimage =>
					validatorsHashPreimage.certificateThreshold >= BigInt(this._lastCertificate.height),
			),
		);
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private async _cleanup() {
		const crossChainMessages = await this._sidechainChainConnectorStore.getCrossChainMessages();
		const index = crossChainMessages.findIndex(ccm => ccm.height === this._lastCertificate.height);
		crossChainMessages.splice(index, 1);
		await this._sidechainChainConnectorStore.setCrossChainMessages(crossChainMessages);

		await this._deleteAggregateCommits();
		await this._deleteBlockHeaders();
		await this._deleteValidatorsHashPreimage();
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private async _createCCU(_serializedCCUParams: Buffer) {}
}
