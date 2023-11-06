/*
 * Copyright © 2021 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
import { apiClient, cryptography, passphrase, codec } from '@liskhq/lisk-client';
import * as React from 'react';
import Box from '../components/Box';
import Button from '../components/Button';
import CopiableText from '../components/CopiableText';
import AccountDialog from '../components/dialogs/AccountDialog';
import NodeInfoDialog from '../components/dialogs/NodeInfoDialog';
import PeersInfoDialog from '../components/dialogs/PeersInfoDialog';
import Grid from '../components/Grid';
import InfoPanel from '../components/InfoPanel';
import { TextAreaInput } from '../components/input';
import Logo from '../components/Logo';
import Text from '../components/Text';
import Ticker from '../components/Ticker';
import { BlockWidget, RecentEventWidget, TransactionWidget } from '../components/widgets';
import CallEndpointWidget from '../components/widgets/CallEndpointWidget';
import MyAccountWidget from '../components/widgets/MyAccountWidget';
import SendTransactionWidget from '../components/widgets/SendTransactionWidget';
import useMessageDialog from '../providers/useMessageDialog';
import {
	Account,
	NodeInfo,
	Transaction,
	EventData,
	SendTransactionOptions,
	CallEndpointOptions,
	BlockHeader,
	ParsedEvent,
	Block,
} from '../types';
import {
	getConfig,
	getKeyPath,
	updateStatesOnNewBlock,
	updateStatesOnNewTransaction,
} from '../utils';
import useRefState from '../utils/useRefState';
import styles from './MainPage.module.scss';

const nodeInfoDefaultValue: NodeInfo = {
	version: '',
	networkVersion: '',
	chainID: '',
	syncing: false,
	unconfirmedTransactions: 0,
	height: 0,
	finalizedHeight: 0,
	lastBlockID: '',
	genesis: {
		blockTime: 0,
		maxTransactionsSize: 0,
		bftBatchSize: 0,
		rewards: { milestones: [], offset: 0, distance: 0 },
		chainID: '',
	},
};
const MAX_RECENT_EVENT = 100;

const connectionErrorMessage = (
	<Text type={'h3'}>
		There were some error and we were unable to connect to node. Try again by refreshing the page.
	</Text>
);

interface DashboardState {
	connected: boolean;
	applicationUrl?: string;
	applicationName?: string;
}

const callAndProcessActions = async (
	client: apiClient.APIClient,
	action: string,
	params: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
	let result = (await client.invoke(action, params)) as unknown;

	switch (action) {
		case 'chain_getLastBlock':
		case 'chain_getBlockByID':
		case 'chain_getBlockByHeight':
			result = client.block.toJSON(client.block.decode(result as string));
			break;

		case 'chain_getBlocksByHeightBetween':
		case 'chain_getBlocksByIDs':
			result = (result as string[]).map(block => client.block.toJSON(client.block.decode(block)));
			break;

		case 'chain_getTransactionByID':
			result = client.transaction.toJSON(client.transaction.decode(result as string));
			break;

		case 'chain_getTransactionsByIDs':
			result = (result as string[]).map(transaction =>
				client.transaction.toJSON(client.transaction.decode(transaction)),
			);
			break;

		default:
			break;
	}

	return result as Record<string, unknown>;
};

const MainPage: React.FC = () => {
	const { showMessageDialog } = useMessageDialog();

	// API Client object
	const [client, setClient] = React.useState<apiClient.APIClient>();
	// To cover apiClient.APIClient | undefined behavior
	const getClient = () => client as apiClient.APIClient;

	// Data States
	const [myAccounts, setMyAccounts] = React.useState<Account[]>([]);
	const [dashboard, setDashboard] = React.useState<DashboardState>({
		connected: false,
	});
	const [nodeInfo, setNodeInfo] = React.useState<NodeInfo>(nodeInfoDefaultValue);
	const [peersInfo, setPeerInfo] = React.useState({ connected: 0, disconnected: 0, banned: 0 });
	const [blocks, setBlocks, blocksRef] = useRefState<Block[]>([]);
	const [confirmedTransactions, setConfirmedTransactions, confirmedTransactionsRef] = useRefState<
		Transaction[]
	>([]);
	const [unconfirmedTransactions, setUnconfirmedTransactions, unconfirmedTransactionsRef] =
		useRefState<Transaction[]>([]);
	const [events, setEvents] = React.useState<string[]>([]);
	const [eventsData, setEventsData, eventsDataRef] = useRefState<ParsedEvent[]>([]);
	const [eventSubscriptionList, setEventSubscriptionList, eventSubscriptionListRef] = useRefState<
		string[]
	>([]);
	const [actions, setActions] = React.useState<string[]>([]);

	// Dialogs related States
	const [showAccount, setShowAccount] = React.useState<Account>();
	const [nodeInfoDialog, setNodeInfoDialog] = React.useState(false);
	const [peersInfoDialog, setPeersInfoDialog] = React.useState(false);

	const newBlockListener = React.useCallback(
		async event => {
			const { blockHeader } = event as { blockHeader: BlockHeader };
			const result = await updateStatesOnNewBlock(
				getClient(),
				blockHeader,
				blocksRef.current,
				confirmedTransactionsRef.current,
				unconfirmedTransactionsRef.current,
			);
			const blockEvents = await getClient().invoke<EventData[]>('chain_getEvents', {
				height: blockHeader.height,
			});
			newEventListener(blockEvents);
			setBlocks(result.blocks);
			setConfirmedTransactions(result.confirmedTransactions);
			setUnconfirmedTransactions(result.unconfirmedTransactions);
			await loadNodeInfo();
		},
		[dashboard.connected],
	);

	const newTransactionListener = React.useCallback(
		event => {
			setUnconfirmedTransactions(
				updateStatesOnNewTransaction(
					(event as { transaction: Transaction }).transaction,
					unconfirmedTransactionsRef.current,
				),
			);
		},
		[dashboard.connected],
	);

	const newEventListener = React.useCallback(
		(blockEvents: EventData[]) => {
			const convertedEvents: ParsedEvent[] = [];
			for (const blockEvent of blockEvents) {
				if (
					eventSubscriptionListRef.current.length > 0 &&
					!eventSubscriptionListRef.current.includes(`${blockEvent.module}_${blockEvent.name}`)
				) {
					continue;
				}
				const metadata = getClient()
					.metadata.find(m => m.name === blockEvent.module)
					?.events.find(m => m.name === blockEvent.name);
				if (metadata?.data) {
					convertedEvents.push({
						...blockEvent,
						data: codec.codec.decodeJSON(metadata.data, Buffer.from(blockEvent.data, 'hex')),
					});
					continue;
				}
				convertedEvents.push({
					...blockEvent,
					data: { data: blockEvent.data },
				});
			}

			eventsDataRef.current.unshift(...convertedEvents);
			const recentEventsData = eventsDataRef.current.slice(-1 * MAX_RECENT_EVENT);
			setEventsData(recentEventsData);
		},
		[dashboard.connected],
	);

	const initClient = async () => {
		try {
			setClient(await apiClient.createWSClient(dashboard.applicationUrl as string));
			setDashboard({ ...dashboard, connected: true });
		} catch {
			showMessageDialog('Error connecting to node', connectionErrorMessage);
		}
	};

	const subscribeEvents = () => {
		getClient().subscribe('chain_newBlock', newBlockListener);
		getClient().subscribe('txpool_newTransaction', newTransactionListener);
		const listOfEvents = getClient().metadata.reduce<string[]>((prev, curr) => {
			prev.push(...curr.events.map(e => `${curr.name}_${e.name}`));
			return prev;
		}, []);
		setEvents(listOfEvents);
	};

	const loadActions = async () => {
		setActions(await getClient().invoke<string[]>('app_getRegisteredEndpoints'));
	};

	const loadNodeInfo = async () => {
		setNodeInfo(await getClient().node.getNodeInfo());
	};

	const loadPeersInfo = async () => {
		const info = await getClient().node.getNetworkStats();
		setPeerInfo({
			connected: info.totalConnectedPeers,
			disconnected: info.totalDisconnectedPeers,
			banned: info.banning.count,
		});
	};

	const generateNewAccount = () => {
		const accountPassphrase = passphrase.Mnemonic.generateMnemonic(256) as unknown as string;
		const keys = cryptography.legacy.getPrivateAndPublicKeyFromPassphrase(accountPassphrase);
		const address = cryptography.address.getAddressFromPublicKey(keys.publicKey);
		const lisk32Address = cryptography.address.getLisk32AddressFromAddress(address);
		const newAccount: Account = {
			passphrase: accountPassphrase,
			publicKey: keys.publicKey.toString('hex'),
			address: lisk32Address,
		};

		setMyAccounts([newAccount, ...myAccounts]);
		setShowAccount(newAccount);
	};

	// Get config as whole
	React.useEffect(() => {
		const initConfig = async () => {
			setDashboard({ ...dashboard, ...(await getConfig()) });
		};

		initConfig().catch(console.error);
	}, []);

	// Init client
	React.useEffect(() => {
		if (dashboard.applicationUrl) {
			initClient().catch(console.error);
		}
	}, [dashboard.applicationUrl]);

	// Load data
	React.useEffect(() => {
		if (dashboard.connected) {
			subscribeEvents();
			loadActions().catch(console.error);
			loadNodeInfo().catch(console.error);
			loadPeersInfo().catch(console.error);
		}
	}, [dashboard.connected]);

	// Refresh event subscriptions
	React.useEffect(() => {
		setEventsData([]);
	}, [eventSubscriptionList]);

	// Send Transaction
	const handleSendTransaction = async (data: SendTransactionOptions) => {
		try {
			const privateKey = await cryptography.ed.getPrivateKeyFromPhraseAndPath(
				data.passphrase,
				getKeyPath(0),
			);
			const publicKey = cryptography.ed.getPublicKeyFromPrivateKey(privateKey);
			const address = cryptography.address.getAddressFromPublicKey(publicKey);
			const moduleMeta = getClient().metadata.find(a => a.name === data.module);
			if (!moduleMeta) {
				throw new Error(`Module: ${data.module} Command: ${data.command} is not registered`);
			}
			const commandMeta = moduleMeta.commands.find(cmd => cmd.name === data.command);
			if (!commandMeta) {
				throw new Error(`Module: ${data.module} Command: ${data.command} is not registered`);
			}
			const sender = await getClient().invoke<{ nonce: string }>('auth_getAuthAccount', {
				address: cryptography.address.getLisk32AddressFromAddress(address),
			});
			const fee =
				getClient().transaction.computeMinFee({
					module: data.module,
					command: data.command,
					params: data.params,
					senderPublicKey: publicKey.toString('hex'),
					nonce: sender.nonce,
					fee: '0',
					signatures: [],
				}) + BigInt(100000000);
			const transaction = await getClient().transaction.create(
				{
					module: data.module,
					command: data.command,
					params: data.params,
					fee,
				},
				privateKey.toString('hex'),
			);

			const resp = await getClient().transaction.send(transaction);

			showMessageDialog(
				'Success!',
				<React.Fragment>
					<Text type={'p'}>Transaction with following id received:</Text>
					<CopiableText text={resp.transactionId} />
				</React.Fragment>,
				{ backButton: true },
			);
		} catch (err) {
			showMessageDialog(
				'Error:',
				<React.Fragment>
					<Text type={'p'} color={'red'}>
						{(err as Error).message}
					</Text>
				</React.Fragment>,
			);
		}
	};

	const handleCallEndpoint = async (data: CallEndpointOptions) => {
		try {
			const result = await callAndProcessActions(getClient(), data.name, data.params);
			if (result.error) {
				throw new Error((result.error as { message: string }).message);
			}
			showMessageDialog(
				'Success!',
				<TextAreaInput
					json
					readonly
					size={'l'}
					value={JSON.stringify(result, undefined, '  ')}
				></TextAreaInput>,
				{ backButton: true },
			);
		} catch (err) {
			showMessageDialog(
				'Error:',
				<React.Fragment>
					<Text type={'p'} color={'red'}>
						{(err as Error).message}
					</Text>
				</React.Fragment>,
			);
		}
	};

	const CurrentHeightPanel = () => (
		<InfoPanel title={'Current height'}>
			<Text color="green" type="h1" style="light">
				{nodeInfo.height.toLocaleString()}
			</Text>
		</InfoPanel>
	);

	const FinalizedHeightPanel = () => (
		<InfoPanel title={'Finalized height'}>
			<Text color="pink" type="h1" style="light">
				{nodeInfo.finalizedHeight.toLocaleString()}
			</Text>
		</InfoPanel>
	);

	const NextBlockPanel = () => (
		<InfoPanel title={'Next block'}>
			<Ticker color="yellow" type="h1" style="light" seconds={nodeInfo.genesis.blockTime}></Ticker>
		</InfoPanel>
	);

	const PeersInfoPanel = () => (
		<InfoPanel title={'Peers'} onClick={() => setPeersInfoDialog(true)}>
			<Text color="blue" type="h1" style="light">
				{peersInfo.connected}
			</Text>
		</InfoPanel>
	);

	const NodeInfoPanel = () => (
		<InfoPanel mode={'light'} title={'Node Info'} onClick={() => setNodeInfoDialog(true)}>
			<Text color="white" type="p">
				Version: {nodeInfo.version}
			</Text>
		</InfoPanel>
	);

	return (
		<section className={styles.root}>
			<Grid container rowSpacing={6}>
				<Grid row alignItems={'center'}>
					<Grid xs={6} md={8}>
						<Logo name={dashboard.applicationName} />
					</Grid>
					<Grid xs={6} md={4} textAlign={'right'}>
						<Button
							onClick={() => {
								generateNewAccount();
							}}
						>
							Generate new account
						</Button>
					</Grid>
				</Grid>
			</Grid>

			<Box showUp={'md'} hideDown={'md'}>
				<Grid container columns={15} colSpacing={2}>
					<Grid row>
						<Grid xs={3}>
							<CurrentHeightPanel />
						</Grid>
						<Grid xs={3}>
							<FinalizedHeightPanel />
						</Grid>
						<Grid xs={3}>
							<NextBlockPanel />
						</Grid>
						<Grid xs={3}>
							<PeersInfoPanel />
						</Grid>
						<Grid xs={3}>
							<NodeInfoPanel />
						</Grid>
					</Grid>
				</Grid>
			</Box>

			<Box hideUp={'xs'} showDown={'md'}>
				<Grid container columns={12} colSpacing={2}>
					<Grid row>
						<Grid xs={6}>
							<CurrentHeightPanel />
						</Grid>
						<Grid xs={6}>
							<FinalizedHeightPanel />
						</Grid>
					</Grid>
					<Grid row>
						<Grid xs={6}>
							<NextBlockPanel />
						</Grid>
						<Grid xs={6}>
							<PeersInfoPanel />
						</Grid>
					</Grid>
					<Grid row>
						<Grid xs={12}>
							<NodeInfoPanel />
						</Grid>
					</Grid>
				</Grid>
			</Box>

			<Grid container columns={12} colSpacing={3} rowSpacing={3}>
				<Grid row>
					<Grid md={6} xs={12}>
						<MyAccountWidget accounts={myAccounts} onSelect={account => setShowAccount(account)} />
					</Grid>
					<Grid md={6} xs={12}>
						<BlockWidget title="Recent Blocks" blocks={blocks}></BlockWidget>
					</Grid>
				</Grid>

				<Grid row>
					<Grid md={6} xs={12}>
						<TransactionWidget
							title="Recent Transactions"
							metadata={getClient()?.metadata}
							transactions={confirmedTransactions}
						></TransactionWidget>
					</Grid>
					<Grid md={6} xs={12}>
						<TransactionWidget
							title="Unconfirmed Transactions"
							metadata={getClient()?.metadata}
							transactions={unconfirmedTransactions}
						></TransactionWidget>
					</Grid>
				</Grid>

				<Grid row>
					<Grid md={6} xs={12}>
						<SendTransactionWidget
							modules={getClient()?.metadata ?? []}
							onSubmit={data => {
								handleSendTransaction(data).catch(console.error);
							}}
						/>
					</Grid>
					<Grid md={6} xs={12}>
						<CallEndpointWidget
							actions={actions}
							onSubmit={data => {
								handleCallEndpoint(data).catch(console.error);
							}}
						/>
					</Grid>
				</Grid>

				<Grid row>
					<Grid xs={12}>
						<RecentEventWidget
							events={events}
							onSelect={selectedEvents => setEventSubscriptionList(selectedEvents)}
							selected={[]}
							data={eventsData}
						/>
					</Grid>
				</Grid>

				<Grid row>
					<Grid xs={12}>
						<Text>© 2021 Lisk Foundation</Text>
					</Grid>
				</Grid>
			</Grid>

			<AccountDialog
				open={!!showAccount}
				onClose={() => {
					setShowAccount(undefined);
				}}
				account={showAccount as Account}
			></AccountDialog>

			<PeersInfoDialog
				open={peersInfoDialog}
				onClose={() => {
					setPeersInfoDialog(false);
				}}
				peersInfo={peersInfo}
			></PeersInfoDialog>

			<NodeInfoDialog
				open={nodeInfoDialog}
				onClose={() => {
					setNodeInfoDialog(false);
				}}
				nodeInfo={nodeInfo}
			></NodeInfoDialog>
		</section>
	);
};

export default MainPage;
