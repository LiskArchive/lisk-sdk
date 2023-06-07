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

import { BaseModule, ModuleMetadata } from '../base_module';
import { PoAMethod } from './method';
import { PoAEndpoint } from './endpoint';
import { AuthorityUpdateEvent } from './events/authority_update';
import { ChainPropertiesStore, ValidatorStore, NameStore, SnapshotStore } from './stores';
import { BlockAfterExecuteContext } from '../../state_machine';
import { EMPTY_BYTES, KEY_SNAPSHOT_0, KEY_SNAPSHOT_1, KEY_SNAPSHOT_2 } from './constants';
import { FeeMethod, RandomMethod, ValidatorsMethod } from './types';
import { shuffleValidatorList } from './utils';
import { NextValidatorsSetter, MethodContext } from '../../state_machine/types';

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
		console.log(!this._validatorsMethod, !this._feeMethod);
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
}
