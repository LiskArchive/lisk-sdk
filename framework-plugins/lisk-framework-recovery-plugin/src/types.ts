export interface MainchainConnection {
	mode: 'ipc' | 'ws';
	connectionString: string;
}
export interface RecoveryPluginConfig {
	mainchainConnectionURL: MainchainConnection;
	encryptedPrivateKey: string;
}
