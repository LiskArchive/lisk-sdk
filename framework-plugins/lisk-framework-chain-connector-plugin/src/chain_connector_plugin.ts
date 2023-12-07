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
	Engine,
	BasePlugin,
	PluginInitContext,
	apiClient,
	db as liskDB,
	codec,
	chain,
	Modules,
	JSONObject,
	Schema,
	Transaction,
	cryptography,
	transactions,
} from 'lisk-sdk';
import { calculateActiveValidatorsUpdate } from './active_validators_update';
import {
	getCertificateFromAggregateCommit,
	getNextCertificateFromAggregateCommits,
} from './certificate_generation';
import {
	CCU_FREQUENCY,
	MODULE_NAME_INTEROPERABILITY,
	CCM_SEND_SUCCESS,
	COMMAND_NAME_SUBMIT_SIDECHAIN_CCU,
	CCM_PROCESSED,
	EMPTY_BYTES,
	COMMAND_NAME_SUBMIT_MAINCHAIN_CCU,
	CCU_TOTAL_CCM_SIZE,
	DEFAULT_LAST_CCM_SENT_NONCE,
} from './constants';
import { ChainConnectorStore, getDBInstance } from './db';
import { Endpoint } from './endpoint';
import { configSchema } from './schemas';
import {
	ChainConnectorPluginConfig,
	BlockHeader,
	ProveResponseJSON,
	BFTParametersJSON,
	ValidatorsData,
	LastSentCCMWithHeight,
	CCMsFromEvents,
} from './types';
import { calculateMessageWitnesses } from './inbox_update';
import {
	bftParametersJSONToObj,
	chainAccountDataJSONToObj,
	channelDataJSONToObj,
	getMainchainID,
	getTokenIDLSK,
	proveResponseJSONToObj,
} from './utils';

const { address, ed } = cryptography;

interface Data {
	readonly blockHeader: chain.BlockHeaderJSON;
}

type ModulesMetadata = [
	{
		stores: { key: string; data: Schema }[];
		events: { name: string; data: Schema }[];
		name: string;
	},
];

type FinalizedHeightInfo = { inboxSize: number; lastCertificateHeight: number };

export class ChainConnectorPlugin extends BasePlugin<ChainConnectorPluginConfig> {
	public endpoint = new Endpoint();
	public configSchema = configSchema;

	private _chainConnectorPluginDB!: liskDB.Database;
	private _chainConnectorStore!: ChainConnectorStore;
	private _lastCertificate!: Modules.Interoperability.LastCertificate;
	private _ccuFrequency!: number;
	private _maxCCUSize!: number;
	private _isSaveCCU!: boolean;
	private _receivingChainClient!: apiClient.APIClient;
	private _sendingChainClient!: apiClient.APIClient;
	private _ownChainID!: Buffer;
	private _receivingChainID!: Buffer;
	private _isReceivingChainMainchain!: boolean;
	private _registrationHeight!: number;
	private _ccuSaveLimit!: number;
	private _receivingChainFinalizedHeight!: number;
	private _heightToDeleteIndex!: Map<number, FinalizedHeightInfo>;

