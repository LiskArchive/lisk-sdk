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
import { BaseModule, ModuleMetadata } from '../base_module';
import { PoAMethod } from './method';
import { PoAEndpoint } from './endpoint';
import { AuthorityUpdateEvent } from './events/authority_update';
import {
	ChainPropertiesStore,
	ValidatorStore,
	NameStore,
	SnapshotStore,
	Validator,
} from './stores';
import { BlockAfterExecuteContext } from '../../state_machine';
import { EMPTY_BYTES } from './constants';
import { FeeMethod, RandomMethod, ValidatorsMethod } from './types';

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
		console.log(this._validatorsMethod, this._feeMethod);
	}

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [],
			assets: [],
		};
	}

	public async afterTransactionsExecute(context: BlockAfterExecuteContext): Promise<void> {
		const chainPropertiesStore = this.stores.get(ChainPropertiesStore);
		const chainProperties = await chainPropertiesStore.get(context, EMPTY_BYTES);
		if (context.header.height === chainProperties.roundEndHeight) {
			const snapshotStore = this.stores.get(SnapshotStore);
			const firstSnapshot = await snapshotStore.get(context, utils.intToBuffer(0, 4));
			const previousLengthValidators = firstSnapshot.validators.length;

			// Update the chain information for the next round
			await snapshotStore.set(context, utils.intToBuffer(0, 4), firstSnapshot);
			const secondSnapshot = await snapshotStore.get(context, utils.intToBuffer(0, 4));
			await snapshotStore.set(context, utils.intToBuffer(1, 4), secondSnapshot);
			// const thirdSnapshot = await snapshotStore.get(context, utils.intToBuffer(0, 4));

			// Reshuffle the list of validators and pass it to the Validators module
			const roundStartHeight = chainProperties.roundEndHeight - previousLengthValidators + 1;
			const randomSeed = await this._randomMethod.getRandomBytes(
				context,
				roundStartHeight,
				previousLengthValidators,
			);

			const validators = [];
			for (const validator of firstSnapshot.validators) {
				validators.push(validator);
			}
			const nextValidators = this._shuffleValidatorsList(validators, randomSeed);

			await this._validatorsMethod.setValidatorsParams(
				context,
				context,
				firstSnapshot.threshold,
				firstSnapshot.threshold,
				nextValidators.map(v => ({
					address: v.address,
					bftWeight: v.weight,
				})),
			);
		}
	}

	private _shuffleValidatorsList(validators: Validator[], randomSeed: Buffer) {
		const roundHash: Record<string, Buffer> = {};

		for (const { address } of validators) {
			roundHash[address.toString('hex')] = utils.hash(Buffer.concat([randomSeed, address]));
		}

		validators.sort((a, b) => {
			if (
				roundHash[a.address.toString('hex')].compare(roundHash[b.address.toString('hex')]) === 1 ||
				(roundHash[a.address.toString('hex')].compare(roundHash[b.address.toString('hex')]) === 0 &&
					a.address.compare(b.address) === 1)
			) {
				return 1;
			}
			return -1;
		});

		return validators;
	}
}
