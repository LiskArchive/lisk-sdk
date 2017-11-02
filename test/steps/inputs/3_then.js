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
import * as input from '../../../src/utils/input';
import {
	getFirstQuotedString,
	hasAncestorWithTitleMatching,
} from '../utils';

export function itShouldGetThePasswordUsingTheSource() {
	const { options } = this.test.ctx;
	const firstCallArgs = input.getPassphrase.firstCall.args;
	return (firstCallArgs[1]).should.equal(options.password);
}

export function itShouldGetTheEncryptedPassphraseUsingTheEncryptedPassphraseFromStdIn() {
	const { cipherAndIv: { cipher } } = this.test.ctx;
	const firstCallArgs = input.getData.firstCall.args;
	return (firstCallArgs[2]).should.equal(cipher);
}

export function itShouldGetTheEncryptedPassphraseUsingThePassphraseArgument() {
	const { cipherAndIv: { cipher: passphrase } } = this.test.ctx;
	return (input.getData).should.be.calledWith(passphrase);
}

export function itShouldGetThePasswordFromStdIn() {
	const firstCallArgs = input.getStdIn.firstCall.args;
	const isDecryptPassphraseAction = hasAncestorWithTitleMatching(this.test, /Given an action "decrypt passphrase"/);
	const property = isDecryptPassphraseAction
		? 'passphraseIsRequired'
		: 'dataIsRequired';
	return (firstCallArgs[0]).should.have.property(property).equal(true);
}

export function itShouldGetThePasswordUsingThePasswordFromStdIn() {
	const { password } = this.test.ctx;
	const isDecryptPassphraseAction = hasAncestorWithTitleMatching(this.test, /Given an action "decrypt passphrase"/);
	const call = isDecryptPassphraseAction
		? 'firstCall'
		: 'secondCall';
	const { args } = input.getPassphrase[call];
	return (args[2]).should.equal(password);
}

export function itShouldGetThePasswordUsingThePasswordSource() {
	const { options } = this.test.ctx;
	const secondCallArgs = input.getPassphrase.secondCall.args;
	return (secondCallArgs[1]).should.equal(options.password);
}

export function itShouldGetTheDataUsingTheMessageFromStdIn() {
	const { message } = this.test.ctx;
	const firstCallArgs = input.getData.firstCall.args;
	return (firstCallArgs[2]).should.equal(message);
}

export function itShouldGetTheDataUsingTheMessageArgument() {
	const { message } = this.test.ctx;
	return (input.getData).should.be.calledWith(message);
}

export function itShouldNotGetTheSecondPassphraseFromStdIn() {
	const firstCallArgs = input.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('dataIsRequired').equal(false);
}

export function itShouldGetTheDataUsingTheMessageSource() {
	const { options } = this.test.ctx;
	const firstCallArgs = input.getData.firstCall.args;
	return (firstCallArgs[1]).should.equal(options.message);
}

export function itShouldGetTheSecondPassphraseFromStdIn() {
	const firstCallArgs = input.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('dataIsRequired').equal(true);
}

export function itShouldGetTheSecondPassphraseUsingTheSecondPassphraseFromStdIn() {
	const { secondPassphrase } = this.test.ctx;
	const secondCallArgs = input.getPassphrase.secondCall.args;
	return (secondCallArgs[2]).should.equal(secondPassphrase);
}

export function itShouldGetThePassphraseUsingThePassphraseFromStdIn() {
	const { passphrase } = this.test.ctx;
	const firstCallArgs = input.getPassphrase.firstCall.args;
	return (firstCallArgs[2]).should.equal(passphrase);
}

export function itShouldGetTheSecondPassphraseUsingTheSecondPassphraseSource() {
	const { options } = this.test.ctx;
	const secondCallArgs = input.getPassphrase.secondCall.args;
	return (secondCallArgs[1]).should.equal(options['second-passphrase']);
}

export function itShouldGetThePassphraseUsingThePassphraseSource() {
	const { options } = this.test.ctx;
	const firstCallArgs = input.getPassphrase.firstCall.args;
	return (firstCallArgs[1]).should.equal(options.passphrase);
}

export function itShouldGetTheSecondPassphraseWithARepeatedPrompt() {
	const secondCallArgs = input.getPassphrase.secondCall.args;
	return (secondCallArgs[3]).should.eql({ shouldRepeat: true, displayName: 'your second secret passphrase' });
}

