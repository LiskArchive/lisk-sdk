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
import getInputsFromSources from '../../../src/utils/input';
import * as inputUtils from '../../../src/utils/input/utils';
import {
	getFirstQuotedString,
	hasAncestorWithTitleMatching,
} from '../utils';

export async function itShouldResolveWithThePassphrase() {
	const { returnValue, passphrase } = this.test.ctx;
	const result = await returnValue;
	return (result).should.have.property('passphrase').equal(passphrase);
}

export async function itShouldResolveWithoutThePassphrase() {
	const { returnValue } = this.test.ctx;
	const result = await returnValue;
	return (result).should.have.property('passphrase').be.null();
}

export async function itShouldResolveWithTheSecondPassphrase() {
	const { returnValue, secondPassphrase } = this.test.ctx;
	const result = await returnValue;
	return (result).should.have.property('secondPassphrase').equal(secondPassphrase);
}

export async function itShouldResolveWithoutTheSecondPassphrase() {
	const { returnValue } = this.test.ctx;
	const result = await returnValue;
	return (result).should.have.property('secondPassphrase').be.null();
}

export async function itShouldResolveWithThePassword() {
	const { returnValue, password } = this.test.ctx;
	const result = await returnValue;
	return (result).should.have.property('password').equal(password);
}

export async function itShouldResolveWithoutThePassword() {
	const { returnValue } = this.test.ctx;
	const result = await returnValue;
	return (result).should.have.property('password').be.null();
}

export async function itShouldResolveWithTheData() {
	const { returnValue, data } = this.test.ctx;
	const result = await returnValue;
	return (result).should.have.property('data').equal(data);
}

export async function itShouldResolveWithoutTheData() {
	const { returnValue } = this.test.ctx;
	const result = await returnValue;
	return (result).should.have.property('data').be.null();
}

export function itShouldGetTheInputsFromSourcesUsingTheVorpalInstance() {
	const { vorpal } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return (firstCallArgs[0]).should.equal(vorpal);
}

export function itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource() {
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return (firstCallArgs[1]).should.have.property('secondPassphrase').be.null();
}

export function itShouldGetTheInputsFromSourcesUsingTheSecondPassphraseSourceWithARepeatingPrompt() {
	const { options } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return (firstCallArgs[1]).should.have.property('secondPassphrase').eql({
		source: options['second-passphrase'],
		repeatPrompt: true,
	});
}

export function itShouldGetTheInputsFromSourcesUsingTheEncryptedPassphraseSourceWithoutARepeatingPrompt() {
	const { options = {} } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return (firstCallArgs[1]).should.have.property('data').eql({
		source: options.passphrase,
	});
}

export function itShouldNotGetTheInputsFromSourcesUsingTheEncryptedPassphraseSource() {
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return (firstCallArgs[1]).should.have.property('data').be.null();
}

export function itShouldGetTheInputsFromSourcesUsingTheMessageSource() {
	const { options = {} } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return (firstCallArgs[1]).should.have.property('data').eql({
		source: options.message,
	});
}

export function itShouldNotGetTheInputsFromSourcesUsingTheMessageSource() {
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return (firstCallArgs[1]).should.have.property('data').be.null();
}

export function itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt() {
	const { options = {} } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return (firstCallArgs[1]).should.have.property('passphrase').eql({
		source: options.passphrase,
		repeatPrompt: true,
	});
}

export function itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithoutARepeatingPrompt() {
	const { options = {} } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return (firstCallArgs[1]).should.have.property('passphrase').eql({
		source: options.passphrase,
	});
}

export function itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithARepeatingPrompt() {
	const { options = {} } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return (firstCallArgs[1]).should.have.property('password').eql({
		source: options.password,
		repeatPrompt: true,
	});
}

export function itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithoutARepeatingPrompt() {
	const { options = {} } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return (firstCallArgs[1]).should.have.property('password').eql({
		source: options.password,
	});
}

export function itShouldGetTheInputsFromSourcesWithARepeatingPasswordPrompt() {
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return (firstCallArgs[1]).should.have.property('repeatPrompt').have.property('password').be.true();
}

