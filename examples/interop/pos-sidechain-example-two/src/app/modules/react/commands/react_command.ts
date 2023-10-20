/* eslint-disable class-methods-use-this */

import {
	BaseCommand,
	CommandVerifyContext,
	CommandExecuteContext,
	VerificationResult,
	VerifyStatus,
	codec,
} from 'lisk-sdk';
import { ReactMethod } from '../method';
import { CROSS_CHAIN_COMMAND_NAME_REACT } from '../constants';
import {
	crossChainReactParamsSchema,
	CCReactMessageParams,
	crossChainReactMessageSchema,
} from '../schemas';
import { InteroperabilityMethod } from '../types';

interface Params {
	reactionType: number;
	helloMessageID: string;
	amount: bigint;
	receivingChainID: Buffer;
	data: string;
	messageFee: bigint;
	messageFeeTokenID: Buffer;
}

export class ReactCrossChainCommand extends BaseCommand {
	private _interoperabilityMethod!: InteroperabilityMethod;
	// private _moduleName!: string;
	// private _method!: ReactMethod;
	public schema = crossChainReactParamsSchema;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_REACT;
	}

	public init(args: {
		moduleName: string;
		method: ReactMethod;
		interoperabilityMethod: InteroperabilityMethod;
	}) {
		// this._moduleName = args.moduleName;
		// this._method = args.method;
		this._interoperabilityMethod = args.interoperabilityMethod;
	}

	public addDependencies(interoperabilityMethod: InteroperabilityMethod) {
		this._interoperabilityMethod = interoperabilityMethod;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(context: CommandVerifyContext<Params>): Promise<VerificationResult> {
		const { params, logger } = context;

		logger.info('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
		logger.info(params);
		logger.info('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');

		try {
			if (params.receivingChainID.equals(context.chainID)) {
				throw new Error('Receiving chain cannot be the sending chain.');
			}

			const messageFeeTokenID = await this._interoperabilityMethod.getMessageFeeTokenID(
				context.getMethodContext(),
				params.receivingChainID,
			);
			if (!messageFeeTokenID.equals(params.messageFeeTokenID)) {
				throw new Error('Invalid message fee Token ID.');
			}
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}
		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<Params>): Promise<void> {
		const {
			params,
			transaction: { senderAddress },
		} = context;

		const reactCCM: CCReactMessageParams = {
			reactionType: params.reactionType,
			data: params.data,
			helloMessageID: params.helloMessageID,
		};

		await this._interoperabilityMethod.send(
			context.getMethodContext(),
			senderAddress,
			'hello',
			CROSS_CHAIN_COMMAND_NAME_REACT,
			params.receivingChainID,
			params.messageFee,
			codec.encode(crossChainReactMessageSchema, reactCCM),
			context.header.timestamp,
		);
	}
}
