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

import { regularMerkleTree, sparseMerkleTree } from '@liskhq/lisk-tree';
import { codec } from '@liskhq/lisk-codec';
import { utils, bls } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import { dataStructures } from '@liskhq/lisk-utils';
import {
	ActiveValidators,
	CCMsg,
	ChainAccount,
	MessageRecoveryVerificationParams,
	ChannelData,
	CrossChainUpdateTransactionParams,
	ChainValidators,
	InboxUpdate,
	MsgWitness,
	GenesisInteroperabilityStore,
} from './types';
import {
	CCM_STATUS_OK,
	CHAIN_REGISTERED,
	CHAIN_TERMINATED,
	EMPTY_BYTES,
	LIVENESS_LIMIT,
	MAINCHAIN_ID_BUFFER,
	MAX_CCM_SIZE,
	MAX_NUM_VALIDATORS,
	MAX_UINT64,
	MESSAGE_TAG_CERTIFICATE,
	MODULE_NAME_INTEROPERABILITY,
	SMT_KEY_LENGTH,
} from './constants';
import {
	ccmSchema,
	genesisInteroperabilityStoreSchema,
	sidechainTerminatedCCMParamsSchema,
	validatorsHashInputSchema,
} from './schemas';
import {
	BlockHeader,
	GenesisBlockExecuteContext,
	VerificationResult,
	VerifyStatus,
} from '../../state_machine';
import { Certificate } from '../../engine/consensus/certificate_generation/types';
import { certificateSchema } from '../../engine/consensus/certificate_generation/schema';
import { CommandExecuteContext } from '../../state_machine/types';
import { certificateToJSON } from './certificates';
import { NamedRegistry } from '../named_registry';
import { OutboxRootStore } from './stores/outbox_root';
import { OwnChainAccountStore } from './stores/own_chain_account';
import { ChannelDataStore } from './stores/channel_data';
import { ChainValidatorsStore } from './stores/chain_validators';
import { ChainAccountStore } from './stores/chain_account';
import { TerminatedOutboxAccount, TerminatedOutboxStore } from './stores/terminated_outbox';
import { TerminatedStateStore } from './stores/terminated_state';
import { RegisteredNamesStore } from './stores/registered_names';
import { RegisteredNetworkStore } from './stores/registered_network_ids';

interface CommonExecutionLogicArgs {
	stores: NamedRegistry;
	context: CommandExecuteContext<CrossChainUpdateTransactionParams>;
	certificate: Certificate;
	partnerValidators: ChainValidators;
	partnerChainAccount: ChainAccount;
	partnerValidatorStore: ChainValidatorsStore;
	partnerChainStore: ChainAccountStore;
	chainIDBuffer: Buffer;
}
// Returns the big endian uint32 serialization of an integer x, with 0 <= x < 2^32 which is 4 bytes long.
export const getIDAsKeyForStore = (id: number) => utils.intToBuffer(id, 4);

export const validateFormat = (ccm: CCMsg) => {
	validator.validate(ccmSchema, ccm);

	const serializedCCM = codec.encode(ccmSchema, ccm);
	if (serializedCCM.byteLength > MAX_CCM_SIZE) {
		throw new Error(`Cross chain message is over the the max ccm size limit of ${MAX_CCM_SIZE}`);
	}
};

export const getCCMSize = (ccm: CCMsg) => {
	const serializedCCM = codec.encode(ccmSchema, ccm);

	return BigInt(serializedCCM.byteLength);
};

export const updateActiveValidators = (
	activeValidators: ActiveValidators[],
	activeValidatorsUpdate: ActiveValidators[],
): ActiveValidators[] => {
	for (const updatedValidator of activeValidatorsUpdate) {
		const currentValidator = activeValidators.find(v => v.blsKey.equals(updatedValidator.blsKey));
		if (currentValidator) {
			currentValidator.bftWeight = updatedValidator.bftWeight;
		} else {
			activeValidators.push(updatedValidator);
			activeValidators.sort((v1, v2) => v1.blsKey.compare(v2.blsKey));
		}
	}

	for (const currentValidator of activeValidators) {
		if (currentValidator.bftWeight === BigInt(0)) {
			const index = activeValidators.findIndex(v => v.blsKey.equals(currentValidator.blsKey));
			activeValidators.splice(index, 1);
		}
	}

	return activeValidators;
};

