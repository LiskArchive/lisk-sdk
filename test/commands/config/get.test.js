const { expect, test } = require('@oclif/test');

describe('config:get', () => {
	test
		.stdout()
		.command(['config:get'])
		.it('runs hello', ctx => {
			expect(ctx.stdout).to.contain('hello world');
		});

	test
		.stdout()
		.command(['config:get', '--name', 'jeff'])
		.it('runs hello --name jeff', ctx => {
			expect(ctx.stdout).to.contain('hello jeff');
		});
});
