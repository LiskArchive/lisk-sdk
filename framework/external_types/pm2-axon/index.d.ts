/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
// eslint-disable-next-line max-classes-per-file
declare module 'pm2-axon' {
	import EventEmitter = NodeJS.EventEmitter;
	import NetSocket = NodeJS.Socket;

	export class Socket extends EventEmitter {
		public set(name: string, val: any): Socket;

		public get(name: string): any;

		public enable(name: string): Socket;

		public disable(name: string): Socket;

		public enabled(name: string): boolean;

		public disabled(name: string): boolean;

		public use(plugin: (socket: Socket) => any): Socket;

		public pack(args: Buffer | Buffer[]): Buffer;

		public closeSockets(): void;

		public close(): void;

		public closeServer(fn: () => any): void;

		public address(): { port: number; family: string; address: string; string: string } | undefined;

		public removeSocket(sock: Socket): void;

		public addSocket(sock: Socket): void;

		public handleErrors(sock: Socket): void;

		public onmessage(sock: NetSocket): (args: Buffer | Buffer[]) => void;

		public connect(port: ConnectionPort, host?: string | (() => void), fn?: () => void): Socket;

		public onconnect(sock: Socket): void;

		bind(port: ConnectionPort, host?: string | (() => void), fn?: () => void): Socket;
	}

	export class SubSocket extends Socket {
		public hasSubscriptions(): boolean;

		public matches(topic: string): boolean;

		public onmessage(sock: NetSocket): (args: Buffer | Buffer[]) => void;

		public subscribe(re: RegExp | string): RegExp;

		public unsubscribe(re: RegExp | string): void;

		public clearSubscriptions(): void;

		/**
		 * @throws {Error}
		 */
		public send(): void;
	}

	export class SubEmitterSocket {
		public sock: Socket;

		public on(event: string, fn: (...args: any[]) => void): SubEmitterSocket;

		public off(event: string): SubEmitterSocket;

		public bind(port: ConnectionPort, host?: string | (() => void), fn?: () => void): Socket;

		public connect(port: ConnectionPort, host?: string | (() => void), fn?: () => void): Socket;

		public close(): void;
	}

	export class PubSocket extends Socket {
		public send(...args: any[]): PubSocket;
	}

	export class PubEmitterSocket {
		public sock: PubSocket;

		public send(...args: any[]): PubSocket;

		public bind(port: ConnectionPort, host?: string | (() => void), fn?: () => void): Socket;

		public connect(port: ConnectionPort, host?: string | (() => void), fn?: () => void): Socket;

		public close(): void;

		public emit(event: string, data: any): void;
	}

	export class PushSocket extends Socket {
		public send(...args: any[]): void;
	}

	export class ReqSocket extends Socket {
		public id(): string;

		public onmessage(): (args: Buffer | Buffer[]) => void;

		public send(...args: any[]): void;
	}

	export class RepSocket extends Socket {
		public sock: Socket;
		public onmessage(sock: NetSocket): (args: Buffer | Buffer[]) => void;
	}

	export class PullSocket extends Socket {
		/**
		 * @throws {Error}
		 */
		public send(): void;
	}

	export type ConnectionPort =
		| number
		| string
		| {
				protocol?: string;
				hostname?: string;
				pathname: string;
				port: string | number;
		  };

	export function socket(
		type: string,
		options?: any,
	):
		| PubEmitterSocket
		| SubEmitterSocket
		| PushSocket
		| PullSocket
		| PubSocket
		| SubSocket
		| ReqSocket
		| RepSocket
		| Socket;

	export const types: {
		[propName: string]: () =>
			| PubEmitterSocket
			| SubEmitterSocket
			| PushSocket
			| PullSocket
			| PubSocket
			| SubSocket
			| ReqSocket
			| RepSocket
			| Socket;
	};
}
