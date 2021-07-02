const { Application, genesisBlockDevnet, configDevnet } = require('lisk-sdk');

const MyModule = require('./my_module');
const MyPlugin = require('./my_plugin');

const app = Application.defaultApplication(genesisBlockDevnet, configDevnet);

app.registerModule(MyModule); // register the custom module
app.registerPlugin(MyPlugin); // register the custom plugin

app
	.run()
	.then(() => app.logger.info('App started...'))
	.catch((error) => {
		console.error('Faced error in application', error);
		process.exit(1);
	});
