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
import readline from 'readline';
import * as inputUtils from '../../../src/utils/input';
import {
	getFirstQuotedString,
	getQuotedStrings,
	createFakeInterface,
	hasAncestorWithTitleMatching,
} from '../utils';

export function theSecondPassphraseIsProvidedViaStdIn() {
	const { passphrase, secondPassphrase } = this.test.ctx;
	inputUtils.getStdIn.resolves({ passphrase, data: secondPassphrase });
	inputUtils.getPassphrase.onSecondCall().resolves(secondPassphrase);
}

export function thePassphraseAndTheSecondPassphraseAreProvidedViaStdIn() {
	const { passphrase, secondPassphrase } = this.test.ctx;
	inputUtils.getStdIn.resolves({ passphrase, data: secondPassphrase });
	inputUtils.getPassphrase.onFirstCall().resolves(passphrase);
	inputUtils.getPassphrase.onSecondCall().resolves(secondPassphrase);
}

export function thePassphraseAndThePasswordAreProvidedViaStdIn() {
	const { passphrase, password, stdInInputs = [] } = this.test.ctx;

	inputUtils.getStdIn.resolves({ passphrase, data: password });
	inputUtils.getPassphrase.onFirstCall().resolves(passphrase);
	inputUtils.getPassphrase.onSecondCall().resolves(password);

	this.test.ctx.stdInInputs = [...stdInInputs, 'passphrase', 'password'];
}

export function thePasswordIsProvidedViaStdIn() {
	const { password, stdInInputs = [] } = this.test.ctx;
	const isDecryptPassphraseAction = hasAncestorWithTitleMatching(this.test, /Given an action "decrypt passphrase"/);
	const key = isDecryptPassphraseAction
		? 'passphrase'
		: 'data';

	inputUtils.getStdIn.resolves({ [key]: password });
	inputUtils.getPassphrase.resolves(password);

	this.test.ctx.stdInInputs = [...stdInInputs, 'password'];
}

export function thePassphraseAndTheMessageAreProvidedViaStdIn() {
	const { passphrase, message, stdInInputs = [] } = this.test.ctx;
	inputUtils.getStdIn.resolves({ passphrase, data: message });
	this.test.ctx.stdInInputs = [...stdInInputs, 'passphrase', 'message'];
}

export function theMessageIsProvidedViaStdIn() {
	const { message, stdInInputs = [] } = this.test.ctx;
	inputUtils.getStdIn.resolves({ data: message });
	this.test.ctx.stdInInputs = [...stdInInputs, 'message'];
}

export function inputs() {
	this.test.ctx.inputs = getQuotedStrings(this.test.parent.title);
}

export function anInput() {
	const input = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.input = input;
}

export function aSourceWithoutDelimiter() {
	this.test.ctx.source = getFirstQuotedString(this.test.parent.title);
}

export function aSourceWithDelimiter() {
	this.test.ctx.source = getFirstQuotedString(this.test.parent.title);
}

export function aPromptMessage() {
	this.test.ctx.promptMessage = getFirstQuotedString(this.test.parent.title);
}

export function aPromptDisplayName() {
	this.test.ctx.displayName = getFirstQuotedString(this.test.parent.title);
}

export function theSecondPassphraseIsProvidedViaThePrompt() {
	const { secondPassphrase } = this.test.ctx;
	this.test.ctx.vorpal.activeCommand.prompt.resolves({ secondPassphrase });
}

export function thePassphraseAndTheSecondPassphraseAreProvidedViaThePrompt() {
	const { passphrase, secondPassphrase } = this.test.ctx;
	this.test.ctx.vorpal.activeCommand.prompt.onFirstCall().resolves({ passphrase });
	this.test.ctx.vorpal.activeCommand.prompt.onSecondCall().resolves({ passphrase: secondPassphrase });
}

export function thePassphraseIsProvidedViaThePrompt() {
	const { vorpal, passphrase } = this.test.ctx;

	vorpal.activeCommand.prompt.onFirstCall().resolves({ passphrase });
	this.test.ctx.getPromptPassphraseCall = () => vorpal.activeCommand.prompt.firstCall;

	if (typeof inputUtils.getPassphrase.resolves === 'function') {
		inputUtils.getPassphrase.onFirstCall().resolves(passphrase);
		this.test.ctx.getGetPassphrasePassphraseCall = () => inputUtils.getPassphrase.firstCall;
	}
}

export function thePasswordIsProvidedViaThePrompt() {
	const { vorpal, password, getPromptPassphraseCall, getGetPassphrasePassphraseCall } = this.test.ctx;

	if (getPromptPassphraseCall) {
		vorpal.activeCommand.prompt.onSecondCall().resolves({ password });
	} else {
		vorpal.activeCommand.prompt.resolves({ password });
	}

	if (typeof inputUtils.getPassphrase.resolves === 'function') {
		if (getGetPassphrasePassphraseCall) {
			inputUtils.getPassphrase.onSecondCall().resolves(password);
			this.test.ctx.getGetPassphrasePasswordCall = () => inputUtils.getPassphrase.secondCall;
		} else {
			inputUtils.getPassphrase.resolves(password);
			this.test.ctx.getGetPassphrasePasswordCall = () => inputUtils.getPassphrase.firstCall;
		}
	}
}

export function thePassphraseShouldNotBeRepeated() {
	this.test.ctx.shouldRepeat = false;
}

export function thePassphraseShouldBeRepeated() {
	this.test.ctx.shouldRepeat = true;
}

