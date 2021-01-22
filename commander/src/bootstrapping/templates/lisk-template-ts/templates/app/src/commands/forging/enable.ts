/* eslint-disable class-methods-use-this */
import { ForgingEnableCommand } from 'lisk-commander';
import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { getApplication } from '../../app/app';

export class EnableCommand extends ForgingEnableCommand {
	static flags = {
		...ForgingEnableCommand.flags,
	};

	static args = [...ForgingEnableCommand.args];

	public getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application {
		const app = getApplication(genesisBlock, config);
		return app;
	}
}
