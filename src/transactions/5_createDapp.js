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
/**
 * Dapp module provides functions used to create dapp registration transactions.
 * @class dapp
 */
import cryptoModule from '../crypto';
import { DAPP_FEE } from '../constants';
import { prepareTransaction, getTimeWithOffset } from './utils';

const isInt = n => parseInt(n, 10) === n;

const validateOptions = options => {
	if (typeof options !== 'object') {
		throw new Error('Options must be an object.');
	}
	const { category, name, type, link } = options;

	if (!isInt(category)) {
		throw new Error('Dapp category must be an integer.');
	}
	if (typeof name !== 'string') {
		throw new Error('Dapp name must be a string.');
	}
	if (!isInt(type)) {
		throw new Error('Dapp type must be an integer.');
	}
	if (typeof link !== 'string') {
		throw new Error('Dapp link must be a string.');
	}
};

/**
 * @method createDapp
 * @param {Object} Object - Object
 * @param {String} Object.passphrase
 * @param {String} Object.secondPassphrase
 * @param {Object} Object.options
 * @param {Number} Objec.timeOffset
 *
 * @return {Object}
 */

const createDapp = ({
	passphrase,
	secondPassphrase,
	options,
	timeOffset,
	unsigned,
}) => {
	validateOptions(options);

	const senderPublicKey = unsigned
		? null
		: cryptoModule.getKeys(passphrase).publicKey;

	const transaction = {
		type: 5,
		amount: '0',
		fee: DAPP_FEE.toString(),
		recipientId: null,
		senderPublicKey,
		timestamp: getTimeWithOffset(timeOffset),
		asset: {
			dapp: {
				category: options.category,
				name: options.name,
				description: options.description,
				tags: options.tags,
				type: options.type,
				link: options.link,
				icon: options.icon,
			},
		},
	};

	return unsigned
		? transaction
		: prepareTransaction(transaction, passphrase, secondPassphrase);
};

export default createDapp;
