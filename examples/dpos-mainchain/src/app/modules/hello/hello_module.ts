/* eslint-disable class-methods-use-this */

import {
	BaseModule,
	ModuleInitArgs,
	BlockGenerateContext,
	BlockVerifyContext,
	TransactionVerifyContext,
	VerificationResult,
	TransactionExecuteContext,
	GenesisBlockExecuteContext,
	BlockExecuteContext,
	BlockAfterExecuteContext,
} from 'lisk-sdk';
import { HelloModuleEndpoint } from './endpoint';
import { HelloModuleAPI } from './api';

export class HelloModule extends BaseModule {
	public endpoint = new HelloModuleEndpoint();
	public api = new HelloModuleAPI();
	public name = 'hello';
	public transactionAssets = [];
	public events = [
		// Example below
		// 'hello:newBlock',
	];
	public id = 1000;

	// Lifecycle hooks
	public async init(_args: ModuleInitArgs): Promise<void> {
		// initialize this module when starting a node
	}

	public async initBlock(_context: BlockGenerateContext): Promise<void> {
		// initialize block generation, add asset
	}

	public async verifyAssets(_context: BlockVerifyContext): Promise<void> {
		// verify block
	}

	// Lifecycle hooks
	public async verifyTransaction(_context: TransactionVerifyContext): Promise<VerificationResult> {
		// verify transaction will be called multiple times in the transaction pool
	}

	public async beforeCommandExecute(_context: TransactionExecuteContext): Promise<void> {}

	public async afterCommandExecute(_context: TransactionExecuteContext): Promise<void> {}
	public async initGenesisState(_context: GenesisBlockExecuteContext): Promise<void> {}

	public async finalizeGenesisState(_context: GenesisBlockExecuteContext): Promise<void> {}

	public async beforeTransactionsExecute(_context: BlockExecuteContext): Promise<void> {}

	public async afterTransactionsExecute(_context: BlockAfterExecuteContext): Promise<void> {}
}
