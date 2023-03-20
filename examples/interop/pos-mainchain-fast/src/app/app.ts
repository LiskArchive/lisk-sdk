import { ChainConnectorPlugin } from '@liskhq/lisk-framework-chain-connector-plugin';
import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { registerModules } from './modules';
import { registerPlugins } from './plugins';

export const getApplication = (config: PartialApplicationConfig): Application => {
	const { app } = Application.defaultApplication(config, true);

	registerModules(app);
	registerPlugins(app);
	app.registerPlugin(new ChainConnectorPlugin());

	return app;
};
