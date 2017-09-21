/*
 * LiskHQ/lisky
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
import decryptPassphraseCommand from '../../src/commands/decryptPassphrase';
import {
	getCommands,
	getRequiredArgs,
	setUpVorpalWithCommand,
} from './utils';

describe('decrypt passphrase command', () => {
	const command = 'decrypt passphrase';
	let vorpal;

	beforeEach(() => {
		vorpal = setUpVorpalWithCommand(decryptPassphraseCommand);
	});

	afterEach(() => {
		vorpal.ui.removeAllListeners();
	});

	describe('setup', () => {
		it('should be available', () => {
			const encryptPassphraseCommands = getCommands(vorpal, command);
			(encryptPassphraseCommands).should.have.length(1);
		});

		it('should require 1 inputs', () => {
			const requiredArgs = getRequiredArgs(vorpal, command);
			(requiredArgs).should.have.length(1);
		});
	});
});
