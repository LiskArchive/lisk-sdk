/*
 * Copyright © 2021 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */

import { APIClient, createIPCClient } from '@liskhq/lisk-api-client';
import { codec } from '@liskhq/lisk-codec';
import { homedir } from 'os';
import { resolve as pathResolve } from 'path';
import { Application, DPoSModule, PartialApplicationConfig } from '..';
import { ModuleClass, PluginClass } from './types';
import { defaultConfig } from './utils';
import { createGenesisBlockWithAccounts } from './fixtures/genesis_block';

interface GetApplicationEnv {
	modules: ModuleClass[];
	plugins?: PluginClass[];
	config?: PartialApplicationConfig;
}

interface ApplicationEnv {
	apiClient: Promise<APIClient>;
	application: Application;
}

export const getApplicationEnv = async (params: GetApplicationEnv): Promise<ApplicationEnv> => {
	// As we can call this function with different configuration
	// so we need to make sure existing schemas are already clear
	codec.clearCache();

	// TODO: Remove this dependency in future
	if (!params.modules.includes(DPoSModule)) {
		params.modules.push(DPoSModule);
	}
	const { genesisBlockJSON } = createGenesisBlockWithAccounts(params.modules);
	const config = params.config ?? (defaultConfig as PartialApplicationConfig);
	const { label } = params.config ?? defaultConfig;

	const application = new Application(genesisBlockJSON, config);
	params.modules.map(module => application.registerModule(module));
	params.plugins?.map(plugin => application.registerPlugin(plugin));
	await Promise.race([application.run(), new Promise(resolve => setTimeout(resolve, 3000))]);

	// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
	const dataPath = pathResolve(`${homedir()}/.lisk/${label}`);
	const apiClient = createIPCClient(dataPath);

	return {
		apiClient,
		application,
	};
};

/* eslint-disable @typescript-eslint/prefer-ts-expect-error */
/* eslint-disable @typescript-eslint/ban-ts-comment */

export const clearApplicationEnv = async (appEnv: ApplicationEnv): Promise<void> => {
	// @ts-ignore
	await appEnv.application._forgerDB.clear();
	// @ts-ignore
	await appEnv.application._blockchainDB.clear();
	// @ts-ignore
	await appEnv.application._nodeDB.clear();
	await appEnv.application.shutdown();
};
