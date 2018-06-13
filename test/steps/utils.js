/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import * as broadcastSignature from '../../src/commands/broadcast_signature';
import * as broadcastTransaction from '../../src/commands/broadcast_transaction';
import * as createAccount from '../../src/commands/create_account';
import * as createTransactionRegisterDelegate from '../../src/commands/create_transaction_register_delegate';
import * as createTransactionCastVotes from '../../src/commands/create_transaction_cast_votes';
import * as createTransactionRegisterMultisignatureAccount from '../../src/commands/create_transaction_register_multisignature_account';
import * as createTransactionRegisterSecondPassphrase from '../../src/commands/create_transaction_register_second_passphrase';
import * as createTransactionTransfer from '../../src/commands/create_transaction_transfer';
import * as decryptMessage from '../../src/commands/decrypt_message';
import * as decryptPassphrase from '../../src/commands/decrypt_passphrase';
import * as encryptMessage from '../../src/commands/encrypt_message';
import * as encryptPassphrase from '../../src/commands/encrypt_passphrase';
import * as config from '../../src/commands/config';
import * as get from '../../src/commands/get';
import * as list from '../../src/commands/list';
import * as set from '../../src/commands/set';
import * as showAccount from '../../src/commands/show_account';
import * as showCopyright from '../../src/commands/show_copyright';
import * as showWarranty from '../../src/commands/show_warranty';
import * as signMessage from '../../src/commands/sign_message';
import * as verifyMessage from '../../src/commands/verify_message';
import * as verifyTransaction from '../../src/commands/verify_transaction';
import * as signTransaction from '../../src/commands/sign_transaction';

export const DEFAULT_ERROR_MESSAGE = "Cannot read property 'length' of null";

const BOOLEANS = {
	true: true,
	false: false,
};

const regExpQuotes = /"((.|\n|\s\S)+?)"/;
const regExpNumbers = /\d+(.\d+)?/;
const regExpBooleans = /(true|false)/;

export const getFirstQuotedString = title => title.match(regExpQuotes)[1];

export const getQuotedStrings = title => {
	const globalRegExp = new RegExp(regExpQuotes, 'g');
	return (title.match(globalRegExp) || []).map(
		match => match.match(regExpQuotes)[1],
	);
};

export const getFirstNumber = title => Number(title.match(regExpNumbers)[0]);

export const getNumbers = title => {
	const globalRegExp = new RegExp(regExpNumbers, 'g');
	return title.match(globalRegExp).map(Number);
};

export const getFirstBoolean = title =>
	BOOLEANS[title.match(regExpBooleans)[1]];

export const getBooleans = title => {
	const globalRegExp = new RegExp(regExpBooleans, 'g');
	return title.match(globalRegExp).map(key => BOOLEANS[key]);
};

export const getCommandInstance = (vorpal, command) => {
	const commandStem = command.match(/^[^[|<]+/)[0].slice(0, -1);
	return vorpal.find(commandStem);
};

export const getActionCreator = actionName =>
	({
		'broadcast signature': broadcastSignature.actionCreator,
		'broadcast transaction': broadcastTransaction.actionCreator,
		'create account': createAccount.actionCreator,
		'decrypt message': decryptMessage.actionCreator,
		'decrypt passphrase': decryptPassphrase.actionCreator,
		'encrypt message': encryptMessage.actionCreator,
		'encrypt passphrase': encryptPassphrase.actionCreator,
		'create transaction register delegate':
			createTransactionRegisterDelegate.actionCreator,
		'create transaction cast votes': createTransactionCastVotes.actionCreator,
		'create transaction register multisignature account':
			createTransactionRegisterMultisignatureAccount.actionCreator,
		'create transaction register second passphrase':
			createTransactionRegisterSecondPassphrase.actionCreator,
		'create transaction transfer': createTransactionTransfer.actionCreator,
		config: config.actionCreator,
		get: get.actionCreator,
		list: list.actionCreator,
		set: set.actionCreator,
		'show copyright': showCopyright.actionCreator,
		'show warranty': showWarranty.actionCreator,
		'show account': showAccount.actionCreator,
		'sign message': signMessage.actionCreator,
		'verify message': verifyMessage.actionCreator,
		'verify transaction': verifyTransaction.actionCreator,
		'sign transaction': signTransaction.actionCreator,
	}[actionName]);

export const createFakeInterface = value => ({
	on: (type, callback) => {
		if (type === 'line') {
			value.split('\n').forEach(callback);
		}
		if (type === 'close') {
			callback();
		}
		return createFakeInterface(value);
	},
});

export const createStreamStub = on => ({
	resume: () => {},
	close: () => {},
	on,
});

export function getTransactionCreatorFunctionNameByType(transactionType) {
	switch (transactionType) {
		case 0:
			return 'transfer';
		case 1:
			return 'registerSecondPassphrase';
		case 2:
			return 'registerDelegate';
		case 3:
			return 'castVotes';
		case 4:
			return 'registerMultisignature';
		// istanbul ignore next
		default:
			throw new Error(`Transaction type ${transactionType} is not supported`);
	}
}

export const hasAncestorWithTitleMatching = (test, regExp) => {
	if (test.title.match(regExp)) return true;
	const { parent } = test;
	if (!parent) return false;
	return hasAncestorWithTitleMatching(parent, regExp);
};
