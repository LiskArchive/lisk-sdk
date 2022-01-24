import { BaseCommand, CommandVerifyContext, VerificationResult, CommandExecuteContext } from 'lisk-sdk';

interface Params { }

export class <%= commandClass %> extends BaseCommand {
	public name = '<%= commandName%>';
	public id = <%= commandID %>;

  // Define schema for asset
	public schema = {
		$id: '<%= moduleName %>/<%= commandName %>-asset',
		title: '<%= commandClass %> transaction asset for <%= moduleName %> module',
		type: 'object',
		required: [],
		properties: {},
	};

	public async verify(context: CommandVerifyContext<Params>): Promise <VerificationResult> {
		// Validate your asset
	}

    public async execute(context: CommandExecuteContext<Params>): Promise <void> {
		throw new Error('Command "<%= commandName %>" execute hook is not implemented.');
	}
}
