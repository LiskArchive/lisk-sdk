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
import {
	getChainAccountRequestSchema,
	getChannelRequestSchema,
	getTerminatedStateAccountRequestSchema,
	getTerminatedOutboxAccountRequestSchema,
	chainAccountSchema,
	channelSchema,
	ownChainAccountSchema,
	terminatedStateSchema,
	terminatedOutboxSchema,
	allChainAccountsSchema,
} from '../schemas';
import { GenesisBlockExecuteContext } from '../../../state_machine';
import { initGenesisStateUtil } from '../utils';

export class SidechainInteroperabilityModule extends BaseInteroperabilityModule {
	public crossChainAPI: BaseInteroperableAPI = new SidechainCCAPI(this.id);
	public api = new SidechainInteroperabilityAPI(this.id, this.interoperableCCAPIs);
	public endpoint = new SidechainInteroperabilityEndpoint(this.id, this.interoperableCCAPIs);
	// private readonly _mainchainRegistrationCommand = new MainchainRegistrationCommand(
	// 	this.id,
	// 	new Map(),
	// 	new Map(),
	// ); // To be updated with actual implementation

	public metadata(): ModuleMetadata {
		return {
			endpoints: [
				{
					name: this.endpoint.getChainAccount.name,
					request: getChainAccountRequestSchema,
					response: chainAccountSchema,
				},
				{
					name: this.endpoint.getAllChainAccounts.name,
					request: getChainAccountRequestSchema,
					response: allChainAccountsSchema,
				},
				{
					name: this.endpoint.getChannel.name,
					request: getChannelRequestSchema,
					response: channelSchema,
				},
				{
					name: this.endpoint.getOwnChainAccount.name,
					response: ownChainAccountSchema,
				},
				{
					name: this.endpoint.getTerminatedStateAccount.name,
					request: getTerminatedStateAccountRequestSchema,
					response: terminatedStateSchema,
				},
				{
					name: this.endpoint.getTerminatedOutboxAccount.name,
					request: getTerminatedOutboxAccountRequestSchema,
					response: terminatedOutboxSchema,
				},
			],
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

	public async initGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		await initGenesisStateUtil(this.id, context);
	}
}