export function itShouldGetTheInputsFromSourcesWithoutARepeatingPassphrasePrompt() {
	const repeatPromptArg = getInputsFromSources.firstCall.args[1];
	return repeatPromptArg.repeatPrompt && repeatPromptArg.repeatPrompt.passphrase
		? (repeatPromptArg.repeatPrompt.passphrase).should.not.be.true()
		: true;
}

export function itShouldGetThePassphrase() {
	const passphraseArgs = inputUtils.getPassphrase.args.filter(args => !args[2].displayName);
	return (passphraseArgs).should.have.length(1);
}

export function itShouldNotGetThePassphrase() {
	const passphraseArgs = inputUtils.getPassphrase.args.filter(args => !args[2].displayName);
	return (passphraseArgs).should.be.empty();
}

export function itShouldGetTheSecondPassphrase() {
	const passphraseArgs = inputUtils.getPassphrase.args.filter(args => args[2].displayName === 'your second secret passphrase');
	return (passphraseArgs).should.have.length(1);
}

export function itShouldNotGetTheSecondPassphrase() {
	const passphraseArgs = inputUtils.getPassphrase.args.filter(args => args[2].displayName === 'your second secret passphrase');
	return (passphraseArgs).should.be.empty();
}

export function itShouldGetThePassword() {
	const passphraseArgs = inputUtils.getPassphrase.args.filter(args => args[2].displayName === 'your password');
	return (passphraseArgs).should.have.length(1);
}

export function itShouldNotGetThePassword() {
	const passphraseArgs = inputUtils.getPassphrase.args.filter(args => args[2].displayName === 'your password');
	return (passphraseArgs).should.be.empty();
}

export function itShouldGetTheData() {
	const { options } = this.test.ctx;
	return (inputUtils.getData).should.be.calledWith(options.data.source);
}

export function itShouldNotGetTheData() {
	return (inputUtils.getData).should.not.be.called();
}

export function itShouldGetThePasswordUsingTheSource() {
	const { options } = this.test.ctx;
	const firstCallArgs = inputUtils.getPassphrase.firstCall.args;
	return (firstCallArgs[1]).should.equal(options.password);
}

export function itShouldGetTheEncryptedPassphraseUsingTheEncryptedPassphraseFromStdIn() {
	const { cipherAndIv: { cipher } } = this.test.ctx;
	const firstCallArgs = inputUtils.getData.firstCall.args;
	return (firstCallArgs[2]).should.equal(cipher);
}

export function itShouldGetTheEncryptedPassphraseUsingThePassphraseArgument() {
	const { cipherAndIv: { cipher: passphrase } } = this.test.ctx;
	return (inputUtils.getData).should.be.calledWith(passphrase);
}

export function itShouldGetThePasswordUsingThePasswordFromStdIn() {
	const { password } = this.test.ctx;
	const isDecryptPassphraseAction = hasAncestorWithTitleMatching(this.test, /Given an action "decrypt passphrase"/);
	const call = isDecryptPassphraseAction
		? 'firstCall'
		: 'secondCall';
	const { args } = inputUtils.getPassphrase[call];
	return (args[2]).should.equal(password);
}

export function itShouldGetThePasswordUsingThePasswordSource() {
	const { options } = this.test.ctx;
	const secondCallArgs = inputUtils.getPassphrase.secondCall.args;
	return (secondCallArgs[1]).should.equal(options.password);
}

export function itShouldNotGetTheSecondPassphraseFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('secondPassphraseIsRequired').equal(false);
}

export function itShouldGetTheDataUsingTheMessageSource() {
	const { options } = this.test.ctx;
	const firstCallArgs = inputUtils.getData.firstCall.args;
	return (firstCallArgs[1]).should.equal(options.message);
}

export function itShouldAskForTheSecondPassphraseFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('secondPassphraseIsRequired').equal(true);
}

export function itShouldAskForThePasswordFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('passwordIsRequired').equal(true);
}

export function itShouldGetTheSecondPassphraseUsingTheSecondPassphraseFromStdIn() {
	const { secondPassphrase } = this.test.ctx;
	const secondCallArgs = inputUtils.getPassphrase.secondCall.args;
	return (secondCallArgs[2]).should.equal(secondPassphrase);
}