export const getEncodedSidechainTerminatedCCMParam = (
	ccm: CCMsg,
	receivingChainAccount: ChainAccount,
) => {
	const params = {
		chainID: ccm.receivingChainID,
		stateRoot: receivingChainAccount.lastCertificate.stateRoot,
	};

	const encodedParams = codec.encode(sidechainTerminatedCCMParamsSchema, params);

	return encodedParams;
};

export const handlePromiseErrorWithNull = async <T>(promise: Promise<T>) => {
	let result;
	try {
		result = await promise;
	} catch {
		result = null;
	}
	return result;
};

export const isValidName = (username: string): boolean => /^[a-z0-9!@$&_.]+$/g.test(username);

export const computeValidatorsHash = (
	initValidators: ActiveValidators[],
	certificateThreshold: bigint,
) => {
	const input = {
		activeValidators: initValidators,
		certificateThreshold,
	};

	const encodedValidatorsHashInput = codec.encode(validatorsHashInputSchema, input);
	return utils.hash(encodedValidatorsHashInput);
};

export const sortValidatorsByBLSKey = (validators: ActiveValidators[]) =>
	validators.sort((a, b) => a.blsKey.compare(b.blsKey));

export const verifyMessageRecovery = (
	params: MessageRecoveryVerificationParams,
	terminatedChainOutboxAccount?: TerminatedOutboxAccount,
) => {
	if (!terminatedChainOutboxAccount) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error('Terminated outbox account does not exist'),
		};
	}

	const { idxs, crossChainMessages, siblingHashes } = params;
	for (const index of idxs) {
		if (index < terminatedChainOutboxAccount.partnerChainInboxSize) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Cross chain messages are still pending'),
			};
		}
	}

	const deserializedCCMs = crossChainMessages.map(serializedCcm =>
		codec.decode<CCMsg>(ccmSchema, serializedCcm),
	);
	for (const ccm of deserializedCCMs) {
		if (ccm.status !== CCM_STATUS_OK) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Cross chain message that needs to be recovered is not valid'),
			};
		}
	}

	const proof = {
		size: terminatedChainOutboxAccount.outboxSize,
		idxs,
		siblingHashes,
	};
	const hashedCCMs = crossChainMessages.map(ccm => utils.hash(ccm));
	const isVerified = regularMerkleTree.verifyDataBlock(
		hashedCCMs,
		proof,
		terminatedChainOutboxAccount.outboxRoot,
	);
	if (!isVerified) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error('The sidechain outbox root is not valid'),
		};
	}

	return {
		status: VerifyStatus.OK,
	};
};
export const swapReceivingAndSendingChainIDs = (ccm: CCMsg) => ({
	...ccm,
	receivingChainID: ccm.sendingChainID,
	sendingChainID: ccm.receivingChainID,
});

export const isInboxUpdateEmpty = (inboxUpdate: InboxUpdate) =>
	inboxUpdate.crossChainMessages.length === 0 &&
	inboxUpdate.messageWitness.siblingHashes.length === 0 &&
	inboxUpdate.messageWitness.partnerChainOutboxSize === BigInt(0) &&
	inboxUpdate.outboxRootWitness.siblingHashes.length === 0 &&
	inboxUpdate.outboxRootWitness.bitmap.length === 0;

export const isCertificateEmpty = (decodedCertificate: Certificate) =>
	decodedCertificate.blockID.equals(EMPTY_BYTES) ||
	decodedCertificate.stateRoot.equals(EMPTY_BYTES) ||
	decodedCertificate.validatorsHash.equals(EMPTY_BYTES) ||
	decodedCertificate.timestamp === 0;

