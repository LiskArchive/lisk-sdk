import { BasePlugin } from 'lisk-sdk';
import type { BaseChannel } from 'lisk-sdk';

 /* eslint-disable class-methods-use-this */
 /* eslint-disable  @typescript-eslint/no-empty-function */
 export class <%= className %> extends BasePlugin {
	// private _channel!: BaseChannel;

	public name:'<%= name %>';

	public async load(_: BaseChannel): Promise<void> {
		// this._channel = channel;
		// this._channel.once('app:ready', () => {});
	}

	public async unload(): Promise<void> {}
}
