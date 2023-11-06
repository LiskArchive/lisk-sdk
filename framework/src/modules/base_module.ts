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

export interface ModuleInitArgs {
	genesisConfig: Omit<GenesisConfig, 'modules'>;
	moduleConfig: Record<string, unknown>;
}

export interface ModuleMetadata {
	endpoints: {
		name: string;
		request?: Schema;
		response?: Schema;
	}[];
	events: {
		name: string;
		data: Schema;
	}[];
	commands: {
		name: string;
		params: Schema;
	}[];
	assets: {
		version: number;
		data: Schema;
	}[];
	stores: {
		key: string;
		data?: Schema;
	}[];
}

export type ModuleMetadataJSON = ModuleMetadata & { name: string };

export abstract class BaseModule {
	public commands: BaseCommand[] = [];
	public events: NamedRegistry = new NamedRegistry();
	public stores: NamedRegistry = new NamedRegistry();
	public offchainStores: NamedRegistry = new NamedRegistry();

	public get name(): string {
		const name = this.constructor.name.replace('Module', '');
		return name.charAt(0).toLowerCase() + name.substr(1);
	}

	public abstract endpoint: BaseEndpoint;
	public abstract method: BaseMethod;

	public async init?(args: ModuleInitArgs): Promise<void>;
	public async insertAssets?(context: InsertAssetContext): Promise<void>;
	public async verifyAssets?(context: BlockVerifyContext): Promise<void>;
	public async verifyTransaction?(context: TransactionVerifyContext): Promise<VerificationResult>;
	public async beforeCommandExecute?(context: TransactionExecuteContext): Promise<void>;
	public async afterCommandExecute?(context: TransactionExecuteContext): Promise<void>;
	public async initGenesisState?(context: GenesisBlockExecuteContext): Promise<void>;
	public async finalizeGenesisState?(context: GenesisBlockExecuteContext): Promise<void>;
	public async beforeTransactionsExecute?(context: BlockExecuteContext): Promise<void>;
	public async afterTransactionsExecute?(context: BlockAfterExecuteContext): Promise<void>;

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
