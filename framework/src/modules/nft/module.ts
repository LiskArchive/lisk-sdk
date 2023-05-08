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

import { GenesisBlockExecuteContext } from '../../state_machine';
import { ModuleInitArgs, ModuleMetadata } from '../base_module';
import { BaseInteroperableModule } from '../interoperability';
import { InteroperabilityMethod } from '../token/types';
import { NFTInteroperableMethod } from './cc_method';
import { NFTEndpoint } from './endpoint';
import { InternalMethod } from './internal_method';
import { NFTMethod } from './method';
import { FeeMethod } from './types';

export class NFTModule extends BaseInteroperableModule {
	public method = new NFTMethod(this.stores, this.events);
	public endpoint = new NFTEndpoint(this.stores, this.offchainStores);
	public crossChainMethod = new NFTInteroperableMethod(this.stores, this.events);

	private readonly _internalMethod = new InternalMethod(this.stores, this.events);
	// @ts-expect-error TODO: unused error. Remove when implementing.
	private _interoperabilityMethod!: InteroperabilityMethod;

	public commands = [];

	// eslint-disable-next-line no-useless-constructor
	public constructor() {
		super();
	}

	public addDependencies(interoperabilityMethod: InteroperabilityMethod, _feeMethod: FeeMethod) {
		this._interoperabilityMethod = interoperabilityMethod;
		this.method.addDependencies(interoperabilityMethod, this._internalMethod);
		this.crossChainMethod.addDependencies(interoperabilityMethod);
	}

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [],
			assets: [],
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async init(_args: ModuleInitArgs) {}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async initGenesisState(_context: GenesisBlockExecuteContext): Promise<void> {}
}
