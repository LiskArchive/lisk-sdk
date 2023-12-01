import {
	StateMachine,
	Modules,
} from 'lisk-sdk';

export type TokenID = Buffer;

export interface InteroperabilityMethod {
	getOwnChainAccount(methodContext: StateMachine.ImmutableMethodContext): Promise<Modules.Interoperability.OwnChainAccount>;
	send(
		methodContext: StateMachine.MethodContext,
		feeAddress: Buffer,
		module: string,
		crossChainCommand: string,
		receivingChainID: Buffer,
		fee: bigint,
		parameters: Buffer,
		timestamp?: number,
	): Promise<void>;
	error(methodContext: StateMachine.MethodContext, ccm: Modules.Interoperability.CCMsg, code: number): Promise<void>;
	terminateChain(methodContext: StateMachine.MethodContext, chainID: Buffer): Promise<void>;
	getChannel(methodContext: StateMachine.MethodContext, chainID: Buffer): Promise<Modules.Interoperability.ChannelData>;
	getMessageFeeTokenID(methodContext: StateMachine.ImmutableMethodContext, chainID: Buffer): Promise<Buffer>;
	getMessageFeeTokenIDFromCCM(methodContext: StateMachine.ImmutableMethodContext, ccm: Modules.Interoperability.CCMsg): Promise<Buffer>;
}