export const isMessageWitnessEmpty = (messageWitness: MsgWitness) =>
	messageWitness.partnerChainOutboxSize === BigInt(0) && messageWitness.siblingHashes.length === 0;

export const checkLivenessRequirementFirstCCU = (
	partnerChainAccount: ChainAccount,
	txParams: CrossChainUpdateTransactionParams,
): VerificationResult => {
	if (partnerChainAccount.status === CHAIN_REGISTERED && txParams.certificate.equals(EMPTY_BYTES)) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error(
				`Sending partner chain ${txParams.sendingChainID.readInt32BE(
					0,
				)} has a registered status so certificate cannot be empty.`,
			),
		};
	}

	return {
		status: VerifyStatus.OK,
	};
};

export const checkCertificateValidity = (
	partnerChainAccount: ChainAccount,
	encodedCertificate: Buffer,
): VerificationResult => {
	if (encodedCertificate.equals(EMPTY_BYTES)) {
		return {
			status: VerifyStatus.OK,
		};
	}

	const decodedCertificate = codec.decode<Certificate>(certificateSchema, encodedCertificate);
	if (isCertificateEmpty(decodedCertificate)) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error('Certificate is missing required values.'),
		};
	}

	// Last certificate height should be less than new certificate height
	if (partnerChainAccount.lastCertificate.height >= decodedCertificate.height) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error('Certificate height should be greater than last certificate height.'),
		};
	}

	return {
		status: VerifyStatus.OK,
	};
};

export const checkActiveValidatorsUpdate = (
	txParams: CrossChainUpdateTransactionParams,
): VerificationResult => {
	if (
		txParams.activeValidatorsUpdate.length === 0 &&
		txParams.newCertificateThreshold === BigInt(0)
	) {
		return { status: VerifyStatus.OK };
	}
	// Non-empty certificate
	if (txParams.certificate.equals(EMPTY_BYTES)) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error(
				'Certificate cannot be empty when activeValidatorsUpdate is non-empty or newCertificateThreshold > 0.',
			),
		};
	}

	// params.activeValidatorsUpdate has the correct format
	for (let i = 0; i < txParams.activeValidatorsUpdate.length - 1; i += 1) {
		const currentValidator = txParams.activeValidatorsUpdate[i];
		const nextValidator = txParams.activeValidatorsUpdate[i + 1];
		if (currentValidator.blsKey.compare(nextValidator.blsKey) > -1) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Validators blsKeys must be unique and lexicographically ordered.'),
			};
		}
	}

	return {
		status: VerifyStatus.OK,
	};
};

