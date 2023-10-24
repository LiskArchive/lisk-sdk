import { BaseMethod, ImmutableMethodContext } from 'lisk-sdk';
import { MessageStore, MessageStoreData } from './stores/message';

export class HelloMethod extends BaseMethod {
	public async getHello(
		methodContext: ImmutableMethodContext,
		address: Buffer,
	): Promise<MessageStoreData> {
		const messageSubStore = this.stores.get(MessageStore);
		const helloMessage = await messageSubStore.get(methodContext, address);

		return helloMessage;
	}
}
