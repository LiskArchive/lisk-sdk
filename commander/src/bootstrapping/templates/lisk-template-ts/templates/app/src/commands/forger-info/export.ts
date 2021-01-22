/* eslint-disable class-methods-use-this */
import { ForgerInfoExportCommand } from 'lisk-commander';
import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { getApplication } from '../../app/app';

export class ExportCommand extends ForgerInfoExportCommand {
	static flags = {
		...ForgerInfoExportCommand.flags,
	};

	public getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application {
		const app = getApplication(genesisBlock, config);
		return app;
	}
}
