import { Modules, ModuleEndpointContext, cryptography } from 'lisk-sdk';
import { counterKey, CounterStore, CounterStoreData } from './stores/counter';
import { MessageStore, MessageStoreData } from './stores/message';
import { ReactionStore, ReactionStoreData } from './stores/reaction';

export class HelloEndpoint extends Modules.BaseEndpoint {
	public async getHelloCounter(ctx: ModuleEndpointContext): Promise<CounterStoreData> {
		const counterSubStore = this.stores.get(CounterStore);

		const helloCounter = await counterSubStore.get(ctx, counterKey);

		return helloCounter;
	}

	public async getReactions(ctx: ModuleEndpointContext): Promise<ReactionStoreData> {
		const reactionSubStore = this.stores.get(ReactionStore);

		const { address } = ctx.params;
		if (typeof address !== 'string') {
			throw new Error('Parameter address must be a string.');
		}

		const reactions = await reactionSubStore.get(
			ctx,
			cryptography.address.getAddressFromLisk32Address(address),
		);

		return reactions;
	}

	public async getHello(ctx: ModuleEndpointContext): Promise<MessageStoreData> {
		const messageSubStore = this.stores.get(MessageStore);

		const { address } = ctx.params;
		if (typeof address !== 'string') {
			throw new Error('Parameter address must be a string.');
		}

		const helloMessage = await messageSubStore.get(
			ctx,
			cryptography.address.getAddressFromLisk32Address(address),
		);

		return helloMessage;
	}
}
