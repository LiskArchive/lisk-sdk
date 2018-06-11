/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import { wrapActionCreator, createCommand } from '../../../src/utils/helpers';
import execFile from '../../../src/exec_file';
import { getFirstQuotedString } from '../utils';

export function theActionIsCalledWithTheOptionsTheMessageThePublicKeyAndTheSignature() {
	const { action, options, message, publicKey, signature } = this.test.ctx;
	const returnValue = action({ options, publicKey, signature, message });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheStringifiedTransactionObject() {
	const { action, transaction } = this.test.ctx;
	const returnValue = action({ transaction });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheStringifiedTransactionObjectAndOptions() {
	const { action, transaction, options } = this.test.ctx;
	const returnValue = action({ transaction, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheCorruptedStringifiedTransactionObject() {
	const { action, transaction } = this.test.ctx;
	const currupted = transaction.slice(0, 10);
	const returnValue = action({ transaction: currupted });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheStringifiedTransactionObjectViaVorpalStdIn() {
	const { action, transaction } = this.test.ctx;
	const returnValue = action({ stdin: [transaction] });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheStringifiedTransactionObjectViaVorpalStdInAndOptions() {
	const { action, transaction, options } = this.test.ctx;
	const returnValue = action({ stdin: [transaction], options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheTransactionAndOptionsObjectContainsSecondPublicKeyAsFileInput() {
	const { action, transaction, options } = this.test.ctx;
	const returnValue = action({ transaction, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheTransactionViaVorpalStdInAndOptionsObjectContainsSecondPublicKey() {
	const { action, transaction, options } = this.test.ctx;
	const returnValue = action({ stdin: [transaction], options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheOptionsThePublicKeyAndTheSignature() {
	const { action, options, publicKey, signature } = this.test.ctx;
	const returnValue = action({ options, publicKey, signature });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheOptionsAndThePublicKey() {
	const { action, options, publicKey } = this.test.ctx;
	const returnValue = action({ options, publicKey });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheSignatureAndTheStringifiedErrorObjectViaVorpalStdIn() {
	const { action, signature, errorObject } = this.test.ctx;
	const returnValue = action({
		signature,
		stdin: [JSON.stringify(errorObject)],
	});
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheSignature() {
	const { action, signature } = this.test.ctx;
	const returnValue = action({ signature });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheSignatureViaVorpalStdIn() {
	const { action, signature } = this.test.ctx;
	const returnValue = action({ stdin: [signature] });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheTransactionAndTheStringifiedErrorObjectViaVorpalStdIn() {
	const { action, transaction, errorObject } = this.test.ctx;
	const returnValue = action({
		transaction,
		stdin: [JSON.stringify(errorObject)],
	});
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheStringifiedErrorObjectViaVorpalStdIn() {
	const { action, errorObject } = this.test.ctx;
	const returnValue = action({ stdin: [JSON.stringify(errorObject)] });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheTransaction() {
	const { action, transaction } = this.test.ctx;
	const returnValue = action({ transaction });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheTransactionViaVorpalStdIn() {
	const { action, transaction } = this.test.ctx;
	const returnValue = action({ stdin: [transaction] });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheKeysgroupTheLifetimeTheMinimumNumberOfSignaturesAndTheOptions() {
	const { action, lifetime, keysgroup, minimum, options } = this.test.ctx;
	const returnValue = action({
		lifetime: lifetime.toString(),
		keysgroup,
		minimum: minimum.toString(),
		options,
	});
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheAmountTheAddressAndTheOptions() {
	const { action, amount, address, options } = this.test.ctx;
	const returnValue = action({ amount, address, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheMessageAndTheOptions() {
	const { action, message, options } = this.test.ctx;
	const returnValue = action({ message, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheDelegateUsernameAndTheOptions() {
	const { action, delegateUsername: username, options } = this.test.ctx;
	const returnValue = action({ username, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheEncryptedPassphraseAndTheOptions() {
	const { action, encryptedPassphrase, options } = this.test.ctx;

	const returnValue = action({ encryptedPassphrase, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function execFileIsCalledWithTheLiskCommanderInstanceTheFilePathAndTheExitFunction() {
	const { liskCommander, filePath, exit } = this.test.ctx;
	try {
		const returnValue = execFile(liskCommander, filePath, null, exit);
		this.test.ctx.returnValue = returnValue;
		return returnValue.catch(e => e);
	} catch (error) {
		const testFunction = execFile.bind(
			null,
			liskCommander,
			filePath,
			null,
			exit,
		);
		this.test.ctx.testFunction = testFunction;
		return testFunction;
	}
}

export function execFileIsCalledWithTheLiskCommanderInstanceTheFilePathTheOptionsAndTheExitFunction() {
	const { liskCommander, filePath, options, exit } = this.test.ctx;
	const returnValue = execFile(liskCommander, filePath, options, exit);
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheMessageTheNonceTheSenderPublicKeyAndTheOptions() {
	const { action, message, nonce, senderPublicKey, options } = this.test.ctx;
	const returnValue = action({
		message,
		nonce,
		senderPublicKey,
		options,
	});
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

export function theActionIsCalledWithTheTypeTheInputsAndTheOptions() {
	const { action, type, inputs, options } = this.test.ctx;
	const returnValue = action({ type, inputs, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheTypeTheInputAndTheOptions() {
	const { action, type, input, options } = this.test.ctx;
	const returnValue = action({ type, input, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheVariableAndTheValues() {
	const { action, variable, values } = this.test.ctx;
	const returnValue = action({ variable, values });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheOptions() {
	const { action, options } = this.test.ctx;
	const returnValue = action({ options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions() {
	const { action, status, publicKey, options } = this.test.ctx;
	const returnValue = action({ status, publicKey, options });
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theActionIsCalled() {
	const { action } = this.test.ctx;
	const returnValue = action({});
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theCommandIsExecuted() {
	const { vorpal } = this.test.ctx;
	const commandToExecute = getFirstQuotedString(this.test.parent.title);
	const returnValue = vorpal.exec(commandToExecute);
	this.test.ctx.returnValue = returnValue;
	return returnValue;
}

export function theCreatedCommandIsCalledWithTheVorpalInstance() {
	const { createdCommand, vorpal } = this.test.ctx;
	const returnValue = createdCommand(vorpal);
	this.test.ctx.returnValue = returnValue;
	return returnValue;
}

export function createCommandIsCalledWithAnObjectContainingTheCommandTheAutocompleteListTheDescriptionTheActionCreatorTheOptionsListAndThePrefix() {
	const {
		command,
		autocompleteList: autocomplete,
		description,
		actionCreator,
		optionsList: options,
		prefix: errorPrefix,
	} = this.test.ctx;
	this.test.ctx.createdCommand = createCommand({
		command,
		autocomplete,
		description,
		actionCreator,
		options,
		errorPrefix,
	});
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
