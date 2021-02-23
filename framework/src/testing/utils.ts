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

import { AccountDefaultProps, AccountSchema, Block, BlockHeaderAsset } from '@liskhq/lisk-chain';
import { BaseModule, GenesisConfig } from '..';
import { Logger } from '../logger';
import { BaseModuleChannel } from '../modules';
import { BaseModuleDataAccess } from '../types';
import { moduleChannelMock } from './mocks/channel_mock';
import { DataAccessMock } from './mocks/data_access_mock';
import { loggerMock } from './mocks/logger_mock';
import { APP_EVENT_BLOCK_NEW } from '../constants';
import { Data, ModuleClass, WaitUntilBlockHeightOptions } from './types';

export const getAccountSchemaFromModules = (
	modules: ModuleClass[],
	genesisConfig?: GenesisConfig,
): { [key: string]: AccountSchema } => {
	const accountSchemas: { [key: string]: AccountSchema } = {};

	for (const Klass of modules) {
		const m = new Klass(genesisConfig ?? ({} as never));
		if (m.accountSchema) {
			accountSchemas[m.name] = { ...m.accountSchema, fieldNumber: m.id } as AccountSchema;
		}
	}

	return accountSchemas;
};

export const getModuleInstance = <T1 = AccountDefaultProps, T2 = BlockHeaderAsset>(
	Module: ModuleClass,
	opts?: {
		genesisConfig?: GenesisConfig;
		dataAccess?: BaseModuleDataAccess;
		channel?: BaseModuleChannel;
		logger?: Logger;
	},
): BaseModule => {
	const module = new Module(opts?.genesisConfig ?? ({} as never));

	module.init({
		channel: opts?.channel ?? moduleChannelMock,
		logger: opts?.logger ?? loggerMock,
		dataAccess: opts?.dataAccess ?? (new DataAccessMock<T1, T2>() as never),
	});

	return module;
};

export const waitUntilBlockHeight = async ({
	apiClient,
	height,
	timeout,
}: WaitUntilBlockHeightOptions): Promise<void> =>
	new Promise((resolve, reject) => {
		if (timeout) {
			setTimeout(() => {
				reject(new Error(`'waitUntilBlockHeight' timed out after ${timeout} ms`));
			}, timeout);
		}

		// eslint-disable-next-line @typescript-eslint/require-await
		apiClient.subscribe(APP_EVENT_BLOCK_NEW, async (data?: Data) => {
			const { block } = (data as unknown) as Data;
			const { header } = apiClient.block.decode<Block>(block);

			if (header.height >= height) {
				resolve();
			}
		});
	});
export const defaultConfig = {
	label: 'beta-sdk-app',
	version: '0.0.0',
	networkVersion: '1.0',
	rootPath: '~/.lisk',
	logger: {
		fileLogLevel: 'info',
		consoleLogLevel: 'info',
		logFileName: 'lisk.log',
	},
	rpc: {
		enable: false,
		mode: 'ipc',
		port: 8080,
	},
	genesisConfig: {
		blockTime: 10,
		communityIdentifier: 'sdk',
		// eslint-disable-next-line @typescript-eslint/no-magic-numbers
		maxPayloadLength: 15 * 1024, // Kilo Bytes
		bftThreshold: 68,
		minFeePerByte: 1000,
		baseFees: [
			{
				moduleID: 5,
				assetID: 0,
				baseFee: '1000000000',
			},
		],
		rewards: {
			milestones: [
				'500000000', // Initial Reward
				'400000000', // Milestone 1
				'300000000', // Milestone 2
				'200000000', // Milestone 3
				'100000000', // Milestone 4
			],
			offset: 2160, // Start rewards at 39th block of 22nd round
			distance: 3000000, // Distance between each milestone
		},
		minRemainingBalance: '5000000',
		activeDelegates: 101,
		standbyDelegates: 2,
		delegateListRoundOffset: 2,
	},
	forging: {
		force: false,
		waitThreshold: 2,
		delegates: [], // Copy the delegates info from genesis.json file
	},
	network: {
		seedPeers: [
			{
				ip: '127.0.0.1',
				port: 5000,
			},
		],
		port: 5000,
	},
	transactionPool: {
		maxTransactions: 4096,
		maxTransactionsPerAccount: 64,
		transactionExpiryTime: 3 * 60 * 60 * 1000,
		minEntranceFeePriority: '0',
		minReplacementFeeDifference: '10',
	},
	plugins: {},
};

