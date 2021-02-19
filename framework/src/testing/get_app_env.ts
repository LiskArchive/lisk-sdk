import { createIPCClient, APIClient } from '@liskhq/lisk-api-client';
import { getGenesisBlockJSON } from '@liskhq/lisk-genesis';
import { resolve as pathResolve } from 'path';
import { homedir } from 'os';
import { createGenesisBlock } from './create_genesis_block';
import { Application, PartialApplicationConfig } from '..';
import { ModuleClass, PluginClass, PartialAccount } from './types';
import { defaultConfig, defaultAccounts, getAccountSchemaFromModules } from './utils';

interface GetApplicationEnv {
	modules: ModuleClass[];
	plugins?: PluginClass[];
	config?: PartialApplicationConfig;
}

interface ApplicationEnv {
	apiClient: Promise<APIClient>;
	application: Application;
}

const createGenesisBlockJSON = (modules: ModuleClass[]): Record<string, unknown> => {
	const accounts = defaultAccounts.map(i => (({ address: i } as unknown) as PartialAccount));
	const genesisBlock = createGenesisBlock({ modules, accounts });
	const accountSchema = getAccountSchemaFromModules(modules);
	return getGenesisBlockJSON({
		genesisBlock,
		accountAssetSchemas: accountSchema,
	});
};

export const getApplicationEnv = async (params: GetApplicationEnv): Promise<ApplicationEnv> => {
	const { modules } = params;
	const genesisBlockJSON = createGenesisBlockJSON(modules);
	const config = params.config ?? (defaultConfig as PartialApplicationConfig);
	const { label } = params.config ?? defaultConfig;
	const application = Application.defaultApplication(genesisBlockJSON, config);
	params.modules.map(i => application.registerModule(i));
	params.plugins?.map(i => application.registerPlugin(i));
	await Promise.race([application.run(), new Promise(resolve => setTimeout(resolve, 3000))]);

	// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
	const dataPath = pathResolve(`${homedir()}/.lisk/${label}`);
	const apiClient = createIPCClient(dataPath);

	return {
		apiClient,
		application,
	};
};
