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
} from '../../../src/utils/input/index';
// Required for stubbing
const inputUtils = require('../../../src/utils/input/utils');

describe('input utils', () => {
	describe('#getFirstLineFromString', () => {
		it('should returns null when it is not string', () => {
			return expect(getFirstLineFromString({})).to.be.null;
		});

		it('should returns first line of string', () => {
			const multiline = 'This is some text\nthat spans\nmultiple lines';
			const firstline = 'This is some text';
			return expect(getFirstLineFromString(multiline)).to.equal(firstline);
		});
	});
	describe('#getInputsFromSources', () => {
		let getStdinStub;
		let getPassphraseStub;
		let getDataStub;

		beforeEach(() => {
			getStdinStub = sandbox.stub(inputUtils, 'getStdIn').resolves({
				passphrase: null,
				password: null,
				secondPassphrase: null,
				data: null,
			});
			getPassphraseStub = sandbox.stub(inputUtils, 'getPassphrase');
			getDataStub = sandbox.stub(inputUtils, 'getData');
			return Promise.resolve();
		});

		describe('get passphrase', async () => {
			const inputs = {
				passphrase: {
					source: 'prompt',
					repeatPrompt: true,
				},
			};

			it('should call getPassphrase when std is not used', async () => {
				await getInputsFromSources(inputs);
				return expect(getPassphraseStub).to.be.calledWithExactly(
					inputs.passphrase.source,
					{ shouldRepeat: true },
				);
			});

			it('should resolve to stdin', async () => {
				const stdin = 'some passphrase';
				getStdinStub.resolves({
					passphrase: stdin,
				});
				const result = await getInputsFromSources(inputs);
				expect(getPassphraseStub).not.to.be.called;
				return expect(result.passphrase).to.equal(stdin);
			});

			it('should resolve to null when input is not supplied', async () => {
				const result = await getInputsFromSources({});
				expect(getPassphraseStub).not.to.be.called;
				return expect(result.passphrase).to.be.null;
			});
		});

		describe('get secondPassphrase', async () => {
			const inputs = {
				secondPassphrase: {
					source: 'prompt',
					repeatPrompt: true,
				},
			};

			it('should call getPassphrase when std is not used', async () => {
				await getInputsFromSources(inputs);
				return expect(getPassphraseStub).to.be.calledWithExactly(
					inputs.secondPassphrase.source,
					{
						displayName: 'your second secret passphrase',
						shouldRepeat: true,
					},
				);
			});

			it('should resolve to stdin', async () => {
				const stdin = 'some passphrase';
				getStdinStub.resolves({
					secondPassphrase: stdin,
				});
				const result = await getInputsFromSources(inputs);
				expect(getPassphraseStub).not.to.be.called;
				return expect(result.secondPassphrase).to.equal(stdin);
			});

			it('should resolve to null when input is not supplied', async () => {
				const result = await getInputsFromSources({});
				expect(getPassphraseStub).not.to.be.called;
				return expect(result.secondPassphrase).to.be.null;
			});
		});

		describe('get password', async () => {
			const inputs = {
				password: {
					source: 'prompt',
					repeatPrompt: true,
				},
			};

			it('should call getPassphrase when std is not used', async () => {
				await getInputsFromSources(inputs);
				return expect(getPassphraseStub).to.be.calledWithExactly(
					inputs.password.source,
					{
						displayName: 'your password',
						shouldRepeat: true,
					},
				);
			});

			it('should resolve to stdin', async () => {
				const stdin = 'some password';
				getStdinStub.resolves({
					password: stdin,
				});
				const result = await getInputsFromSources(inputs);
				expect(getPassphraseStub).not.to.be.called;
				return expect(result.password).to.equal(stdin);
			});

			it('should resolve to null when input is not supplied', async () => {
				const result = await getInputsFromSources({});
				expect(getPassphraseStub).not.to.be.called;
				return expect(result.password).to.be.null;
			});
		});

		describe('get data', async () => {
			const inputs = {
				data: {
					source: 'prompt',
				},
			};

			it('should call getData when std is not used', async () => {
				await getInputsFromSources(inputs);
				expect(getPassphraseStub).not.to.be.called;
				return expect(getDataStub).to.be.calledWithExactly(inputs.data.source);
			});

			it('should resolve to stdin', async () => {
				const stdin = 'random data';
				getStdinStub.resolves({
					data: stdin,
				});
				const result = await getInputsFromSources(inputs);
				expect(getDataStub).not.to.be.called;
				expect(getPassphraseStub).not.to.be.called;
				return expect(result.data).to.equal(stdin);
			});

			it('should resolve to null when input is not supplied', async () => {
				const result = await getInputsFromSources({});
				expect(getPassphraseStub).not.to.be.called;
				return expect(result.password).to.be.null;
			});
		});
	});
});
