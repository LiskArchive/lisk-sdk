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
import { codec } from '@liskhq/lisk-codec';
import { bls } from '@liskhq/lisk-cryptography';
import { BaseAPI } from '../base_api';
import { APIContext, ImmutableAPIContext } from '../../state_machine';
import {
	EMPTY_KEY,
	INVALID_BLS_KEY,
	SUBSTORE_PREFIX_BLS_KEYS,
	SUBSTORE_PREFIX_GENESIS_DATA,
	SUBSTORE_PREFIX_VALIDATORS_DATA,
	KEY_REG_RESULT_ALREADY_VALIDATOR,
	KEY_REG_RESULT_DUPLICATE_BLS_KEY,
	KEY_REG_RESULT_INVALID_POP,
	KEY_REG_RESULT_SUCCESS,
	KEY_REG_RESULT_NO_VALIDATOR,
	EVENT_NAME_GENERATOR_KEY_REGISTRATION,
	EVENT_NAME_BLS_KEY_REGISTRATION,
} from './constants';
import { APIInitArgs, GenesisData, ValidatorAddress, ValidatorKeys } from './types';
import {
	blsKeyRegDataSchema,
	generatorKeyRegDataSchema,
	genesisDataSchema,
	validatorAccountSchema,
	validatorAddressSchema,
} from './schemas';

export class ValidatorsAPI extends BaseAPI {
	private _blockTime!: number;

	public init(args: APIInitArgs) {
		this._blockTime = args.config.blockTime;
	}

	public async registerValidatorKeys(
		apiContext: APIContext,
		validatorAddress: Buffer,
		blsKey: Buffer,
		generatorKey: Buffer,
		proofOfPossession: Buffer,
	): Promise<boolean> {
		const validatorsSubStore = apiContext.getStore(this.moduleID, SUBSTORE_PREFIX_VALIDATORS_DATA);
		const addressExists = await validatorsSubStore.has(validatorAddress);
		if (addressExists) {
			apiContext.eventQueue.add(
				this.moduleName,
				EVENT_NAME_GENERATOR_KEY_REGISTRATION,
				codec.encode(generatorKeyRegDataSchema, {
					generatorKey,
					result: KEY_REG_RESULT_ALREADY_VALIDATOR,
				}),
				[validatorAddress],
				true,
			);
			throw new Error('This address is already registered as validator.');
		}

		const blsKeysSubStore = apiContext.getStore(this.moduleID, SUBSTORE_PREFIX_BLS_KEYS);
		const blsKeyExists = await blsKeysSubStore.has(blsKey);
		if (blsKeyExists) {
			apiContext.eventQueue.add(
				this.moduleName,
				EVENT_NAME_BLS_KEY_REGISTRATION,
				codec.encode(blsKeyRegDataSchema, {
					blsKey,
					proofOfPossession,
					result: KEY_REG_RESULT_DUPLICATE_BLS_KEY,
				}),
				[validatorAddress],
				true,
			);
			throw new Error(
				`The BLS key ${blsKey.toString('hex')} has already been registered in the chain.`,
			);
		}

		if (!bls.popVerify(blsKey, proofOfPossession)) {
			apiContext.eventQueue.add(
				this.moduleName,
				EVENT_NAME_BLS_KEY_REGISTRATION,
				codec.encode(blsKeyRegDataSchema, {
					blsKey,
					proofOfPossession,
					result: KEY_REG_RESULT_INVALID_POP,
				}),
				[validatorAddress],
				true,
			);
			throw new Error('Invalid proof of possession for the given BLS key.');
		}

		const validatorAccount = {
			generatorKey,
			blsKey,
		};

		await validatorsSubStore.setWithSchema(
			validatorAddress,
			validatorAccount,
			validatorAccountSchema,
		);
		await blsKeysSubStore.setWithSchema(
			blsKey,
			{ address: validatorAddress },
			validatorAddressSchema,
		);
		apiContext.eventQueue.add(
			this.moduleName,
			EVENT_NAME_GENERATOR_KEY_REGISTRATION,
			codec.encode(generatorKeyRegDataSchema, { generatorKey, result: KEY_REG_RESULT_SUCCESS }),
			[validatorAddress],
		);
		apiContext.eventQueue.add(
			this.moduleName,
			EVENT_NAME_BLS_KEY_REGISTRATION,
			codec.encode(blsKeyRegDataSchema, {
				blsKey,
				proofOfPossession,
				result: KEY_REG_RESULT_SUCCESS,
			}),
			[validatorAddress],
		);

		return true;
	}