export function thePassphraseIsNotSuccessfullyRepeated() {
	const { vorpal, passphrase } = this.test.ctx;
	vorpal.activeCommand.prompt.onSecondCall().resolves({
		passphrase: `${passphrase.slice(0, -1)}y`,
	});
}

export function thePassphraseIsSuccessfullyRepeated() {
	const { vorpal, passphrase } = this.test.ctx;
	vorpal.activeCommand.prompt.onSecondCall().resolves({ passphrase });
}

export function someData() {
	this.test.ctx.data = getFirstQuotedString(this.test.parent.title);
}

export function neitherThePassphraseNorTheDataIsProvidedViaStdIn() {
	sandbox.stub(readline, 'createInterface').returns(createFakeInterface(''));
}

export function thePasswordAndTheEncryptedPassphraseAreProvidedViaStdIn() {
	const { password, cipherAndIv: { cipher }, stdInInputs = [] } = this.test.ctx;

	sandbox.stub(readline, 'createInterface').returns(createFakeInterface(`${password}\n${cipher}`));
	if (typeof inputUtils.getStdIn.resolves === 'function') {
		inputUtils.getStdIn.resolves({ passphrase: password, data: cipher });
	}
	if (typeof inputUtils.getPassphrase.resolves === 'function') {
		inputUtils.getPassphrase.resolves(password);
	}

	this.test.ctx.dataIsRequired = true;
	this.test.ctx.stdInInputs = [...stdInInputs, 'passphrase'];
}

export function theEncryptedPassphraseIsProvidedViaStdIn() {
	const { cipherAndIv: { cipher }, stdInInputs = [] } = this.test.ctx;

	sandbox.stub(readline, 'createInterface').returns(createFakeInterface(cipher));
	if (typeof inputUtils.getStdIn.resolves === 'function') {
		inputUtils.getStdIn.resolves({ data: cipher });
	}

	this.test.ctx.dataIsRequired = true;
	this.test.ctx.stdInInputs = [...stdInInputs, 'passphrase'];
}

export function thePassphraseIsProvidedViaStdIn() {
	const { passphrase, stdInInputs = [] } = this.test.ctx;

	sandbox.stub(readline, 'createInterface').returns(createFakeInterface(passphrase));
	if (typeof inputUtils.getStdIn.resolves === 'function') {
		inputUtils.getStdIn.resolves({ passphrase });
	}

	this.test.ctx.passphraseIsRequired = true;
	this.test.ctx.stdInInputs = [...stdInInputs, 'passphrase'];
}

export function theDataIsProvidedViaStdIn() {
	const { data, stdInInputs = [] } = this.test.ctx;

	sandbox.stub(readline, 'createInterface').returns(createFakeInterface(data));

	this.test.ctx.dataIsRequired = true;
	this.test.ctx.stdInInputs = [...stdInInputs, 'data'];
}

export function bothThePassphraseAndTheDataAreProvidedViaStdIn() {
	const { passphrase, data, stdInInputs = [] } = this.test.ctx;

	sandbox.stub(readline, 'createInterface').returns(createFakeInterface(`${passphrase}\n${data}`));

	this.test.ctx.passphraseIsRequired = true;
	this.test.ctx.dataIsRequired = true;
	this.test.ctx.stdInInputs = [...stdInInputs, 'passphrase', 'data'];
}

export function thePassphraseIsStoredInEnvironmentalVariable() {
	const { passphrase } = this.test.ctx;
	const environmentalVariableName = getFirstQuotedString(this.test.parent.title);

	process.env[environmentalVariableName] = passphrase;

	this.test.ctx.environmentalVariableName = environmentalVariableName;
	this.test.ctx.passphraseSource = `env:${environmentalVariableName}`;
}

export function environmentalVariableIsNotSet() {
	const environmentalVariableName = getFirstQuotedString(this.test.parent.title);

	delete process.env[environmentalVariableName];

	this.test.ctx.environmentalVariableName = environmentalVariableName;
}

export function aPassphraseFilePath() {
	const { passphrase } = this.test.ctx;
	const filePath = getFirstQuotedString(this.test.parent.title);

	this.test.ctx.fileContents = `${passphrase}\nSome irrelevant text\non subsequent lines\n`;
	this.test.ctx.filePath = filePath;
	this.test.ctx.passphraseSource = `file:${filePath}`;
}

export function anUnknownPassphraseSource() {
	this.test.ctx.passphraseSource = 'unknownSource';
}

export function thePassphraseIsProvidedAsPlaintext() {
	const { passphrase } = this.test.ctx;
	this.test.ctx.passphraseSource = `pass:${passphrase}`;
}

export function aDataFilePath() {
	const { data } = this.test.ctx;
	const filePath = getFirstQuotedString(this.test.parent.title);

	this.test.ctx.fileContents = data;
	this.test.ctx.filePath = filePath;
}

export function noDataIsProvided() {}

export function dataIsProvidedViaStdIn() {
	const { data, stdInInputs = [] } = this.test.ctx;
	this.test.ctx.stdInData = data;
	this.test.ctx.stdInInputs = [...stdInInputs, 'data'];
}

export function dataIsProvidedAsAnArgument() {
	const { data } = this.test.ctx;
	this.test.ctx.argData = data;
}

export function dataIsProvidedViaAnUnknownSource() {
	this.test.ctx.sourceData = 'unknownSource';
}

export function dataIsProvidedViaAFileSource() {
	const { filePath } = this.test.ctx;
	this.test.ctx.sourceData = `file:${filePath}`;
}
