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
import { MainchainInteroperabilityAPI } from './api';
import { MainchainCCAPI } from './cc_api';
import { MainchainInteroperabilityEndpoint } from './endpoint';
import {
	getChainAccountRequestSchema,
	getChannelRequestSchema,
	getTerminatedStateAccountRequestSchema,
	getTerminatedOutboxAccountRequestSchema,
} from '../schemas';
import { GenesisBlockExecuteContext } from '../../../state_machine';
import { initGenesisStateUtil } from '../utils';
import { chainAccountSchema } from '../stores/chain_account';
import { channelSchema } from '../stores/channel_data';
import { ownChainAccountSchema } from '../stores/own_chain_account';
import { terminatedStateSchema } from '../stores/terminated_state';
import { terminatedOutboxSchema } from '../stores/terminated_outbox';

export class MainchainInteroperabilityModule extends BaseInteroperabilityModule {
	public crossChainAPI = new MainchainCCAPI(this.stores, this.events);
	public api = new MainchainInteroperabilityAPI(this.stores, this.events, this.interoperableCCAPIs);
	public endpoint = new MainchainInteroperabilityEndpoint(
		this.stores,
		this.offchainStores,
		this.interoperableCCAPIs,
	);

	public metadata(): ModuleMetadata {
		return {
			endpoints: [
				{
					name: this.endpoint.getChainAccount.name,
					request: getChainAccountRequestSchema,
					response: chainAccountSchema,
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
		await initGenesisStateUtil(context, this.stores);
	}
}
