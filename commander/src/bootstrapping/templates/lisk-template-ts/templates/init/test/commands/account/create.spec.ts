import * as Config from '@oclif/config';
import { AccountCreateCommand } from '../../../src/commands/account/create';
import { getConfig } from '../../utils/config';

describe('account:create', () => {
	let config: Config.IConfig;
	let results: any;
	beforeEach(async () => {
		results = [];
		config = await getConfig();
		jest.spyOn(process.stdout, 'write').mockImplementation(val => results.push(val));
	});

	it('should throw an error if the flag is invalid number', async () => {
		await expect(AccountCreateCommand.run(['--count=NaN'], config)).rejects.toThrow(
			'Count flag must be an integer and greater than 0',
		);
	});

	it('should throw an error if the Count flag is less than 1', async () => {
		await expect(AccountCreateCommand.run(['--count=0'], config)).rejects.toThrow(
			'Count flag must be an integer and greater than 0',
		);
	});

	it('should throw an error if the Count flag contains non-number characters', async () => {
		await expect(AccountCreateCommand.run(['--count=10sk24'], config)).rejects.toThrow(
			'Count flag must be an integer and greater than 0',
		);
	});

	describe('account:create', () => {
		it('should create an account', async () => {
			await AccountCreateCommand.run([], config);
			expect(Object.keys(JSON.parse(results[0])[0])).toEqual([
				'passphrase',
				'privateKey',
				'publicKey',
				'binaryAddress',
				'address',
			]);
		});
	});

	describe('account:create --count=x', () => {
		const defaultNumber = 2;
		it('should create multiple accounts', async () => {
			await AccountCreateCommand.run(['--count', defaultNumber.toString()], config);
			expect(JSON.parse(results[0])).toHaveLength(defaultNumber);
		});
	});
});
