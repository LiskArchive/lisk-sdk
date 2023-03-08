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

import { GenesisBlockExecuteContext } from '../../state_machine';
import { BaseCCCommand } from './base_cc_command';
import { BaseCCMethod } from './base_cc_method';
import { BaseInteroperableModule } from './base_interoperable_module';
import { MODULE_NAME_INTEROPERABILITY } from './constants';
import { ChainAccountStore } from './stores/chain_account';
import { ChainValidatorsStore } from './stores/chain_validators';
import { ChannelDataStore } from './stores/channel_data';
import { OutboxRootStore } from './stores/outbox_root';
import { OwnChainAccountStore } from './stores/own_chain_account';
import { RegisteredNamesStore } from './stores/registered_names';
import { TerminatedOutboxStore } from './stores/terminated_outbox';
import { TerminatedStateStore } from './stores/terminated_state';

export abstract class BaseInteroperabilityModule extends BaseInteroperableModule {
	protected interoperableCCCommands = new Map<string, BaseCCCommand[]>();
	protected interoperableCCMethods = new Map<string, BaseCCMethod>();

	protected constructor() {
		super();
		this.stores.register(OutboxRootStore, new OutboxRootStore(this.name, 0));
		this.stores.register(ChainAccountStore, new ChainAccountStore(this.name, 1));
		this.stores.register(OwnChainAccountStore, new OwnChainAccountStore(this.name, 13));
		this.stores.register(ChannelDataStore, new ChannelDataStore(this.name, 5));
		this.stores.register(ChainValidatorsStore, new ChainValidatorsStore(this.name, 9));
		this.stores.register(TerminatedStateStore, new TerminatedStateStore(this.name, 3));
		this.stores.register(TerminatedOutboxStore, new TerminatedOutboxStore(this.name, 11));
		this.stores.register(RegisteredNamesStore, new RegisteredNamesStore(this.name, 7));
	}

	// Common name for mainchain/sidechain interoperability module
	public get name(): string {
		return MODULE_NAME_INTEROPERABILITY;
	}

	public registerInteroperableModule(module: BaseInteroperableModule): void {
		this.interoperableCCMethods.set(module.name, module.crossChainMethod);
		this.interoperableCCCommands.set(module.name, module.crossChainCommand);
	}

	// @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#mainchain
	// eslint-disable-next-line @typescript-eslint/require-await,@typescript-eslint/no-empty-function
	public async initGenesisState(_ctx: GenesisBlockExecuteContext): Promise<void> {}
}
