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

const messageDescription = `Specifies a source for providing a message to the command. If a string is provided directly as an argument, this option will be ignored. The message must be provided via an argument or via this option. Sources must be one of \`file\` or \`stdin\`. In the case of \`file\`, a corresponding identifier must also be provided.
	Note: if both secret passphrase and message are passed via stdin, the passphrase must be the first line.
	Examples:
	- --message=file:/path/to/my/message.txt
	- --message=stdin
`;

const passphraseDescription = `Specifies a source for your secret passphrase. Lisk Commander will prompt you for input if this option is not set.
	Source must be one of \`prompt\`, \`pass\`, \`env\`, \`file\` or \`stdin\`. For \`pass\`, \`env\` and \`file\` a corresponding identifier must also be provided.
	Examples:
	- --passphrase=prompt (default behaviour)
	- --passphrase='pass:my secret passphrase' (should only be used where security is not important)
	- --passphrase=env:SECRET_PASSPHRASE
	- --passphrase=file:/path/to/my/passphrase.txt (takes the first line only)
	- --passphrase=stdin (takes one line only)
`;

const secondPassphraseDescription = `Specifies a source for your second secret passphrase. For certain commands a second passphrase is necessary, in which case Lisk Commander will prompt you for it if this option is not set. Otherwise, Lisk Commander will assume you want to use one passphrase only.
	Source must be one of \`prompt\`, \`pass\`, \`env\`, \`file\` or \`stdin\`. For \`pass\`, \`env\` and \`file\` a corresponding identifier must also be provided.
	Examples:
	- --second-passphrase=prompt (to force a prompt even when a second passphrase is not always necessary)
	- --second-passphrase='pass:my second secret passphrase' (should only be used where security is not important)
	- --second-passphrase=env:SECOND_SECRET_PASSPHRASE
	- --second-passphrase=file:/path/to/my/secondPassphrase.txt (takes the first line only)
	- --second-passphrase=stdin (takes one line only)
`;

const passwordDescription = `Specifies a source for your secret password. Lisk Commander will prompt you for input if this option is not set.
	Source must be one of \`prompt\`, \`pass\`, \`env\`, \`file\` or \`stdin\`. For \`pass\`, \`env\` and \`file\` a corresponding identifier must also be provided.
	Examples:
	- --password=prompt (default behaviour)
	- --password=pass:password123 (should only be used where security is not important)
	- --password=env:PASSWORD
	- --password=file:/path/to/my/password.txt (takes the first line only)
	- --password=stdin (takes the first line only)
`;

const votesDescription = `Specifies the public keys for the delegate candidates you want to vote for. Takes either a string of public keys separated by commas, or a path to a file which contains the public keys.
	Examples:
	- --votes=publickey1,publickey2
	- --votes=file:/path/to/my/votes.txt (every public key should be on a new line)
`;

const unvotesDescription = `Specifies the public keys for the delegate candidates you want to remove your vote from. Takes either a string of public keys separated by commas, or a path to a file which contains the public keys.
	Examples:
	- --unvotes=publickey1,publickey2
	- --unvotes=file:/path/to/my/unvotes.txt (every public key should be on a new line)
`;

const noSignatureDescription =
	'Creates the transaction without a signature. Your passphrase will therefore not be required.';

const networkDescription = 'Lisk Core network name.';
const installationPathDescription = 'Lisk Core installation path.';
const releaseUrlDescription = 'Lisk Core download URL.';
const snapshotUrlDescription = 'Lisk Core blockchain snapshot URL.';
const noSnapshotDescription =
	'Install Lisk Core without a blockchain snapshot.';
const liskVersionDescription = 'Lisk Core version.';
const noStartDescription = 'Install Lisk Core without starting.';

export type AlphabetLowercase =
	| 'a'
	| 'b'
	| 'c'
	| 'd'
	| 'e'
	| 'f'
	| 'g'
	| 'h'
	| 'i'
	| 'j'
	| 'k'
	| 'l'
	| 'm'
	| 'n'
	| 'o'
	| 'p'
	| 'q'
	| 'r'
	| 's'
	| 't'
	| 'u'
	| 'v'
	| 'w'
	| 'x'
	| 'y'
	| 'z';

export interface FlagMap {
	readonly [key: string]: {
		readonly char?: AlphabetLowercase;
		readonly description: string;
	};
}

export const flags: FlagMap = {
	message: {
		char: 'm',
		description: messageDescription,
	},
	noSignature: {
		description: noSignatureDescription,
	},
	passphrase: {
		char: 'p',
		description: passphraseDescription,
	},
	secondPassphrase: {
		char: 's',
		description: secondPassphraseDescription,
	},
	password: {
		char: 'w',
		description: passwordDescription,
	},
	unvotes: {
		description: unvotesDescription,
	},
	votes: {
		description: votesDescription,
	},
	network: {
		char: 'n',
		description: networkDescription,
	},
	installationPath: {
		char: 'p',
		description: installationPathDescription,
	},
	releaseUrl: {
		char: 'r',
		description: releaseUrlDescription,
	},
	snapshotUrl: {
		char: 's',
		description: snapshotUrlDescription,
	},
	noSnapshot: {
		description: noSnapshotDescription,
	},
	liskVersion: {
		description: liskVersionDescription,
	},
	noStart: {
		description: noStartDescription,
	},
};