export const checkInboxUpdateValidity = (
	stores: NamedRegistry,
	txParams: CrossChainUpdateTransactionParams,
	partnerChannelData: ChannelData,
): VerificationResult => {
	// If inboxUpdate is empty then return success
	if (isInboxUpdateEmpty(txParams.inboxUpdate)) {
		return {
			status: VerifyStatus.OK,
		};
	}
	const decodedCertificate = codec.decode<Certificate>(certificateSchema, txParams.certificate);
	const { crossChainMessages, messageWitness, outboxRootWitness } = txParams.inboxUpdate;
	const ccmHashes = crossChainMessages.map(ccm => utils.hash(ccm));

	let newInboxRoot;
	let newInboxAppendPath = partnerChannelData.inbox.appendPath;
	let newInboxSize = partnerChannelData.inbox.size;
	for (const ccm of ccmHashes) {
		const { appendPath, size, root } = regularMerkleTree.calculateMerkleRoot({
			value: ccm,
			appendPath: newInboxAppendPath,
			size: newInboxSize,
		});
		newInboxAppendPath = appendPath;
		newInboxSize = size;
		newInboxRoot = root;
	}
	// non-empty certificate and an inboxUpdate
	if (!isCertificateEmpty(decodedCertificate)) {
		// If inboxUpdate contains a non-empty messageWitness, then update newInboxRoot to the output
		if (!isMessageWitnessEmpty(txParams.inboxUpdate.messageWitness)) {
			newInboxRoot = regularMerkleTree.calculateRootFromRightWitness(
				newInboxSize,
				newInboxAppendPath,
				messageWitness.siblingHashes,
			);
		}
		const outboxStore = stores.get(OutboxRootStore);
		const outboxKey = outboxStore.key;
		const proof = {
			siblingHashes: outboxRootWitness.siblingHashes,
			queries: [
				{
					key: outboxKey,
					value: newInboxRoot as Buffer,
					bitmap: outboxRootWitness.bitmap,
				},
			],
		};
		const querykeys = [outboxKey];
		const isSMTRootValid = sparseMerkleTree.verify(
			querykeys,
			proof,
			decodedCertificate.stateRoot,
			SMT_KEY_LENGTH,
		);
		if (!isSMTRootValid) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'Failed at verifying state root when messageWitness and certificate are non-empty.',
				),
			};
		}
	}

	// empty certificate and a non-empty inboxUpdate
	if (isCertificateEmpty(decodedCertificate)) {
		// If inboxUpdate contains a non-empty messageWitness, then update newInboxRoot to the output
		if (!isMessageWitnessEmpty(txParams.inboxUpdate.messageWitness)) {
			newInboxRoot = regularMerkleTree.calculateRootFromRightWitness(
				newInboxSize,
				newInboxAppendPath,
				messageWitness.siblingHashes,
			);
		}
		if (!(newInboxRoot as Buffer).equals(partnerChannelData.partnerChainOutboxRoot)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'Failed at verifying state root when messageWitness is non-empty and certificate is empty.',
				),
			};
		}
	}

	return {
		status: VerifyStatus.OK,
	};
};

export const checkValidCertificateLiveness = (
	txParams: CrossChainUpdateTransactionParams,
	header: BlockHeader,
	certificate: Certificate,
) => {
	if (isInboxUpdateEmpty(txParams.inboxUpdate)) {
		return;
	}
	if (!(header.timestamp - certificate.timestamp < LIVENESS_LIMIT / 2)) {
		throw Error(
			`Certificate is not valid as it passed Liveness limit of ${LIVENESS_LIMIT} seconds.`,
		);
	}
};

export const verifyCertificateSignature = (
	txParams: CrossChainUpdateTransactionParams,
	partnerValidators: ChainValidators,
	partnerChainAccount: ChainAccount,
): VerificationResult => {
	// Only check when ceritificate is non-empty
	if (txParams.certificate.equals(EMPTY_BYTES)) {
		return {
			status: VerifyStatus.OK,
		};
	}

	const decodedCertificate = codec.decode<Certificate>(certificateSchema, txParams.certificate);

	if (isCertificateEmpty(decodedCertificate)) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error(
				'Certificate should have all required values when activeValidatorsUpdate or newCertificateThreshold has a non-empty value.',
			),
		};
	}
	const { activeValidators, certificateThreshold } = partnerValidators;
	const verifySignature = bls.verifyWeightedAggSig(
		activeValidators.map(v => v.blsKey),
		decodedCertificate.aggregationBits as Buffer,
		decodedCertificate.signature as Buffer,
		MESSAGE_TAG_CERTIFICATE,
		partnerChainAccount.chainID,
		txParams.certificate,
		activeValidators.map(v => v.bftWeight),
		certificateThreshold,
	);

	if (!verifySignature) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error('Certificate is invalid due to invalid signature.'),
		};
	}

	return {
		status: VerifyStatus.OK,
	};
};

export const checkCertificateTimestamp = (
	txParams: CrossChainUpdateTransactionParams,
	certificate: Certificate,
	header: BlockHeader,
) => {
	// Only check when ceritificate is non-empty
	if (txParams.certificate.equals(EMPTY_BYTES)) {
		return;
	}

	if (certificate.timestamp >= header.timestamp) {
		throw Error('Certificate is invalid due to invalid timestamp.');
	}
};

