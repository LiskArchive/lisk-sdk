/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import * as passphraseModule from '@liskhq/lisk-passphrase';
import { getData, getPassphrase, getStdIn } from './utils';

export const getFirstLineFromString = (multilineString: unknown) =>
	typeof multilineString === 'string'
		? multilineString.split(/[\r\n]+/)[0]
		: undefined;

interface InputSource {
	readonly repeatPrompt?: boolean;
	readonly source?: string;
}

interface InputFromSourceInputs {
	readonly data?: InputSource;
	readonly passphrase?: InputSource;
	readonly password?: InputSource;
	readonly secondPassphrase?: InputSource;
}

export interface InputFromSourceOutput {
	readonly data?: string;
	readonly passphrase?: string;
	readonly password?: string;
	readonly secondPassphrase?: string;
}

interface MnemonicError {
	readonly code: string;
	readonly message: string;
}

export const getInputsFromSources = async ({
	passphrase: passphraseInput,
	secondPassphrase: secondPassphraseInput,
	password: passwordInput,
	data: dataInput,
}: InputFromSourceInputs): Promise<InputFromSourceOutput> => {
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
			: stdIn.passphrase || undefined;

	const secondPassphrase =
		typeof stdIn.secondPassphrase !== 'string' && secondPassphraseInput
			? await getPassphrase(secondPassphraseInput.source, {
					displayName: 'your second secret passphrase',
					shouldRepeat: secondPassphraseInput.repeatPrompt,
			  })
			: stdIn.secondPassphrase || undefined;

	const passphraseErrors = [passphrase, secondPassphrase]
		.filter(Boolean)
		.map(pass =>
			passphraseModule.validation
				.getPassphraseValidationErrors(pass as string)
				.filter((error: MnemonicError) => error.message),
		);

	passphraseErrors.forEach(errors => {
		if (errors.length > 0) {
			const passphraseWarning = errors
				.filter((error: MnemonicError) => error.code !== 'INVALID_MNEMONIC')
				.reduce(
					(accumulator: string, error: MnemonicError) =>
						accumulator.concat(
							`${error.message.replace(' Please check the passphrase.', '')} `,
						),
					'Warning: ',
				);
			// tslint:disable-next-line no-console
			console.warn(passphraseWarning);
		}
	});

	const password =
		typeof stdIn.password !== 'string' && passwordInput
			? await getPassphrase(passwordInput.source, {
					displayName: 'your password',
					shouldRepeat: passwordInput.repeatPrompt,
			  })
			: stdIn.password || undefined;

	const data =
		typeof stdIn.data !== 'string' && dataInput
			? await getData(dataInput.source)
			: stdIn.data || undefined;

	return {
		passphrase,
		secondPassphrase,
		password,
		data,
	};
};
