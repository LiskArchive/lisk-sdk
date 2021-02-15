import { HTTPAPIPlugin, ForgerPlugin, Application } from 'lisk-sdk';

export const registerPlugins = (app: Application): void => {
	app.registerPlugin(HTTPAPIPlugin);
	app.registerPlugin(ForgerPlugin);
};
