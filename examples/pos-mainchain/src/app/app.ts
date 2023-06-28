import {
	Application,
	FeeModule,
	MainchainInteroperabilityModule,
	PartialApplicationConfig,
	TokenModule,
	NFTModule,
} from 'lisk-sdk';
import { registerModules } from './modules';
import { registerPlugins } from './plugins';

export const getApplication = (config: PartialApplicationConfig): Application => {
	const { app } = Application.defaultApplication(config, true);
	const tokenModule = new TokenModule();
	const nftModule = new NFTModule();
	const feeModule = new FeeModule();
	const interoperabilityModule = new MainchainInteroperabilityModule();
	interoperabilityModule.registerInteroperableModule(nftModule);
	nftModule.addDependencies(interoperabilityModule.method, feeModule.method, tokenModule.method);
	registerModules(app);
	registerPlugins(app);

	return app;
};
