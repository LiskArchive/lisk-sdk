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
	ActiveValidatorsUpdate,
	CrossChainUpdateTransactionParams,
	EMPTY_BYTES,
	LastCertificate,
	MODULE_NAME_INTEROPERABILITY,
	Transaction,
	ccuParamsSchema,
	certificateSchema,
	codec,
	cryptography,
	getMainchainID,
	transactions,
} from 'lisk-sdk';
import { ChainConnectorDB } from './db';
import { ChainAPIClient } from './chain_api_client';
import {
	getCertificateFromAggregateCommitByBlockHeader,
	getNextCertificateFromAggregateCommits,
} from './certificate_generation';
import {
	COMMAND_NAME_SUBMIT_MAINCHAIN_CCU,
	COMMAND_NAME_SUBMIT_SIDECHAIN_CCU,
	DEFAULT_LAST_CCM_SENT_NONCE,
} from './constants';
import { calculateMessageWitnesses } from './inbox_update';
import { LastSentCCM, Logger, ModuleMetadata } from './types';
import { calculateActiveValidatorsUpdate } from './active_validators_update';

interface ComputeCCUConfig {
	registrationHeight: number;
	ownChainID: Buffer;
	receivingChainID: Buffer;
	maxCCUSize: number;
	ccuFee: string;
	isSaveCCU: boolean;
}

interface ComputeCCUInitArgs {
	logger: Logger;
	db: ChainConnectorDB;
	sendingChainAPIClient: ChainAPIClient;
	receivingChainAPIClient: ChainAPIClient;
	lastCertificate: LastCertificate;
	interoperabilityMetadata: ModuleMetadata;
}

export class CCUHandler {
	private readonly _registrationHeight: number;
	private readonly _ownChainID: Buffer;
	private readonly _receivingChainID: Buffer;
	private readonly _maxCCUSize: number;
	private readonly _isReceivingChainMainchain: boolean;
	private readonly _isSaveCCU: boolean;
	private readonly _ccuFee: string;
	private _db!: ChainConnectorDB;
	private _logger!: Logger;
	private _sendingChainAPIClient!: ChainAPIClient;
	private _receivingChainAPIClient!: ChainAPIClient;
	private _lastCertificate!: LastCertificate;
	private _interoperabilityMetadata!: ModuleMetadata;
	private _outboxKeyForInclusionProof!: Buffer;

	public constructor(config: ComputeCCUConfig) {
		this._registrationHeight = config.registrationHeight;
		this._ownChainID = config.ownChainID;
		this._receivingChainID = config.receivingChainID;
		this._maxCCUSize = config.maxCCUSize;
		this._ccuFee = config.ccuFee;
		this._isSaveCCU = config.isSaveCCU;
		// If the running node is mainchain then receiving chain will be sidechain or vice verse.
		this._isReceivingChainMainchain = !getMainchainID(this._ownChainID).equals(this._ownChainID);
	}

	public load(args: ComputeCCUInitArgs) {
		this._logger = args.logger;
		this._db = args.db;
		this._sendingChainAPIClient = args.sendingChainAPIClient;
		this._receivingChainAPIClient = args.receivingChainAPIClient;
		this._lastCertificate = args.lastCertificate;
		this._interoperabilityMetadata = args.interoperabilityMetadata;

		const store = this._interoperabilityMetadata.stores.find(
			s => s.data.$id === '/modules/interoperability/outbox',
		);
		// Calculate the inclusion proof of the outbox root on state root
		this._outboxKeyForInclusionProof = Buffer.concat([
			Buffer.from(store?.key as string, 'hex'),
			cryptography.utils.hash(this._receivingChainID),
		]);
	}