export function itShouldGetThePassphraseWithASinglePrompt() {
	const firstCallArgs = input.getPassphrase.firstCall.args;
	return (firstCallArgs[3] === undefined || !firstCallArgs[3].shouldRepeat).should.be.true();
}

export function itShouldGetThePassphraseWithARepeatedPrompt() {
	const firstCallArgs = input.getPassphrase.firstCall.args;
	return (firstCallArgs[3]).should.have.property('shouldRepeat').be.true();
}

export function itShouldGetThePasswordWithARepeatedPrompt() {
	const secondCallArgs = input.getPassphrase.secondCall.args;
	return (secondCallArgs[3]).should.have.property('shouldRepeat').be.true();
}

export function itShouldGetThePasswordWithASinglePrompt() {
	const { getGetPassphrasePasswordCall } = this.test.ctx;
	const { args } = getGetPassphrasePasswordCall();
	return (args[3] === undefined || !args[3].shouldRepeat).should.be.true();
}

export function itShouldGetTheSecondPassphraseUsingTheVorpalInstance() {
	const { vorpal } = this.test.ctx;
	return (input.getPassphrase.secondCall).should.be.calledWith(vorpal);
}

export function itShouldGetThePassphraseUsingTheVorpalInstance() {
	const { vorpal } = this.test.ctx;
	return (input.getPassphrase.firstCall).should.be.calledWith(vorpal);
}

export function itShouldGetThePasswordUsingTheVorpalInstance() {
	const { vorpal, getGetPassphrasePasswordCall } = this.test.ctx;
	return (getGetPassphrasePasswordCall()).should.be.calledWith(vorpal);
}

export function itShouldNotGetThePassphraseFromStdIn() {
	const firstCallArgs = input.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('passphraseIsRequired').equal(false);
}

export function itShouldNotGetTheEncryptedPassphraseFromStdIn() {
	const firstCallArgs = input.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('dataIsRequired').equal(false);
}

export function itShouldGetTheEncryptedPassphraseFromStdIn() {
	const firstCallArgs = input.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('dataIsRequired').equal(true);
}

export function itShouldNotGetThePasswordFromStdIn() {
	const { stdInInputs = [] } = this.test.ctx;
	const firstCallArgs = input.getStdIn.firstCall.args;
	const isDecryptPassphraseAction = hasAncestorWithTitleMatching(this.test, /Given an action "decrypt passphrase"/);
	const property = stdInInputs.length && !isDecryptPassphraseAction
		? 'dataIsRequired'
		: 'passphraseIsRequired';
	return (firstCallArgs[0]).should.have.property(property).equal(false);
}

export function itShouldGetThePassphraseFromStdIn() {
	const firstCallArgs = input.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('passphraseIsRequired').equal(true);
}

export function itShouldNotGetTheMessageFromStdIn() {
	const firstCallArgs = input.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('dataIsRequired').equal(false);
}

export function itShouldGetTheMessageFromStdIn() {
	const firstCallArgs = input.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('dataIsRequired').equal(true);
}

export function theResultShouldHaveSourceType() {
	const { returnValue } = this.test.ctx;
	const sourceType = getFirstQuotedString(this.test.title);
	return (returnValue).should.have.property('sourceType').equal(sourceType);
}

export function theResultShouldHaveAnEmptySourceIdentifier() {
	const { returnValue } = this.test.ctx;
	return (returnValue).should.have.property('sourceIdentifier').equal('');
}

export function theResultShouldHaveSourceIdentifier() {
	const { returnValue } = this.test.ctx;
	const sourceIdentifier = getFirstQuotedString(this.test.title);
	return (returnValue).should.have.property('sourceIdentifier').equal(sourceIdentifier);
}

export function anOptionsObjectWithTheMessageShouldBeReturned() {
	const { returnValue, promptMessage } = this.test.ctx;
	return (returnValue).should.eql({
		type: 'password',
		name: 'passphrase',
		message: promptMessage,
	});
}

export function itShouldPromptForThePassphraseOnce() {
	const { vorpal } = this.test.ctx;
	return (vorpal.activeCommand.prompt).should.be.calledOnce();
}

export function itShouldPromptForThePassphraseTwice() {
	const { vorpal } = this.test.ctx;
	return (vorpal.activeCommand.prompt).should.be.calledTwice();
}

export function itShouldUseOptionsWithTheMessage() {
	const { vorpal } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return (vorpal.activeCommand.prompt).should.be.calledWithExactly({
		type: 'password',
		name: 'passphrase',
		message,
	});
}
