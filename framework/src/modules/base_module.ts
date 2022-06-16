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
import { BaseAPI } from './base_api';
import { InsertAssetContext } from '../state_machine/types';

export interface ModuleInitArgs {
	genesisConfig: Omit<GenesisConfig, 'modules'>;
	moduleConfig: Record<string, unknown>;
	generatorConfig: Record<string, unknown>;
}

export interface ModuleMetadata {
	endpoints: {
		name: string;
		request?: Schema;
		response: Schema;
	}[];
	events: {
		typeID: string;
		data: Schema;
	}[];
	commands: {
		id: number;
		name: string;
		params?: Schema;
	}[];
	assets: {
		version: number;
		data: Schema;
	}[];
}

export type RootModuleMetadata = ModuleMetadata & { id: number; name: string };

export abstract class BaseModule {
	public commands: BaseCommand[] = [];
	public events: string[] = [];
	public abstract name: string;
	public abstract id: number;
	public abstract endpoint: BaseEndpoint;
	public abstract api: BaseAPI;

	public async init?(args: ModuleInitArgs): Promise<void>;
	public async initBlock?(context: InsertAssetContext): Promise<void>;
	public async verifyAssets?(context: BlockVerifyContext): Promise<void>;
	public async verifyTransaction?(context: TransactionVerifyContext): Promise<VerificationResult>;
	public async beforeCommandExecute?(context: TransactionExecuteContext): Promise<void>;
	public async afterCommandExecute?(context: TransactionExecuteContext): Promise<void>;
	public async initGenesisState?(context: GenesisBlockExecuteContext): Promise<void>;
	public async finalizeGenesisState?(context: GenesisBlockExecuteContext): Promise<void>;
	public async beforeTransactionsExecute?(context: BlockExecuteContext): Promise<void>;
	public async afterTransactionsExecute?(context: BlockAfterExecuteContext): Promise<void>;

	public abstract metadata(): ModuleMetadata;
}
