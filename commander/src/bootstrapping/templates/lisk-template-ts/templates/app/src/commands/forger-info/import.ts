/* eslint-disable class-methods-use-this */
import { ForgerInfoImportCommand } from 'lisk-commander';
import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { getApplication } from '../../app/app';

export class ImportCommand extends ForgerInfoImportCommand {
	static flags = {
		...ForgerInfoImportCommand.flags,
	};

	public getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application {
		const app = getApplication(genesisBlock, config);
		return app;
	}
}
