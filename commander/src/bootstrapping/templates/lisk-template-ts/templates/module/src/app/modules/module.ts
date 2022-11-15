/* eslint-disable class-methods-use-this */

import {
    BaseModule,
    ModuleInitArgs,
    InsertAssetContext,
	BlockVerifyContext,
	TransactionVerifyContext,
	VerificationResult,
	TransactionExecuteContext,
	GenesisBlockExecuteContext,
	ModuleMetadata,
	BlockExecuteContext,
	BlockAfterExecuteContext,
} from 'lisk-sdk';
import { <%= moduleClass %>Endpoint } from './endpoint';
import { <%= moduleClass %>Method } from './method';

export class <%= moduleClass %>Module extends BaseModule {
    public endpoint = new <%= moduleClass %>Endpoint(this.stores, this.offchainStores);
    public method = new <%= moduleClass %>Method(this.stores, this.events);
    public commands = [];

	public constructor() {
		super();
		// registeration of stores and events
	}

	public metadata(): ModuleMetadata {
		return {
			name: '',
			endpoints: [],
			commands: this.commands.map(command => ({
				name: command.name,
				params: command.schema,
			})),
			events: this.events.values().map(v => ({
				name: v.name,
				data: v.schema,
			})),
			assets: [],
		};
	}

    // Lifecycle hooks
    public async init(_args: ModuleInitArgs): Promise<void> {
		// initialize this module when starting a node
	}

	public async insertAssets(_context: InsertAssetContext) {
		// initialize block generation, add asset
	}

	public async verifyAssets(_context: BlockVerifyContext): Promise<void> {
		// verify block
	}

    // Lifecycle hooks
	public async verifyTransaction(_context: TransactionVerifyContext): Promise<VerificationResult> {
		// verify transaction will be called multiple times in the transaction pool
	}

	public async beforeCommandExecute(_context: TransactionExecuteContext): Promise<void> {
	}

	public async afterCommandExecute(_context: TransactionExecuteContext): Promise<void> {

	}
	public async initGenesisState(_context: GenesisBlockExecuteContext): Promise<void> {

	}

	public async finalizeGenesisState(_context: GenesisBlockExecuteContext): Promise<void> {

	}

	public async beforeTransactionsExecute(_context: BlockExecuteContext): Promise<void> {

	}

	public async afterTransactionsExecute(_context: BlockAfterExecuteContext): Promise<void> {

	}
}
