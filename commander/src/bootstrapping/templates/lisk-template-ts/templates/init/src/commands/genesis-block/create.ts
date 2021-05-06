import { BaseGenesisBlockCommand } from 'lisk-commander';
import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { getApplication } from '../../app/app';
import { registerModules } from '../../app/modules';

export class GenesisBlockCommand extends BaseGenesisBlockCommand {
	public getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application {
		const app = getApplication(genesisBlock, config);
		registerModules(app);
		return app;
	}
}
