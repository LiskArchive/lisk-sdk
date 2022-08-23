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
import { BaseAPI } from '../base_api';
import { APIContext, ImmutableAPIContext } from '../../state_machine';
import { EMPTY_KEY, INVALID_BLS_KEY, KeyRegResult } from './constants';
import { APIInitArgs, ValidatorAddress } from './types';
import { GeneratorKeyRegistrationEvent } from './events/generator_key_registration';
import { ValidatorKeys, ValidatorKeysStore } from './stores/validator_keys';
import { BLSKeyStore } from './stores/bls_keys';
import { BLSKeyRegistrationEvent } from './events/bls_key_registration';
import { GenesisData, GenesisStore } from './stores/genesis';

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
		const validatorsSubStore = this.stores.get(ValidatorKeysStore);
		const addressExists = await validatorsSubStore.has(apiContext, validatorAddress);
		if (addressExists) {
			this.events.get(GeneratorKeyRegistrationEvent).log(apiContext, validatorAddress, {
				generatorKey,
				result: KeyRegResult.ALREADY_VALIDATOR,
			});
			throw new Error('This address is already registered as validator.');
		}

		const blsKeysSubStore = this.stores.get(BLSKeyStore);
		const blsKeyExists = await blsKeysSubStore.has(apiContext, blsKey);
		if (blsKeyExists) {
			this.events.get(BLSKeyRegistrationEvent).log(apiContext, validatorAddress, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.DUPLICATE_BLS_KEY,
			});
			throw new Error(
				`The BLS key ${blsKey.toString('hex')} has already been registered in the chain.`,
			);
		}

		if (!bls.popVerify(blsKey, proofOfPossession)) {
			this.events.get(BLSKeyRegistrationEvent).log(apiContext, validatorAddress, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.INVALID_POP,
			});
			throw new Error('Invalid proof of possession for the given BLS key.');
		}

		const validatorAccount = {
			generatorKey,
			blsKey,
		};

		await validatorsSubStore.set(apiContext, validatorAddress, validatorAccount);
		await blsKeysSubStore.set(apiContext, blsKey, { address: validatorAddress });
		this.events
			.get(GeneratorKeyRegistrationEvent)
			.log(apiContext, validatorAddress, { generatorKey, result: KeyRegResult.SUCCESS });
		this.events.get(BLSKeyRegistrationEvent).log(apiContext, validatorAddress, {
			blsKey,
			proofOfPossession,
			result: KeyRegResult.SUCCESS,
		});

		return true;
	}

	public async registerValidatorWithoutBLSKey(
		apiContext: APIContext,
		validatorAddress: Buffer,
		generatorKey: Buffer,
	): Promise<boolean> {
		const validatorsSubStore = this.stores.get(ValidatorKeysStore);

		const addressExists = await validatorsSubStore.has(apiContext, validatorAddress);
		if (addressExists) {
			this.events.get(GeneratorKeyRegistrationEvent).log(apiContext, validatorAddress, {
				generatorKey,
				result: KeyRegResult.ALREADY_VALIDATOR,
			});

			throw new Error('This address is already registered as validator.');
		}

		const validatorAccount = {
			generatorKey,
			blsKey: INVALID_BLS_KEY,
		};

		await validatorsSubStore.set(apiContext, validatorAddress, validatorAccount);

		this.events
			.get(GeneratorKeyRegistrationEvent)
			.log(apiContext, validatorAddress, { generatorKey, result: KeyRegResult.SUCCESS });

		return true;
	}

	public async getAddressFromBLSKey(
		apiContext: APIContext,
		blsKey: Buffer,
	): Promise<ValidatorAddress> {
		const blsKeysSubStore = this.stores.get(BLSKeyStore);
		const blsKeyExists = await blsKeysSubStore.has(apiContext, blsKey);

		if (!blsKeyExists) {
			throw new Error(
				`The BLS key ${blsKey.toString('hex')} has not been registered in the chain.`,
			);
		}

		return blsKeysSubStore.get(apiContext, blsKey);
	}

	public async getValidatorAccount(
		apiContext: ImmutableAPIContext,
		address: Buffer,
	): Promise<ValidatorKeys> {
		if (address.length !== 20) {
			throw new Error('Address is not valid.');
		}

		const validatorsSubStore = this.stores.get(ValidatorKeysStore);
		const addressExists = await validatorsSubStore.has(apiContext, address);
		if (!addressExists) {
			throw new Error('No validator account found for the input address.');
		}

		return validatorsSubStore.get(apiContext, address);
	}

	public async getGenesisData(apiContext: ImmutableAPIContext): Promise<GenesisData> {
		const genesisDataSubStore = this.stores.get(GenesisStore);
		return genesisDataSubStore.get(apiContext, EMPTY_KEY);
	}

	public async setValidatorBLSKey(
		apiContext: APIContext,
		validatorAddress: Buffer,
		blsKey: Buffer,
		proofOfPossession: Buffer,
	): Promise<boolean> {
		const validatorsSubStore = this.stores.get(ValidatorKeysStore);
		const addressExists = await validatorsSubStore.has(apiContext, validatorAddress);

		if (!addressExists) {
			this.events.get(BLSKeyRegistrationEvent).log(apiContext, validatorAddress, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.NO_VALIDATOR,
			});
			throw new Error(
				'This address is not registered as validator. Only validators can register a BLS key.',
			);
		}

		const blsKeysSubStore = this.stores.get(BLSKeyStore);
		const blsKeyExists = await blsKeysSubStore.has(apiContext, blsKey);
		if (blsKeyExists) {
			this.events.get(BLSKeyRegistrationEvent).log(apiContext, validatorAddress, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.DUPLICATE_BLS_KEY,
			});
			throw new Error(
				`The BLS key ${blsKey.toString('hex')} has already been registered in the chain.`,
			);
		}

		const validatorAccount = await validatorsSubStore.get(apiContext, validatorAddress);
		if (!validatorAccount.blsKey.equals(INVALID_BLS_KEY)) {
			return false;
		}

		if (!bls.popVerify(blsKey, proofOfPossession)) {
			this.events.get(BLSKeyRegistrationEvent).log(apiContext, validatorAddress, {
				blsKey,
				proofOfPossession,
				result: KeyRegResult.INVALID_POP,
			});

			throw new Error('Invalid proof of possession for the given BLS key.');
		}

		validatorAccount.blsKey = blsKey;

		await validatorsSubStore.set(apiContext, validatorAddress, validatorAccount);
		await blsKeysSubStore.set(apiContext, blsKey, { address: validatorAddress });

		this.events.get(BLSKeyRegistrationEvent).log(apiContext, validatorAddress, {
			blsKey,
			proofOfPossession,
			result: KeyRegResult.SUCCESS,
		});

		return true;
	}

	public async setValidatorGeneratorKey(
		apiContext: APIContext,
		validatorAddress: Buffer,
		generatorKey: Buffer,
	): Promise<boolean> {
		const validatorsSubStore = this.stores.get(ValidatorKeysStore);

		const addressExists = await validatorsSubStore.has(apiContext, validatorAddress);
		if (!addressExists) {
			this.events
				.get(GeneratorKeyRegistrationEvent)
				.log(apiContext, validatorAddress, { generatorKey, result: KeyRegResult.NO_VALIDATOR });
			throw new Error(
				'This address is not registered as validator. Only validators can register a generator key.',
			);
		}

		const validatorAccount = await validatorsSubStore.get(apiContext, validatorAddress);
		validatorAccount.generatorKey = generatorKey;
		await validatorsSubStore.set(apiContext, validatorAddress, validatorAccount);

		this.events
			.get(GeneratorKeyRegistrationEvent)
			.log(apiContext, validatorAddress, { generatorKey, result: KeyRegResult.SUCCESS });

		return true;
	}

	public async isKeyRegistered(apiContext: ImmutableAPIContext, blsKey: Buffer): Promise<boolean> {
		const blsKeysSubStore = this.stores.get(BLSKeyStore);
		return blsKeysSubStore.has(apiContext, blsKey);
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
