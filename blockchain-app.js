const { Application, genesisBlockDevnet, configDevnet } = require('lisk-sdk');

const app = Application.defaultApplication(genesisBlockDevnet, configDevnet);

app
	.run()
	.then(() => app.logger.info('App started...'))
	.catch((error) => {
		console.error('Faced error in application', error);
		process.exit(1);
	});
