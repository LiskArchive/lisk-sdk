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
import os from 'os';
import { test } from '@oclif/test';
import BaseCommand, { defaultConfigFolder } from '../src/base';
import * as config from '../src/utils/config';
import * as print from '../src/utils/print';

describe('base command', () => {
	const defaultFlags = {
		some: 'flag',
	};
	const defaultConfig = {
		name: 'lisk-commander',
	};
	const configFolder = './some/folder';

	const printMethodStub = sandbox.stub();

	const setupTest = () => {
		const command = new BaseCommand();
		return test
			.stub(command, 'parse', sandbox.stub().returns({ flags: defaultFlags }))
			.stub(command, 'error', sandbox.stub())
			.stub(print, 'default', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns(defaultConfig))
			.add('command', () => command);
	};

	describe('#init', () => {
		setupTest()
			.env({ LISK_COMMANDER_CONFIG_DIR: undefined })
			.do(async ctx => {
				await ctx.command.init();
				return expect(process.env.XDG_CONFIG_HOME).to.equal(
					`${os.homedir()}/${defaultConfigFolder}`,
				);
			})
			.it('should set XDG_CONFIG_HOME to default value');

		setupTest()
			.env({ LISK_COMMANDER_CONFIG_DIR: configFolder })
			.do(async ctx => {
				await ctx.command.init();
				return expect(process.env.XDG_CONFIG_HOME).to.equal(configFolder);
			})
			.it('should set XDG_CONFIG_HOME to LISK_COMMANDER_CONFIG_DIR');

		setupTest()
			.env({ LISK_COMMANDER_CONFIG_DIR: configFolder })
			.do(async ctx => {
				await ctx.command.init();
				return expect(config.getConfig).to.be.calledWithExactly(configFolder);
			})
			.it(
				'should call getConfig with the config folder set by the environment variable',
			);

		setupTest()
			.do(async ctx => {
				await ctx.command.init();
				return expect(ctx.command.flags).to.equal(defaultFlags);
			})
			.it('should set the flags to the return value of the parse function');

		setupTest()
			.do(async ctx => {
				await ctx.command.init();
				return expect(ctx.command.userConfig).to.equal(defaultConfig);
			})
			.it('should set the userConfig to the return value of the getConfig');
	});

	describe('#finally', () => {
		const errorMsg = 'some error';

		setupTest()
			.do(async ctx => {
				const error = new Error(errorMsg);
				await ctx.command.finally(error);
				return expect(ctx.command.error).to.be.calledWithExactly(errorMsg);
			})
			.it('should log error with the message');

		setupTest()
			.do(async ctx => {
				await ctx.command.finally(errorMsg);
				return expect(ctx.command.error).to.be.calledWithExactly(errorMsg);
			})
			.it('should log error with input');

		setupTest()
			.do(async ctx => {
				await ctx.command.finally();
				return expect(ctx.command.error).not.to.be.called;
			})
			.it('should do nothing if no error is provided');
	});

	describe('#print', () => {
		const result = {
			some: 'result',
		};

		setupTest()
			.env({ XDG_CONFIG_HOME: 'home' })
			.do(async ctx => {
				await ctx.command.print(result, true);
				return expect(config.getConfig).to.be.calledWithExactly(
					process.env.XDG_CONFIG_HOME,
				);
			})
			.it(
				'should call getConfig with the process.env.XDG_CONFIG_HOME when readAgain is true',
			);

		setupTest()
			.do(async ctx => {
				ctx.command.userConfig = {};
				ctx.command.print(result);
				return expect(config.getConfig).not.to.be.called;
			})
			.it('should not call getConfig when readAgain is falsy');

		setupTest()
			.do(async ctx => {
				ctx.command.userConfig = {};
				ctx.command.print(result);
				return expect(printMethodStub).to.be.calledWithExactly(result);
			})
			.it('should call print method with the result');

		setupTest()
			.do(async ctx => {
				ctx.command.userConfig = {
					json: false,
				};
				ctx.command.print(result);
				return expect(print.default).to.be.calledWithExactly({
					json: false,
					pretty: undefined,
				});
			})
			.it('should call print with the userConfig');

		setupTest()
			.do(async ctx => {
				ctx.command.userConfig = {
					json: false,
					pretty: true,
				};
				const overwritingFlags = {
					json: true,
					pretty: false,
				};
				ctx.command.flags = overwritingFlags;
				ctx.command.print(result);
				return expect(print.default).to.be.calledWithExactly(overwritingFlags);
			})
			.it('should call print method with the result');
	});
});
