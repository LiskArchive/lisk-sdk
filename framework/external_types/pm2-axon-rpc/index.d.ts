// eslint-disable-next-line max-classes-per-file
declare module 'pm2-axon-rpc' {
	import { Axon } from 'pm2-axon';

	export namespace AxonRpc {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		type ServerExposeCallBack = (...args: any[]) => void;

		export class Server {
			public sock: Axon.RepSocket;
			public constructor(socket: Axon.RepSocket);
			public expose(name: string, cb: ServerExposeCallBack): void;
		}

		export class Client {
			public sock: Axon.ReqSocket;
			public constructor(socket: Axon.ReqSocket);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			public call(...args: any[]): void;
		}
	}
}
