import { genesisBlockDevnet, configDevnet } from 'lisk-sdk';
import { getApplication } from './app';
import { registerPlugins } from './plugins';
import { registerModules } from './modules';

// TODO: This needed to be removed when start command is implemented
const app = getApplication(genesisBlockDevnet, configDevnet as any);

// Register all modules
registerModules(app);

// Register all plugins
registerPlugins(app);

app.run().catch(error => {
	console.error('Application cause error: ', error);
});
