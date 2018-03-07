/*
 * LiskHQ/lisk-commander
 * Copyright © 2017 Lisk Foundation
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
import elements from 'lisk-elements';

const { constants } = elements;

export const COMMAND_TYPES = [
	'accounts',
	'addresses',
	'blocks',
	'delegates',
	'transactions',
];

export const PLURALS = {
	account: 'accounts',
	address: 'addresses',
	block: 'blocks',
	delegate: 'delegates',
	transaction: 'transactions',
};

export const QUERY_INPUT_MAP = {
	accounts: 'address',
	blocks: 'id',
	delegates: 'username',
	transactions: 'id',
};

export const CONFIG_VARIABLES = [
	'api.nodes',
	'api.network',
	'json',
	'name',
	'pretty',
];

export const API_PROTOCOLS = ['http:', 'https:'];

export const NETHASHES = {
	main: constants.MAINNET_NETHASH,
	test: constants.TESTNET_NETHASH,
	beta: constants.BETANET_NETHASH,
};
