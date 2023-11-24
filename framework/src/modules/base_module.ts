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
/* eslint-disable class-methods-use-this */

import { Schema } from '@liskhq/lisk-codec';
import { GenesisConfig } from '../types';
import {
	BlockAfterExecuteContext,
	BlockExecuteContext,
	GenesisBlockExecuteContext,
	TransactionExecuteContext,
	TransactionVerifyContext,
	BlockVerifyContext,
	VerificationResult,
} from '../state_machine';
import { BaseCommand } from './base_command';
import { BaseEndpoint } from './base_endpoint';
import { BaseMethod } from './base_method';
import { InsertAssetContext } from '../state_machine/types';
import { NamedRegistry } from './named_registry';

/**
 * Arguments used during module initialization.
 */
export interface ModuleInitArgs {
	/** Genesis config options */
	genesisConfig: Omit<GenesisConfig, 'modules'>;
	/** Module-specific config options */
	moduleConfig: Record<string, unknown>;
}

export interface ModuleMetadata {
	/** A list of Endpoints of the respective module. */
	endpoints: {
		// The name of the endpoint.
		name: string;
		// Required parameters for the endpoint.
		request?: Schema;
		// A schema of the expected response to a request to the endpoint.
		response?: Schema;
	}[];
	/** A list of Blockchain Events that are emitted by the module. */
	events: {
		// The event name.
		name: string;
		// The event data.
		data: Schema;
	}[];
	/** The list of Commands belonging to the module. */
	commands: {
		// The command name.
		name: string;
		// The parameters of the command.
		params: Schema;
	}[];
	/** The schemas to decode block assets that are relevant to the module. */
	assets: {
		// The block version.
		version: number;
		// The asset schema.
		data: Schema;
	}[];
	/** The data stores of the module. */
	stores: {
		// The store key.
		key: string;
		// The store schema.
		data?: Schema;
	}[];
}

export type ModuleMetadataJSON = ModuleMetadata & { name: string };

/**
 * The `BaseModule` represents Lisk modules by providing a generic interface, from which each module extends from.
 */
export abstract class BaseModule {
	/**
	 * A command is a group of state-transition logic triggered by a transaction and is identified by the module and command name of the transaction.
	 */
	public commands: BaseCommand[] = [];
	/**
	 * Blockchain events, or module events, are logs of events that occur in the blockchain network during block execution.
	 * Events occur per block, and are stored in the respective block header, from where they can be queried.
	 */
	public events: NamedRegistry = new NamedRegistry();
	/**
	 * A module can define one or multiple on-chain stores, to store data in the blockchain, i.e. to include it in the blockchain state.
	 *
	 * For example, data such as account balances, validator’s names, and multisignature keys are values that are stored in the on-chain module store.
	 */
	public stores: NamedRegistry = new NamedRegistry();
	/**
	 * In a module, the off-chain store is available in: insertAssets & Endpoints.
	 *
	 * It complements the on-chain module store, by allowing to store various additional data in the blockchain client, that does not need to be included in the on-chain store.
	 *
	 * The data stored in the off-chain store is not part of the blockchain protocol, and it may differ from machine to machine.
	 */
	public offchainStores: NamedRegistry = new NamedRegistry();

	/**
	 * The module name is the unique identifier for the module.
	 *
	 * The module name is automatically calculated from the class name of the module:
	 * The `Module` suffix of the class name is removed, and the first character is converted to lowercase.
	 */
	public get name(): string {
		const name = this.constructor.name.replace('Module', '');
		return name.charAt(0).toLowerCase() + name.substr(1);
	}

	/**
	 * An endpoint is an interface between a module and an external system. Lisk endpoints support RPC communication.
	 * The module-specific RPC endpoints can be invoked by external services, like UIs, to get relevant data from the application.
	 *
	 * Endpoints allow us to conveniently get data from the blockchain.
	 * It is never possible to set data / mutate the state via module endpoints.
	 */
	public abstract endpoint: BaseEndpoint;

	/**
	 * A method is an interface for module-to-module communication, and can perform state mutations on the blockchain.
	 *
	 * To get or set module-specific data in the blockchain, methods are either called by other modules or by the module itself.
	 * For example, the `transfer()` method from the Token module is called by a module, if it needs to transfer tokens from one account to the other.
	 */
	public abstract method: BaseMethod;

	/**
	 * If a module needs to access certain configuration options, it is required to validate and cache the respective configurations in the `init()` method of a module.
	 *
	 * The init() function is called for every registered module once, when the client is started.
	 *
	 * @param args
	 */
	public async init?(args: ModuleInitArgs): Promise<void>;
	public async insertAssets?(context: InsertAssetContext): Promise<void>;
	public async verifyAssets?(context: BlockVerifyContext): Promise<void>;
	public async verifyTransaction?(context: TransactionVerifyContext): Promise<VerificationResult>;
	public async beforeCommandExecute?(context: TransactionExecuteContext): Promise<void>;
	public async afterCommandExecute?(context: TransactionExecuteContext): Promise<void>;

	/**
	 * The hook `initGenesisState()` is called at the beginning of the genesis block execution.
	 * Each module must initialize its state using an associated block asset.
	 *
	 * @param context
	 */
	public async initGenesisState?(context: GenesisBlockExecuteContext): Promise<void>;
	public async finalizeGenesisState?(context: GenesisBlockExecuteContext): Promise<void>;
	public async beforeTransactionsExecute?(context: BlockExecuteContext): Promise<void>;
	public async afterTransactionsExecute?(context: BlockAfterExecuteContext): Promise<void>;

	/**
	 * The metadata of a module provides information about the module to external services like UIs.
	 */
	public abstract metadata(): ModuleMetadata;

	protected baseMetadata() {
		return {
			commands: this.commands.map(command => ({
				name: command.name,
				params: command.schema,
			})),
			events: this.events.values().map(v => ({
				name: v.name,
				data: v.schema,
			})),
			stores: this.stores.values().map(v => ({
				key: v.key.toString('hex'),
				data: v.schema,
			})),
			endpoints: [],
			assets: [],
		};
	}
}
