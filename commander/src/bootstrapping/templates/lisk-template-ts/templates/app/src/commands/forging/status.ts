/* eslint-disable class-methods-use-this */
import { ForgingStatusCommand } from 'lisk-commander';
import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { getApplication } from '../../app/app';

export class StatusCommand extends ForgingStatusCommand {
	static flags = {
		...ForgingStatusCommand.flags,
	};

	static args = [...ForgingStatusCommand.args];

	public getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application {
		const app = getApplication(genesisBlock, config);
		return app;
	}
}
