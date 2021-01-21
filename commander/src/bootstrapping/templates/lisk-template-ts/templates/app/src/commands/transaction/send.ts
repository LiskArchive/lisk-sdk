/* eslint-disable class-methods-use-this */
import { TransactionSendCommand } from 'lisk-commander';
import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { getApplication } from '../../app/app';

export class SendCommand extends TransactionSendCommand {
	static flags = {
		...TransactionSendCommand.flags,
	};

	static args = [...TransactionSendCommand.args];

	public getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application {
		const app = getApplication(genesisBlock, config);
		return app;
	}
}
