import { App } from './application';

const app = new App();

const run = async () => {
	await app.init();
	await app.start();
};

run().catch(async error => {
	// tslint:disable-next-line
	console.error(error);
	await app.stop();
});
