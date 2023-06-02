/*
 * Copyright © 2023 Lisk Foundation
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

import { ImmutableMethodContext, MethodContext } from '../../state_machine';
import { NextValidatorsSetter } from '../../state_machine/types';
import { ValidatorKeys } from '../pos/types';

export interface RegisterAuthorityParams {
	name: string;
	blsKey: Buffer;
	generatorKey: Buffer;
	proofOfPossession: Buffer;
}

export interface UpdateAuthorityValidatorParams {
	newValidators: {
		address: Buffer;
		weight: bigint;
	}[];
	threshold: bigint;
	validatorsUpdateNonce: number;
	signature: Buffer;
	aggregationBits: Buffer;
}

export interface ValidatorsMethod {
	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0044.md#setvalidatorgeneratorkey
	setValidatorGeneratorKey(
		methodContext: MethodContext,
		validatorAddress: Buffer,
		generatorKey: Buffer,
	): Promise<boolean>;
	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0044.md#registervalidatorkeys
	registerValidatorKeys(
		methodContext: MethodContext,
		validatorAddress: Buffer,
		blsKey: Buffer,
		generatorKey: Buffer,
		proofOfPossession: Buffer,
	): Promise<boolean>;
	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0044.md#registervalidatorwithoutblskey
	registerValidatorWithoutBLSKey(
		methodContext: MethodContext,
		validatorAddress: Buffer,
		generatorKey: Buffer,
	): Promise<boolean>;
	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0044.md#getvalidatorkeys
	getValidatorKeys(methodContext: ImmutableMethodContext, address: Buffer): Promise<ValidatorKeys>;
	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0044.md#getgeneratorsbetweentimestamps
	getGeneratorsBetweenTimestamps(
		methodContext: ImmutableMethodContext,
		startTimestamp: number,
		endTimestamp: number,
	): Promise<Record<string, number>>;
	setValidatorsParams(
		methodContext: MethodContext,
		validatorSetter: NextValidatorsSetter,
		preCommitThreshold: bigint,
		certificateThreshold: bigint,
		validators: { address: Buffer; bftWeight: bigint }[],
	): Promise<void>;
}

interface PoAValidator {
	address: Buffer;
	name: string;
	blsKey: Buffer;
	proofOfPossession: Buffer;
	generatorKey: Buffer;
}

interface ActiveValidator {
	address: Buffer;
	weight: bigint;
}

interface SnapshotSubstore {
	activeValidators: ActiveValidator[];
	threshold: bigint;
}

export interface GenesisPoAStore {
	validators: PoAValidator[];
	snapshotSubstore: SnapshotSubstore;
}
