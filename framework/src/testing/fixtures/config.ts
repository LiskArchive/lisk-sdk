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
import { address as cryptoAddress } from '@liskhq/lisk-cryptography';
import { ApplicationConfig } from '../../types';
import * as accountFixture from './keys_fixture.json';

export const defaultConfig: ApplicationConfig = {
	system: {
		version: '0.1.0',
		logLevel: 'none',
		keepEventsForHeights: -1,
		dataPath: '~/.lisk/default',
		enableMetrics: false,
	},
	genesis: {
		block: {},
		bftBatchSize: 103,
		blockTime: 10,
		chainID: '10000000',
		maxTransactionsSize: 15 * 1024, // Kilo Bytes
	},
	network: {
		version: '1.0',
		seedPeers: [
			{
				ip: '127.0.0.1',
				port: 5000,
			},
		],
		port: 5000,
		maxInboundConnections: 0,
	},
	transactionPool: {
		maxTransactions: 4096,
		maxTransactionsPerAccount: 64,
		transactionExpiryTime: 3 * 60 * 60 * 1000,
		minEntranceFeePriority: '0',
		minReplacementFeeDifference: '10',
	},
	rpc: {
		modes: [],
		port: 8080,
		host: '127.0.0.1',
	},
	legacy: {
		sync: false,
		brackets: [],
	},
	generator: {
		keys: {},
	},
	modules: {},
	plugins: {},
};

export const getKeysFromDefaultConfig = (address: Buffer) => {
	const account = accountFixture.keys.find(key =>
		cryptoAddress.getAddressFromLisk32Address(key.address).equals(address),
	);
	if (!account) {
		throw new Error(
			`Validator with address: ${cryptoAddress.getLisk32AddressFromAddress(
				address,
			)} does not exists in default config`,
		);
	}
	return account;
};

export type Keys = ReturnType<typeof getKeysFromDefaultConfig>;

export const getGeneratorPrivateKeyFromDefaultConfig = (address: Buffer): Buffer => {
	const account = getKeysFromDefaultConfig(address);

	return Buffer.from(account.plain.generatorPrivateKey, 'hex');
};
