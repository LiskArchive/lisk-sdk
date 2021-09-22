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

import { blsPopVerify } from '@liskhq/lisk-cryptography';
import { BaseAPI } from '../base_api';
import { APIContext, ImmutableAPIContext } from '../../node/state_machine';
import {
	INVALID_BLS_KEY,
	MODULE_ID_VALIDATORS,
	STORE_PREFIX_BLS_KEYS,
	STORE_PREFIX_GENERATOR_LIST,
	STORE_PREFIX_GENESIS_DATA,
	STORE_PREFIX_VALIDATORS_DATA,
} from './constants';
import { APIInitArgs, GeneratorList, GenesisData } from './types';
import {
	generatorListSchema,
	genesisDataSchema,
	validatorAccountSchema,
	validatorAddressSchema,
} from './schemas';

export class ValidatorsAPI extends BaseAPI {
	private _blockTime!: number;

	public init(args: APIInitArgs) {
		this._blockTime = args.config.blockTime;
	}

	public async getGeneratorAtTimestamp(
		apiContext: ImmutableAPIContext,
		timestamp: number,
	): Promise<Buffer> {
		const genesisDataSubStore = apiContext.getStore(
			MODULE_ID_VALIDATORS,
			STORE_PREFIX_GENESIS_DATA,
		);
		const emptyKey = Buffer.alloc(0);
		const genesisData = await genesisDataSubStore.getWithSchema<GenesisData>(
			emptyKey,
			genesisDataSchema,
		);

		if (timestamp < genesisData.timestamp) {
			throw new Error('Invalid timestamp');
		}

		const elapsedTime = timestamp - genesisData.timestamp;

		const generatorListSubStore = apiContext.getStore(
			MODULE_ID_VALIDATORS,
			STORE_PREFIX_GENERATOR_LIST,
		);
		const generatorList = await generatorListSubStore.getWithSchema<GeneratorList>(
			emptyKey,
			generatorListSchema,
		);
		const slotIndex = Math.floor(elapsedTime / this._blockTime) % generatorList.addresses.length;
		return generatorList.addresses[slotIndex];
	}

	public async getSlotNumber(apiContext: ImmutableAPIContext, timestamp: number): Promise<number> {
		const genesisDataSubStore = apiContext.getStore(
			MODULE_ID_VALIDATORS,
			STORE_PREFIX_GENESIS_DATA,
		);
		const emptyKey = Buffer.alloc(0);
		const genesisData = await genesisDataSubStore.getWithSchema<GenesisData>(
			emptyKey,
			genesisDataSchema,
		);

		if (timestamp < genesisData.timestamp) {
			throw new Error('Invalid timestamp');
		}

		const elapsedTime = timestamp - genesisData.timestamp;
		return Math.floor(elapsedTime / this._blockTime);
	}

	public async getSlotTime(apiContext: ImmutableAPIContext, slot: number): Promise<number> {
		const slotGenesisTimeOffset = slot * this._blockTime;
		const genesisDataSubStore = apiContext.getStore(
			MODULE_ID_VALIDATORS,
			STORE_PREFIX_GENESIS_DATA,
		);
		const emptyKey = Buffer.alloc(0);
		const genesisData = await genesisDataSubStore.getWithSchema<GenesisData>(
			emptyKey,
			genesisDataSchema,
		);
		return genesisData.timestamp + slotGenesisTimeOffset;
	}

