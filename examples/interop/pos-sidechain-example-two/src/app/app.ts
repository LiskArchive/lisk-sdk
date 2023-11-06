import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { registerModules } from './modules';
import { registerPlugins } from './plugins';
import { ReactModule } from './modules/react/module';

export const getApplication = (config: PartialApplicationConfig): Application => {
	const { app, method } = Application.defaultApplication(config);
	const reactModule = new ReactModule();
	app.registerModule(reactModule);
	app.registerInteroperableModule(reactModule);
	reactModule.addDependencies(method.interoperability);

	registerModules(app);
	registerPlugins(app);

	return app;
};
