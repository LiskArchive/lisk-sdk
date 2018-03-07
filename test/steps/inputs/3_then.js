/*
 * LiskHQ/lisk-commander
 * Copyright © 2016–2018 Lisk Foundation
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
import { getFirstQuotedString } from '../utils';

export async function itShouldGetTheDataUsingTheUnvotesSource() {
	const { options } = this.test.ctx;
	return expect(inputUtils.getData).to.be.calledWithExactly(options.unvotes);
}

export async function itShouldGetTheDataUsingTheVotesSource() {
	const { options } = this.test.ctx;
	return expect(inputUtils.getData).to.be.calledWithExactly(options.votes);
}

export async function itShouldNotGetTheDataUsingTheUnvotesSource() {
	return expect(inputUtils.getData).not.to.be.called;
}

export async function itShouldNotGetTheDataUsingTheVotesSource() {
	return expect(inputUtils.getData).not.to.be.called;
}

export async function itShouldResolveWithThePassphrase() {
	const { returnValue, passphrase } = this.test.ctx;
	const result = await returnValue;
	return expect(result)
		.to.have.property('passphrase')
		.equal(passphrase);
}

export async function itShouldResolveWithoutThePassphrase() {
	const { returnValue } = this.test.ctx;
	const result = await returnValue;
	return expect(result).to.have.property('passphrase').be.null;
}

export async function itShouldResolveWithTheSecondPassphrase() {
	const { returnValue, secondPassphrase } = this.test.ctx;
	const result = await returnValue;
	return expect(result)
		.to.have.property('secondPassphrase')
		.equal(secondPassphrase);
}

export async function itShouldResolveWithoutTheSecondPassphrase() {
	const { returnValue } = this.test.ctx;
	const result = await returnValue;
	return expect(result).to.have.property('secondPassphrase').be.null;
}

export async function itShouldResolveWithThePassword() {
	const { returnValue, password } = this.test.ctx;
	const result = await returnValue;
	return expect(result)
		.to.have.property('password')
		.equal(password);
}

export async function itShouldResolveWithoutThePassword() {
	const { returnValue } = this.test.ctx;
	const result = await returnValue;
	return expect(result).to.have.property('password').be.null;
}

export async function itShouldResolveWithTheData() {
	const { returnValue, data } = this.test.ctx;
	const result = await returnValue;
	return expect(result)
		.to.have.property('data')
		.equal(data);
}

export async function itShouldResolveWithoutTheData() {
	const { returnValue } = this.test.ctx;
	const result = await returnValue;
	return expect(result).to.have.property('data').be.null;
}

export function itShouldGetTheInputsFromSourcesUsingTheVorpalInstance() {
	const { vorpal } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return expect(firstCallArgs[0]).to.equal(vorpal);
}

export function itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource() {
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return expect(firstCallArgs[1]).to.have.property('secondPassphrase').be.null;
}

export function itShouldGetTheInputsFromSourcesUsingTheSecondPassphraseSourceWithARepeatingPrompt() {
	const { options } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return expect(firstCallArgs[1])
		.to.have.property('secondPassphrase')
		.eql({
			source: options['second-passphrase'],
			repeatPrompt: true,
		});
}

export function itShouldGetTheInputsFromSourcesUsingTheEncryptedPassphraseSourceWithoutARepeatingPrompt() {
	const { options } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return expect(firstCallArgs[1])
		.to.have.property('data')
		.eql({
			source: options.passphrase,
		});
}

export function itShouldNotGetTheInputsFromSourcesUsingTheEncryptedPassphraseSource() {
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return expect(firstCallArgs[1]).to.have.property('data').be.null;
}

export function itShouldGetTheInputsFromSourcesUsingTheMessageSource() {
	const { options } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return expect(firstCallArgs[1])
		.to.have.property('data')
		.eql({
			source: options.message,
		});
}

export function itShouldNotGetTheInputsFromSourcesUsingTheMessageSource() {
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return expect(firstCallArgs[1]).to.have.property('data').be.null;
}

export function itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt() {
	const { options } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return expect(firstCallArgs[1])
		.to.have.property('passphrase')
		.eql({
			source: options.passphrase,
			repeatPrompt: true,
		});
}

export function itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithoutARepeatingPrompt() {
	const { options } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return expect(firstCallArgs[1])
		.to.have.property('passphrase')
		.eql({
			source: options.passphrase,
		});
}

export function itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithARepeatingPrompt() {
	const { options } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return expect(firstCallArgs[1])
		.to.have.property('password')
		.eql({
			source: options.password,
			repeatPrompt: true,
		});
}

export function itShouldGetTheInputsFromSourcesUsingThePasswordSourceWithoutARepeatingPrompt() {
	const { options } = this.test.ctx;
	const firstCallArgs = getInputsFromSources.firstCall.args;
	return expect(firstCallArgs[1])
		.to.have.property('password')
		.eql({
			source: options.password,
		});
}

export function itShouldGetTheInputsFromSourcesWithoutARepeatingPassphrasePrompt() {
	const repeatPromptArg = getInputsFromSources.firstCall.args[1];
	// istanbul ignore next
	return repeatPromptArg.repeatPrompt && repeatPromptArg.repeatPrompt.passphrase
		? expect(repeatPromptArg.repeatPrompt.passphrase).not.to.be.true
		: true;
}

export function itShouldGetThePassphrase() {
	const passphraseArgs = inputUtils.getPassphrase.args.filter(
		args => !args[2].displayName,
	);
	return expect(passphraseArgs).to.have.length(1);
}

export function itShouldNotGetThePassphrase() {
	const passphraseArgs = inputUtils.getPassphrase.args.filter(
		args => !args[2].displayName,
	);
	return expect(passphraseArgs).to.be.empty;
}

export function itShouldGetTheSecondPassphrase() {
	const passphraseArgs = inputUtils.getPassphrase.args.filter(
		args => args[2].displayName === 'your second secret passphrase',
	);
	return expect(passphraseArgs).to.have.length(1);
}

export function itShouldNotGetTheSecondPassphrase() {
	const passphraseArgs = inputUtils.getPassphrase.args.filter(
		args => args[2].displayName === 'your second secret passphrase',
	);
	return expect(passphraseArgs).to.be.empty;
}

export function itShouldGetThePassword() {
	const passphraseArgs = inputUtils.getPassphrase.args.filter(
		args => args[2].displayName === 'your password',
	);
	return expect(passphraseArgs).to.have.length(1);
}

export function itShouldNotGetThePassword() {
	const passphraseArgs = inputUtils.getPassphrase.args.filter(
		args => args[2].displayName === 'your password',
	);
	return expect(passphraseArgs).to.be.empty;
}

export function itShouldGetTheData() {
	const { options } = this.test.ctx;
	return expect(inputUtils.getData).to.be.calledWith(options.data.source);
}

export function itShouldNotGetTheData() {
	return expect(inputUtils.getData).not.to.be.called;
}

export function itShouldAskForTheSecondPassphraseFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return expect(firstCallArgs[0])
		.to.have.property('secondPassphraseIsRequired')
		.equal(true);
}

export function itShouldAskForThePasswordFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return expect(firstCallArgs[0])
		.to.have.property('passwordIsRequired')
		.equal(true);
}

export function itShouldGetTheSecondPassphraseWithASinglePrompt() {
	const secondPassphraseArgs = inputUtils.getPassphrase.args.filter(
		args => args[2].displayName === 'your second secret passphrase',
	)[0];
	return expect(secondPassphraseArgs[2]).to.have.property('shouldRepeat').not.be
		.ok;
}

export function itShouldGetTheSecondPassphraseWithARepeatedPrompt() {
	const secondPassphraseArgs = inputUtils.getPassphrase.args.filter(
		args => args[2].displayName === 'your second secret passphrase',
	)[0];
	return expect(secondPassphraseArgs[2]).to.have.property('shouldRepeat').be
		.true;
}

export function itShouldGetThePassphraseWithASinglePrompt() {
	const firstPassphraseArgs = inputUtils.getPassphrase.args.filter(
		args => !args[2] || !args[2].displayName,
	)[0];
	return expect(firstPassphraseArgs[2]).to.have.property('shouldRepeat').not.be
		.ok;
}

export function itShouldGetThePassphraseWithARepeatedPrompt() {
	const firstPassphraseArgs = inputUtils.getPassphrase.args.filter(
		args => !args[2] || !args[2].displayName,
	)[0];
	return expect(firstPassphraseArgs[2]).to.have.property('shouldRepeat').be
		.true;
}

export function itShouldGetThePasswordWithARepeatedPrompt() {
	const passwordArgs = inputUtils.getPassphrase.args.filter(
		args => args[2].displayName === 'your password',
	)[0];
	return expect(passwordArgs[2]).to.have.property('shouldRepeat').be.true;
}

export function itShouldGetThePasswordWithASinglePrompt() {
	const passwordArgs = inputUtils.getPassphrase.args.filter(
		args => args[2].displayName === 'your password',
	)[0];
	return expect(passwordArgs[2]).to.have.property('shouldRepeat').not.be.ok;
}

export function itShouldNotAskForThePassphraseFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return expect(firstCallArgs[0])
		.to.have.property('passphraseIsRequired')
		.equal(false);
}

export function itShouldNotAskForTheSecondPassphraseFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return expect(firstCallArgs[0])
		.to.have.property('secondPassphraseIsRequired')
		.equal(false);
}

export function itShouldNotAskForThePasswordFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return expect(firstCallArgs[0])
		.to.have.property('passwordIsRequired')
		.equal(false);
}

export function itShouldNotAskForTheDataFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return expect(firstCallArgs[0])
		.to.have.property('dataIsRequired')
		.equal(false);
}

export function itShouldAskForTheDataFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return expect(firstCallArgs[0])
		.to.have.property('dataIsRequired')
		.equal(true);
}

export function itShouldAskForThePassphraseFromStdIn() {
	const firstCallArgs = inputUtils.getStdIn.firstCall.args;
	return expect(firstCallArgs[0])
		.to.have.property('passphraseIsRequired')
		.equal(true);
}

export function theResultShouldHaveSourceType() {
	const { returnValue } = this.test.ctx;
	const sourceType = getFirstQuotedString(this.test.title);
	return expect(returnValue)
		.to.have.property('sourceType')
		.equal(sourceType);
}

export function theResultShouldHaveAnEmptySourceIdentifier() {
	const { returnValue } = this.test.ctx;
	return expect(returnValue)
		.to.have.property('sourceIdentifier')
		.equal('');
}

export function theResultShouldHaveSourceIdentifier() {
	const { returnValue } = this.test.ctx;
	const sourceIdentifier = getFirstQuotedString(this.test.title);
	return expect(returnValue)
		.to.have.property('sourceIdentifier')
		.equal(sourceIdentifier);
}

export function anOptionsObjectWithTheMessageShouldBeReturned() {
	const { returnValue, promptMessage } = this.test.ctx;
	return expect(returnValue).to.eql({
		type: 'password',
		name: 'passphrase',
		message: promptMessage,
	});
}

export function itShouldPromptForThePassphraseOnce() {
	const { vorpal } = this.test.ctx;
	return expect(vorpal.activeCommand.prompt).to.be.calledOnce;
}

export function itShouldPromptForThePassphraseTwice() {
	const { vorpal } = this.test.ctx;
	return expect(vorpal.activeCommand.prompt).to.be.calledTwice;
}

export function itShouldUseOptionsWithTheMessage() {
	const { vorpal } = this.test.ctx;
	const message = getFirstQuotedString(this.test.title);
	return expect(vorpal.activeCommand.prompt).to.be.calledWithExactly({
		type: 'password',
		name: 'passphrase',
		message,
	});
}