	public async registerValidatorKeys(
		apiContext: APIContext,
		validatorAddress: Buffer,
		blsKey: Buffer,
		generatorKey: Buffer,
		proofOfPossession: Buffer,
	): Promise<boolean> {
		const validatorsSubStore = apiContext.getStore(
			MODULE_ID_VALIDATORS,
			STORE_PREFIX_VALIDATORS_DATA,
		);
		if (await validatorsSubStore.has(validatorAddress)) {
			return false;
		}

		const blsKeysSubStore = apiContext.getStore(MODULE_ID_VALIDATORS, STORE_PREFIX_BLS_KEYS);
		if (await blsKeysSubStore.has(blsKey)) {
			return false;
		}

		if (!blsPopVerify(blsKey, proofOfPossession)) {
			return false;
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

		return true;
	}

	public async getValidatorAccount(
		apiContext: ImmutableAPIContext,
		address: Buffer,
	): Promise<Record<string, unknown>> {
		const validatorsSubStore = apiContext.getStore(
			MODULE_ID_VALIDATORS,
			STORE_PREFIX_VALIDATORS_DATA,
		);
		return validatorsSubStore.getWithSchema(address, validatorAccountSchema);
	}

	public async getGenesisData(apiContext: ImmutableAPIContext): Promise<number> {
		const genesisDataSubStore = apiContext.getStore(
			MODULE_ID_VALIDATORS,
			STORE_PREFIX_GENESIS_DATA,
		);
		const emptyKey = Buffer.alloc(0);
		const value = await genesisDataSubStore.getWithSchema<GenesisData>(emptyKey, genesisDataSchema);
		return value.timestamp;
	}

	public async setValidatorBLSKey(
		apiContext: APIContext,
		validatorAddress: Buffer,
		blsKey: Buffer,
		proofOfPossession: Buffer,
	): Promise<boolean> {
		const validatorsSubStore = apiContext.getStore(
			MODULE_ID_VALIDATORS,
			STORE_PREFIX_VALIDATORS_DATA,
		);
		if (!(await validatorsSubStore.has(validatorAddress))) {
			return false;
		}

		const blsKeysSubStore = apiContext.getStore(MODULE_ID_VALIDATORS, STORE_PREFIX_BLS_KEYS);
		if (await blsKeysSubStore.has(blsKey)) {
			return false;
		}

		const validatorAccount = await validatorsSubStore.getWithSchema<Record<string, unknown>>(
			validatorAddress,
			validatorAccountSchema,
		);
		if (!(validatorAccount.blsKey as Buffer).equals(INVALID_BLS_KEY)) {
			return false;
		}

		if (!blsPopVerify(blsKey, proofOfPossession)) {
			return false;
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

		return true;
	}

	public async setValidatorGeneratorKey(
		apiContext: APIContext,
		validatorAddress: Buffer,
		generatorKey: Buffer,
	): Promise<boolean> {
		const validatorsSubStore = apiContext.getStore(
			MODULE_ID_VALIDATORS,
			STORE_PREFIX_VALIDATORS_DATA,
		);
		if (!(await validatorsSubStore.has(validatorAddress))) {
			return false;
		}

		const validatorAccount = await validatorsSubStore.getWithSchema<Record<string, unknown>>(
			validatorAddress,
			validatorAccountSchema,
		);
		validatorAccount.generatorKey = generatorKey;
		await validatorsSubStore.setWithSchema(
			validatorAddress,
			validatorAccount,
			validatorAccountSchema,
		);

		return true;
	}

	public async isKeyRegistered(apiContext: ImmutableAPIContext, blsKey: Buffer): Promise<boolean> {
		const blsKeysSubStore = apiContext.getStore(MODULE_ID_VALIDATORS, STORE_PREFIX_BLS_KEYS);
		if (await blsKeysSubStore.has(blsKey)) {
			return true;
		}
		return false;
	}

	public async getGeneratorList(apiContext: ImmutableAPIContext): Promise<{ list: Buffer[] }> {
		const generatorListSubStore = apiContext.getStore(
			MODULE_ID_VALIDATORS,
			STORE_PREFIX_GENERATOR_LIST,
		);
		const emptyKey = Buffer.alloc(0);
		const generatorList = await generatorListSubStore.getWithSchema<GeneratorList>(
			emptyKey,
			generatorListSchema,
		);

		return { list: generatorList.addresses };
	}

	public async setGeneratorList(
		apiContext: APIContext,
		generatorAddresses: Buffer[],
	): Promise<boolean> {
		const generatorListSubStore = apiContext.getStore(
			MODULE_ID_VALIDATORS,
			STORE_PREFIX_GENERATOR_LIST,
		);
		const validatorsSubStore = apiContext.getStore(
			MODULE_ID_VALIDATORS,
			STORE_PREFIX_VALIDATORS_DATA,
		);

		for (const addr of generatorAddresses) {
			if (!(await validatorsSubStore.has(addr))) {
				return false;
			}
		}

		const emptyKey = Buffer.alloc(0);
		await generatorListSubStore.setWithSchema(
			emptyKey,
			{ addresses: generatorAddresses },
			generatorListSchema,
		);
		return true;
	}

	public async getGeneratorsBetweenTimestamps(
		apiContext: ImmutableAPIContext,
		startTimestamp: number,
		endTimestamp: number,
	): Promise<Record<string, unknown>> {
		if (endTimestamp < startTimestamp) {
			throw new Error('Invalid timestamps');
		}

		const result: Record<string, unknown> = {};
		const genesisDataSubStore = apiContext.getStore(
			MODULE_ID_VALIDATORS,
			STORE_PREFIX_GENESIS_DATA,
		);
		const emptyKey = Buffer.alloc(0);
		const genesisData = await genesisDataSubStore.getWithSchema<GenesisData>(
			emptyKey,
			genesisDataSchema,
		);

		if (startTimestamp < genesisData.timestamp) {
			throw new Error('Invalid timestamp');
		}

		const startSlotNumber = Math.floor((startTimestamp - genesisData.timestamp) / this._blockTime);
		const endSlotNumber = Math.floor((endTimestamp - genesisData.timestamp) / this._blockTime);
		let totalSlots = endSlotNumber - startSlotNumber + 1;

		const generatorListSubStore = apiContext.getStore(
			MODULE_ID_VALIDATORS,
			STORE_PREFIX_GENERATOR_LIST,
		);
		const generatorList = await generatorListSubStore.getWithSchema<GeneratorList>(
			emptyKey,
			generatorListSchema,
		);
		const generatorAddresses = generatorList.addresses.map(buf => buf.toString());
		const baseSlots = Math.floor(totalSlots / generatorList.addresses.length);
		if (baseSlots > 0) {
			totalSlots -= baseSlots * generatorAddresses.length;
			for (const generatorAddress of generatorAddresses) {
				result[generatorAddress] = baseSlots;
			}
		}

		const range = (start: number, end: number) =>
			Array.from({ length: end - start }, (_v, k) => k + start);
		for (const slotNumber of range(startSlotNumber, startSlotNumber + totalSlots)) {
			const slotIndex = slotNumber % generatorAddresses.length;
			const generatorAddress = generatorAddresses[slotIndex];
			if (Object.prototype.hasOwnProperty.call(result, generatorAddress)) {
				(result[generatorAddress] as number) += 1;
			} else {
				result[generatorAddress] = 1;
			}
		}

		return result;
	}
}
