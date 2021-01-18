import { Application, PartialApplicationConfig, utils } from 'lisk-sdk';

export const getApplication = (
	genesisBlock: Record<string, unknown>,
	config: PartialApplicationConfig,
): Application => {
	const app = Application.defaultApplication(
		genesisBlock,
		utils.objects.mergeDeep(config, { label: '<%= appName %>' }),
	);

	return app;
};
