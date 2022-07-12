/*
 * Copyright © 2022 Lisk Foundation
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

import { genesisAuthStoreSchema } from '../../auth/schemas';
import { ModuleMetadata } from '../../base_module';
import { BaseInteroperabilityModule } from '../base_interoperability_module';
import { BaseInteroperableAPI } from '../base_interoperable_api';
import { SidechainInteroperabilityAPI } from './api';
import { SidechainCCAPI } from './cc_api';
// import { MainchainRegistrationCommand } from './commands/mainchain_registration';
import { SidechainInteroperabilityEndpoint } from './endpoint';

export class SidechainInteroperabilityModule extends BaseInteroperabilityModule {
	public crossChainAPI: BaseInteroperableAPI = new SidechainCCAPI(this.id);
	public api = new SidechainInteroperabilityAPI(this.id, this.interoperableCCAPIs);
	public endpoint = new SidechainInteroperabilityEndpoint(this.id);
	// private readonly _mainchainRegistrationCommand = new MainchainRegistrationCommand(
	// 	this.id,
	// 	new Map(),
	// 	new Map(),
	// ); // To be updated with actual implementation

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public registerInteroperableModule(): void {
		// TODO
	}

	public metadata(): ModuleMetadata {
		return {
			endpoints: [],
			commands: this.commands.map(command => ({
				id: command.id,
				name: command.name,
				params: command.schema,
			})),
			events: [],
			assets: [
				{
					version: 0,
					data: genesisAuthStoreSchema,
				},
			],
		};
	}
}
