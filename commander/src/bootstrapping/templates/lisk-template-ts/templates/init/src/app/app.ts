import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { registerModules } from './modules';
import { registerPlugins } from './plugins';

export const getApplication = (
	genesisBlock: Record<string, unknown>,
	config: PartialApplicationConfig,
): Application => {
	const app = Application.defaultApplication(genesisBlock, config);

	registerModules(app);
	registerPlugins(app);

	return app;
};
