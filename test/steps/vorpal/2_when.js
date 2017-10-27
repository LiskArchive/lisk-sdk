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
	wrapActionCreator,
	createCommand,
} from '../../../src/utils/helpers';
import * as inputUtils from '../../../src/utils/input';
import execFile from '../../../src/execFile';
import {
	getFirstQuotedString,
} from '../utils';

export function theActionIsCalledWithTheIVAndTheOptions() {
	const { action, cipherAndIv: { iv }, options } = this.test.ctx;
	const returnValue = action({ iv, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheIVTheEncryptedPassphraseAndTheOptions() {
	const { action, cipherAndIv: { cipher: passphrase, iv }, options } = this.test.ctx;

	inputUtils.getData.onFirstCall().resolves(passphrase);

	const returnValue = action({ iv, passphrase, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function execFileIsCalledWithTheLiskyInstanceTheFilePathAndTheExitFunction() {
	const { lisky, filePath, exit } = this.test.ctx;
	try {
		const returnValue = execFile(lisky, filePath, null, exit);
		this.test.ctx.returnValue = returnValue;
		return returnValue.catch(e => e);
	} catch (error) {
		const testFunction = execFile.bind(null, lisky, filePath, null, exit);
		this.test.ctx.testFunction = testFunction;
		return testFunction;
	}
}

export function execFileIsCalledWithTheLiskyInstanceTheFilePathTheOptionsAndTheExitFunction() {
	const { lisky, filePath, options, exit } = this.test.ctx;
	try {
		const returnValue = execFile(lisky, filePath, options, exit);
		this.test.ctx.returnValue = returnValue;
		return returnValue.catch(e => e);
	} catch (error) {
		const testFunction = execFile.bind(null, lisky, filePath, options, exit);
		this.test.ctx.testFunction = testFunction;
		return testFunction;
	}
}

export function theActionIsCalledWithTheMessageTheNonceTheSenderPublicKeyAndTheOptions() {
	const { action, message, nonce, senderPublicKey, options } = this.test.ctx;
	const returnValue = action({ message, nonce, senderPublicKey, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheNonceTheSenderPublicKeyAndTheOptions() {
	const { action, nonce, senderPublicKey, options } = this.test.ctx;
	const returnValue = action({ nonce, senderPublicKey, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheRecipientAndTheOptions() {
	const { action, recipient, options } = this.test.ctx;
	const returnValue = action({ recipient, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheRecipientTheMessageAndTheOptions() {
	const { action, recipient, message, options } = this.test.ctx;
	const returnValue = action({ recipient, message, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheTypeAndTheInputs() {
	const { action, type, inputs } = this.test.ctx;
	const returnValue = action({ type, inputs });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheTypeAndTheInput() {
	const { action, type, input } = this.test.ctx;
	const returnValue = action({ type, input });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheVariableAndTheValue() {
	const { action, variable, value } = this.test.ctx;
	const returnValue = action({ variable, value });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheOptions() {
	const { action, options } = this.test.ctx;
	const returnValue = action({ options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalled() {
	const { action } = this.test.ctx;
	const returnValue = action();
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theCommandIsExecuted() {
	const { vorpal } = this.test.ctx;
	const commandToExecute = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.returnValue = vorpal.exec(commandToExecute);
}

export function theCreatedCommandIsCalledWithTheVorpalInstance() {
	const { createdCommand, vorpal } = this.test.ctx;
	this.test.ctx.returnValue = createdCommand(vorpal);
}

export function createCommandIsCalledWithAnObjectContainingTheCommandTheAutocompleteListTheDescriptionTheAliasTheActionCreatorTheOptionsListAndThePrefix() {
	const {
		command,
		autocompleteList: autocomplete,
		description,
		alias,
		actionCreator,
		optionsList: options,
		prefix: errorPrefix,
	} = this.test.ctx;
	this.test.ctx.createdCommand = createCommand({
		command,
		autocomplete,
		description,
		alias,
		actionCreator,
		options,
		errorPrefix,
	});
}

export function theWrappedActionCreatorIsCalledWithTheParameters() {
	const { returnValue: wrappedActionCreator, parameters } = this.test.ctx;
	const returnValue = wrappedActionCreator(parameters);
	this.test.ctx.returnValue = returnValue;
	return returnValue;
}

export function wrapActionCreatorIsCalledWithTheVorpalInstanceTheActionCreatorAndThePrefix() {
	const { vorpal, actionCreator, prefix } = this.test.ctx;
	this.test.ctx.returnValue = wrapActionCreator(vorpal, actionCreator, prefix);
}
