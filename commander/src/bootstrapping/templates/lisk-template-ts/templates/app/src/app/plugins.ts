import { HTTPAPIPlugin, ForgerPlugin, Application } from 'lisk-sdk';

export const registerPlugins = (app: Application) => {
	app.registerPlugin(HTTPAPIPlugin);
	app.registerPlugin(ForgerPlugin);
};
