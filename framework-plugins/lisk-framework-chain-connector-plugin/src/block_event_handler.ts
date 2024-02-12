/*
 * Copyright © 2024 Lisk Foundation
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
	chain,
	CCMProcessedResult,
	CcmProcessedEventData,
	CcmSendSuccessEventData,
	LastCertificate,
	MODULE_NAME_INTEROPERABILITY,
	codec,
	ChainAccount,
	EMPTY_BYTES,
} from 'lisk-sdk';
import { ChainAPIClient } from './chain_api_client';
import { ChainConnectorDB } from './db';
import { BlockHeader, Logger, ModuleMetadata } from './types';
import { CCM_PROCESSED, CCM_SEND_SUCCESS } from './constants';
import { CCUHandler } from './ccu_handler';

export interface NewBlockHandlerConfig {
	registrationHeight: number;
	ownChainID: Buffer;
	receivingChainID: Buffer;
	maxCCUSize: number;
	ccuFee: string;
	isSaveCCU: boolean;
	ccuSaveLimit: number;
}

interface NewBlockHandlerInitArgs {
	logger: Logger;
	db: ChainConnectorDB;
	sendingChainAPIClient: ChainAPIClient;
	receivingChainAPIClient: ChainAPIClient;
}

interface Data {
	readonly blockHeader: chain.BlockHeaderJSON;
}
type FinalizedHeightInfo = { inboxSize: number; lastCertificateHeight: number };

export class BlockEventHandler {
	private readonly _ownChainID!: Buffer;
	private readonly _ccuHandler!: CCUHandler;
	private _db!: ChainConnectorDB;
	private _logger!: Logger;
	private _sendingChainAPIClient!: ChainAPIClient;
	private _receivingChainAPIClient!: ChainAPIClient;
	private _lastCertificate!: LastCertificate;
	private _interoperabilityMetadata!: ModuleMetadata;
	private _heightToDeleteIndex!: Map<number, FinalizedHeightInfo>;
	private readonly _ccuFrequency!: number;
	private _receivingChainFinalizedHeight!: number;
	private readonly _ccuSaveLimit: number;
	private readonly _receivingChainID: Buffer;
	private _isReceivingChainRegistered = false;

	public constructor(config: NewBlockHandlerConfig) {
		this._ownChainID = config.ownChainID;
		this._ccuSaveLimit = config.ccuSaveLimit;
		this._receivingChainFinalizedHeight = 0;
		this._receivingChainID = config.receivingChainID;
		this._ccuHandler = new CCUHandler({
			maxCCUSize: config.maxCCUSize,
			ownChainID: config.ownChainID,
			receivingChainID: config.receivingChainID,
			registrationHeight: config.registrationHeight,
			ccuFee: config.ccuFee,
			isSaveCCU: config.isSaveCCU,
		});
	}

	public async load(args: NewBlockHandlerInitArgs) {
		this._logger = args.logger;
		this._db = args.db;
		this._sendingChainAPIClient = args.sendingChainAPIClient;
		this._receivingChainAPIClient = args.receivingChainAPIClient;
		await this._receivingChainAPIClient.connect();
		this._interoperabilityMetadata = await this._sendingChainAPIClient.getMetadataByModuleName(
			MODULE_NAME_INTEROPERABILITY,
		);
		this._lastCertificate = {
			height: 0,
			stateRoot: EMPTY_BYTES,
			timestamp: 0,
			validatorsHash: EMPTY_BYTES,
		};

		this._ccuHandler.load({
			db: args.db,
			lastCertificate: this._lastCertificate,
			logger: args.logger,
			receivingChainAPIClient: args.receivingChainAPIClient,
			sendingChainAPIClient: args.sendingChainAPIClient,
			interoperabilityMetadata: this._interoperabilityMetadata,
		});
		this._heightToDeleteIndex = new Map();
		// On a new block start with CCU creation process
		this._sendingChainAPIClient.subscribe(
			'chain_newBlock',
			async (data?: Record<string, unknown>) => this.handleNewBlock(data),
		);

		this._sendingChainAPIClient.subscribe(
			'chain_deleteBlock',
			async (data?: Record<string, unknown>) => this._deleteBlockHandler(data),
		);
	}

	public async handleNewBlock(data?: Record<string, unknown>) {
		const { blockHeader: receivedBlock } = data as unknown as Data;

		const newBlockHeader = chain.BlockHeader.fromJSON(receivedBlock).toObject();
		let chainAccount: ChainAccount | undefined;
		// Save blockHeader, aggregateCommit, validatorsData and cross chain messages if any.
		const nodeInfo = await this._sendingChainAPIClient.getNodeInfo();
		// Fetch last certificate from the receiving chain and update the _lastCertificate
		try {
			// eslint-disable-next-line no-console
			console.log('this._ownChainID>>>', this._ownChainID);

			chainAccount = await this._receivingChainAPIClient.getChainAccount(this._ownChainID);
			// eslint-disable-next-line no-console
			console.log('chainAccount>>>>>>>>>>>', chainAccount);
		} catch (error) {
			// If receivingChainAPIClient is not ready then still save data on new block
			await this._saveOnNewBlock(newBlockHeader);
			await this._initializeReceivingChainClient();
			this._logger.error(
				{ err: error as Error },
				'Error occurred while accessing receivingChainAPIClient but all data is saved on new block.',
			);

			return;
		}

		// If sending chain is not registered with the receiving chain then only save data on new block and exit
		if (!chainAccount || (chainAccount && !chainAccount.lastCertificate)) {
			this._logger.info(
				'Sending chain is not registered to the receiving chain yet and has no chain data.',
			);
			try {
				await this._saveOnNewBlock(newBlockHeader);
			} catch (error) {
				this._logger.error(
					{ err: error as Error },
					'Error occurred while saving data on new block.',
				);
			}

			return;
		}

		try {
			this._lastCertificate = chainAccount.lastCertificate;
			await this._saveOnNewBlock(newBlockHeader);

			const numOfBlocksSinceLastCertificate = newBlockHeader.height - this._lastCertificate.height;
			if (nodeInfo.syncing || this._ccuFrequency > numOfBlocksSinceLastCertificate) {
				this._logger.debug(
					{
						syncing: nodeInfo.syncing,
						ccuFrequency: this._ccuFrequency,
						nextPossibleCCUHeight: this._ccuFrequency - numOfBlocksSinceLastCertificate,
					},
					'No attempt to create CCU either due to ccuFrequency or the node is syncing',
				);

				return;
			}
		} catch (error) {
			this._logger.error(error, 'Failed while saving on new block');
			return;
		}

		// Check if receiving chain is registered yet or not
		if (!this._isReceivingChainRegistered) {
			const receivingChainAccount = await this._sendingChainAPIClient.getChainAccount(
				this._receivingChainID,
			);
			if (!receivingChainAccount) {
				return;
			}
			this._isReceivingChainRegistered = true;
		}
		// When all the relevant data is saved successfully then try to create CCU
		const computedCCUParams = await this._ccuHandler.computeCCU();

		if (computedCCUParams) {
			try {
				await this._ccuHandler.submitCCU(computedCCUParams.ccuParams);
				// If CCU was sent successfully then save the lastSentCCM if any
				// TODO: Add function to check on the receiving chain whether last sent CCM was accepted or not
				if (computedCCUParams.lastCCMToBeSent) {
					await this._db.setLastSentCCM(computedCCUParams.lastCCMToBeSent);
				}
			} catch (error) {
				this._logger.info(
					{ err: error },
					`Error occured while submitting CCU for the blockHeader at height: ${newBlockHeader.height}`,
				);
			}
		}
	}

	public async _saveOnNewBlock(newBlockHeader: BlockHeader) {
		// Save block header if a new block header arrives
		await this._db.saveOnNewBlock(newBlockHeader);

		this._logger.info('Saved data on new block');
		// Check for events if any and store them
		const events = await this._sendingChainAPIClient.getEvents(newBlockHeader.height);

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
				const ccmSendSuccessEventInfo = this._interoperabilityMetadata.events.filter(
					e => e.name === CCM_SEND_SUCCESS,
				);

				if (!ccmSendSuccessEventInfo?.[0]?.data) {
					throw new Error('No schema found for "ccmSendSuccess" event data.');
				}

				for (const e of ccmSendSuccessEvents) {
					const eventData = codec.decode<CcmSendSuccessEventData>(
						ccmSendSuccessEventInfo[0].data,
						Buffer.from(e.data, 'hex'),
					);
					ccmsFromEvents.push(eventData.ccm);
				}
			}
			// Save ccm processed events based on CCMProcessedResult FORWARDED = 1
			if (ccmProcessedEvents.length > 0) {
				const ccmProcessedEventInfo = this._interoperabilityMetadata.events.filter(
					e => e.name === CCM_PROCESSED,
				);

				if (!ccmProcessedEventInfo?.[0]?.data) {
					throw new Error('No schema found for "ccmProcessed" event data.');
				}

				for (const e of ccmProcessedEvents) {
					const eventData = codec.decode<CcmProcessedEventData>(
						ccmProcessedEventInfo[0].data,
						Buffer.from(e.data, 'hex'),
					);
					if (eventData.result === CCMProcessedResult.FORWARDED) {
						ccmsFromEvents.push(eventData.ccm);
					}
				}
			}
		}
		this._logger.info('Collected CCMs');

		await this._db.setCCMsByHeight(
			ccmsFromEvents.map(ccm => ({ ...ccm, height: newBlockHeader.height })),
			newBlockHeader.height,
		);

		this._logger.info('Set CCMs');

		const validatorsData = await this._sendingChainAPIClient.getBFTParametersAtHeight(
			newBlockHeader.height,
		);

		this._logger.info('get getBFTParametersAtHeight');

		await this._db.setValidatorsDataByHash(validatorsData.validatorsHash, validatorsData);
		this._logger.info('set getBFTParametersAtHeight');
	}

	private async _initializeReceivingChainClient() {
		try {
			await this._receivingChainAPIClient.connect();
			this._receivingChainAPIClient.subscribe(
				'chain_newBlock',
				async (data?: Record<string, unknown>) => this._newBlockReceivingChainHandler(data),
			);
		} catch (error) {
			this._logger.error(
				error,
				'Not able to connect to receivingChainAPIClient. Trying again on next new block.',
			);
		}
	}

	private async _newBlockReceivingChainHandler(_?: Record<string, unknown>) {
		try {
			const { finalizedHeight } = await this._receivingChainAPIClient.getNodeInfo();
			this._receivingChainFinalizedHeight = finalizedHeight;
			const { inbox } = await this._receivingChainAPIClient.getChannelAccount(this._ownChainID);
			if (!inbox) {
				throw new Error('No channel data available on receiving chain.');
			}
			const chainAccount = await this._receivingChainAPIClient.getChainAccount(this._ownChainID);
			if (!chainAccount?.lastCertificate) {
				throw new Error('No chain data available on receiving chain.');
			}
			this._heightToDeleteIndex.set(finalizedHeight, {
				inboxSize: inbox.size,
				lastCertificateHeight: chainAccount.lastCertificate?.height,
			});
			await this._cleanup();
		} catch (error) {
			this._logger.debug(
				error,
				'No Channel or Chain Data: Sending chain is not registered yet on receiving chain.',
			);
		}
	}

	private async _cleanup() {
		// Delete CCUs
		// When given -1 then there is no limit
		if (this._ccuSaveLimit !== -1) {
			const listOfCCUs = await this._db.getListOfCCUs();
			if (listOfCCUs.length > this._ccuSaveLimit) {
				await this._db.setListOfCCUs(
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

			if (this._lastCertificate.height > 0) {
				// Delete CCMs
				await this._db.deleteCCMsBetweenHeight(
					1,
					finalizedInfoAtHeight ? finalizedInfoAtHeight.inboxSize : 0,
				);

				// Delete blockHeaders
				await this._db.deleteBlockHeadersBetweenHeight(
					1,
					finalizedInfoAtHeight ? finalizedInfoAtHeight.lastCertificateHeight : 0,
				);

				// Delete aggregateCommits
				await this._db.deleteAggregateCommitsBetweenHeight(
					1,
					finalizedInfoAtHeight ? finalizedInfoAtHeight.lastCertificateHeight : 0,
				);
				// Delete validatorsHashPreimage
			}

			// Delete info less than finalized height
			this._heightToDeleteIndex.forEach((_, key) => {
				if (key < this._receivingChainFinalizedHeight) {
					this._heightToDeleteIndex.delete(key);
				}
			});
		}
	}

	private async _deleteBlockHandler(data?: Record<string, unknown>) {
		const { blockHeader: receivedBlock } = data as unknown as Data;

		const deletedBlockHeader = chain.BlockHeader.fromJSON(receivedBlock).toObject();

		// Delete ccmEvents for the height of blockHeader
		await this._db.deleteCCMsByHeight(deletedBlockHeader.height);
		await this._db.deleteBlockHeaderByHeight(deletedBlockHeader.height);
		await this._db.deleteAggregateCommitByHeight(deletedBlockHeader.height);
	}
}
