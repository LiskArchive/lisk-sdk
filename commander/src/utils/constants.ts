/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
export const COMMUNITY_IDENTIFIER = 'Lisk';

export enum NETWORK {
	MAINNET = 'mainnet',
	TESTNET = 'testnet',
	BETANET = 'betanet',
	ALPHANET = 'alphanet',
	DEVNET = 'devnet',
}

export const POSTGRES_PORT = 5432;

export const REDIS_PORT = 6380;

export const HTTP_PORTS = {
	mainnet: 8000,
	testnet: 7000,
	betanet: 6000,
	alphanet: 5000,
	devnet: 4000,
};

export const WS_PORTS = {
	mainnet: 8001,
	testnet: 7001,
	betanet: 6001,
	alphanet: 5001,
	devnet: 4001,
};

export enum OS {
	Darwin = 'MACOS',
	Linux = 'LINUX',
}

export const RELEASE_URL = 'https://downloads.lisk.io/lisk';
export const SNAPSHOT_URL = 'https://downloads.lisk.io/lisk/mainnet/blockchain.db.gz';
