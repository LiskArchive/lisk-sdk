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
/* eslint-disable global-require, import/no-dynamic-require */
import os from 'os';
import fse from 'fs-extra';
import set from '../../src/commands/set';
import get from '../../src/commands/get';
import liskInstance from '../../src/utils/liskInstance';
import { setUpVorpalWithCommand } from './utils';

const configFilePath = `${os.homedir()}/.lisky/config.json`;
const writeConfig = config => fse.writeJsonSync(configFilePath, config, { spaces: '\t' });

const initialConfig = fse.readJsonSync(configFilePath);

const defaultConfig = {
	name: 'lisky',
	json: false,
	liskJS: {
		testnet: false,
	},
};

describe('set command', () => {
	let vorpal;
	let capturedOutput = [];

	beforeEach(() => {
		writeConfig(defaultConfig);
		vorpal = setUpVorpalWithCommand(set, capturedOutput);
	});

	afterEach(() => {
		// See https://github.com/dthree/vorpal/issues/230
		vorpal.ui.removeAllListeners();
		capturedOutput = [];
	});

	after(() => {
		writeConfig(initialConfig);
	});

	describe('should exist', () => {
		/* eslint-disable no-underscore-dangle */
		const filterCommand = vorpalCommand => vorpalCommand._name === 'set';
		let setCommand;

		beforeEach(() => {
			setCommand = vorpal.commands.filter(filterCommand)[0];
		});

		it('should be available', () => {
			(setCommand._args).should.be.length(2);
			(setCommand._name).should.be.equal('set');
		});

		it('should have 2 required inputs', () => {
			(setCommand._args[0].required).should.be.true();
			(setCommand._args[1].required).should.be.true();
		});
		/* eslint-enable */
	});

	it('should handle unknown config variables', () => {
		const invalidVariableCommand = 'set xxx true';
		return vorpal.exec(invalidVariableCommand, () => {
			(capturedOutput).should.be.eql(['Unsupported variable name.']);
		});
	});

	describe('should set json parameter', () => {
		const setJsonTrueCommand = 'set json true';
		const setJsonFalseCommand = 'set json false';
		const invalidValueCommand = 'set json tru';
		const getDelegateCommand = 'get delegate lightcurve';
		const setJsonTrueResult = 'Successfully set json output to true.';
		const setJsonFalseResult = 'Successfully set json output to false.';
		const invalidValueResult = 'Cannot set json output to tru.';

		const jsonProperty = 'json';

		afterEach(() => {
		});

		it('should set json to true', () => {
			return vorpal.exec(setJsonTrueCommand, () => {
				const config = fse.readJsonSync(configFilePath);

				(config).should.have.property(jsonProperty).be.true();
				(capturedOutput).should.be.eql([setJsonTrueResult]);
			});
		});

		it('should set json to false', () => {
			return vorpal.exec(setJsonFalseCommand, () => {
				const config = fse.readJsonSync(configFilePath);

				(config).should.have.property(jsonProperty).be.false();
				(capturedOutput).should.be.eql([setJsonFalseResult]);
			});
		});

		it('should set json to true and then to false', () => {
			return vorpal.exec(setJsonTrueCommand, () =>
				vorpal.exec(setJsonFalseCommand, () => {
					const config = fse.readJsonSync(configFilePath);

					(config).should.have.property(jsonProperty).be.false();
					(capturedOutput).should.be.eql([setJsonTrueResult, setJsonFalseResult]);
				}),
			);
		});

		it('should not set json to non-boolean values', () => {
			return vorpal.exec(setJsonTrueCommand, () =>
				vorpal.exec(invalidValueCommand, () => {
					const config = fse.readJsonSync(configFilePath);

					(config).should.have.property(jsonProperty).be.true();
					(capturedOutput).should.be.eql([setJsonTrueResult, invalidValueResult]);
				}),
			);
		});

		it('should have an immediate effect', () => {
			vorpal.use(get);

			return vorpal.exec(setJsonTrueCommand)
				.then(() => vorpal.exec(getDelegateCommand))
				.then(() => {
					(() => JSON.parse(capturedOutput[1])).should.not.throw();
					return vorpal.exec(setJsonFalseCommand);
				})
				.then(() => vorpal.exec(getDelegateCommand))
				.then(() => {
					(() => JSON.parse(capturedOutput[3])).should.throw();
				});
		});
	});

	describe('switch testnet and mainnet', () => {
		const setTestnetTrueCommand = 'set testnet true';
		const setTestnetFalseCommand = 'set testnet false';
		const invalidValueCommand = 'set testnet tru';
		const setTestnetTrueResult = 'Successfully set testnet to true.';
		const setTestnetFalseResult = 'Successfully set testnet to false.';
		const invalidValueResult = 'Cannot set testnet to tru.';

		const testnetProperties = ['liskJS', 'testnet'];

		let stub;

		beforeEach(() => {
			stub = sinon.stub(liskInstance, 'setTestnet');
		});

		afterEach(() => {
			stub.restore();
		});

		it('should set testnet to true', () => {
			return vorpal.exec(setTestnetTrueCommand, () => {
				const config = fse.readJsonSync(configFilePath);

				(stub.calledWithExactly(true)).should.be.true();
				(config)
					.should.have.property(testnetProperties[0])
					.have.property(testnetProperties[1])
					.be.true();
				(capturedOutput).should.be.eql([setTestnetTrueResult]);
			});
		});

		it('should set testnet to false', () => {
			return vorpal.exec(setTestnetFalseCommand, () => {
				const config = fse.readJsonSync(configFilePath);

				(stub.calledWithExactly(false)).should.be.true();
				(config)
					.should.have.property(testnetProperties[0])
					.have.property(testnetProperties[1])
					.be.false();
				(capturedOutput).should.be.eql([setTestnetFalseResult]);
			});
		});

		it('should not set testnet to non-boolean values', () => {
			return vorpal.exec(setTestnetTrueCommand, () =>
				vorpal.exec(invalidValueCommand, () => {
					const config = fse.readJsonSync(configFilePath);

					(stub.calledWithExactly(true)).should.be.true();
					(config)
						.should.have.property(testnetProperties[0])
						.have.property(testnetProperties[1])
						.be.true();
					(capturedOutput).should.be.eql([setTestnetTrueResult, invalidValueResult]);
				}),
			);
		});
	});
});
