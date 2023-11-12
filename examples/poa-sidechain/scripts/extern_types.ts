import { GenesisConfig } from 'lisk-sdk';
export interface ValidatorJSON {
	address: string;
	bftWeight: string;
	generatorKey: string;
	blsKey: string;
}

export interface NodeInfo {
	readonly version: string;
	readonly networkVersion: string;
	readonly chainID: string;
	readonly lastBlockID: string;
	readonly height: number;
	readonly genesisHeight: number;
	readonly finalizedHeight: number;
	readonly syncing: boolean;
	readonly unconfirmedTransactions: number;
	readonly genesis: GenesisConfig;
	readonly network: {
		readonly port: number;
		readonly hostIp?: string;
		readonly seedPeers: {
			readonly ip: string;
			readonly port: number;
		}[];
		readonly blacklistedIPs?: string[];
		readonly fixedPeers?: string[];
		readonly whitelistedPeers?: {
			readonly ip: string;
			readonly port: number;
		}[];
	};
}

export interface BFTParametersJSON {
	prevoteThreshold: string;
	precommitThreshold: string;
	certificateThreshold: string;
	validators: ValidatorJSON[];
	validatorsHash: string;
}
