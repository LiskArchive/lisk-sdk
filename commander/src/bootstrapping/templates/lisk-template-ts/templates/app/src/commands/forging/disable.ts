/* eslint-disable class-methods-use-this */
import { ForgingDisableCommand } from 'lisk-commander';
import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { getApplication } from '../../app/app';

export class DisableCommand extends ForgingDisableCommand {
	static flags = {
		...ForgingDisableCommand.flags,
	};

	static args = [...ForgingDisableCommand.args];

	public getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application {
		const app = getApplication(genesisBlock, config);
		return app;
	}
}