export const checkValidatorsHashWithCertificate = (
	txParams: CrossChainUpdateTransactionParams,
	partnerValidators: ChainValidators,
): VerificationResult => {
	if (
		txParams.activeValidatorsUpdate.length !== 0 ||
		txParams.newCertificateThreshold > BigInt(0)
	) {
		if (txParams.certificate.equals(EMPTY_BYTES)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'Certificate cannot be empty when activeValidatorsUpdate or newCertificateThreshold has a non-empty value.',
				),
			};
		}
		let decodedCertificate: Certificate;
		try {
			decodedCertificate = codec.decode<Certificate>(certificateSchema, txParams.certificate);
			if (isCertificateEmpty(decodedCertificate)) {
				throw new Error('Invalid empty certificate.');
			}
		} catch (error) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'Certificate should have all required values when activeValidatorsUpdate or newCertificateThreshold has a non-empty value.',
				),
			};
		}

		const newActiveValidators = updateActiveValidators(
			partnerValidators.activeValidators,
			txParams.activeValidatorsUpdate,
		);

		const validatorsHash = computeValidatorsHash(
			newActiveValidators,
			txParams.newCertificateThreshold || partnerValidators.certificateThreshold,
		);

		if (!decodedCertificate.validatorsHash.equals(validatorsHash)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Validators hash given in the certificate is incorrect.'),
			};
		}
	}

	return {
		status: VerifyStatus.OK,
	};
};

export const commonCCUExecutelogic = async (args: CommonExecutionLogicArgs) => {
	const {
		stores,
		certificate,
		partnerChainAccount,
		partnerValidatorStore,
		partnerChainStore,
		partnerValidators,
		chainIDBuffer,
		context,
	} = args;
	const newActiveValidators = updateActiveValidators(
		partnerValidators.activeValidators,
		context.params.activeValidatorsUpdate,
	);
	partnerValidators.activeValidators = newActiveValidators;
	if (context.params.newCertificateThreshold !== BigInt(0)) {
		partnerValidators.certificateThreshold = context.params.newCertificateThreshold;
	}
	await partnerValidatorStore.set(context, chainIDBuffer, partnerValidators);
	if (!context.params.certificate.equals(EMPTY_BYTES)) {
		partnerChainAccount.lastCertificate.stateRoot = certificate.stateRoot;
		partnerChainAccount.lastCertificate.timestamp = certificate.timestamp;
		partnerChainAccount.lastCertificate.height = certificate.height;
		partnerChainAccount.lastCertificate.validatorsHash = certificate.validatorsHash;
		await partnerChainStore.set(context, chainIDBuffer, partnerChainAccount);
	}

	const partnerChannelStore = stores.get(ChannelDataStore);
	const partnerChannelData = await partnerChannelStore.get(context, chainIDBuffer);
	const { inboxUpdate } = context.params;
	if (
		inboxUpdate.messageWitness.partnerChainOutboxSize === BigInt(0) ||
		inboxUpdate.messageWitness.siblingHashes.length === 0
	) {
		partnerChannelData.partnerChainOutboxRoot = partnerChannelData.inbox.root;
	} else {
		partnerChannelData.partnerChainOutboxRoot = regularMerkleTree.calculateRootFromRightWitness(
			partnerChannelData.inbox.size,
			partnerChannelData.inbox.appendPath,
			inboxUpdate.messageWitness.siblingHashes,
		);
	}
	await partnerChannelStore.set(context, chainIDBuffer, partnerChannelData);
};

