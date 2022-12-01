import { BasePlugin } from 'lisk-sdk';
import type { BaseChannel } from 'lisk-sdk';

 /* eslint-disable class-methods-use-this */
 /* eslint-disable  @typescript-eslint/no-empty-function */
 export class <%= className %> extends BasePlugin {

	public name: '<%= name %>';

	public get nodeModulePath(): string {
		return  __filename;
	}

	public async load(_: BaseChannel): Promise<void> {}

	public async unload(): Promise<void> {}
}
