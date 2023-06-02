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

import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { objects } from '@liskhq/lisk-utils';
import { validator } from '@liskhq/lisk-validator';
import { BaseModule, ModuleMetadata } from '../base_module';
import { PoAMethod } from './method';
import { PoAEndpoint } from './endpoint';
import { AuthorityUpdateEvent } from './events/authority_update';
import { ChainPropertiesStore, ValidatorStore, NameStore, SnapshotStore } from './stores';
import { BlockAfterExecuteContext, GenesisBlockExecuteContext } from '../../state_machine';
import { MODULE_NAME_POA, EMPTY_BYTES, KEY_SNAPSHOT_0, KEY_SNAPSHOT_1, KEY_SNAPSHOT_2 } from './constants';
import { shuffleValidatorList } from './utils';
import { NextValidatorsSetter, MethodContext } from '../../state_machine/types';
import { FeeMethod, GenesisPoAStore, ValidatorsMethod, RandomMethod } from './types';
import { genesisPoAStoreSchema } from './schemas';

export class PoAModule extends BaseModule {
	public method = new PoAMethod(this.stores, this.events);
	public endpoint = new PoAEndpoint(this.stores, this.offchainStores);
	private _randomMethod!: RandomMethod;
	private _validatorsMethod!: ValidatorsMethod;
	private _feeMethod!: FeeMethod;

	public constructor() {
		super();
		this.events.register(AuthorityUpdateEvent, new AuthorityUpdateEvent(this.name));
		this.stores.register(ValidatorStore, new ValidatorStore(this.name, 0));
		this.stores.register(ChainPropertiesStore, new ChainPropertiesStore(this.name, 1));
		this.stores.register(NameStore, new NameStore(this.name, 2));
		this.stores.register(SnapshotStore, new SnapshotStore(this.name, 3));
	}

	public get name() {
		return 'poa';
	}

