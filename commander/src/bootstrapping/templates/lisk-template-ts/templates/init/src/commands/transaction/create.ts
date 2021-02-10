/* eslint-disable class-methods-use-this */
import { TransactionCreateCommand } from 'lisk-commander';
import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { getApplication } from '../../app/app';

export class CreateCommand extends TransactionCreateCommand {
	static flags: any = {
		...TransactionCreateCommand.flags,
	};

	static args = [...TransactionCreateCommand.args];

	public getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application {
		const app = getApplication(genesisBlock, config);
		return app;
	}
}
