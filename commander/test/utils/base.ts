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
import os from 'os';
import { test, expect } from '@oclif/test';
import BaseCommand, { defaultConfigFolder } from '../../src/base';
import * as configUtils from '../../src/utils/config';
import * as printUtils from '../../src/utils/print';

describe('base command', () => {
	const defaultFlags = {
		some: 'flag',
	};
	const defaultConfig = {
		name: 'lisk-commander',
	};
	const configFolder = './some/folder';

	const printMethodStub = sandbox.stub();

	class BaseExtended extends BaseCommand {
		async run(): Promise<void> {}
	}

	const setupTest = () => {
		const command = new BaseExtended([], {} as any);
		return test
			.stub(command, 'parse', sandbox.stub().returns({ flags: defaultFlags }))
			.stub(command, 'error', sandbox.stub())
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(configUtils, 'getConfig', sandbox.stub().returns(defaultConfig))
			.add('command', () => command);
	};

	describe('#init', () => {
		setupTest()
			.env({ LISK_COMMANDER_CONFIG_DIR: undefined })
			.do(async ctx => ctx.command.init())
			.it('should set XDG_CONFIG_HOME to default value', () =>
				expect(process.env.XDG_CONFIG_HOME).to.equal(
					`${os.homedir()}/${defaultConfigFolder}`,
				),
			);

		setupTest()
			.env({ LISK_COMMANDER_CONFIG_DIR: configFolder })
			.do(async ctx => ctx.command.init())
			.it('should set XDG_CONFIG_HOME to LISK_COMMANDER_CONFIG_DIR', () =>
				expect(process.env.XDG_CONFIG_HOME).to.equal(configFolder),
			);

		setupTest()
			.env({ LISK_COMMANDER_CONFIG_DIR: configFolder })
			.do(async ctx => ctx.command.init())
			.it(
				'should call getConfig with the config folder set by the environment variable',
				() =>
					expect(configUtils.getConfig).to.be.calledWithExactly(configFolder),
			);

		setupTest()
			.do(async ctx => ctx.command.init())
			.it(
				'should set the flags to the return value of the parse function',
				ctx => expect(ctx.command.printFlags).to.equal(defaultFlags),
			);

		setupTest()
			.do(async ctx => ctx.command.init())
			.it(
				'should set the userConfig to the return value of the getConfig',
				ctx => expect(ctx.command.userConfig).to.equal(defaultConfig),
			);
	});

	describe('#finally', () => {
		const errorMsg = 'some error';

		setupTest()
			.do(async ctx => {
				const error = new Error(errorMsg);
				return ctx.command.finally(error);
			})
			.it('should log error with the message', ctx =>
				expect(ctx.command.error).to.be.calledWithExactly(errorMsg),
			);

		setupTest()
			.do(async ctx => ctx.command.finally(errorMsg))
			.it('should log error with input', ctx =>
				expect(ctx.command.error).to.be.calledWithExactly(errorMsg),
			);

		setupTest()
			.do(async ctx => ctx.command.finally())
			.it(
				'should do nothing if no error is provided',
				ctx => expect(ctx.command.error).not.to.be.called,
			);
	});

	describe('#print', () => {
		const result = {
			some: 'result',
		};

		setupTest()
			.env({ XDG_CONFIG_HOME: 'home' })
			.do(async ctx => ctx.command.print(result, true))
			.it(
				'should call getConfig with the process.env.XDG_CONFIG_HOME when readAgain is true',
				() =>
					expect(configUtils.getConfig).to.be.calledWithExactly(
						process.env.XDG_CONFIG_HOME,
					),
			);

		setupTest()
			.do(async ctx => {
				ctx.command.userConfig = {} as any;
				return ctx.command.print(result);
			})
			.it(
				'should not call getConfig when readAgain is falsy',
				() => expect(configUtils.getConfig).not.to.be.called,
			);

		setupTest()
			.do(async ctx => {
				ctx.command.userConfig = {} as any;
				return ctx.command.print(result);
			})
			.it('should call print method with the result', () =>
				expect(printMethodStub).to.be.calledWithExactly(result),
			);

		setupTest()
			.do(async ctx => {
				ctx.command.userConfig = {
					json: false,
				} as any;
				return ctx.command.print(result);
			})
			.it('should call print with the userConfig', () =>
				expect(printUtils.print).to.be.calledWithExactly({
					json: false,
					pretty: undefined,
				}),
			);

		setupTest()
			.add('overwritingFlags', {
				json: true,
				pretty: false,
			})
			.do(async ctx => {
				ctx.command.userConfig = {
					json: false,
					pretty: true,
				} as any;
				ctx.command.printFlags = ctx.overwritingFlags;
				ctx.command.print(result);
			})
			.it('should call print method with flags overriding the config', ctx =>
				expect(printUtils.print).to.be.calledWithExactly(ctx.overwritingFlags),
			);
	});
});
