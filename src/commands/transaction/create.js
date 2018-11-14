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
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import commonFlags from '../../utils/flags';
import TransferCommand from './create/transfer';
import SecondPassphraseCommand from './create/second-passphrase';
import VoteCommand from './create/vote';
import DelegateCommand from './create/delegate';
import MultisignatureCommand from './create/multisignature';

const MAX_ARG_NUM = 3;

const typeNumberMap = {
	0: 'transfer',
	1: 'second-passphrase',
	2: 'delegate',
	3: 'vote',
	4: 'multisignature',
};

const options = Object.entries(typeNumberMap).reduce(
	(accumulated, [key, value]) => [...accumulated, key, value],
	[],
);

const typeClassMap = {
	transfer: TransferCommand,
	'second-passphrase': SecondPassphraseCommand,
	vote: VoteCommand,
	delegate: DelegateCommand,
	multisignature: MultisignatureCommand,
};

const resolveFlags = (accumulated, [key, value]) => {
	if (key === 'type') {
		return accumulated;
	}
	if (typeof value === 'string') {
		return [...accumulated, `--${key}`, value];
	}
	const boolKey = value === false ? `--no-${key}` : `--${key}`;
	return [...accumulated, boolKey];
};

export default class CreateCommand extends BaseCommand {
	async run() {
		const { argv, flags } = this.parse(CreateCommand);
		const { type } = flags;
		const commandType = Object.keys(typeNumberMap).includes(type)
			? typeNumberMap[type]
			: type;
		const resolvedFlags = Object.entries(flags).reduce(resolveFlags, []);
		await typeClassMap[commandType].run([...argv, ...resolvedFlags]);
	}
}

CreateCommand.flags = {
	...BaseCommand.flags,
	type: flagParser.string({
		char: 't',
		description: 'type of transaction to create',
		required: true,
		options,
	}),
	passphrase: flagParser.string(commonFlags.passphrase),
	'second-passphrase': flagParser.string(commonFlags.secondPassphrase),
	'no-signature': flagParser.boolean(commonFlags.noSignature),
	votes: flagParser.string(commonFlags.votes),
	unvotes: flagParser.string(commonFlags.unvotes),
};

CreateCommand.args = new Array(MAX_ARG_NUM).fill().map(i => ({
	name: `${i}_arg`,
}));

CreateCommand.description = `
Creates a transaction object.
`;

CreateCommand.examples = [
	'transaction:create --type=0 100 13356260975429434553L',
	'transaction:create --type=delegate lightcurve',
];
