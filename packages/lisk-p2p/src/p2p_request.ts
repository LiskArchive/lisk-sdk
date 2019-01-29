import { RPCResponseAlreadySentError } from './errors';
import { P2PResponsePacket } from './p2p_types';

export class P2PRequest {
	private readonly _procedure: string;
	private readonly _data: unknown;
	private readonly _respondCallback: (
		responseError?: Error,
		responseData?: P2PResponsePacket,
	) => void;
	private _wasResponseSent: boolean;

	public constructor(
		procedure: string,
		data: unknown,
		respondCallback: (responseError?: Error, responseData?: unknown) => void,
	) {
		this._procedure = procedure;
		this._data = data;
		this._respondCallback = (
			responseError?: Error,
			responsePacket?: P2PResponsePacket,
		) => {
			if (this._wasResponseSent) {
				throw new RPCResponseAlreadySentError(
					'A response has already been sent for this request',
				);
			}
			this._wasResponseSent = true;
			respondCallback(responseError, responsePacket);
		};
		this._wasResponseSent = false;
	}

	public get procedure(): string {
		return this._procedure;
	}

	public get data(): unknown {
		return this._data;
	}

	public get wasResponseSent(): boolean {
		return this._wasResponseSent;
	}

	public end(responseData?: unknown): void {
		const responsePacket: P2PResponsePacket = {
			data: responseData,
		};
		this._respondCallback(undefined, responsePacket);
	}

	public error(responseError: Error): void {
		this._respondCallback(responseError);
	}
}
