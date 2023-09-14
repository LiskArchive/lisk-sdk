/*
 * Copyright © 2021 Lisk Foundation
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
import { bls } from '@liskhq/lisk-cryptography';
import { validator as liskValidator } from '@liskhq/lisk-validator';
import { BaseMethod } from '../base_method';
import { MethodContext, ImmutableMethodContext } from '../../state_machine';
import {
	ADDRESS_LENGTH,
	BLS_POP_LENGTH,
	BLS_PUBLIC_KEY_LENGTH,
	ED25519_PUBLIC_KEY_LENGTH,
	EMPTY_KEY,
	INVALID_BLS_KEY,
	KeyRegResult,
} from './constants';
import { MethodInitArgs, ValidatorAddress } from './types';
import { GeneratorKeyRegistrationEvent } from './events/generator_key_registration';
import { ValidatorKeys, validatorKeysSchema, ValidatorKeysStore } from './stores/validator_keys';
import { BLSKeyStore } from './stores/bls_keys';
import { BlsKeyRegistrationEvent } from './events/bls_key_registration';
import { ValidatorsParams, ValidatorsParamsStore } from './stores/validators_params';
import { NextValidatorsSetter, Validator } from '../../state_machine/types';

export type ValidatorArgs = {
	validatorAddress?: Buffer;
	blsKey?: Buffer;
	proofOfPossession?: Buffer;
	generatorKey?: Buffer;
};

export class ValidatorsMethod extends BaseMethod {
	private _blockTime!: number;

	public init(args: MethodInitArgs) {
		this._blockTime = args.config.blockTime;
	}

	public async registerValidatorKeys(
		methodContext: MethodContext,
		validatorAddress: Buffer,
		blsKey: Buffer,
		generatorKey: Buffer,
		proofOfPossession: Buffer,
	): Promise<void> {
		this._validateLengths({ validatorAddress, blsKey, proofOfPossession });

		const validatorAccount = {
			generatorKey,
			blsKey,
		};
		liskValidator.validate<ValidatorKeys>(validatorKeysSchema, validatorAccount);

		const validatorsSubStore = this.stores.get(ValidatorKeysStore);
		const addressExists = await validatorsSubStore.has(methodContext, validatorAddress);
		if (addressExists) {
			this.events.get(GeneratorKeyRegistrationEvent).log(methodContext, validatorAddress, {
				generatorKey,
				result: KeyRegResult.ALREADY_VALIDATOR,
			});
			throw new Error('This address is already registered as validator.');
		}

		const blsKeysSubStore = this.stores.get(BLSKeyStore);
		const blsKeyExists = await blsKeysSubStore.has(methodContext, blsKey);
		if (blsKeyExists) {
			this.events.get(BlsKeyRegistrationEvent).log(methodContext, validatorAddress, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.DUPLICATE_BLS_KEY,
			});
			throw new Error(
				`The BLS key ${blsKey.toString('hex')} has already been registered in the chain.`,
			);
		}

		if (!bls.popVerify(blsKey, proofOfPossession)) {
			this.events.get(BlsKeyRegistrationEvent).log(methodContext, validatorAddress, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.INVALID_POP,
			});
			throw new Error('Invalid proof of possession for the given BLS key.');
		}

		await validatorsSubStore.set(methodContext, validatorAddress, validatorAccount);
		await blsKeysSubStore.set(methodContext, blsKey, { address: validatorAddress });
		this.events
			.get(GeneratorKeyRegistrationEvent)
			.log(methodContext, validatorAddress, { generatorKey, result: KeyRegResult.SUCCESS });
		this.events.get(BlsKeyRegistrationEvent).log(methodContext, validatorAddress, {
			blsKey,
			proofOfPossession,
			result: KeyRegResult.SUCCESS,
		});
	}

	public async registerValidatorWithoutBLSKey(
		methodContext: MethodContext,
		validatorAddress: Buffer,
		generatorKey: Buffer,
	): Promise<boolean> {
		this._validateLengths({ validatorAddress });

		const validatorAccount = {
			generatorKey,
			blsKey: INVALID_BLS_KEY,
		};
		liskValidator.validate<ValidatorKeys>(validatorKeysSchema, validatorAccount);

		const validatorsSubStore = this.stores.get(ValidatorKeysStore);

		const addressExists = await validatorsSubStore.has(methodContext, validatorAddress);
		if (addressExists) {
			this.events.get(GeneratorKeyRegistrationEvent).log(methodContext, validatorAddress, {
				generatorKey,
				result: KeyRegResult.ALREADY_VALIDATOR,
			});

			throw new Error('This address is already registered as validator.');
		}

		await validatorsSubStore.set(methodContext, validatorAddress, validatorAccount);

		this.events
			.get(GeneratorKeyRegistrationEvent)
			.log(methodContext, validatorAddress, { generatorKey, result: KeyRegResult.SUCCESS });

		return true;
	}

	public async getAddressFromBLSKey(
		methodContext: MethodContext,
		blsKey: Buffer,
	): Promise<ValidatorAddress> {
		this._validateLengths({ blsKey });

		const blsKeysSubStore = this.stores.get(BLSKeyStore);
		const blsKeyExists = await blsKeysSubStore.has(methodContext, blsKey);

		if (!blsKeyExists) {
			throw new Error(
				`The BLS key ${blsKey.toString('hex')} has not been registered in the chain.`,
			);
		}

		return blsKeysSubStore.get(methodContext, blsKey);
	}

	public async getValidatorKeys(
		methodContext: ImmutableMethodContext,
		address: Buffer,
	): Promise<ValidatorKeys> {
		this._validateLengths({ validatorAddress: address });

		const validatorsSubStore = this.stores.get(ValidatorKeysStore);
		const addressExists = await validatorsSubStore.has(methodContext, address);
		if (!addressExists) {
			throw new Error('No validator account found for the input address.');
		}

		return validatorsSubStore.get(methodContext, address);
	}

	public async setValidatorBLSKey(
		methodContext: MethodContext,
		validatorAddress: Buffer,
		blsKey: Buffer,
		proofOfPossession: Buffer,
	): Promise<boolean> {
		this._validateLengths({ validatorAddress, blsKey, proofOfPossession });

		const validatorsSubStore = this.stores.get(ValidatorKeysStore);
		const addressExists = await validatorsSubStore.has(methodContext, validatorAddress);

		if (!addressExists) {
			this.events.get(BlsKeyRegistrationEvent).log(methodContext, validatorAddress, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.NO_VALIDATOR,
			});
			throw new Error(
				'This address is not registered as validator. Only validators can register a BLS key.',
			);
		}

		const blsKeysSubStore = this.stores.get(BLSKeyStore);
		const blsKeyExists = await blsKeysSubStore.has(methodContext, blsKey);
		if (blsKeyExists) {
			this.events.get(BlsKeyRegistrationEvent).log(methodContext, validatorAddress, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.DUPLICATE_BLS_KEY,
			});
			throw new Error(
				`The BLS key ${blsKey.toString('hex')} has already been registered in the chain.`,
			);
		}

		const validatorAccount = await validatorsSubStore.get(methodContext, validatorAddress);
		if (!validatorAccount.blsKey.equals(INVALID_BLS_KEY)) {
			return false;
		}

		if (!bls.popVerify(blsKey, proofOfPossession)) {
			this.events.get(BlsKeyRegistrationEvent).log(methodContext, validatorAddress, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.INVALID_POP,
			});

			throw new Error('Invalid proof of possession for the given BLS key.');
		}

		validatorAccount.blsKey = blsKey;

		await validatorsSubStore.set(methodContext, validatorAddress, validatorAccount);
		await blsKeysSubStore.set(methodContext, blsKey, { address: validatorAddress });

		this.events.get(BlsKeyRegistrationEvent).log(methodContext, validatorAddress, {
			blsKey,
			proofOfPossession,
			result: KeyRegResult.SUCCESS,
		});

		return true;
	}

	public async setValidatorGeneratorKey(
		methodContext: MethodContext,
		validatorAddress: Buffer,
		generatorKey: Buffer,
	): Promise<boolean> {
		this._validateLengths({ validatorAddress, generatorKey });

		const validatorsSubStore = this.stores.get(ValidatorKeysStore);

		const addressExists = await validatorsSubStore.has(methodContext, validatorAddress);
		if (!addressExists) {
			this.events
				.get(GeneratorKeyRegistrationEvent)
				.log(methodContext, validatorAddress, { generatorKey, result: KeyRegResult.NO_VALIDATOR });
			throw new Error(
				'This address is not registered as validator. Only validators can register a generator key.',
			);
		}

		const validatorAccount = await validatorsSubStore.get(methodContext, validatorAddress);
		validatorAccount.generatorKey = generatorKey;
		await validatorsSubStore.set(methodContext, validatorAddress, validatorAccount);

		this.events
			.get(GeneratorKeyRegistrationEvent)
			.log(methodContext, validatorAddress, { generatorKey, result: KeyRegResult.SUCCESS });

		return true;
	}

	public async isKeyRegistered(
		methodContext: ImmutableMethodContext,
		blsKey: Buffer,
	): Promise<boolean> {
		const blsKeysSubStore = this.stores.get(BLSKeyStore);
		return blsKeysSubStore.has(methodContext, blsKey);
	}

	public async getGeneratorsBetweenTimestamps(
		methodContext: ImmutableMethodContext,
		startTimestamp: number,
		endTimestamp: number,
	): Promise<Record<string, number>> {
		if (endTimestamp < startTimestamp) {
			throw new Error('End timestamp must be greater than or equal to start timestamp.');
		}

		const result: Record<string, number> = {};

		const startSlotNumber = Math.floor(startTimestamp / this._blockTime) + 1;
		const endSlotNumber = Math.floor(endTimestamp / this._blockTime) - 1;

		if (startSlotNumber > endSlotNumber) {
			return {};
		}

		let totalSlots = endSlotNumber - startSlotNumber + 1;

		const { validators } = await this.stores
			.get(ValidatorsParamsStore)
			.get(methodContext, EMPTY_KEY);
		const generatorAddresses = validators.map(validator => validator.address.toString('binary'));
		const baseSlots = Math.floor(totalSlots / generatorAddresses.length);

		if (baseSlots > 0) {
			totalSlots -= baseSlots * generatorAddresses.length;
			for (const generatorAddress of generatorAddresses) {
				result[generatorAddress] = baseSlots;
			}
		}

		for (
			let slotNumber = startSlotNumber;
			slotNumber < startSlotNumber + totalSlots;
			slotNumber += 1
		) {
			const slotIndex = slotNumber % generatorAddresses.length;
			const generatorAddress = generatorAddresses[slotIndex];
			if (Object.prototype.hasOwnProperty.call(result, generatorAddress)) {
				result[generatorAddress] += 1;
			} else {
				result[generatorAddress] = 1;
			}
		}

		return result;
	}

	public async getValidatorsParams(
		methodContext: ImmutableMethodContext,
	): Promise<ValidatorsParams> {
		return this.stores.get(ValidatorsParamsStore).get(methodContext, EMPTY_KEY);
	}

	public async setValidatorsParams(
		methodContext: MethodContext,
		validatorSetter: NextValidatorsSetter,
		preCommitThreshold: bigint,
		certificateThreshold: bigint,
		validators: Pick<Validator, 'address' | 'bftWeight'>[],
	): Promise<void> {
		const validatorsSubStore = this.stores.get(ValidatorKeysStore);
		const validatorsWithKey = [];
		for (const validator of validators) {
			const keys = await validatorsSubStore.get(methodContext, validator.address);
			validatorsWithKey.push({
				...validator,
				generatorKey: keys.generatorKey,
				blsKey: keys.blsKey,
			});
		}
		await this.stores.get(ValidatorsParamsStore).set(methodContext, EMPTY_KEY, {
			certificateThreshold,
			preCommitThreshold,
			validators: validatorsWithKey,
		});
		validatorSetter.setNextValidators(preCommitThreshold, certificateThreshold, validatorsWithKey);
	}

	private _validateLengths(args: ValidatorArgs) {
		if (args.validatorAddress && args.validatorAddress.length !== ADDRESS_LENGTH) {
			throw new Error(`Validator address must be ${ADDRESS_LENGTH} bytes long.`);
		}
		if (args.blsKey && args.blsKey.length !== BLS_PUBLIC_KEY_LENGTH) {
			throw new Error(`BLS public key must be ${BLS_PUBLIC_KEY_LENGTH} bytes long.`);
		}
		if (args.proofOfPossession && args.proofOfPossession.length !== BLS_POP_LENGTH) {
			throw new Error(`Proof of Possession must be ${BLS_POP_LENGTH} bytes long.`);
		}
		if (args.generatorKey && args.generatorKey.length !== ED25519_PUBLIC_KEY_LENGTH) {
			throw new Error(`Generator key must be ${ED25519_PUBLIC_KEY_LENGTH} bytes long.`);
		}
	}
}
