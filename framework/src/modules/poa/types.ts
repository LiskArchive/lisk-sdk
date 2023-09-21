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

import {
	ImmutableMethodContext,
	MethodContext,
	NextValidatorsSetter,
} from '../../state_machine/types';
import { JSONObject } from '../../types';

export interface ModuleConfig {
	authorityRegistrationFee: bigint;
}

export type ModuleConfigJSON = JSONObject<ModuleConfig>;
export interface RegisterAuthorityParams {
	name: string;
	blsKey: Buffer;
	proofOfPossession: Buffer;
	generatorKey: Buffer;
}

export interface UpdateAuthorityParams {
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
	setValidatorGeneratorKey(
		methodContext: MethodContext,
		validatorAddress: Buffer,
		generatorKey: Buffer,
	): Promise<boolean>;
	registerValidatorKeys(
		methodContext: MethodContext,
		validatorAddress: Buffer,
		blsKey: Buffer,
		generatorKey: Buffer,
		proofOfPossession: Buffer,
	): Promise<void>;
	registerValidatorWithoutBLSKey(
		methodContext: MethodContext,
		validatorAddress: Buffer,
		generatorKey: Buffer,
	): Promise<boolean>;
	getValidatorKeys(methodContext: ImmutableMethodContext, address: Buffer): Promise<ValidatorKeys>;
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

export interface RandomMethod {
	getRandomBytes(
		methodContext: ImmutableMethodContext,
		height: number,
		numberOfSeeds: number,
	): Promise<Buffer>;
}

export interface ValidatorKeys {
	generatorKey: Buffer;
	blsKey: Buffer;
}

export interface FeeMethod {
	payFee(methodContext: MethodContext, amount: bigint): void;
}

interface PoAValidator {
	address: Buffer;
	name: string;
	blsKey: Buffer;
	proofOfPossession: Buffer;
	generatorKey: Buffer;
}

export interface ActiveValidator {
	address: Buffer;
	weight: bigint;
}

export interface SnapshotSubstore {
	activeValidators: ActiveValidator[];
	threshold: bigint;
}

export interface GenesisPoAStore {
	validators: PoAValidator[];
	snapshotSubstore: SnapshotSubstore;
}

export interface UpdateGeneratorKeyParams {
	generatorKey: Buffer;
}

export interface Validator {
	address: string;
	name: string;
	weight: string;
}
