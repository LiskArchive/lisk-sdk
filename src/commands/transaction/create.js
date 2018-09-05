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
import SecondpassphraseCommand from './create/secondpassphrase';
import VoteCommand from './create/vote';
import DelegateCommand from './create/delegate';
import MultisignatureCommand from './create/multisignature';

const MAX_ARG_NUM = 3;

const typeNumberMap = {
	0: 'transfer',
	1: 'secondpassphrase',
	2: 'vote',
	3: 'delegate',
	4: 'multisignature',
};

const options = Object.entries(typeNumberMap).reduce(
	(accumulated, [key, value]) => {
		accumulated.push(key, value);
		return accumulated;
	},
	[],
);

const typeClassMap = {
	transfer: TransferCommand,
	secondpassphrase: SecondpassphraseCommand,
	vote: VoteCommand,
	delegate: DelegateCommand,
	multisignature: MultisignatureCommand,
};

const resolveFlags = (accumulated, [key, value]) => {
	if (key === 'type') {
		return accumulated;
	}
	if (typeof value === 'string') {
		accumulated.push(`--${key}`, value);
		return accumulated;
	}
	const boolKey = value === false ? `--no-${key}` : `--${key}`;
	accumulated.push(boolKey);
	return accumulated;
};

export default class CreateCommand extends BaseCommand {
	async run() {
		const { argv, flags } = this.parse(CreateCommand);
		const { type } = flags;
		const clazz =
			typeClassMap[type in typeNumberMap ? typeNumberMap[type] : type];
		const resolvedFlags = Object.entries(flags).reduce(resolveFlags, []);
		await clazz.run([...argv, ...resolvedFlags]);
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

CreateCommand.args = Array(MAX_ARG_NUM)
	.fill()
	.map(i => ({
		name: `${i}_arg`,
	}));

CreateCommand.description = `
Create transaction.
`;

CreateCommand.examples = [
	'transaction:create --type=0 100 13356260975429434553L',
	'transaction:create --type=delegate username',
];
