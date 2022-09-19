/*
 * Copyright © 2020 Lisk Foundation
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
 */
// TODO: Fix the test when functional test is fixed https://github.com/LiskHQ/lisk-sdk/issues/7209

// import * as os from 'os';
// import * as fs from 'fs-extra';
// import * as path from 'path';
// import { codec } from '@liskhq/lisk-codec';
// import { Transaction } from '@liskhq/lisk-chain';
// import { P2P } from '@liskhq/lisk-p2p';

// import { APP_EVENT_BLOCK_NEW } from '../../../src/constants';
// import * as genesisBlockJSON from '../../fixtures/config/devnet/genesis_block.json';
// import * as configJSON from '../../fixtures/config/devnet/config.json';
// import { Application, PartialApplicationConfig, RPCConfig } from '../../../src';
// import { genesis } from '../../fixtures';
// import { nodeUtils } from '../../utils';
// import { createTransferTransaction } from '../../utils/mocks/transaction';
// import { HelloPlugin } from './hello_plugin';
// import { transactionIdsSchema, transactionsSchema } from '../../../src/node/transport/schemas';

// export const createApplication = async (
// 	label: string,
// 	consoleLogLevel?: string,
// ): Promise<Application> => {
// 	const rootPath = '~/.lisk/functional';
// 	const config = {
// 		...configJSON,
// 		rootPath,
// 		label,
// 		logger: {
// 			consoleLogLevel: consoleLogLevel ?? 'fatal',
// 			fileLogLevel: 'fatal',
// 			logFileName: 'functional-test.log',
// 		},
// 		rpc: {
// 			modes: ['ipc', 'ws', 'http'],
// 			ws: {
// 				port: 8080,
// 			},
// 			http: {
// 				port: 8000,
// 			},
// 		},
// 	} as PartialApplicationConfig;

// 	const { app } = Application.defaultApplication(genesisBlockJSON, config);

// 	// Remove pre-existing data
// 	fs.removeSync(path.join(rootPath, label).replace('~', os.homedir()));

// 	// eslint-disable-next-line @typescript-eslint/no-floating-promises
// 	await Promise.race([app.run(), new Promise(resolve => setTimeout(resolve, 3000))]);
// 	await new Promise<void>(resolve => {
// 		app.channel.subscribe(APP_EVENT_BLOCK_NEW, () => {
// 			if (app['_node']['_chain'].lastBlock.header.height === 2) {
// 				resolve();
// 			}
// 		});
// 	});
// 	return app;
// };

// export const createApplicationWithHelloPlugin = async ({
// 	label,
// 	pluginChildProcess = false,
// 	rpcConfig = { modes: ['ws'] },
// 	consoleLogLevel,
// }: {
// 	label: string;
// 	pluginChildProcess?: boolean;
// 	rpcConfig?: Partial<RPCConfig>;
// 	consoleLogLevel?: string;
// }): Promise<Application> => {
// 	const rootPath = path.join(os.homedir(), '.lisk/functional-with-plugin');
// 	const config = {
// 		...configJSON,
// 		rootPath,
// 		label,
// 		logger: {
// 			consoleLogLevel: consoleLogLevel ?? 'fatal',
// 			fileLogLevel: 'fatal',
// 			logFileName: 'lisk.log',
// 		},
// 		network: {
// 			...configJSON.network,
// 			maxInboundConnections: 0,
// 		},
// 		rpc: rpcConfig,
// 	} as PartialApplicationConfig;

// 	const { app } = Application.defaultApplication(genesisBlockJSON, config);
// 	app.registerPlugin(new HelloPlugin(), { loadAsChildProcess: pluginChildProcess });

// 	// Remove pre-existing data
// 	fs.removeSync(path.join(rootPath, label).replace('~', os.homedir()));

// 	await Promise.race([
// 		app.run(),
// 		new Promise((_resolve, reject) => {
// 			const id = setTimeout(() => {
// 				clearTimeout(id);
// 				reject(new Error('App can not started in time.'));
// 			}, 10000);
// 		}),
// 	]);
// 	return app;
// };

// export const closeApplication = async (app: Application): Promise<void> => {
// 	// eslint-disable-next-line @typescript-eslint/no-empty-function
// 	jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
// 	await app['_forgerDB'].clear();
// 	await app['_blockchainDB'].clear();
// 	await app.shutdown();
// };

// export const getPeerID = (app: Application): string => `127.0.0.1:${app.config.network.port}`;

// export const waitNBlocks = async (app: Application, n = 1): Promise<void> => {
// 	const height = app['_node']['_chain'].lastBlock.header.height + n;
// 	return new Promise(resolve => {
// 		app['_channel'].subscribe(APP_EVENT_BLOCK_NEW, () => {
// 			if (app['_node']['_chain'].lastBlock.header.height >= height) {
// 				resolve();
// 			}
// 		});
// 	});
// };

// export const sendTransaction = async (app: Application): Promise<Transaction> => {
// 	const genesisAccount = await app['_node']['_chain'].dataAccess.getAccountByAddress<{
// 		sequence: { nonce: bigint };
// 	}>(genesis.address);
// 	const accountWithoutBalance = nodeUtils.createAccount();

// 	const fundingTx = createTransferTransaction({
// 		recipientAddress: accountWithoutBalance.address,
// 		amount: BigInt('10000000000'),
// 		chainID: app['_node']['_chainID'],
// 		nonce: genesisAccount.sequence.nonce,
// 		privateKey: Buffer.from(genesis.privateKey, 'hex'),
// 	});

// 	await app['_channel'].invoke('txpool_postTransaction', {
// 		transaction: fundingTx.getBytes().toString('hex'),
// 	});
// 	return fundingTx;
// };

// export const getTransactionsFromNetwork = async (
// 	app: Application,
// 	p2p: P2P,
// 	transactionIds: Buffer[],
// ): Promise<{ transactions: Buffer[] }> => {
// 	const transactionIdsBuffer = codec.encode(transactionIdsSchema, {
// 		transactionIds,
// 	});
// 	const { data } = (await p2p.requestFromPeer(
// 		{
// 			procedure: 'getTransactions',
// 			data: transactionIdsBuffer,
// 		},
// 		getPeerID(app),
// 	)) as { data: Buffer };

// 	return codec.decode(transactionsSchema, data);
// };
