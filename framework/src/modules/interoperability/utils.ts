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

import { regularMerkleTree } from '@liskhq/lisk-tree';
import { codec } from '@liskhq/lisk-codec';
import { hash, intToBuffer } from '@liskhq/lisk-cryptography';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { CCM_STATUS_OK, MAX_CCM_SIZE } from './constants';
import {
	ActiveValidators,
	CCMsg,
	ChainAccount,
	MessageRecoveryVerificationParams,
	TerminatedOutboxAccount,
} from './types';
import { ccmSchema, sidechainTerminatedCCMParamsSchema, validatorsHashInputSchema } from './schema';
import { VerifyStatus } from '../../node/state_machine/types';

// Returns the big endian uint32 serialization of an integer x, with 0 <= x < 2^32 which is 4 bytes long.
export const getIDAsKeyForStore = (id: number) => intToBuffer(id, 4);

export const validateFormat = (ccm: CCMsg) => {
	const errors = validator.validate(ccmSchema, ccm);
	if (errors.length) {
		const error = new LiskValidationError(errors);

		throw error;
	}
	const serializedCCM = codec.encode(ccmSchema, ccm);
	if (serializedCCM.byteLength > MAX_CCM_SIZE) {
		throw new Error(`Cross chain message is over the the max ccm size limit of ${MAX_CCM_SIZE}`);
	}
};

export const getCCMSize = (ccm: CCMsg) => {
	const serializedCCM = codec.encode(ccmSchema, ccm);

	return serializedCCM.byteLength;
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
	return hash(encodedValidatorsHashInput);
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
	const hashedCCMs = crossChainMessages.map(ccm => hash(ccm));
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
