import { BasePlugin } from 'lisk-sdk';
import type { BaseChannel, EventsDefinition, ActionsDefinition, SchemaWithDefault } from 'lisk-sdk';

 /* eslint-disable class-methods-use-this */
 /* eslint-disable  @typescript-eslint/no-empty-function */
 export class <%= className %> extends BasePlugin {
	// private _channel!: BaseChannel;

	public name: '<%= name %>';

	public get nodeModulePath(): string {
		return <%= __filename %>;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	public get configSchema(): SchemaWithDefault {
		return {
			$id: '/plugins/plugin-<%= name %>/config',
			type: 'object',
			properties: {},
			required: [],
			default: {},
		}
	}

	public get events(): EventsDefinition {
		return [
			// 'block:created',
			// 'block:missed'
		];
	}

	public get actions(): ActionsDefinition {
		return {
		// 	hello: async () => { hello: 'world' },
		};
	}

		public async load(_: BaseChannel): Promise<void> {
		// this._channel = channel;
		// this._channel.once('app:ready', () => {});
	}

	public async unload(): Promise<void> {}
}
