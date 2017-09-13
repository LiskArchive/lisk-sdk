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
import {
	getPassphraseFromPrompt,
} from '../../src/utils/prompt';

describe('prompt utils', () => {
	const passphrase = 'minute omit local rare sword knee banner pair rib museum shadow juice';
	const badPassphrase = `${passphrase.slice(0, -1)}y`;

	let promptStub;
	let vorpal;

	beforeEach(() => {
		promptStub = sinon.stub().resolves({ passphrase });
		vorpal = {
			activeCommand: {
				prompt: promptStub,
			},
			ui: {},
		};
	});

	describe('#getPassphraseFromPrompt', () => {
		it('should set the UI parent on the vorpal instance', () => {
			return getPassphraseFromPrompt(vorpal)
				.then(() => {
					(vorpal.ui).should.have.property('parent').and.be.equal(vorpal);
				});
		});

		it('prompt for the pass phrase twice', () => {
			return getPassphraseFromPrompt(vorpal)
				.then(() => {
					(promptStub.calledTwice).should.be.true();
				});
		});

		it('should return the pass phrase if successfully repeated', () => {
			return getPassphraseFromPrompt(vorpal)
				.then((result) => {
					(result).should.be.equal(passphrase);
				});
		});

		it('should throw an error if the pass phrase is not successfully repeated', () => {
			promptStub.onSecondCall().resolves(badPassphrase);
			return getPassphraseFromPrompt(vorpal)
				.should.be.rejectedWith({ message: 'Passphrase verification failed.' });
		});
	});
});