	public async registerValidatorWithoutBLSKey(
		apiContext: APIContext,
		validatorAddress: Buffer,
		generatorKey: Buffer,
	): Promise<boolean> {
		const validatorsSubStore = apiContext.getStore(this.moduleID, SUBSTORE_PREFIX_VALIDATORS_DATA);

		const addressExists = await validatorsSubStore.has(validatorAddress);
		if (addressExists) {
			apiContext.eventQueue.add(
				this.moduleName,
				EVENT_NAME_GENERATOR_KEY_REGISTRATION,
				codec.encode(generatorKeyRegDataSchema, {
					generatorKey,
					result: KEY_REG_RESULT_ALREADY_VALIDATOR,
				}),
				[validatorAddress],
				true,
			);
			throw new Error('This address is already registered as validator.');
		}

		const validatorAccount = {
			generatorKey,
			blsKey: INVALID_BLS_KEY,
		};

		await validatorsSubStore.setWithSchema(
			validatorAddress,
			validatorAccount,
			validatorAccountSchema,
		);

		apiContext.eventQueue.add(
			this.moduleName,
			EVENT_NAME_GENERATOR_KEY_REGISTRATION,
			codec.encode(generatorKeyRegDataSchema, { generatorKey, result: KEY_REG_RESULT_SUCCESS }),
			[validatorAddress],
		);

		return true;
	}

	public async getAddressFromBLSKey(
		apiContext: APIContext,
		blsKey: Buffer,
	): Promise<ValidatorAddress> {
		const blsKeysSubStore = apiContext.getStore(this.moduleID, SUBSTORE_PREFIX_BLS_KEYS);
		const blsKeyExists = await blsKeysSubStore.has(blsKey);

		if (!blsKeyExists) {
			throw new Error(
				`The BLS key ${blsKey.toString('hex')} has not been registered in the chain.`,
			);
		}

		return blsKeysSubStore.getWithSchema<ValidatorAddress>(blsKey, validatorAddressSchema);
	}

	public async getValidatorAccount(
		apiContext: ImmutableAPIContext,
		address: Buffer,
	): Promise<ValidatorKeys> {
		if (address.length !== 20) {
			throw new Error('Address is not valid.');
		}

		const validatorsSubStore = apiContext.getStore(this.moduleID, SUBSTORE_PREFIX_VALIDATORS_DATA);
		const addressExists = await validatorsSubStore.has(address);
		if (!addressExists) {
			throw new Error('No validator account found for the input address.');
		}

		return validatorsSubStore.getWithSchema<ValidatorKeys>(address, validatorAccountSchema);
	}

	public async getGenesisData(apiContext: ImmutableAPIContext): Promise<GenesisData> {
		const genesisDataSubStore = apiContext.getStore(this.moduleID, SUBSTORE_PREFIX_GENESIS_DATA);
		return genesisDataSubStore.getWithSchema<GenesisData>(EMPTY_KEY, genesisDataSchema);
	}

