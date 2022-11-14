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

	public constructor() {
		super();
		this.stores.register(ChainAccountStore, new ChainAccountStore(this.name));
		this.stores.register(ChainValidatorsStore, new ChainValidatorsStore(this.name));
		this.stores.register(ChannelDataStore, new ChannelDataStore(this.name));
		this.stores.register(OutboxRootStore, new OutboxRootStore(this.name));
		this.stores.register(OwnChainAccountStore, new OwnChainAccountStore(this.name));
		this.stores.register(RegisteredNamesStore, new RegisteredNamesStore(this.name));
		this.stores.register(TerminatedOutboxStore, new TerminatedOutboxStore(this.name));
		this.stores.register(TerminatedStateStore, new TerminatedStateStore(this.name));
	}

	// Common name for mainchain/sidechain interoperability module
	public get name(): string {
		return MODULE_NAME_INTEROPERABILITY;
	}

	public registerInteroperableModule(module: BaseInteroperableModule): void {
		this.interoperableCCMethods.set(module.name, module.crossChainMethod);
		this.interoperableCCCommands.set(module.name, module.crossChainCommand);
	}
}
