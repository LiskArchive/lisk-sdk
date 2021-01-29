import { Application, PartialApplicationConfig, utils } from 'lisk-sdk';
import { registerModules } from './modules';
import { registerPlugins } from './plugins';

export const getApplication = (
	genesisBlock: Record<string, unknown>,
	config: PartialApplicationConfig,
): Application => {
	const app = Application.defaultApplication(
		genesisBlock,
		utils.objects.mergeDeep(config, { label: '<%= appName %>' }),
	);

	registerModules(app);
	registerPlugins(app);

	return app;
};
