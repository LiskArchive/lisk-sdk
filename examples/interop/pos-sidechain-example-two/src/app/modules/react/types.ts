import {
	MethodContext,
	ImmutableMethodContext,
	CCMsg,
	ChannelData,
	OwnChainAccount,
} from 'lisk-sdk';

export type TokenID = Buffer;

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