export const defaultDelegates = [
	{
		address: '03f6d90b7dbd0497dc3a52d1c27e23bb8c75897f',
		dpos: {
			delegate: {
				username: 'delegate_1',
			},
		},
	},
];

export const defaultAccounts = [
	'0903f4c5cb599a7928aef27e314e98291d1e3888',
	'0ada6a2f6c8f891769366fc9aa6fd9f1facb36cf',
	'0bc3bec2fdb565996fd316e368e66e5d8e830808',
	'0d2c377e936b68c70066613b10c0fdad537f90da',
	'0f33a5033b750e6c4dca47e38ba020e912df143e',
	'1ac73bff74924ad9b74236c4962be27174ae87d0',
	'1c194c2be1cc53f663a93c64899cbaa34016f415',
	'2159f75e5440c36431aedbc7dc29a65a327778b8',
	'246fba5c519576d93c5fac899c44b29b72f526ae',
	'24c130eb6cc0d8f663a8f6d16ffc61f935a2e02e',
	'27843a60a1e044c1e6e3cf119fdf64eb2b3e0d94',
	'290abc4a2244bf0ecf5aa1ccee8ac8f60f8bce48',
	'2cf52c08cc76091d884e800c1c697b13f69907d4',
	'308a95d1d3f7bb556f48da4f4344566e59f6f1cb',
	'31204ad5b95dd922c2899aa5bf8e7ee5b7546af3',
	'31fe789b43277e35ab410f2afcfb574280af2dd8',
	'328d0f546695c5fa02105deb055cf2801d9b8ba1',
	'3b3e137b1bec6f20c9a8b2ad4f5784661fb0fa79',
	'3b96d8565569421f43684b2c4eaa0639cbb5e011',
	'3c80e7d9964a1c83a6dd5dc64e105e0e634bd58a',
	'3de95e18f18a54e2269bbf8f1a38ea70762c73fa',
	'3deeb0a7426a028b435b4ddd8d35ac85cf567237',
	'436b40f58c0c27ed133f6001a019ff25561efad4',
	'463e7e879b7bdc6a97ec02a2a603aa1a46a04c80',
	'4b6126597881cb6ba1a45c1f6286769e7a094fb4',
	'4e874bcfb6f5896fe9e5dab3b26f59b2e2a9c09b',
	'4f4422eb61c45edb4d76f10cd871c9f983f2ebaa',
	'4fd52f67f151fbbdda9dd92a714884a399830eca',
	'4fd8cc4e27a3489b57ed986efe3d327d3de40d92',
	'52f9cdcff0605241c78278690ae36eb0136a30ff',
	'5853a3f24990deecced49d6bc15990102ec0c33a',
	'58d907d26508603e838423daa2061c29c7a84950',
	'5ade564399e670bd1d429583059067f3a6ca2b7f',
	'5cd1d0ccf98f2bd5a4bfaa770d55f16498af0bcc',
	'5fbd442a4647b079cda1229ecf6d8f44f361c8ca',
	'6174515fa66c91bff1128913edd4e0f1de37cee0',
	'61f396d2a4a13ab7a39ba791fac4b921b54a208e',
	'6330fd8ae91df4a5d7fbc2390c182ec6676dc5a6',
	'657f610728eef97d55e50212871f0993bb7cc700',
	'65f927187bf96aac5d968fcc9351e5492b5f9356',
	'6b9895c31bcdb2d9c929b9da7e389ed91de672a0',
	'6e12e4498ae69fb07ff2d8aab036a911229d6c62',
	'6ffcd8ad547d8a549a31b25236e322c781a52d85',
	'70abf056bd92e8f77cfc551748fa54a4e3018d5f',
	'79f30c1cbc1b9c4949c8b85acc24a7578e01558b',
	'7d2c6781d873ed2ba7a87f46f735f5e15a41a6f1',
	'7d60db187337cbd881140d69d84c9246eda8382e',
	'8074f0d02f748fc55448a4bf200f1dade8517059',
	'82cbc7b39d35af358f9e2513af13b2f77b647a00',
	'8459b8870fcefff59f172d716b7bfe9fcc28d408',
	'8506f3c10f75044946f1a23a7caf578253649471',
	'8722453383f781d5427a4ee211020e49bf34a2b9',
	'89b144ecfdd5ea352083bf624d3cf842ec06a5e3',
	'8ac800124d5b16afd57b5cf7245edfcd5885ea3b',
	'8b1c221a030cf720736d9fb7d0499dd7276fc1b3',
	'8eceffd5a41e678b6467c9bc80ce35d2e8543d98',
	'9139c91f8a0aa1fb385770feaf299b99883aec2d',
	'936f3a0f4d776b6a7722ed126e8ff17b44d7e7b8',
	'94146c9889748c7b727eb3ac8c20e53c52effd32',
	'9b42e4264020f3c3dcaaed806578ccd469205060',
	'9cabee3d27426676b852ce6b804cb2fdff7cd0b5',
	'9d0149b0962d44bfc08a9f64d5afceb6281d7fb5',
	'a0620472cde03e77caece701ab7bc5928a5d367c',
	'a0bc50b27e7ac39060ed015a55f2f4508c84f0c2',
	'a28d5e34007fd8fe6d7903044eb23a60fdad3c00',
	'a6f6a0543ae470c6b056021cb2ac153368eafeec',
	'a9c66694dd65b2fdf40cdf45a0c308cbd38004fc',
	'ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815',
	'abd2ed5ad35b3a0870aadae6dceacc988ba63895',
	'acfbdbaeb93d587170c7cd9c0b5ffdeb7ff9daec',
	'ad42f8e867d618171bf4982e64269442148f6e11',
	'aebd99f07218109162a905d0e0c91e58bedc83c5',
	'b11c5811ea074a30142d824b6e8cfd3df14b2688',
	'b485becd88db1ab3d556d405204451ba00adaa7d',
	'b543e2e592200beb38235f6e48f8abe1d87ad872',
	'b56c55b9a70c8e2f07979b862374aed0e92a6dda',
	'b7580969dd56151f608931f126f793bbf45d8fa0',
	'b76a0f1819c4be0a1482567ca9b9fbed3eda444c',
	'bd175729d4177259c71cf13fd4ecfb5d01542706',
	'be89f4e983dfb04e2b58a12eb9ed18149e108b07',
	'c3ab2ac23512d9bf62b02775e22cf80df814eb1b',
	'c697b620c7c4015e32dd7bdd7d0430b33404e107',
	'c98554123062ac5795a3ee905b081e863db5a818',
	'ca309a5f4bbf11ca86592febb6d2ccc78309f69e',
	'ca5f6d76eab6e4f5aacee2864c79034d7111b986',
	'cb579ee537b34926d47129a0b54c0e6d00ef3004',
	'd06fe6d3e5f7facb5855eca839422fe3824a5d6e',
	'd0a0e45b950e3871d8783b973409042b4ab382d4',
	'd2c9a93755aed20c4d8f55c1e92b812d2c7d49d2',
	'd3c8064d011ef853e3be506b95a045f41f78e72a',
	'd5bd2050b74b309d54819ca17add173c6fca1e16',
	'd5c4e380b1ec2f7f2068cfba9a90cb3ae7816110',
	'd5e1f52cbe4a11a3730b98f52109b57602a9c4a1',
	'd8e611bafd70a549f035cf61ab0d6ed9e7f25c4e',
	'dcb5bf35b6d521195e613c42483f520139e2331d',
	'df0e187bb3895806261c87cf66e1772566ee8e58',
	'e2950a9f07b44e724df2129360cc140293c08308',
	'e39316cc020089ea7a5614bcf69a8931c10630a7',
	'e9355152c117c9e1fad8be86e9abea961cef4a36',
	'f730cb929a1c45032387c345e10d2427bea55a5e',
	'fa526a1611ccc66dec815cb963174118074b736e',
	'ffce8ce225c5d80098f50e877125b655aef6d101',
];