export const initGenesisStateUtil = async (
	ctx: GenesisBlockExecuteContext,
	stores: NamedRegistry,
) => {
	const assetBytes = ctx.assets.getAsset(MODULE_NAME_INTEROPERABILITY);
	if (!assetBytes) {
		return;
	}

	const genesisStore = codec.decode<GenesisInteroperabilityStore>(
		genesisInteroperabilityStoreSchema,
		assetBytes,
	);
	validator.validate(genesisInteroperabilityStoreSchema, genesisStore);

	const outboxRootStoreKeySet = new dataStructures.BufferSet();
	const outboxRootStore = stores.get(OutboxRootStore);
	for (const outboxRootData of genesisStore.outboxRootSubstore) {
		if (outboxRootStoreKeySet.has(outboxRootData.storeKey)) {
			throw new Error(
				`Outbox root store key ${outboxRootData.storeKey.toString('hex')} is duplicated.`,
			);
		}
		outboxRootStoreKeySet.add(outboxRootData.storeKey);
		await outboxRootStore.set(ctx, outboxRootData.storeKey, outboxRootData.storeValue);
	}

	const ownChainAccountStore = stores.get(OwnChainAccountStore);
	const ownChainAccount = await ownChainAccountStore.get(ctx, MAINCHAIN_ID_BUFFER);
	const channelDataStoreKeySet = new dataStructures.BufferSet();
	const channelDataStore = stores.get(ChannelDataStore);
	for (const channelData of genesisStore.channelDataSubstore) {
		if (channelDataStoreKeySet.has(channelData.storeKey)) {
			throw new Error(
				`Channel data store key ${channelData.storeKey.toString('hex')} is duplicated.`,
			);
		}
		channelDataStoreKeySet.add(channelData.storeKey);

		const tokenID = channelData.storeValue.messageFeeTokenID;
		if (
			!(
				tokenID.chainID.readInt32BE(0) === 1 ||
				tokenID.chainID.equals(channelData.storeKey) ||
				tokenID.chainID.equals(ownChainAccount.id)
			)
		) {
			throw new Error(
				`Chain id corresponding to the channel data store key ${channelData.storeKey.toString(
					'hex',
				)} is not valid.`,
			);
		}
		if (tokenID.chainID.equals(MAINCHAIN_ID_BUFFER) && tokenID.localID.readInt32BE(0) !== 0) {
			throw new Error(
				`Local id corresponding to the channel data store key ${channelData.storeKey.toString(
					'hex',
				)} is not valid.`,
			);
		}

		await channelDataStore.set(ctx, channelData.storeKey, channelData.storeValue);
	}

	const chainValidatorsStoreKeySet = new dataStructures.BufferSet();
	const chainValidatorsStore = stores.get(ChainValidatorsStore);
	for (const chainValidators of genesisStore.chainValidatorsSubstore) {
		if (chainValidatorsStoreKeySet.has(chainValidators.storeKey)) {
			throw new Error(
				`Chain validators store key ${chainValidators.storeKey.toString('hex')} is duplicated.`,
			);
		}
		chainValidatorsStoreKeySet.add(chainValidators.storeKey);

		const { activeValidators, certificateThreshold } = chainValidators.storeValue;
		if (activeValidators.length < 1 || activeValidators.length > MAX_NUM_VALIDATORS) {
			throw new Error(
				`Active validators must have at least 1 element and at most ${MAX_NUM_VALIDATORS} elements.`,
			);
		}

		let totalWeight = BigInt(0);
		for (let j = 0; j < activeValidators.length; j += 1) {
			const activeValidator = activeValidators[j];

			const { blsKey } = activeValidator;
			if (j < activeValidators.length - 1 && blsKey.compare(activeValidators[j + 1].blsKey) >= 0) {
				throw new Error(
					'Active validators must be ordered lexicographically by blsKey property and pairwise distinct.',
				);
			}

			const { bftWeight } = activeValidator;
			totalWeight += bftWeight;
		}

		if (totalWeight > MAX_UINT64) {
			throw new Error(
				'The total BFT weight of all active validators has to be less than or equal to MAX_UINT64.',
			);
		}

		const checkBftWeightValue = totalWeight / BigInt(3) + BigInt(1);
		if (checkBftWeightValue > totalWeight || checkBftWeightValue > certificateThreshold) {
			throw new Error('The total BFT weight of all active validators is not valid.');
		}

		await chainValidatorsStore.set(ctx, chainValidators.storeKey, chainValidators.storeValue);
	}

	const chainDataStoreKeySet = new dataStructures.BufferSet();
	const chainDataStore = stores.get(ChainAccountStore);
	let isAnotherSidechainAccount = 0;
	for (const chainData of genesisStore.chainDataSubstore) {
		const chainDataStoreKey = chainData.storeKey;
		if (chainDataStoreKeySet.has(chainDataStoreKey)) {
			throw new Error(`Chain data store key ${chainDataStoreKey.toString('hex')} is duplicated.`);
		}
		chainDataStoreKeySet.add(chainDataStoreKey);

		const chainAccountStatus = chainData.storeValue.status;
		if (chainAccountStatus === CHAIN_TERMINATED) {
			if (outboxRootStoreKeySet.has(chainDataStoreKey)) {
				throw new Error('Outbox root store cannot have entry for a terminated chain account.');
			}
			if (
				!channelDataStoreKeySet.has(chainDataStoreKey) ||
				!chainValidatorsStoreKeySet.has(chainDataStoreKey)
			) {
				throw new Error(
					`Chain data store key ${chainDataStoreKey.toString(
						'hex',
					)} missing in some or all of channel data and chain validators stores.`,
				);
			}
		}
		if (
			!outboxRootStoreKeySet.has(chainDataStoreKey) ||
			!channelDataStoreKeySet.has(chainDataStoreKey) ||
			!chainValidatorsStoreKeySet.has(chainDataStoreKey)
		) {
			throw new Error(
				`Chain data store key ${chainDataStoreKey.toString(
					'hex',
				)} missing in some or all of outbox root, channel data and chain validators stores.`,
			);
		}

		if (
			!(
				chainDataStoreKey.equals(ownChainAccount.id) ||
				chainDataStoreKey.equals(MAINCHAIN_ID_BUFFER)
			)
		) {
			isAnotherSidechainAccount = 1;
		}

		await chainDataStore.set(ctx, chainData.storeKey, chainData.storeValue);
	}

	if (
		isAnotherSidechainAccount &&
		!(chainDataStoreKeySet.has(MAINCHAIN_ID_BUFFER) && chainDataStoreKeySet.has(ownChainAccount.id))
	) {
		throw new Error(
			'If a chain account for another sidechain is present, then a chain account for the mainchain must be present, as well as the own chain account.',
		);
	}

	for (const storeKey of outboxRootStoreKeySet) {
		if (!chainDataStoreKeySet.has(storeKey)) {
			throw new Error(
				`Outbox root store key ${storeKey.toString('hex')} is missing in chain data store.`,
			);
		}
	}

	for (const storeKey of channelDataStoreKeySet) {
		if (!chainDataStoreKeySet.has(storeKey)) {
			throw new Error(
				`Channel data store key ${storeKey.toString('hex')} is missing in chain data store.`,
			);
		}
	}

	for (const storeKey of chainValidatorsStoreKeySet) {
		if (!chainDataStoreKeySet.has(storeKey)) {
			throw new Error(
				`Chain validators store key ${storeKey.toString('hex')} is missing in chain data store.`,
			);
		}
	}

	const ownChainDataStoreKeySet = new dataStructures.BufferSet();
	for (const ownChainData of genesisStore.ownChainDataSubstore) {
		if (ownChainDataStoreKeySet.has(ownChainData.storeKey)) {
			throw new Error(
				`Own chain data store key ${ownChainData.storeKey.toString('hex')} is duplicated.`,
			);
		}
		ownChainDataStoreKeySet.add(ownChainData.storeKey);

		await ownChainAccountStore.set(ctx, ownChainData.storeKey, ownChainData.storeValue);
	}

	const terminatedOutboxStoreKeySet = new dataStructures.BufferSet();
	const terminatedOutboxStore = stores.get(TerminatedOutboxStore);
	for (const terminatedOutbox of genesisStore.terminatedOutboxSubstore) {
		if (terminatedOutboxStoreKeySet.has(terminatedOutbox.storeKey)) {
			throw new Error(
				`Terminated outbox store key ${terminatedOutbox.storeKey.toString('hex')} is duplicated.`,
			);
		}
		terminatedOutboxStoreKeySet.add(terminatedOutbox.storeKey);

		await terminatedOutboxStore.set(ctx, terminatedOutbox.storeKey, terminatedOutbox.storeValue);
	}

	const terminatedStateStoreKeySet = new dataStructures.BufferSet();
	const terminatedStateStore = stores.get(TerminatedStateStore);
	for (const terminatedState of genesisStore.terminatedStateSubstore) {
		const terminatedStateStoreKey = terminatedState.storeKey;
		if (terminatedStateStoreKeySet.has(terminatedStateStoreKey)) {
			throw new Error(
				`Terminated state store key ${terminatedStateStoreKey.toString('hex')} is duplicated.`,
			);
		}
		terminatedStateStoreKeySet.add(terminatedStateStoreKey);

		const terminatedStateStoreValue = terminatedState.storeValue;
		if (terminatedStateStoreValue.initialized === false) {
			if (terminatedOutboxStoreKeySet.has(terminatedStateStoreKey)) {
				throw new Error(
					`Uninitialized account associated with terminated state store key ${terminatedStateStoreKey.toString(
						'hex',
					)} cannot be present in terminated outbox store.`,
				);
			}
			if (
				!terminatedStateStoreValue.stateRoot.equals(EMPTY_BYTES) ||
				terminatedStateStoreValue.mainchainStateRoot?.length !== 32
			) {
				throw new Error(
					`For the uninitialized account associated with terminated state store key ${terminatedStateStoreKey.toString(
						'hex',
					)} the stateRoot must be set to empty bytes and mainchainStateRoot to a 32-bytes value.`,
				);
			}
		} else if (terminatedStateStoreValue.initialized === true) {
			if (
				terminatedStateStoreValue.stateRoot.length !== 32 ||
				!terminatedStateStoreValue.mainchainStateRoot?.equals(EMPTY_BYTES)
			) {
				throw new Error(
					`For the initialized account associated with terminated state store key ${terminatedStateStoreKey.toString(
						'hex',
					)} the mainchainStateRoot must be set to empty bytes and stateRoot to a 32-bytes value.`,
				);
			}
		}

		await terminatedStateStore.set(ctx, terminatedState.storeKey, terminatedState.storeValue);
	}

	for (const storeKey of terminatedOutboxStoreKeySet) {
		if (!terminatedStateStoreKeySet.has(storeKey)) {
			throw new Error(
				`Terminated outbox store key ${storeKey.toString(
					'hex',
				)} missing in terminated state store.`,
			);
		}
	}

	const registeredNamesStoreKeySet = new dataStructures.BufferSet();
	const registeredNamesStore = stores.get(RegisteredNamesStore);
	for (const registeredNames of genesisStore.registeredNamesSubstore) {
		if (registeredNamesStoreKeySet.has(registeredNames.storeKey)) {
			throw new Error(
				`Registered names store key ${registeredNames.storeKey.toString('hex')} is duplicated.`,
			);
		}
		registeredNamesStoreKeySet.add(registeredNames.storeKey);

		await registeredNamesStore.set(ctx, registeredNames.storeKey, registeredNames.storeValue);
	}

	const registeredNetworkIDsStoreKeySet = new dataStructures.BufferSet();
	const registeredNetworkIDsStore = stores.get(RegisteredNetworkStore);
	for (const registeredNetworkIDs of genesisStore.registeredNetworkIDsSubstore) {
		if (registeredNetworkIDsStoreKeySet.has(registeredNetworkIDs.storeKey)) {
			throw new Error(
				`Registered network id's store key ${registeredNetworkIDs.storeKey.toString(
					'hex',
				)} is duplicated.`,
			);
		}
		registeredNetworkIDsStoreKeySet.add(registeredNetworkIDs.storeKey);

		await registeredNetworkIDsStore.set(
			ctx,
			registeredNetworkIDs.storeKey,
			registeredNetworkIDs.storeValue,
		);
	}
};

export const chainAccountToJSON = (chainAccount: ChainAccount) => {
	const { lastCertificate, name, chainID, status } = chainAccount;

	return {
		lastCertificate: certificateToJSON(lastCertificate),
		name,
		status,
		chainID: chainID.toString('hex'),
	};
};
