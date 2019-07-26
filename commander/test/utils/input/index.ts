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
import { expect } from 'chai';
import {
	getInputsFromSources,
	getFirstLineFromString,
} from '../../../src/utils/input/index';
import * as inputUtils from '../../../src/utils/input/utils';
import { SinonStub } from 'sinon';

describe('input utils', () => {
	describe('#getFirstLineFromString', () => {
		it('should return null when input is not a string', () => {
			return expect(getFirstLineFromString({})).to.be.undefined;
		});

		it('should return first line of string', () => {
			const firstline = 'This is some text';
			return expect(getFirstLineFromString(firstline)).to.equal(firstline);
		});

		it('should return first line of string with delimiter', () => {
			const multiline = 'This is some text\nthat spans\nmultiple lines';
			const firstline = 'This is some text';
			return expect(getFirstLineFromString(multiline)).to.equal(firstline);
		});
	});

	describe('#getInputsFromSources', () => {
		let getStdInStub: SinonStub;

		beforeEach(() => {
			getStdInStub = sandbox.stub(inputUtils, 'getStdIn').resolves({
				passphrase: undefined,
				password: undefined,
				secondPassphrase: undefined,
				data: undefined,
			});
			sandbox.stub(inputUtils, 'getPassphrase');
			sandbox.stub(console, 'warn').returns('');
			return sandbox.stub(inputUtils, 'getData');
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
				return expect(inputUtils.getPassphrase).to.be.calledWithExactly(
					inputs.passphrase.source,
					{ shouldRepeat: true },
				);
			});

			it('should resolve to stdin', async () => {
				const stdin = 'some passphrase';
				getStdInStub.resolves({
					passphrase: stdin,
				});
				const result = await getInputsFromSources(inputs);
				expect(inputUtils.getPassphrase).not.to.be.called;
				return expect(result.passphrase).to.equal(stdin);
			});

			it('should resolve to undefined when input is not supplied', async () => {
				const result = await getInputsFromSources({});
				expect(inputUtils.getPassphrase).not.to.be.called;
				return expect(result.passphrase).to.be.undefined;
			});

			it('should print a warning if passphase not in mnemonic format', async () => {
				const stdin = 'some passphrase';
				getStdInStub.resolves({
					passphrase: stdin,
				});
				await getInputsFromSources(inputs);
				return expect(console.warn).to.be.calledWithExactly(
					'Warning: Passphrase contains 2 words instead of expected 12. Passphrase contains 1 whitespaces instead of expected 11. ',
				);
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
				return expect(inputUtils.getPassphrase).to.be.calledWithExactly(
					inputs.secondPassphrase.source,
					{
						displayName: 'your second secret passphrase',
						shouldRepeat: true,
					},
				);
			});

			it('should resolve to stdin', async () => {
				const stdin = 'some passphrase';
				getStdInStub.resolves({
					secondPassphrase: stdin,
				});
				const result = await getInputsFromSources(inputs);
				expect(inputUtils.getPassphrase).not.to.be.called;
				return expect(result.secondPassphrase).to.equal(stdin);
			});

			it('should resolve to undefined when input is not supplied', async () => {
				const result = await getInputsFromSources({});
				expect(inputUtils.getPassphrase).not.to.be.called;
				return expect(result.secondPassphrase).to.be.undefined;
			});

			it('should print a warning if secondPassphase not in mnemonic format', async () => {
				const stdin = 'some passphrase';
				getStdInStub.resolves({
					secondPassphrase: stdin,
				});
				await getInputsFromSources(inputs);
				return expect(console.warn).to.be.calledWithExactly(
					'Warning: Passphrase contains 2 words instead of expected 12. Passphrase contains 1 whitespaces instead of expected 11. ',
				);
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
				return expect(inputUtils.getPassphrase).to.be.calledWithExactly(
					inputs.password.source,
					{
						displayName: 'your password',
						shouldRepeat: true,
					},
				);
			});

			it('should resolve to stdin', async () => {
				const stdin = 'some password';
				getStdInStub.resolves({
					password: stdin,
				});
				const result = await getInputsFromSources(inputs);
				expect(inputUtils.getPassphrase).not.to.be.called;
				return expect(result.password).to.equal(stdin);
			});

			it('should resolve to undefined when input is not supplied', async () => {
				const result = await getInputsFromSources({});
				expect(inputUtils.getPassphrase).not.to.be.called;
				return expect(result.password).to.be.undefined;
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
				expect(inputUtils.getPassphrase).not.to.be.called;
				return expect(inputUtils.getData).to.be.calledWithExactly(
					inputs.data.source,
				);
			});

			it('should resolve to stdin', async () => {
				const stdin = 'random data';
				getStdInStub.resolves({
					data: stdin,
				});
				const result = await getInputsFromSources(inputs);
				expect(inputUtils.getData).not.to.be.called;
				expect(inputUtils.getPassphrase).not.to.be.called;
				return expect(result.data).to.equal(stdin);
			});

			it('should resolve to undefined when input is not supplied', async () => {
				const result = await getInputsFromSources({});
				expect(inputUtils.getPassphrase).not.to.be.called;
				return expect(result.password).to.be.undefined;
			});
		});
	});
});