	public async setValidatorBLSKey(
		apiContext: APIContext,
		validatorAddress: Buffer,
		blsKey: Buffer,
		proofOfPossession: Buffer,
	): Promise<boolean> {
		const validatorsSubStore = apiContext.getStore(this.moduleID, SUBSTORE_PREFIX_VALIDATORS_DATA);
		const addressExists = await validatorsSubStore.has(validatorAddress);

		if (!addressExists) {
			apiContext.eventQueue.add(
				this.moduleName,
				EVENT_NAME_BLS_KEY_REGISTRATION,
				codec.encode(blsKeyRegDataSchema, {
					blsKey,
					proofOfPossession,
					result: KEY_REG_RESULT_NO_VALIDATOR,
				}),
				[validatorAddress],
				true,
			);
			throw new Error(
				'This address is not registered as validator. Only validators can register a BLS key.',
			);
		}

		const blsKeysSubStore = apiContext.getStore(this.moduleID, SUBSTORE_PREFIX_BLS_KEYS);
		const blsKeyExists = await blsKeysSubStore.has(blsKey);
		if (blsKeyExists) {
			apiContext.eventQueue.add(
				this.moduleName,
				EVENT_NAME_BLS_KEY_REGISTRATION,
				codec.encode(blsKeyRegDataSchema, {
					blsKey,
					proofOfPossession,
					result: KEY_REG_RESULT_DUPLICATE_BLS_KEY,
				}),
				[validatorAddress],
				true,
			);
			throw new Error(
				`The BLS key ${blsKey.toString('hex')} has already been registered in the chain.`,
			);
		}

		const validatorAccount = await validatorsSubStore.getWithSchema<ValidatorKeys>(
			validatorAddress,
			validatorAccountSchema,
		);
		if (!validatorAccount.blsKey.equals(INVALID_BLS_KEY)) {
			return false;
		}

		if (!bls.popVerify(blsKey, proofOfPossession)) {
			apiContext.eventQueue.add(
				this.moduleName,
				EVENT_NAME_BLS_KEY_REGISTRATION,
				codec.encode(blsKeyRegDataSchema, {
					blsKey,
					proofOfPossession,
					result: KEY_REG_RESULT_INVALID_POP,
				}),
				[validatorAddress],
				true,
			);

			throw new Error('Invalid proof of possession for the given BLS key.');
		}

		validatorAccount.blsKey = blsKey;

		await validatorsSubStore.setWithSchema(
			validatorAddress,
			validatorAccount,
			validatorAccountSchema,
		);
		await blsKeysSubStore.setWithSchema(
			blsKey,
			{ address: validatorAddress },
			validatorAddressSchema,
		);

		apiContext.eventQueue.add(
			this.moduleName,
			EVENT_NAME_BLS_KEY_REGISTRATION,
			codec.encode(blsKeyRegDataSchema, {
				blsKey,
				proofOfPossession,
				result: KEY_REG_RESULT_SUCCESS,
			}),
			[validatorAddress],
		);

		return true;
	}

	public async setValidatorGeneratorKey(
		apiContext: APIContext,
		validatorAddress: Buffer,
		generatorKey: Buffer,
	): Promise<boolean> {
		const validatorsSubStore = apiContext.getStore(this.moduleID, SUBSTORE_PREFIX_VALIDATORS_DATA);

		const addressExists = await validatorsSubStore.has(validatorAddress);
		if (!addressExists) {
			apiContext.eventQueue.add(
				this.moduleName,
				EVENT_NAME_GENERATOR_KEY_REGISTRATION,
				codec.encode(generatorKeyRegDataSchema, {
					generatorKey,
					result: KEY_REG_RESULT_NO_VALIDATOR,
				}),
				[validatorAddress],
				true,
			);
			throw new Error(
				'This address is not registered as validator. Only validators can register a generator key.',
			);
		}

		const validatorAccount = await validatorsSubStore.getWithSchema<ValidatorKeys>(
			validatorAddress,
			validatorAccountSchema,
		);
		validatorAccount.generatorKey = generatorKey;
		await validatorsSubStore.setWithSchema(
			validatorAddress,
			validatorAccount,
			validatorAccountSchema,
		);

		apiContext.eventQueue.add(
			this.moduleName,
			EVENT_NAME_GENERATOR_KEY_REGISTRATION,
			codec.encode(generatorKeyRegDataSchema, { generatorKey, result: KEY_REG_RESULT_SUCCESS }),
			[validatorAddress],
		);

		return true;
	}

	public async isKeyRegistered(apiContext: ImmutableAPIContext, blsKey: Buffer): Promise<boolean> {
		const blsKeysSubStore = apiContext.getStore(this.moduleID, SUBSTORE_PREFIX_BLS_KEYS);
		return blsKeysSubStore.has(blsKey);
	}

	public async getGeneratorsBetweenTimestamps(
		apiContext: ImmutableAPIContext,
		startTimestamp: number,
		endTimestamp: number,
		validators: { address: Buffer }[],
	): Promise<Record<string, number>> {
		if (endTimestamp < startTimestamp) {
			throw new Error('End timestamp must be greater than start timestamp.');
		}

		const result: Record<string, number> = {};
		const genesisData = await this.getGenesisData(apiContext);

		if (startTimestamp < genesisData.timestamp) {
			throw new Error('Input timestamp must be greater than genesis timestamp.');
		}

		const startSlotNumber =
			Math.floor((startTimestamp - genesisData.timestamp) / this._blockTime) + 1;
		const endSlotNumber = Math.floor((endTimestamp - genesisData.timestamp) / this._blockTime) - 1;

		if (startSlotNumber > endSlotNumber) {
			return {};
		}

		let totalSlots = endSlotNumber - startSlotNumber + 1;

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
}
