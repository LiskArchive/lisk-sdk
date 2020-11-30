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
import * as sandbox from 'sinon';
import { test, expect } from '@oclif/test';
import BaseCommand from '../../src/base';
import * as printUtils from '../../src/utils/print';

describe('base command', () => {
	const defaultFlags = {
		some: 'flag',
	};

	const printMethodStub = sandbox.stub();

	class BaseExtended extends BaseCommand {
		// eslint-disable-next-line class-methods-use-this,@typescript-eslint/no-empty-function
		async run(): Promise<void> {}
	}

	const setupTest = () => {
		const command = new BaseExtended([], {} as any);
		return test
			.stub(command, 'parse', sandbox.stub().returns({ flags: defaultFlags }))
			.stub(command, 'error', sandbox.stub())
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.add('command', () => command);
	};

	describe('#init', () => {
		setupTest()
			.do(async ctx => ctx.command.init())
			.it('should set the flags to the return value of the parse function', ctx =>
				expect(ctx.command.printFlags).to.equal(defaultFlags),
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
});