export const defaultAccountSchema = {
	token: {
		type: 'object',
		fieldNumber: 2,
		properties: {
			balance: {
				fieldNumber: 1,
				dataType: 'uint64',
			},
		},
		default: {
			balance: BigInt(0),
		},
	},
	sequence: {
		type: 'object',
		fieldNumber: 3,
		properties: {
			nonce: {
				fieldNumber: 1,
				dataType: 'uint64',
			},
		},
		default: {
			nonce: BigInt(0),
		},
	},
	keys: {
		type: 'object',
		fieldNumber: 4,
		properties: {
			numberOfSignatures: { dataType: 'uint32', fieldNumber: 1 },
			mandatoryKeys: {
				type: 'array',
				items: { dataType: 'bytes' },
				fieldNumber: 2,
			},
			optionalKeys: {
				type: 'array',
				items: { dataType: 'bytes' },
				fieldNumber: 3,
			},
		},
		default: {
			numberOfSignatures: 0,
			mandatoryKeys: [],
			optionalKeys: [],
		},
	},
	dpos: {
		type: 'object',
		fieldNumber: 5,
		properties: {
			delegate: {
				type: 'object',
				fieldNumber: 1,
				properties: {
					username: { dataType: 'string', fieldNumber: 1 },
					pomHeights: {
						type: 'array',
						items: { dataType: 'uint32' },
						fieldNumber: 2,
					},
					consecutiveMissedBlocks: { dataType: 'uint32', fieldNumber: 3 },
					lastForgedHeight: { dataType: 'uint32', fieldNumber: 4 },
					isBanned: { dataType: 'boolean', fieldNumber: 5 },
					totalVotesReceived: { dataType: 'uint64', fieldNumber: 6 },
				},
				required: [
					'username',
					'pomHeights',
					'consecutiveMissedBlocks',
					'lastForgedHeight',
					'isBanned',
					'totalVotesReceived',
				],
			},
			sentVotes: {
				type: 'array',
				fieldNumber: 2,
				items: {
					type: 'object',
					properties: {
						delegateAddress: {
							dataType: 'bytes',
							fieldNumber: 1,
						},
						amount: {
							dataType: 'uint64',
							fieldNumber: 2,
						},
					},
					required: ['delegateAddress', 'amount'],
				},
			},
			unlocking: {
				type: 'array',
				fieldNumber: 3,
				items: {
					type: 'object',
					properties: {
						delegateAddress: {
							dataType: 'bytes',
							fieldNumber: 1,
						},
						amount: {
							dataType: 'uint64',
							fieldNumber: 2,
						},
						unvoteHeight: {
							dataType: 'uint32',
							fieldNumber: 3,
						},
					},
					required: ['delegateAddress', 'amount', 'unvoteHeight'],
				},
			},
		},
		default: {
			delegate: {
				username: '',
				pomHeights: [],
				consecutiveMissedBlocks: 0,
				lastForgedHeight: 0,
				isBanned: false,
				totalVotesReceived: BigInt(0),
			},
			sentVotes: [],
			unlocking: [],
		},
	},
};