	public async computeCCU(
		lastCertificate: LastCertificate,
		lastIncludedCCM?: LastSentCCM,
	): Promise<
		| {
				ccuParams: CrossChainUpdateTransactionParams;
				lastCCMToBeSent: LastSentCCM | undefined;
		  }
		| undefined
	> {
		this._lastCertificate = lastCertificate;
		const newCertificate = await this._findCertificate();
		if (!newCertificate && this._lastCertificate.height === 0) {
			return undefined;
		}

		const lastSentCCM = lastIncludedCCM ?? {
			nonce: DEFAULT_LAST_CCM_SENT_NONCE,
			height: this._lastCertificate.height,
		};

		// Get range of CCMs and update the DB accordingly
		const ccmsRange = await this._db.getCCMsBetweenHeights(
			lastSentCCM.height,
			newCertificate ? newCertificate.height : this._lastCertificate.height,
		);
		const channelDataOnReceivingChain = await this._receivingChainAPIClient.getChannelAccount(
			this._ownChainID,
		);
		if (!channelDataOnReceivingChain) {
			return undefined;
		}
		const channelDataOnSendingChain = await this._sendingChainAPIClient.getChannelAccount(
			this._receivingChainID,
		);
		if (!channelDataOnSendingChain) {
			return undefined;
		}
		const { crossChainMessages, lastCCMToBeSent, messageWitnessHashes } = calculateMessageWitnesses(
			channelDataOnReceivingChain.inbox.size,
			channelDataOnSendingChain?.outbox.size,
			lastSentCCM,
			ccmsRange,
			this._maxCCUSize,
		);
		let activeValidatorsUpdate: ActiveValidatorsUpdate = {
			blsKeysUpdate: [],
			bftWeightsUpdate: [],
			bftWeightsUpdateBitmap: EMPTY_BYTES,
		};
		let certificate = EMPTY_BYTES;
		let certificateThreshold;
		let outboxRootWitness;

		if (!newCertificate) {
			if (crossChainMessages.length === 0) {
				this._logger.info(
					'CCU cant be created as there are no pending CCMs for the last certificate.',
				);
				return undefined;
			}
			// Empty outboxRootWitness for last certificate
			outboxRootWitness = {
				bitmap: EMPTY_BYTES,
				siblingHashes: [],
			};

			// Use the old certificateThreshold
			const validatorsDataAtLastCertificate = await this._db.getValidatorsDataByHash(
				this._lastCertificate.validatorsHash,
			);
			certificateThreshold = validatorsDataAtLastCertificate?.certificateThreshold;

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
				} as CrossChainUpdateTransactionParams,
				lastCCMToBeSent,
			};
		}

		const validatorsDataAtLastCertificate = await this._db.getValidatorsDataByHash(
			this._lastCertificate.validatorsHash,
		);

		if (!validatorsDataAtLastCertificate) {
			throw new Error(
				`No validators data at last certificate with hash at ${this._lastCertificate.validatorsHash.toString(
					'hex',
				)}`,
			);
		}
		if (!this._lastCertificate.validatorsHash.equals(newCertificate.validatorsHash)) {
			const validatorsDataAtNewCertificate = await this._db.getValidatorsDataByHash(
				newCertificate.validatorsHash,
			);
			if (!validatorsDataAtNewCertificate) {
				throw new Error(
					`No validators data at new certificate with hash at ${newCertificate.validatorsHash.toString(
						'hex',
					)}`,
				);
			}
			const validatorsUpdateResult = calculateActiveValidatorsUpdate(
				validatorsDataAtLastCertificate,
				validatorsDataAtNewCertificate,
			);
			activeValidatorsUpdate = validatorsUpdateResult.activeValidatorsUpdate;
			certificateThreshold = validatorsUpdateResult.certificateThreshold;
		} else {
			// If there was no activeValidatorsUpdate then use the old certificateThreshold
			certificateThreshold = validatorsDataAtLastCertificate?.certificateThreshold;
		}

		if (crossChainMessages.length === 0) {
			outboxRootWitness = {
				bitmap: EMPTY_BYTES,
				siblingHashes: [],
			};
		} else {
			const inclusionProofs = await this._sendingChainAPIClient.getSavedInclusionProofAtHeight(
				newCertificate.height,
			);

			const foundInclusionProof = inclusionProofs.proof.queries.find(q =>
				q.key.equals(this._outboxKeyForInclusionProof),
			);
			if (!foundInclusionProof) {
				throw new Error(
					`No inclusion proof was found for key ${this._outboxKeyForInclusionProof.toString(
						'hex',
					)}`,
				);
			}
			outboxRootWitness = {
				bitmap: foundInclusionProof.bitmap,
				siblingHashes: inclusionProofs.proof.siblingHashes,
			};
		}

		certificate = codec.encode(certificateSchema, newCertificate);

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
			} as CrossChainUpdateTransactionParams,
			lastCCMToBeSent,
		};
	}

	public async submitCCU(
		ccuParams: CrossChainUpdateTransactionParams,
		lastSentCCUTxID: string,
	): Promise<string | undefined> {
		if (!this._db.privateKey) {
			throw new Error('There is no key enabled to submit CCU.');
		}
		const { syncing } = await this._receivingChainAPIClient.getNodeInfo();
		if (syncing) {
			throw new Error('Receiving node is syncing.');
		}
		const relayerPublicKey = cryptography.ed.getPublicKeyFromPrivateKey(this._db.privateKey);
		const targetCommand = this._isReceivingChainMainchain
			? COMMAND_NAME_SUBMIT_MAINCHAIN_CCU
			: COMMAND_NAME_SUBMIT_SIDECHAIN_CCU;

		const nonce = await this._receivingChainAPIClient.getAuthAccountNonceFromPublicKey(
			relayerPublicKey,
		);

		const txWithoutFee = {
			module: MODULE_NAME_INTEROPERABILITY,
			command: targetCommand,
			nonce: BigInt(nonce),
			senderPublicKey: relayerPublicKey,
			params: codec.encode(ccuParamsSchema, ccuParams),
			signatures: [],
		};

		const tx = new Transaction({
			...txWithoutFee,
			fee: await this._getCcuFee({
				...txWithoutFee,
				params: ccuParams,
			}),
		});

		tx.sign(this._receivingChainID, this._db.privateKey);
		if (tx.id.equals(Buffer.from(lastSentCCUTxID, 'hex'))) {
			return undefined;
		}
		let result: { transactionId: string };
		if (this._isSaveCCU) {
			result = { transactionId: tx.id.toString('hex') };
		} else {
			result = await this._receivingChainAPIClient.postTransaction(tx.getBytes());
		}
		// Save the sent CCU
		await this._db.setCCUTransaction(tx.toObject());
		// Update logs
		this._logger.info({ transactionID: result.transactionId }, 'Sent CCU transaction');

		return result.transactionId;
	}

	private async _findCertificate() {
		// First certificate can be picked directly from first valid aggregateCommit taking registration height into account
		if (this._lastCertificate.height === 0) {
			const aggreggateCommits = await this._db.getAggregateCommitBetweenHeights(
				this._registrationHeight,
				1000,
			);
			for (const aggregateCommit of aggreggateCommits) {
				const blockHeader = await this._db.getBlockHeaderByHeight(aggregateCommit.height);
				if (!blockHeader) {
					continue;
				}
				// When we receive the first aggregateCommit in the chain we can create certificate directly
				const firstCertificate = getCertificateFromAggregateCommitByBlockHeader(
					aggregateCommit,
					blockHeader,
				);

				return firstCertificate;
			}

			return undefined;
		}

		const bftHeights = await this._sendingChainAPIClient.getBFTHeights();

		return getNextCertificateFromAggregateCommits(this._db, bftHeights, this._lastCertificate);
	}

	private async _getCcuFee(tx: Record<string, unknown>): Promise<bigint> {
		let additionalFee = BigInt(0);

		const userBalance = await this._receivingChainAPIClient.hasUserTokenAccount(
			cryptography.address.getLisk32AddressFromAddress(
				cryptography.address.getAddressFromPublicKey(tx.senderPublicKey as Buffer),
			),
		);

		if (!userBalance.exists) {
			const fee = await this._receivingChainAPIClient.getTokenInitializationFee();
			additionalFee += BigInt(fee.userAccount);
		}

		const ccuFee = BigInt(this._ccuFee ?? '0') + additionalFee;
		const computedMinFee = transactions.computeMinFee(tx, ccuParamsSchema, {
			additionalFee,
		});

		if (ccuFee > computedMinFee) {
			return ccuFee;
		}
		return computedMinFee;
	}
}
