import { Application, PartialApplicationConfig, NFTModule } from 'lisk-sdk';
import { TestNftModule } from './modules/testNft/module';
import { registerModules } from './modules';
import { registerPlugins } from './plugins';
import { HelloModule } from './modules/hello/module';

export const getApplication = (config: PartialApplicationConfig): Application => {
	const { app, method } = Application.defaultApplication(config, false);

	const nftModule = new NFTModule();
	const testNftModule = new TestNftModule();
	const interoperabilityModule = app['_registeredModules'].find(
		mod => mod.name === 'interoperability',
	);
	interoperabilityModule.registerInteroperableModule(nftModule);
	nftModule.addDependencies(method.interoperability, method.fee, method.token);
	testNftModule.addDependencies(nftModule.method);

	app.registerModule(nftModule);
	app.registerModule(testNftModule);

	const helloModule = new HelloModule();
	app.registerModule(helloModule);

	app.registerInteroperableModule(helloModule);

	registerModules(app);
	registerPlugins(app);

	return app;
};
