const app = require('./app');

app
	.run()
	.then(() => app.logger.log('App started...'))
	.catch(error => {
		if (error instanceof Error) {
			app.logger.error('App stopped with error', error.message);
			app.logger.debug(error.stack);
		} else {
			app.logger.error('App stopped with error', error);
		}
		process.exit();
	});
