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
import TransferCommand from './create/transfer';
import VoteCommand from './create/vote';

interface TypeNumberMap {
	readonly [key: string]: string;
}

const typeNumberMap: TypeNumberMap = {
	'8': 'transfer',
	'10': 'delegate',
	'12': 'multisignature',
	'13': 'vote',
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
	static strict = false;

	static description = `
	Creates a transaction object.
	`;

	static examples = [
		'transaction:create --type=8 1 100 100 13356260975429434553L',
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
		'no-signature': flagParser.boolean(commonFlags.noSignature),
		networkIdentifier: flagParser.string(commonFlags.networkIdentifier),
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
