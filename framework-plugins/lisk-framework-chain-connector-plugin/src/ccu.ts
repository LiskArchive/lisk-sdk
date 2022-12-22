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
	BFTHeights,
	ActiveValidator,
	codec,
	certificateSchema,
	CrossChainUpdateTransactionParams,
	apiClient,
	LastCertificate,
	ccmSchema,
	tree,
	CCMsg,
	OutboxRootWitness,
	db as liskDB,
	crossChainUpdateTransactionParams,
} from 'lisk-sdk';
import { getNextCertificateFromAggregateCommits } from './certificate_generation';
import { calculateActiveValidatorsUpdate } from './active_validators_update';
import { ChainConnectorStore } from './db';
import { BlockHeader, InboxUpdate, CrossChainMessagesFromEvents } from './types';

export class Ccu {
	private readonly _chainConnectorPluginDB!: liskDB.Database;
	private readonly _sidechainChainConnectorStore: ChainConnectorStore;
	private readonly _sidechainAPIClient!: apiClient.APIClient;
	private readonly _ownChainID!: Buffer;
	private readonly _lastCertificate!: LastCertificate;

	public constructor(
		store: ChainConnectorStore,
		chainApiClient: apiClient.APIClient,
		ownChainID: Buffer,
		certificate: LastCertificate,
	) {
		this._sidechainChainConnectorStore = store;
		this._sidechainAPIClient = chainApiClient;
		this._ownChainID = ownChainID;
		this._lastCertificate = certificate;
	}

	public async calculateCCUParams(): Promise<void> {
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

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private async _createCCU(_serializedCCUParams: Buffer) {}
}