	public addDependencies(
		validatorsMethod: ValidatorsMethod,
		feeMethod: FeeMethod,
		randomMethod: RandomMethod,
	) {
		this._validatorsMethod = validatorsMethod;
		this._feeMethod = feeMethod;
		this._randomMethod = randomMethod;

		// TODO: Remove it after the usage of these methods is implemented
		// eslint-disable-next-line no-console
		console.log(this._validatorsMethod, this._feeMethod, this._randomMethod);
	}

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [],
			assets: [],
		};
	}

	// LIP: https://github.com/LiskHQ/lips/blob/main/proposals/lip-0047.md#after-transactions-execution
	public async afterTransactionsExecute(context: BlockAfterExecuteContext): Promise<void> {
		const chainPropertiesStore = this.stores.get(ChainPropertiesStore);
		const chainProperties = await chainPropertiesStore.get(context, EMPTY_BYTES);

		if (context.header.height === chainProperties.roundEndHeight) {
			const snapshotStore = this.stores.get(SnapshotStore);
			const snapshot0 = await snapshotStore.get(context, KEY_SNAPSHOT_0);
			const previousLengthValidators = snapshot0.validators.length;

			const snapshot1 = await snapshotStore.get(context, KEY_SNAPSHOT_1);
			// Update the chain information for the next round

			// snapshot0 = snapshot1
			await snapshotStore.set(context, KEY_SNAPSHOT_0, snapshot1);
			const snapshot2 = await snapshotStore.get(context, KEY_SNAPSHOT_2);
			// snapshot1 = snapshot2
			await snapshotStore.set(context, KEY_SNAPSHOT_1, snapshot2);

			// Reshuffle the list of validators and pass it to the Validators module
			const roundStartHeight = chainProperties.roundEndHeight - previousLengthValidators + 1;
			const randomSeed = await this._randomMethod.getRandomBytes(
				context,
				roundStartHeight,
				previousLengthValidators,
			);

			const nextValidators = shuffleValidatorList(randomSeed, snapshot1.validators);

			await this._validatorsMethod.setValidatorsParams(
				context as MethodContext,
				context as NextValidatorsSetter,
				snapshot1.threshold,
				snapshot1.threshold,
				nextValidators.map(v => ({
					address: v.address,
					bftWeight: v.weight,
				})),
			);

			chainProperties.roundEndHeight += snapshot1.validators.length;

			await chainPropertiesStore.set(context, EMPTY_BYTES, chainProperties);
		}
	}

	public async initGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		const genesisBlockAssetBytes = context.assets.getAsset(MODULE_NAME_POA);
		if (!genesisBlockAssetBytes) {
			return;
		}
		const asset = codec.decode<GenesisPoAStore>(genesisPoAStoreSchema, genesisBlockAssetBytes);
		validator.validate<GenesisPoAStore>(genesisPoAStoreSchema, asset);

		const { validators, snapshotSubstore } = asset;

		// Check that the name property of all entries in the validators array are pairwise distinct.
		const validatorNames = validators.map(v => v.name);
		if (validatorNames.length !== new Set(validatorNames).size) {
			throw new Error('`name` property of all entries in the validators must be distinct.');
		}

		// Check that the address properties of all entries in the validators array are pairwise distinct.
		const validatorAddresses = validators.map(v => v.address);
		if (!objects.bufferArrayUniqueItems(validatorAddresses)) {
			throw new Error('`address` property of all entries in validators must be distinct.');
		}

		const sortedValidatorsByAddress = [...validatorAddresses].sort((a, b) => a.compare(b));
		for (let i = 0; i < validators.length; i += 1) {
			// Check that entries in the validators array are ordered lexicographically according to address.
			if (!validatorAddresses[i].equals(sortedValidatorsByAddress[i])) {
				throw new Error('`validators` must be ordered lexicographically by address.');
			}

			if (!/^[a-z0-9!@$&_.]+$/g.test(validators[i].name)) {
				throw new Error('`name` property is invalid. Must contain only characters a-z0-9!@$&_.');
			}
		}

		const { activeValidators, threshold } = snapshotSubstore;
		const activeValidatorAddresses = activeValidators.map(v => v.address);
		const sortedActiveValidatorsByAddress = [...activeValidatorAddresses].sort((a, b) =>
			a.compare(b),
		);
		const validatorAddressesString = validatorAddresses.map(a => a.toString('hex'));
		let totalWeight = BigInt(0);

		// Check that the address properties of entries in the snapshotSubstore.activeValidators are pairwise distinct.
		if (!objects.bufferArrayUniqueItems(activeValidatorAddresses)) {
			throw new Error('`address` properties in `activeValidators` must be distinct.');
		}

		for (let i = 0; i < activeValidators.length; i += 1) {
			// Check that entries in the snapshotSubstore.activeValidators array are ordered lexicographically according to address.
			if (!activeValidators[i].address.equals(sortedActiveValidatorsByAddress[i])) {
				throw new Error(
					'`activeValidators` must be ordered lexicographically by address property.',
				);
			}

			// Check that for every element activeValidator in the snapshotSubstore.activeValidators array, there is an entry validator in the validators array with validator.address == activeValidator.address.
			if (!validatorAddressesString.includes(activeValidators[i].address.toString('hex'))) {
				throw new Error('`activeValidator` address is missing from validators array.');
			}

			// Check that the weight property of every entry in the snapshotSubstore.activeValidators array is a positive integer.
			if (activeValidators[i].weight <= BigInt(0)) {
				throw new Error('`activeValidators` weight must be positive integer.');
			}

			totalWeight += activeValidators[i].weight;

			if (totalWeight > MAX_UINT64) {
				throw new Error('Total weight `activeValidators` exceeds maximum value.');
			}
		}

		// Check that the value of snapshotSubstore.threshold is within range
		if (threshold < totalWeight / BigInt(3) + BigInt(1) || threshold > totalWeight) {
			throw new Error('`threshold` in snapshot substore is not within range.');
		}

		// Create an entry in the validator substore for each entry validator in the validators
		// Create an entry in the name substore for each entry validator in the validators
		const validatorStore = this.stores.get(ValidatorStore);
		const nameStore = this.stores.get(NameStore);

		for (const currentValidator of validators) {
			await validatorStore.set(context, currentValidator.address, { name: currentValidator.name });
			await nameStore.set(context, Buffer.from(currentValidator.name, 'utf-8'), {
				address: currentValidator.address,
			});
		}

		// Create three entries in the snapshot substore indicating a snapshot of the next rounds of validators
		const snapshotStore = this.stores.get(SnapshotStore);
		await snapshotStore.set(context, utils.intToBuffer(0, 4), snapshotSubstore);
		await snapshotStore.set(context, utils.intToBuffer(1, 4), snapshotSubstore);
		await snapshotStore.set(context, utils.intToBuffer(2, 4), snapshotSubstore);

		// Create an entry in the chain properties substore
		const { header } = context;
		const chainPropertiesStore = this.stores.get(ChainPropertiesStore);
		await chainPropertiesStore.set(context, EMPTY_BYTES, {
			roundEndHeight: header.height,
			validatorsUpdateNonce: 0,
		});
	}
}