export function itShouldGetThePassphraseUsingThePassphraseFromStdIn() {
	const { passphrase } = this.test.ctx;
	const firstCallArgs = inputUtils.getPassphrase.firstCall.args;
	return (firstCallArgs[2]).should.equal(passphrase);
}

export function itShouldGetTheSecondPassphraseUsingTheSecondPassphraseSource() {
	const { options } = this.test.ctx;
	const secondCallArgs = inputUtils.getPassphrase.secondCall.args;
	return (secondCallArgs[1]).should.equal(options['second-passphrase']);
}

export function itShouldGetThePassphraseUsingThePassphraseSource() {
	const { options } = this.test.ctx;
	const firstCallArgs = inputUtils.getPassphrase.firstCall.args;
	return (firstCallArgs[1]).should.equal(options.passphrase);
}

export function itShouldGetTheSecondPassphraseWithASinglePrompt() {
	const secondPassphraseArgs = inputUtils.getPassphrase.args.filter(args => args[2].displayName === 'your second secret passphrase')[0];
	return (secondPassphraseArgs[2]).should.have.property('shouldRepeat').not.be.ok();
}

export function itShouldGetTheSecondPassphraseWithARepeatedPrompt() {
	const secondPassphraseArgs = inputUtils.getPassphrase.args.filter(args => args[2].displayName === 'your second secret passphrase')[0];
	return (secondPassphraseArgs[2]).should.have.property('shouldRepeat').be.true();
}

export function itShouldGetThePassphraseWithASinglePrompt() {
	const firstPassphraseArgs = inputUtils.getPassphrase.args.filter(args => !args[2] || !args[2].displayName)[0];
	return (firstPassphraseArgs[2]).should.have.property('shouldRepeat').not.be.ok();
}

export function itShouldGetThePassphraseWithARepeatedPrompt() {
	const firstPassphraseArgs = inputUtils.getPassphrase.args.filter(args => !args[2] || !args[2].displayName)[0];
	return (firstPassphraseArgs[2]).should.have.property('shouldRepeat').be.true();
}

export function itShouldGetThePasswordWithARepeatedPrompt() {
	const passwordArgs = inputUtils.getPassphrase.args.filter(args => args[2].displayName === 'your password')[0];
	return (passwordArgs[2]).should.have.property('shouldRepeat').be.true();
}

export function itShouldGetThePasswordWithASinglePrompt() {
	const passwordArgs = inputUtils.getPassphrase.args.filter(args => args[2].displayName === 'your password')[0];
	return (passwordArgs[2]).should.have.property('shouldRepeat').not.be.ok();
}

export function itShouldGetTheSecondPassphraseUsingTheVorpalInstance() {
	const { vorpal } = this.test.ctx;
	return (inputUtils.getPassphrase.secondCall).should.be.calledWith(vorpal);
}

export function itShouldGetThePassphraseUsingTheVorpalInstance() {
	const { vorpal } = this.test.ctx;
	return (inputUtils.getPassphrase.firstCall).should.be.calledWith(vorpal);
}

export function itShouldGetThePasswordUsingTheVorpalInstance() {
	const { vorpal, getGetPassphrasePasswordCall } = this.test.ctx;
	return (getGetPassphrasePasswordCall()).should.be.calledWith(vorpal);
}

export function itShouldNotAskForThePassphraseFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('passphraseIsRequired').equal(false);
}

export function itShouldNotAskForTheSecondPassphraseFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('secondPassphraseIsRequired').equal(false);
}

export function itShouldNotAskForThePasswordFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('passwordIsRequired').equal(false);
}

export function itShouldNotAskForTheDataFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('dataIsRequired').equal(false);
}

export function itShouldAskForTheDataFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('dataIsRequired').equal(true);
}

export function itShouldAskForThePassphraseFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('passphraseIsRequired').equal(true);
}

export function itShouldNotAskForTheMessageFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return (firstCallArgs[0]).should.have.property('dataIsRequired').equal(false);
}

export function itShouldAskForTheMessageFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
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
