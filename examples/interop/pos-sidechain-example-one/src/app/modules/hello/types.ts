import { JSONObject } from 'lisk-sdk';

export interface ModuleConfig {
	maxMessageLength: number;
	minMessageLength: number;
	blacklist: string[];
}

export type ModuleConfigJSON = JSONObject<ModuleConfig>;

export interface CreateHelloParams {
	message: string;
}

// Parameters of the reactCrossChain CCM
export interface CCReactMessageParams {
	// A number indicating the type of the reaction.
	reactionType: number;
	// ID of the Hello message being reacted to.
	helloMessageID: string;
	// Optional field for data / messages.
	data: string;
}
