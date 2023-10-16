import { Application, PartialApplicationConfig } from 'lisk-sdk';
import { registerModules } from './modules';
import { registerPlugins } from './plugins';
import { HelloModule } from './modules/hello/module';

export const getApplication = (config: PartialApplicationConfig): Application => {
	const { app } = Application.defaultApplication(config);

	const helloModule = new HelloModule();
	app.registerModule(helloModule);

	app.registerInteroperableModule(helloModule);

	registerModules(app);
	registerPlugins(app);

	return app;
};