	public get nodeModulePath(): string {
		return __filename;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(context: PluginInitContext): Promise<void> {
		await super.init(context);
		this._ccuFrequency = this.config.ccuFrequency ?? CCU_FREQUENCY;
		if (this.config.maxCCUSize > CCU_TOTAL_CCM_SIZE) {
			throw new Error(`maxCCUSize cannot be greater than ${CCU_TOTAL_CCM_SIZE} bytes.`);
		}
		this._receivingChainID = Buffer.from(this.config.receivingChainID, 'hex');
		this._maxCCUSize = this.config.maxCCUSize;
		this._isSaveCCU = this.config.isSaveCCU;
		this._registrationHeight = this.config.registrationHeight;
		this._ccuSaveLimit = this.config.ccuSaveLimit;
		this._receivingChainFinalizedHeight = 0;
		this._heightToDeleteIndex = new Map();
	}

	public async load(): Promise<void> {
		this._chainConnectorPluginDB = await getDBInstance(this.dataPath);
		this._chainConnectorStore = new ChainConnectorStore(this._chainConnectorPluginDB);
		this.endpoint.load(this.config, this._chainConnectorStore);

		this._sendingChainClient = this.apiClient;
		this._ownChainID = Buffer.from(this.appConfig.genesis.chainID, 'hex');
		if (this._receivingChainID[0] !== this._ownChainID[0]) {
			throw new Error('Receiving Chain ID network does not match the sending chain network.');
		}
		// If the running node is mainchain then receiving chain will be sidechain or vice verse.
		this._isReceivingChainMainchain = !getMainchainID(this._ownChainID).equals(this._ownChainID);
		// On a new block start with CCU creation process
		this._sendingChainClient.subscribe('chain_newBlock', async (data?: Record<string, unknown>) =>
			this._newBlockHandler(data),
		);
		this._sendingChainClient.subscribe(
			'chain_deleteBlock',
			async (data?: Record<string, unknown>) => this._deleteBlockHandler(data),
		);
	}

	public async unload(): Promise<void> {
		if (this._receivingChainClient) {
			await this._receivingChainClient.disconnect();
		}
		if (this._sendingChainClient) {
			await this._sendingChainClient.disconnect();
		}

		this._chainConnectorStore.close();
	}

	public async _getCcuFee(tx: Record<string, unknown>): Promise<bigint> {
		let additionalFee = BigInt(0);

		const userBalance = await this._receivingChainClient.invoke<{ exists: boolean }>(
			'token_hasUserAccount',
			{
				address: address.getLisk32AddressFromAddress(
					address.getAddressFromPublicKey(tx.senderPublicKey as Buffer),
				),
				// It is always LSK token
				tokenID: `${getTokenIDLSK(this._receivingChainID).toString('hex')}`,
			},
		);

		if (!userBalance.exists) {
			const fee = await this._receivingChainClient.invoke<{
				userAccount: string;
				escrowAccount: string;
			}>('token_getInitializationFees');
			additionalFee += BigInt(fee.userAccount);
		}

		const ccuFee = BigInt(this.config.ccuFee ?? '0') + additionalFee;
		const computedMinFee = transactions.computeMinFee(
			tx,
			Modules.Interoperability.ccuParamsSchema,
			{
				additionalFee,
			},
		);

		if (ccuFee > computedMinFee) {
			return ccuFee;
		}
		return computedMinFee;
	}

	private async _newBlockReceivingChainHandler(_?: Record<string, unknown>) {
		try {
			const { finalizedHeight } = await this._receivingChainClient.invoke<{
				finalizedHeight: number;
			}>('system_getNodeInfo');
			this._receivingChainFinalizedHeight = finalizedHeight;
			const { inbox } =
				await this._receivingChainClient.invoke<Modules.Interoperability.ChannelDataJSON>(
					'interoperability_getChannel',
					{ chainID: this._ownChainID.toString('hex') },
				);
			if (!inbox) {
				throw new Error('No channel data available on receiving chain.');
			}
			const { lastCertificate } =
				await this._receivingChainClient.invoke<Modules.Interoperability.ChainAccountJSON>(
					'interoperability_getChainAccount',
					{ chainID: this._ownChainID.toString('hex') },
				);
			if (!lastCertificate) {
				throw new Error('No chain data available on receiving chain.');
			}
			this._heightToDeleteIndex.set(finalizedHeight, {
				inboxSize: inbox.size,
				lastCertificateHeight: lastCertificate.height,
			});
		} catch (error) {
			this.logger.debug(
				error,
				'No Channel or Chain Data: Sending chain is not registered yet on receiving chain.',
			);
		}

		await this._cleanup();
	}

	/**
	 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0053.md
	 * This function is a handler for a new block. It saves all the relevant needed to be stored for each block that will be used to calculate CCU params
	 * - Calls _computeCCUParams that calculates CCU params
	 * - Saves or sends a CCU if created
	 * - Updates the last certificate and does the cleanup
	 */
	private async _newBlockHandler(data?: Record<string, unknown>) {
		const { blockHeader: receivedBlock } = data as unknown as Data;

		const newBlockHeader = chain.BlockHeader.fromJSON(receivedBlock).toObject();
		let chainAccountJSON: Modules.Interoperability.ChainAccountJSON;
		// Save blockHeader, aggregateCommit, validatorsData and cross chain messages if any.
		try {
			const nodeInfo = await this._sendingChainClient.node.getNodeInfo();
			// Fetch last certificate from the receiving chain and update the _lastCertificate
			try {
				chainAccountJSON =
					await this._receivingChainClient.invoke<Modules.Interoperability.ChainAccountJSON>(
						'interoperability_getChainAccount',
						{ chainID: this._ownChainID.toString('hex') },
					);
				// If sending chain is not registered with the receiving chain then only save data on new block and exit
				if (!chainAccountJSON || (chainAccountJSON && !chainAccountJSON.lastCertificate)) {
					this.logger.info(
						'Sending chain is not registered to the receiving chain yet and has no chain data.',
					);
					await this._saveDataOnNewBlock(newBlockHeader);

					return;
				}
			} catch (error) {
				// If receivingChainAPIClient is not ready then still save data on new block
				await this._saveDataOnNewBlock(newBlockHeader);
				await this._initializeReceivingChainClient();
				this.logger.error(
					{ err: error as Error },
					'Error occurred while accessing receivingChainAPIClient but all data is saved on newBlock.',
				);

				return;
			}

			this._lastCertificate = chainAccountDataJSONToObj(chainAccountJSON).lastCertificate;
			const { aggregateCommits, blockHeaders, validatorsHashPreimage, crossChainMessages } =
				await this._saveDataOnNewBlock(newBlockHeader);

			const numOfBlocksSinceLastCertificate = newBlockHeader.height - this._lastCertificate.height;
			if (nodeInfo.syncing || this._ccuFrequency > numOfBlocksSinceLastCertificate) {
				this.logger.debug(
					{
						syncing: nodeInfo.syncing,
						ccuFrequency: this._ccuFrequency,
						nextPossibleCCUHeight: this._ccuFrequency - numOfBlocksSinceLastCertificate,
					},
					'No attempt to create CCU either due to ccuFrequency or the node is syncing',
				);

				return;
			}
			// When all the relevant data is saved successfully then try to create CCU
			const computedCCUParams = await this._computeCCUParams(
				blockHeaders,
				aggregateCommits,
				validatorsHashPreimage,
				crossChainMessages,
			);

			if (computedCCUParams) {
				try {
					await this._submitCCU(computedCCUParams.ccuParams);
					// If CCU was sent successfully then save the lastSentCCM if any
					// TODO: Add function to check on the receiving chain whether last sent CCM was accepted or not
					if (computedCCUParams.lastCCMToBeSent) {
						await this._chainConnectorStore.setLastSentCCM(computedCCUParams.lastCCMToBeSent);
					}
				} catch (error) {
					this.logger.info(
						{ err: error },
						`Error occured while submitting CCU for the blockHeader at height: ${newBlockHeader.height}`,
					);
					return;
				}
			}
		} catch (error) {
			this.logger.error(error, 'Failed while handling the new block');
		}
	}

	/**
	 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0053.md#cross-chain-update-transaction-properties
	 * This function computes CCU params especially, certificate, activeValidatorsUpdate and inboxUpdate
	 * - Uses either lastCertificate or newCertificate
	 * - When lastCertificate, it only computes pending CCMs if any else it skips CCU creation
	 * - When newCertificate it computes certificate, activeValidatorsUpdate and inboxUpdate
	 */

	private async _computeCCUParams(
		blockHeaders: BlockHeader[],
		aggregateCommits: Engine.AggregateCommit[],
		validatorsHashPreimage: ValidatorsData[],
		ccmsFromEvents: CCMsFromEvents[],
	): Promise<
		| {
				ccuParams: Modules.Interoperability.CrossChainUpdateTransactionParams;
				lastCCMToBeSent: LastSentCCMWithHeight | undefined;
		  }
		| undefined
	> {
		const newCertificate = await this._findNextCertificate(
			aggregateCommits,
			blockHeaders,
			validatorsHashPreimage,
		);

		if (!newCertificate && this._lastCertificate.height === 0) {
			return;
		}
		/**
		 * If no lastSentCCM then assume that it's the first CCM to be sent
		 * and we can use the lastCertificate height
		 * which will be zero in case if this is the first CCU after registration
		 */
		const lastSentCCM = (await this._chainConnectorStore.getLastSentCCM()) ?? {
			nonce: DEFAULT_LAST_CCM_SENT_NONCE,
			height: this._lastCertificate.height,
		};

		let activeValidatorsUpdate: Modules.Interoperability.ActiveValidatorsUpdate = {
			blsKeysUpdate: [],
			bftWeightsUpdate: [],
			bftWeightsUpdateBitmap: EMPTY_BYTES,
		};
		let certificate = EMPTY_BYTES;
		let certificateThreshold;
		let outboxRootWitness;

		// Take range from lastSentCCM height until new or last certificate height
		const ccmsToBeIncluded = ccmsFromEvents.filter(
			record =>
				record.height >= lastSentCCM.height &&
				// If no newCertificate then use lastCertificate height
				record.height <= (newCertificate ? newCertificate.height : this._lastCertificate.height),
		);
		// Calculate messageWitnessHashes for pending CCMs if any
		const channelDataOnReceivingChain =
			await this._receivingChainClient.invoke<Modules.Interoperability.ChannelDataJSON>(
				'interoperability_getChannel',
				{ chainID: this._ownChainID.toString('hex') },
			);
		if (!channelDataOnReceivingChain?.inbox) {
			this.logger.info('Receiving chain is not registered yet on the sending chain.');
			return;
		}
		const inboxSizeOnReceivingChain = channelDataJSONToObj(channelDataOnReceivingChain).inbox.size;

		const receivingChainChannelDataJSON =
			await this._sendingChainClient.invoke<Modules.Interoperability.ChannelDataJSON>(
				'interoperability_getChannel',
				{ chainID: this._receivingChainID.toString('hex') },
			);

		if (!receivingChainChannelDataJSON?.outbox) {
			this.logger.info('Sending chain is not registered yet on the receiving chain.');
			return;
		}
		const outboxSizeOnSendingChain = channelDataJSONToObj(receivingChainChannelDataJSON).outbox
			.size;
		const messageWitnessHashesForCCMs = calculateMessageWitnesses(
			inboxSizeOnReceivingChain,
			outboxSizeOnSendingChain,
			lastSentCCM,
			ccmsToBeIncluded,
			this._maxCCUSize,
		);
		const { crossChainMessages, lastCCMToBeSent, messageWitnessHashes } =
			messageWitnessHashesForCCMs;
		/**
		 * If there is no new certificate then we calculate CCU params based on last certificate and pending ccms
		 */
		if (!newCertificate) {
			if (crossChainMessages.length === 0) {
				this.logger.info(
					'CCU cant be created as there are no pending CCMs for the last certificate.',
				);
				return;
			}
			// Empty outboxRootWitness for last certificate
			outboxRootWitness = {
				bitmap: EMPTY_BYTES,
				siblingHashes: [],
			};

			// Use the old certificateThreshold
			const validatorsDataAtLastCertificate = validatorsHashPreimage.find(validatorsData =>
				validatorsData.validatorsHash.equals(this._lastCertificate.validatorsHash),
			);
			if (!validatorsDataAtLastCertificate) {
				throw new Error('No validatorsData found for the lastCertificate.');
			}

			certificateThreshold = validatorsDataAtLastCertificate.certificateThreshold;
		} else {
			if (!this._lastCertificate.validatorsHash.equals(newCertificate.validatorsHash)) {
				const validatorsUpdateResult = calculateActiveValidatorsUpdate(
					newCertificate,
					validatorsHashPreimage,
					this._lastCertificate,
				);
				activeValidatorsUpdate = validatorsUpdateResult.activeValidatorsUpdate;
				certificateThreshold = validatorsUpdateResult.certificateThreshold;
			} else {
				// If there was no activeValidatorsUpdate then use the old certificateThreshold
				const validatorsDataAtLastCertificate = validatorsHashPreimage.find(validatorsData =>
					validatorsData.validatorsHash.equals(this._lastCertificate.validatorsHash),
				);
				if (!validatorsDataAtLastCertificate) {
					throw new Error('No validatorsData found for the lastCertificate.');
				}
				certificateThreshold = validatorsDataAtLastCertificate.certificateThreshold;
			}

			// Get the inclusionProof for outboxRoot on stateRoot
			const ccmsDataAtCertificateHeight = ccmsToBeIncluded.find(
				ccmsData => ccmsData.height === newCertificate.height,
			);
			if (crossChainMessages.length === 0) {
				outboxRootWitness = {
					bitmap: EMPTY_BYTES,
					siblingHashes: [],
				};
			} else {
				outboxRootWitness = ccmsDataAtCertificateHeight?.inclusionProof;
			}

			certificate = codec.encode(Engine.certificateSchema, newCertificate);
		}

		// eslint-disable-next-line consistent-return
		return {
			ccuParams: {
				sendingChainID: this._ownChainID,
				activeValidatorsUpdate,
				certificate,
				certificateThreshold,
				inboxUpdate: {
					crossChainMessages,
					messageWitnessHashes,
					outboxRootWitness,
				},
			} as Modules.Interoperability.CrossChainUpdateTransactionParams,
			lastCCMToBeSent,
		};
	}

	private async _findNextCertificate(
		aggregateCommits: Engine.AggregateCommit[],
		blockHeaders: BlockHeader[],
		validatorsHashPreimage: ValidatorsData[],
	): Promise<Engine.Certificate | undefined> {
		if (aggregateCommits.length === 0) {
			return undefined;
		}

		if (this._lastCertificate.height === 0) {
			for (const aggregateCommit of aggregateCommits) {
				// If blockHeader corresponding to aggregateCommit height does not exist then try with the next aggregCommit.
				const blockHeaderExist = blockHeaders.find(
					header => header.height === aggregateCommit.height,
				);
				if (!blockHeaderExist || aggregateCommit.height < this._registrationHeight) {
					continue;
				}

				// When we receive the first aggregateCommit in the chain we can create certificate directly
				const firstCertificate = getCertificateFromAggregateCommit(aggregateCommit, blockHeaders);

				return firstCertificate;
			}

			return undefined;
		}
		const bftHeights = await this._sendingChainClient.invoke<Engine.BFTHeights>(
			'consensus_getBFTHeights',
		);
		// Calculate certificate
		return getNextCertificateFromAggregateCommits(
			blockHeaders,
			aggregateCommits,
			validatorsHashPreimage,
			bftHeights,
			this._lastCertificate,
		);
	}

	/**
	 * This function saves block header, aggregateCommit, validatorsHashPreimage and crossChainMessages for a new block
	 */
	private async _saveDataOnNewBlock(newBlockHeader: BlockHeader) {
		// Save block header if a new block header arrives
		const blockHeaders = await this._chainConnectorStore.getBlockHeaders();

		const blockHeaderIndex = blockHeaders.findIndex(
			header => header.height === newBlockHeader.height,
		);
		if (blockHeaderIndex > -1) {
			blockHeaders[blockHeaderIndex] = newBlockHeader;
		} else {
			blockHeaders.push(newBlockHeader);
		}

		// Check for events if any and store them
		const events = await this._sendingChainClient.invoke<JSONObject<chain.EventAttr[]>>(
			'chain_getEvents',
			{ height: newBlockHeader.height },
		);

		const { modules: modulesMetadata } = await this._sendingChainClient.invoke<{
			modules: ModulesMetadata;
		}>('system_getMetadata');
		const interoperabilityMetadata = modulesMetadata.find(
			m => m.name === MODULE_NAME_INTEROPERABILITY,
		);

		if (!interoperabilityMetadata) {
			throw new Error(`No metadata found for ${MODULE_NAME_INTEROPERABILITY} module.`);
		}

		const ccmsFromEvents = [];
		// eslint-disable-next-line no-restricted-syntax, no-labels
		ccmInEventsCheck: if (events && events.length > 0) {
			const ccmSendSuccessEvents = events.filter(
				eventAttr =>
					eventAttr.name === CCM_SEND_SUCCESS && eventAttr.module === MODULE_NAME_INTEROPERABILITY,
			);

			const ccmProcessedEvents = events.filter(
				eventAttr =>
					eventAttr.name === CCM_PROCESSED && eventAttr.module === MODULE_NAME_INTEROPERABILITY,
			);

			if (ccmSendSuccessEvents.length === 0 && ccmProcessedEvents.length === 0) {
				// If there are no CCMs present in the events for the height then skip CCM saving part
				// eslint-disable-next-line no-labels
				break ccmInEventsCheck;
			}

			// Save ccm send success events
			if (ccmSendSuccessEvents.length > 0) {
				const ccmSendSuccessEventInfo = interoperabilityMetadata.events.filter(
					e => e.name === CCM_SEND_SUCCESS,
				);

				if (!ccmSendSuccessEventInfo?.[0]?.data) {
					throw new Error('No schema found for "ccmSendSuccess" event data.');
				}

				for (const e of ccmSendSuccessEvents) {
					const eventData = codec.decode<Modules.Interoperability.CcmSendSuccessEventData>(
						ccmSendSuccessEventInfo[0].data,
						Buffer.from(e.data, 'hex'),
					);
					ccmsFromEvents.push(eventData.ccm);
				}
			}
			// Save ccm processed events based on CCMProcessedResult FORWARDED = 1
			if (ccmProcessedEvents.length > 0) {
				const ccmProcessedEventInfo = interoperabilityMetadata.events.filter(
					e => e.name === CCM_PROCESSED,
				);

				if (!ccmProcessedEventInfo?.[0]?.data) {
					throw new Error('No schema found for "ccmProcessed" event data.');
				}

				for (const e of ccmProcessedEvents) {
					const eventData = codec.decode<Modules.Interoperability.CcmProcessedEventData>(
						ccmProcessedEventInfo[0].data,
						Buffer.from(e.data, 'hex'),
					);
					if (eventData.result === Modules.Interoperability.CCMProcessedResult.FORWARDED) {
						ccmsFromEvents.push(eventData.ccm);
					}
				}
			}
		}
		// TODO: find a better way to find storeKey from metadata
		const store = interoperabilityMetadata.stores.find(
			s => s.data.$id === '/modules/interoperability/outbox',
		);

		// Calculate the inclusion proof of the outbox root on state root
		const outboxKey = Buffer.concat([
			Buffer.from(store?.key as string, 'hex'),
			cryptography.utils.hash(this._receivingChainID),
		]).toString('hex');

		const proveResponseJSON = await this._sendingChainClient.invoke<ProveResponseJSON>(
			'state_prove',
			{
				queryKeys: [outboxKey],
			},
		);
		const proveResponseObj = proveResponseJSONToObj(proveResponseJSON);
		const outboxRootWitness: Modules.Interoperability.OutboxRootWitness = {
			bitmap: proveResponseObj.proof.queries[0].bitmap,
			siblingHashes: proveResponseObj.proof.siblingHashes,
		};
		const crossChainMessages = await this._chainConnectorStore.getCrossChainMessages();
		let receivingChainOutboxSize = 0;
		try {
			const receivingChainChannelDataJSON =
				await this._sendingChainClient.invoke<Modules.Interoperability.ChannelDataJSON>(
					'interoperability_getChannel',
					{ chainID: this._receivingChainID.toString('hex') },
				);
			receivingChainOutboxSize = receivingChainChannelDataJSON.outbox.size;
		} catch (error) {
			this.logger.debug(
				error,
				'No Channel Data: Receiving chain is not registered yet on sending chain',
			);
		}
		crossChainMessages.push({
			ccms: this._isReceivingChainMainchain
				? ccmsFromEvents
				: ccmsFromEvents.filter(ccm => ccm.receivingChainID.equals(this._receivingChainID)),
			height: newBlockHeader.height,
			inclusionProof: outboxRootWitness,
			// Add outbox size info to be used for cleanup
			outboxSize: receivingChainOutboxSize,
		});

		await this._chainConnectorStore.setCrossChainMessages(crossChainMessages);

		// Save validatorsData for a new validatorsHash
		const validatorsHashPreimage = await this._chainConnectorStore.getValidatorsHashPreimage();

		// Get validatorsData at new block header height
		const bftParametersJSON = await this._sendingChainClient.invoke<BFTParametersJSON>(
			'consensus_getBFTParametersActiveValidators',
			{ height: newBlockHeader.height },
		);

		const bftParametersObj = bftParametersJSONToObj(bftParametersJSON);
		const validatorsDataIndex = validatorsHashPreimage.findIndex(v =>
			v.validatorsHash.equals(bftParametersObj.validatorsHash),
		);
		// Save validatorsData if there is a new validatorsHash
		if (validatorsDataIndex === -1) {
			const activeValidators = bftParametersObj.validators;
			validatorsHashPreimage.push({
				certificateThreshold: bftParametersObj.certificateThreshold,
				validators: activeValidators,
				validatorsHash: bftParametersObj.validatorsHash,
			});
		}

		// Save aggregateCommit if present in the block header
		const aggregateCommits = await this._chainConnectorStore.getAggregateCommits();
		if (
			!newBlockHeader.aggregateCommit.aggregationBits.equals(EMPTY_BYTES) ||
			!newBlockHeader.aggregateCommit.certificateSignature.equals(EMPTY_BYTES)
		) {
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
		await this._chainConnectorStore.setBlockHeaders(blockHeaders);
		await this._chainConnectorStore.setAggregateCommits(aggregateCommits);
		await this._chainConnectorStore.setValidatorsHashPreimage(validatorsHashPreimage);

		return {
			blockHeaders,
			aggregateCommits,
			validatorsHashPreimage,
			crossChainMessages,
		};
	}

	private async _deleteBlockHandler(data?: Record<string, unknown>) {
		const { blockHeader: receivedBlock } = data as unknown as Data;

		const deletedBlockHeader = chain.BlockHeader.fromJSON(receivedBlock).toObject();

		// Delete ccmEvents for the height of blockHeader
		const crossChainMessages = await this._chainConnectorStore.getCrossChainMessages();
		const indexForCCMEvents = crossChainMessages.findIndex(
			ccm => ccm.height === deletedBlockHeader.height,
		);
		crossChainMessages.splice(indexForCCMEvents, 1);
		await this._chainConnectorStore.setCrossChainMessages(crossChainMessages);

		const findIndexByHeight = (someData: { height: number }[]): number =>
			someData.findIndex(datum => datum.height === deletedBlockHeader.height);

		const blockHeaders = await this._chainConnectorStore.getBlockHeaders();
		const blockHeaderIndex = findIndexByHeight(blockHeaders);
		if (blockHeaderIndex !== -1) {
			blockHeaders.splice(blockHeaderIndex, 1);
			await this._chainConnectorStore.setBlockHeaders(blockHeaders);
		}

		if (
			!deletedBlockHeader.aggregateCommit.aggregationBits.equals(EMPTY_BYTES) ||
			!deletedBlockHeader.aggregateCommit.certificateSignature.equals(EMPTY_BYTES)
		) {
			const aggregateCommits = await this._chainConnectorStore.getAggregateCommits();
			const aggregateCommitIndex = aggregateCommits.findIndex(
				commit => commit.height === deletedBlockHeader.aggregateCommit.height,
			);
			if (aggregateCommitIndex > -1) {
				aggregateCommits.splice(aggregateCommitIndex, 1);
			}
			await this._chainConnectorStore.setAggregateCommits(aggregateCommits);
		}

		const validatorsHashPreimage = await this._chainConnectorStore.getValidatorsHashPreimage();
		const validatorsHashMap = blockHeaders.reduce((prev: Record<string, boolean>, curr) => {
			// eslint-disable-next-line no-param-reassign
			prev[curr.validatorsHash.toString('hex')] = true;
			return prev;
		}, {});
		const updatedValidatorsHashPreimages = validatorsHashPreimage.filter(
			vhp => validatorsHashMap[vhp.validatorsHash.toString('hex')],
		);
		if (updatedValidatorsHashPreimages.length !== validatorsHashPreimage.length) {
			await this._chainConnectorStore.setValidatorsHashPreimage(updatedValidatorsHashPreimages);
		}
	}

	private async _cleanup() {
		// Delete CCUs
		// When given -1 then there is no limit
		if (this._ccuSaveLimit !== -1) {
			const listOfCCUs = await this._chainConnectorStore.getListOfCCUs();
			if (listOfCCUs.length > this._ccuSaveLimit) {
				await this._chainConnectorStore.setListOfCCUs(
					// Takes the last ccuSaveLimit elements
					listOfCCUs.slice(-this._ccuSaveLimit),
				);
			}
			let finalizedInfoAtHeight = this._heightToDeleteIndex.get(
				this._receivingChainFinalizedHeight,
			);
			if (!finalizedInfoAtHeight) {
				for (let i = 1; i < this._heightToDeleteIndex.size; i += 1) {
					if (this._heightToDeleteIndex.get(this._receivingChainFinalizedHeight - i)) {
						finalizedInfoAtHeight = this._heightToDeleteIndex.get(
							this._receivingChainFinalizedHeight - i,
						);
						break;
					}
				}
			}

			// Delete CCMs
			const crossChainMessages = await this._chainConnectorStore.getCrossChainMessages();
			const ccmsAfterLastCertificate = crossChainMessages.filter(
				ccm =>
					// Some extra ccms may be stored at the outbox size === finalizedheight.inboxSize
					ccm.outboxSize >= (finalizedInfoAtHeight ? finalizedInfoAtHeight.inboxSize : 0),
			);

			await this._chainConnectorStore.setCrossChainMessages(ccmsAfterLastCertificate);
			// Delete blockHeaders
			const blockHeaders = await this._chainConnectorStore.getBlockHeaders();
			const updatedBlockHeaders = blockHeaders.filter(
				blockHeader =>
					blockHeader.height >=
					(finalizedInfoAtHeight ? finalizedInfoAtHeight.lastCertificateHeight : 0),
			);
			await this._chainConnectorStore.setBlockHeaders(updatedBlockHeaders);

			// Delete aggregateCommits
			const aggregateCommits = await this._chainConnectorStore.getAggregateCommits();

			await this._chainConnectorStore.setAggregateCommits(
				aggregateCommits.filter(
					aggregateCommit =>
						aggregateCommit.height >=
						(finalizedInfoAtHeight ? finalizedInfoAtHeight.lastCertificateHeight : 0),
				),
			);
			// Delete validatorsHashPreimage
			const validatorsHashPreimage = await this._chainConnectorStore.getValidatorsHashPreimage();
			const validatorsHashMap = updatedBlockHeaders.reduce(
				(prev: Record<string, boolean>, curr) => {
					// eslint-disable-next-line no-param-reassign
					prev[curr.validatorsHash.toString('hex')] = true;
					return prev;
				},
				{},
			);
			const updatedValidatorsHashPreimages = validatorsHashPreimage.filter(
				vhp => validatorsHashMap[vhp.validatorsHash.toString('hex')],
			);
			if (updatedValidatorsHashPreimages.length !== validatorsHashPreimage.length) {
				await this._chainConnectorStore.setValidatorsHashPreimage(updatedValidatorsHashPreimages);
			}

			// Delete info less than finalized height
			this._heightToDeleteIndex.forEach((_, key) => {
				if (key < this._receivingChainFinalizedHeight) {
					this._heightToDeleteIndex.delete(key);
				}
			});
		}
	}

	private async _submitCCU(
		ccuParams: Modules.Interoperability.CrossChainUpdateTransactionParams,
	): Promise<void> {
		if (!this._chainConnectorStore.privateKey) {
			throw new Error('There is no key enabled to submit CCU');
		}
		const relayerPublicKey = ed.getPublicKeyFromPrivateKey(this._chainConnectorStore.privateKey);
		const targetCommand = this._isReceivingChainMainchain
			? COMMAND_NAME_SUBMIT_MAINCHAIN_CCU
			: COMMAND_NAME_SUBMIT_SIDECHAIN_CCU;

		const { nonce } = await this._receivingChainClient.invoke<{ nonce: string }>(
			'auth_getAuthAccount',
			{
				address: address.getLisk32AddressFromPublicKey(relayerPublicKey),
			},
		);

		const { chainID: chainIDStr } = await this._receivingChainClient.invoke<{ chainID: string }>(
			'system_getNodeInfo',
		);
		const chainID = Buffer.from(chainIDStr, 'hex');

		const txWithoutFee = {
			module: MODULE_NAME_INTEROPERABILITY,
			command: targetCommand,
			nonce: BigInt(nonce),
			senderPublicKey: relayerPublicKey,
			params: codec.encode(Modules.Interoperability.ccuParamsSchema, ccuParams),
			signatures: [],
		};

		const tx = new Transaction({
			...txWithoutFee,
			fee: await this._getCcuFee({
				...txWithoutFee,
				params: ccuParams,
			}),
		});

		tx.sign(chainID, this._chainConnectorStore.privateKey);
		let result: { transactionId: string };
		if (this._isSaveCCU) {
			result = { transactionId: tx.id.toString('hex') };
		} else {
			result = await this._receivingChainClient.invoke<{
				transactionId: string;
			}>('txpool_postTransaction', {
				transaction: tx.getBytes().toString('hex'),
			});
		}
		/**
		 * TODO: As of now we save it in memory but going forward it should be saved in DB,
		 * as the array size can grow after sometime.
		 */
		// Save the sent CCU
		const listOfCCUs = await this._chainConnectorStore.getListOfCCUs();
		listOfCCUs.push(tx.toObject());
		await this._chainConnectorStore.setListOfCCUs(listOfCCUs);
		// Update logs
		this.logger.info({ transactionID: result.transactionId }, 'Sent CCU transaction');
	}

	private async _initializeReceivingChainClient() {
		if (!this.config.receivingChainIPCPath && !this.config.receivingChainWsURL) {
			throw new Error('IPC path and WS url are undefined in the configuration.');
		}
		try {
			if (this.config.receivingChainIPCPath) {
				this._receivingChainClient = await apiClient.createIPCClient(
					this.config.receivingChainIPCPath,
				);
			} else if (this.config.receivingChainWsURL) {
				this._receivingChainClient = await apiClient.createWSClient(
					this.config.receivingChainWsURL,
				);
			}
			this._receivingChainClient.subscribe(
				'chain_newBlock',
				async (data?: Record<string, unknown>) => this._newBlockReceivingChainHandler(data),
			);
		} catch (error) {
			this.logger.error(
				error,
				'Not able to connect to receivingChainAPIClient. Trying again on next new block.',
			);
		}
	}
}
