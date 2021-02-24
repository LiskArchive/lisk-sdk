import { createIPCClient, APIClient } from '@liskhq/lisk-api-client';
import { getGenesisBlockJSON } from '@liskhq/lisk-genesis';
import { codec } from '@liskhq/lisk-codec';
import { resolve as pathResolve } from 'path';
import { homedir } from 'os';
import { createGenesisBlock } from './create_genesis_block';
import { Application, PartialApplicationConfig, DPoSModule } from '..';
import { ModuleClass, PluginClass, PartialAccount } from './types';
import {
	defaultConfig,
	defaultAccounts,
	defaultDelegates,
	getAccountSchemaFromModules,
} from './utils';

interface GetApplicationEnv {
	modules: ModuleClass[];
	plugins?: PluginClass[];
	config?: PartialApplicationConfig;
}

interface ApplicationEnv {
	apiClient: Promise<APIClient>;
	application: Application;
}

export const createGenesisBlockJSON = (modules: ModuleClass[]): Record<string, unknown> => {
	const accounts = defaultAccounts.map(i => ({ address: Buffer.from(i, 'hex') } as PartialAccount));
	const delegates = defaultDelegates.map(
		d => ({ ...d, address: Buffer.from(d.address, 'hex') } as PartialAccount),
	);
	const genesisBlock = createGenesisBlock({
		modules,
		accounts: [...accounts, ...delegates] as PartialAccount[],
		initDelegates: delegates.map(d => d.address),
	});

	return getGenesisBlockJSON({
		genesisBlock,
		accountAssetSchemas: getAccountSchemaFromModules(modules),
	});
};

export const getApplicationEnv = async (params: GetApplicationEnv): Promise<ApplicationEnv> => {
	// TODO: Due to compiled schema cache we need to clear readonly attribute forcefully
	// @ts-ignore
	codec._compileSchemas = {};

	// TODO: Remove this dependency in future
	if (!params.modules.includes(DPoSModule)) {
		params.modules.push(DPoSModule);
	}
	const genesisBlockJSON = createGenesisBlockJSON(params.modules);
	const config = params.config ?? (defaultConfig as PartialApplicationConfig);
	const { label } = params.config ?? defaultConfig;

	const application = new Application(genesisBlockJSON, config);
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

export const clearApplicationEnv = async (appEnv: ApplicationEnv): Promise<void> => {
	// @ts-ignore
	await appEnv.application._forgerDB.clear();
	// @ts-ignore
	await appEnv.application._blockchainDB.clear();
	// @ts-ignore
	await appEnv.application._nodeDB.clear();
	await appEnv.application.shutdown();
};
