import { CCMsg, BFTParameters, apiClient, OutboxRootWitness, AggregateCommit } from 'lisk-sdk';
import { ModuleMetadata, metadata, BlockHeader, ProveResponse, ValidatorsData } from './types';
import { MODULE_NAME_INTEROPERABILITY } from './constants';
import { EventsListener } from './eventsListener';
import { ChainConnectorStore } from './db';

export class NewBlockHandler {
	private readonly _chainConnectorPluginStore: ChainConnectorStore;
	private readonly _sidechainAPIClient!: apiClient.APIClient;
	private readonly _ownChainID!: Buffer;

	public constructor(
		store: ChainConnectorStore,
		chainApiClient: apiClient.APIClient,
		ownChainID: Buffer,
	) {
		this._chainConnectorPluginStore = store;
		this._sidechainAPIClient = chainApiClient;
		this._ownChainID = ownChainID;
	}

	public async handleNewBlock(newBlockHeader: BlockHeader) {
		const { modules } = await this._sidechainAPIClient.invoke<{ modules: ModuleMetadata }>(
			'system_getMetadata',
		);
		const interopModule = modules.find(m => m.name === MODULE_NAME_INTEROPERABILITY) as metadata;

		// Save ccm send success events
		// Save ccm processed events based on CCMProcessedResult FORWARDED = 1

		// Save all the data
		await this._chainConnectorPluginStore.setCrossChainMessages(
			await this._buildCrossChainMessages(newBlockHeader, interopModule),
		);
		await this._chainConnectorPluginStore.setBlockHeaders(
			await this._buildBlockHeaders(newBlockHeader),
		);
		await this._chainConnectorPluginStore.setAggregateCommits(
			await this._buildAggregateCommits(newBlockHeader),
		);
		await this._chainConnectorPluginStore.setValidatorsHashPreImage(
			await this._buildValidatorsHashPreImage(newBlockHeader),
		);
	}

	private async _buildBlockHeaders(newBlockHeader: BlockHeader) {
		// Save block header if a new block header
		const blockHeaders = await this._chainConnectorPluginStore.getBlockHeaders();
		const indexBlockHeader = blockHeaders.findIndex(
			header => header.height === newBlockHeader.height,
		);
		if (indexBlockHeader > -1) {
			blockHeaders[indexBlockHeader] = newBlockHeader;
		} else {
			blockHeaders.push(newBlockHeader);
		}
		return blockHeaders;
	}

	// Save aggregateCommit if present in the block header
	private async _buildAggregateCommits(newBlockHeader: BlockHeader): Promise<AggregateCommit[]> {
		const aggregateCommits = await this._chainConnectorPluginStore.getAggregateCommits();
		if (newBlockHeader.aggregateCommit) {
			const indexAggregateCommit = aggregateCommits.findIndex(
				commit => commit.height === newBlockHeader.aggregateCommit.height,
			);
			if (indexAggregateCommit > -1) {
				aggregateCommits[indexAggregateCommit] = newBlockHeader.aggregateCommit;
			} else {
				aggregateCommits.push(newBlockHeader.aggregateCommit);
			}
		}
		return aggregateCommits;
	}

	// Save validatorsData for a new validatorsHash
	private async _buildValidatorsHashPreImage(
		newBlockHeader: BlockHeader,
	): Promise<ValidatorsData[]> {
		const validatorsHashPreimage =
			await this._chainConnectorPluginStore.getValidatorsHashPreImage();

		// Get validatorsData at new block header height
		const bftParameters = await this._sidechainAPIClient.invoke<BFTParameters>(
			'consensus_getBFTParameters',
			{ height: newBlockHeader.height },
		);
		const indexValidatorsData = validatorsHashPreimage.findIndex(v =>
			v.validatorsHash.equals(bftParameters?.validatorsHash),
		);

		// Save validatorsData if there is a new validatorsHash
		if (indexValidatorsData === -1) {
			validatorsHashPreimage.push({
				certificateThreshold: bftParameters?.certificateThreshold,
				validators: bftParameters?.validators,
				validatorsHash: bftParameters?.validatorsHash,
			});
		}
		return validatorsHashPreimage;
	}

	private async _buildCrossChainMessages(newBlockHeader: BlockHeader, interopModule: metadata) {
		const ccmsFromEvents = await new EventsListener(this._sidechainAPIClient).getEvents(
			interopModule,
			newBlockHeader,
		);
		const crossChainMessages = await this._chainConnectorPluginStore.getCrossChainMessages();
		crossChainMessages.push({
			ccms: ccmsFromEvents as unknown as CCMsg[],
			height: newBlockHeader.height,
			inclusionProof: await this._getProof(interopModule),
		});
		return crossChainMessages;
	}

	private async _getProof(interopModule: metadata): Promise<OutboxRootWitness> {
		// TODO: find a better way to find storeKey from metadata
		const store = interopModule?.stores.find(
			s => s.data.$id === '/modules/interoperability/outbox',
		);

		// Calculate the inclusion proof of the CCMs
		const outboxKey = Buffer.concat([Buffer.from(store?.key as string, 'hex'), this._ownChainID]);
		const stateProveResponse = await this._sidechainAPIClient.invoke<ProveResponse>('state_prove', {
			queries: [outboxKey],
		});

		return {
			bitmap: stateProveResponse.proof.queries[0].bitmap,
			siblingHashes: stateProveResponse.proof.siblingHashes,
		};
	}
}
