// eslint-disable-next-line max-classes-per-file
declare module 'pm2-axon-rpc' {
	import { RepSocket, ReqSocket } from 'pm2-axon';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type ServerExposeCallBack = (...args: any[]) => void;

	export class Server {
		public sock: RepSocket;
		public constructor(socket: RepSocket);
		public expose(name: string, cb: ServerExposeCallBack): void;
	}

	export class Client {
		public sock: ReqSocket;
		public constructor(socket: ReqSocket);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		public call(...args: any[]): void;
	}
}
