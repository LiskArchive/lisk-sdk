import { Application } from 'lisk-framework';

export const getApplication = (): Application => {
	const app = Application.defaultApplication({}, {});
	return app;
};
