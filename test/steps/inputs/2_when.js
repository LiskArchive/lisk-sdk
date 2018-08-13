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
import getInputsFromSources, {
	getFirstLineFromString,
} from '../../../src/utils/input/';
import * as inputUtils from '../../../src/utils/input/utils';

export function getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions() {
	const { vorpal, options } = this.test.ctx;
	const returnValue = getInputsFromSources(vorpal, options);
	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function theSourceIsSplit() {
	const { source } = this.test.ctx;
	this.test.ctx.returnValue = inputUtils.splitSource(source);
}

export function createPromptOptionsIsCalledWithTheMessage() {
	const { promptMessage } = this.test.ctx;
	this.test.ctx.returnValue = inputUtils.createPromptOptions(promptMessage);
}

export function getPassphraseFromPromptIsCalled() {
	const { vorpal, displayName, shouldRepeat } = this.test.ctx;
	const returnValue = inputUtils.getPassphraseFromPrompt(vorpal, {
		displayName,
		shouldRepeat,
	});

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getStdInIsCalledWithTheRelevantOptions() {
	const {
		passphraseIsRequired,
		secondPassphraseIsRequired,
		passwordIsRequired,
		dataIsRequired,
	} = this.test.ctx;
	const options =
		passphraseIsRequired ||
		secondPassphraseIsRequired ||
		passwordIsRequired ||
		dataIsRequired
			? {
					passphraseIsRequired,
					secondPassphraseIsRequired,
					passwordIsRequired,
					dataIsRequired,
				}
			: undefined;
	const returnValue = inputUtils.getStdIn(options);

	this.test.ctx.returnValue = returnValue;
	return returnValue;
}

export function getPassphraseFromEnvVariableIsCalled() {
	const { environmentalVariableName, displayName } = this.test.ctx;
	const returnValue = inputUtils.getPassphraseFromEnvVariable(
		environmentalVariableName,
		displayName,
	);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getPassphraseFromFileIsCalledOnThePath() {
	const { filePath } = this.test.ctx;
	const returnValue = inputUtils.getPassphraseFromFile(filePath);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getPassphraseFromFileIsCalledOnThePathAndAnUnknownErrorOccurs() {
	const { filePath } = this.test.ctx;
	const returnValue = inputUtils.getPassphraseFromFile(filePath);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getPassphraseFromSourceIsCalledWithTheRelevantSource() {
	const { passphraseSource, displayName } = this.test.ctx;
	const returnValue = inputUtils.getPassphraseFromSource(passphraseSource, {
		displayName,
	});

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getPassphraseIsPassedASourceButNoPassphrase() {
	const { passphraseSource } = this.test.ctx;
	const returnValue = inputUtils.getPassphrase(null, passphraseSource);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getPassphraseIsPassedNeitherASourceNorAPassphrase() {
	const { vorpal } = this.test.ctx;
	const returnValue = inputUtils.getPassphrase(vorpal);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getFirstLineFromStringIsCalledOnTheString() {
	const { testString } = this.test.ctx;
	this.test.ctx.returnValue = getFirstLineFromString(testString);
}

export function getDataFromFileIsCalledWithThePath() {
	const { filePath } = this.test.ctx;
	const returnValue = inputUtils.getDataFromFile(filePath);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}

export function getDataIsCalledWithTheSource() {
	const { sourceData } = this.test.ctx;
	const returnValue = inputUtils.getData(sourceData);

	this.test.ctx.returnValue = returnValue;
	return returnValue.catch(e => e);
}
