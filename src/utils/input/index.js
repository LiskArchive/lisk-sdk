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
import { getStdIn, getPassphrase, getData } from './utils';

export const getFirstLineFromString = multilineString =>
	typeof multilineString === 'string'
		? multilineString.split(/[\r\n]+/)[0]
		: null;

const getInputsFromSources = async ({
	passphrase: passphraseInput,
	secondPassphrase: secondPassphraseInput,
	password: passwordInput,
	data: dataInput,
}) => {
	const [
		passphraseIsRequired,
		secondPassphraseIsRequired,
		passwordIsRequired,
		dataIsRequired,
	] = [passphraseInput, secondPassphraseInput, passwordInput, dataInput].map(
		input => !!input && input.source === 'stdin',
	);

	const stdIn = await getStdIn({
		passphraseIsRequired,
		secondPassphraseIsRequired,
		passwordIsRequired,
		dataIsRequired,
	});

	const passphrase =
		typeof stdIn.passphrase !== 'string' && passphraseInput
			? await getPassphrase(passphraseInput.source, {
					shouldRepeat: passphraseInput.repeatPrompt,
				})
			: stdIn.passphrase || null;

	const secondPassphrase =
		typeof stdIn.secondPassphrase !== 'string' && secondPassphraseInput
			? await getPassphrase(secondPassphraseInput.source, {
					displayName: 'your second secret passphrase',
					shouldRepeat: secondPassphraseInput.repeatPrompt,
				})
			: stdIn.secondPassphrase || null;

	const password =
		typeof stdIn.password !== 'string' && passwordInput
			? await getPassphrase(passwordInput.source, {
					displayName: 'your password',
					shouldRepeat: passwordInput.repeatPrompt,
				})
			: stdIn.password || null;

	const data =
		typeof stdIn.data !== 'string' && dataInput
			? await getData(dataInput.source)
			: stdIn.data || null;

	return {
		passphrase,
		secondPassphrase,
		password,
		data,
	};
};

export default getInputsFromSources;
