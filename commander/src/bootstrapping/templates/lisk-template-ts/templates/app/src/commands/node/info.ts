/* eslint-disable class-methods-use-this */
import { NodeInfoCommand } from 'lisk-commander';
import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { getApplication } from '../../app/app';

export class InfoCommand extends NodeInfoCommand {
	static flags = {
		...NodeInfoCommand.flags,
	};

	static args = [...NodeInfoCommand.args];

	public getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application {
		const app = getApplication(genesisBlock, config);
		return app;
	}
}
