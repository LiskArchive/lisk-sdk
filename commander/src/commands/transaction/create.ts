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
import { flags as flagParser } from '@oclif/command';
import BaseCommand from '../../base';
import { flags as commonFlags } from '../../utils/flags';
import DelegateCommand from './create/delegate';
import MultisignatureCommand from './create/multisignature';
import SecondPassphraseCommand from './create/second-passphrase';
import TransferCommand from './create/transfer';
import VoteCommand from './create/vote';

const MAX_ARG_NUM = 3;

interface TypeNumberMap {
	readonly [key: string]: string;
}

const typeNumberMap: TypeNumberMap = {
	'0': 'transfer',
	'1': 'second-passphrase',
	'2': 'delegate',
	'3': 'vote',
	'4': 'multisignature',
};

const options = Object.entries(typeNumberMap).reduce(
	(accumulated: string[], [key, value]: [string, string]) => [
		...accumulated,
		key,
		value,
	],
	[],
);

interface TypeClassMap {
	readonly [key: string]: typeof BaseCommand;
}

const typeClassMap: TypeClassMap = {
	transfer: TransferCommand,
	'second-passphrase': SecondPassphraseCommand,
	vote: VoteCommand,
	delegate: DelegateCommand,
	multisignature: MultisignatureCommand,
};

const resolveFlags = (
	accumulated: ReadonlyArray<string>,
	[key, value]: [string, string | boolean | undefined],
): ReadonlyArray<string> => {
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
	static args = new Array(MAX_ARG_NUM).fill(0).map(i => ({
		name: `${i}_arg`,
	}));

	static description = `
	Creates a transaction object.
	`;

	static examples = [
		'transaction:create --type=0 100 13356260975429434553L',
		'transaction:create --type=delegate lightcurve',
	];

	static flags = {
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

	async run(): Promise<void> {
		const { argv, flags } = this.parse(CreateCommand);
		const { type } = flags;
		const commandType = Object.keys(typeNumberMap).includes(type)
			? typeNumberMap[type]
			: type;
		const resolvedFlags = Object.entries(flags).reduce(resolveFlags, []);
		// tslint:disable-next-line await-promise
		await typeClassMap[commandType].run([...argv, ...resolvedFlags]);
	}
}
