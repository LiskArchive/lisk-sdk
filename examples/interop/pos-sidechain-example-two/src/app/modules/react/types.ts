import {
	MethodContext,
	ImmutableMethodContext,
	CCMsg,
	ChannelData,
	OwnChainAccount,
} from 'lisk-sdk';

export type TokenID = Buffer;
// Parameters of the reactCrossChain CCM
export interface CCReactMessageParams {
	/**
	 * A number indicating the type of the reaction.
	 */
	reactionType: number;
	/**
	 * ID of the Hello message being reacted to.
	 */
	helloMessageID: string;
	/** Optional field for data / messages. */
	data: string;
}

// Parameters of the react reactCrossChain command
export interface CCReactCommandParams extends CCReactMessageParams {
	// The chain ID of the receiving chain.
	receivingChainID: Buffer;
	// The fee for sending the CCM across chains.
	messageFee: bigint;
}

export interface InteroperabilityMethod {
	getOwnChainAccount(methodContext: ImmutableMethodContext): Promise<OwnChainAccount>;
	send(
		methodContext: MethodContext,
		feeAddress: Buffer,
		module: string,
		crossChainCommand: string,
		receivingChainID: Buffer,
		fee: bigint,
		parameters: Buffer,
		timestamp?: number,
	): Promise<void>;
	error(methodContext: MethodContext, ccm: CCMsg, code: number): Promise<void>;
	terminateChain(methodContext: MethodContext, chainID: Buffer): Promise<void>;
	getChannel(methodContext: MethodContext, chainID: Buffer): Promise<ChannelData>;
	getMessageFeeTokenID(methodContext: ImmutableMethodContext, chainID: Buffer): Promise<Buffer>;
	getMessageFeeTokenIDFromCCM(methodContext: ImmutableMethodContext, ccm: CCMsg): Promise<Buffer>;
}
