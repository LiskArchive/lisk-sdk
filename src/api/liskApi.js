/*
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
import { LIVE_PORT, TEST_PORT, GET, POST } from 'constants';
import config from '../../config.json';
import * as privateApi from './privateApi';
import * as utils from './utils';

export default class LiskAPI {
	constructor(providedOptions) {
		const options = Object.assign({}, config.options, providedOptions);

		this.defaultNodes = options.nodes || config.nodes.mainnet;

		this.defaultSSLNodes = this.defaultNodes;

		this.defaultTestnetNodes = options.nodes || config.nodes.testnet;

		this.options = options;
		this.ssl = options.ssl;
		this.randomNode = Boolean(options.randomNode);
		this.testnet = options.testnet;
		this.bannedNodes = options.bannedNodes;
		this.node = options.node || privateApi.selectNewNode.call(this);
		this.port =
			options.port === '' || options.port
				? options.port
				: utils.getDefaultPort(options);
		this.nethash = this.getNethash(options.nethash);
	}

	getNethash(providedNethash) {
		const { port } = this;
		const NetHash = this.testnet
			? utils.netHashOptions({ port }).testnet
			: utils.netHashOptions({ port }).mainnet;

		if (providedNethash) {
			NetHash.nethash = providedNethash;
			NetHash.version = '0.0.0a';
		}

		return NetHash;
	}

	getNodes() {
		return {
			official: this.defaultNodes.map(node => ({ node })),
			ssl: this.defaultSSLNodes.map(node => ({ node, ssl: true })),
			testnet: this.defaultTestnetNodes.map(node => ({
				node,
				testnet: true,
			})),
		};
	}

	setNode(node) {
		this.node = node || privateApi.selectNewNode.call(this);
		return this.node;
	}

	setTestnet(testnet) {
		if (this.testnet !== testnet) {
			this.bannedNodes = [];
		}
		this.testnet = testnet;
		this.port = testnet ? TEST_PORT : LIVE_PORT;

		privateApi.selectNewNode.call(this);
	}

	setSSL(ssl) {
		if (this.ssl !== ssl) {
			this.ssl = ssl;
			this.bannedNodes = [];
			privateApi.selectNewNode.call(this);
		}
	}

	broadcastTransactions(transactions) {
		return privateApi.sendRequestPromise
			.call(this, POST, 'transactions', transactions)
			.then(result => result.body);
	}

	broadcastTransaction(transaction) {
		return this.broadcastTransactions([transaction]);
	}

	broadcastSignatures(signatures) {
		return privateApi.sendRequestPromise
			.call(this, POST, 'signatures', { signatures })
			.then(result => result.body);
	}

	sendRequest(requestMethod, requestType, options) {
		const checkedOptions = utils.checkOptions(options);

		return privateApi.sendRequestPromise
			.call(this, requestMethod, requestType, checkedOptions)
			.then(result => result.body)
			.then(
				privateApi.handleTimestampIsInFutureFailures.bind(
					this,
					requestMethod,
					requestType,
					checkedOptions,
				),
			)
			.catch(
				privateApi.handleSendRequestFailures.bind(
					this,
					requestMethod,
					requestType,
					checkedOptions,
				),
			);
	}

	transferLSK(recipientId, amount, passphrase, secondPassphrase) {
		return this.sendRequest(POST, 'transactions', {
			recipientId,
			amount,
			passphrase,
			secondPassphrase,
		});
	}
}

LiskAPI.prototype.getAccount = utils.wrapSendRequest(
	GET,
	'accounts',
	address => ({ address }),
);

LiskAPI.prototype.getActiveDelegates = utils.wrapSendRequest(
	GET,
	'delegates',
	limit => ({ limit }),
);

LiskAPI.prototype.getStandbyDelegates = utils.wrapSendRequest(
	GET,
	'delegates',
	(limit, { orderBy = 'rate:asc', offset = 101 }) => ({
		limit,
		orderBy,
		offset,
	}),
);

LiskAPI.prototype.searchDelegatesByUsername = utils.wrapSendRequest(
	GET,
	'delegates',
	search => ({ search }),
);

LiskAPI.prototype.getBlocks = utils.wrapSendRequest(GET, 'blocks', limit => ({
	limit,
}));

LiskAPI.prototype.getForgedBlocks = utils.wrapSendRequest(
	GET,
	'blocks',
	generatorPublicKey => ({ generatorPublicKey }),
);

LiskAPI.prototype.getBlock = utils.wrapSendRequest(GET, 'blocks', height => ({
	height,
}));

LiskAPI.prototype.getTransactions = utils.wrapSendRequest(
	GET,
	'transactions',
	recipientId => ({ recipientId }),
);

LiskAPI.prototype.getTransaction = utils.wrapSendRequest(
	GET,
	'transactions',
	transactionId => ({ transactionId }),
);

LiskAPI.prototype.getVotes = utils.wrapSendRequest(GET, 'votes', address => ({
	address,
}));

LiskAPI.prototype.getVoters = utils.wrapSendRequest(
	GET,
	'voters',
	username => ({ username }),
);

LiskAPI.prototype.getUnsignedMultisignatureTransactions = utils.wrapSendRequest(
	GET,
	'transactions/unsigned',
	data => data,
);

LiskAPI.prototype.getDapp = utils.wrapSendRequest(
	GET,
	'dapps',
	transactionId => ({ transactionId }),
);

LiskAPI.prototype.getDapps = utils.wrapSendRequest(GET, 'dapps', data => data);

LiskAPI.prototype.getDappsByCategory = utils.wrapSendRequest(
	GET,
	'dapps',
	category => ({ category }),
);
