/* eslint-disable class-methods-use-this */
import { TransactionGetCommand } from 'lisk-commander';
import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { getApplication } from '../../app/app';

export class GetCommand extends TransactionGetCommand {
	static flags = {
		...TransactionGetCommand.flags,
	};

	static args = [...TransactionGetCommand.args];

	public getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application {
		const app = getApplication(genesisBlock, config);
		return app;
	}
}
