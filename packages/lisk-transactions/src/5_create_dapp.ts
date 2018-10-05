/*
 * Copyright © 2018 Lisk Foundation
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
import { DAPP_FEE } from './constants';
import { PartialTransaction } from './transaction_types';
import { isValidInteger, prepareTransaction } from './utils';

export interface DappInputs {
	readonly options: {
		readonly category: number;
		readonly description: string;
		readonly icon: string;
		readonly link: string;
		readonly name: string;
		readonly tags: string;
		readonly type: number;
	};
	readonly passphrase: string;
	readonly secondPassphrase?: string;
	readonly timeOffset?: number;
}

const validateInputs = ({ options }: DappInputs) => {
	if (typeof options !== 'object') {
		throw new Error('Options must be an object.');
	}
	const { category, name, type, link, description, tags, icon } = options;

	if (!isValidInteger(category)) {
		throw new Error('Dapp category must be an integer.');
	}
	if (typeof name !== 'string') {
		throw new Error('Dapp name must be a string.');
	}
	if (!isValidInteger(type)) {
		throw new Error('Dapp type must be an integer.');
	}
	if (typeof link !== 'string') {
		throw new Error('Dapp link must be a string.');
	}

	if (typeof description !== 'undefined' && typeof description !== 'string') {
		throw new Error('Dapp description must be a string if provided.');
	}

	if (typeof tags !== 'undefined' && typeof tags !== 'string') {
		throw new Error('Dapp tags must be a string if provided.');
	}

	if (typeof icon !== 'undefined' && typeof icon !== 'string') {
		throw new Error('Dapp icon must be a string if provided.');
	}
};

export const createDapp = (inputs: DappInputs) => {
	validateInputs(inputs);
	const { passphrase, secondPassphrase, timeOffset, options } = inputs;

	const transaction: PartialTransaction = {
		type: 5,
		fee: DAPP_FEE.toString(),
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

	return prepareTransaction(transaction, passphrase, secondPassphrase, timeOffset);
};