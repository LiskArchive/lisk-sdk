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
import * as React from 'react';
import { apiClient } from '@liskhq/lisk-client';
import styles from './MainPage.module.scss';
import Text from '../components/Text';
import Icon from '../components/Icon';
import Logo from '../components/Logo';
import CopiableText from '../components/CopiableText';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
import AccountDialog from '../components/dialogs/AccountDialog';
import PeersInfoDialog from '../components/dialogs/PeersInfoDialog';
import NodeInfoDialog from '../components/dialogs/NodeInfoDialog';
import Grid from '../components/Grid';
import { TextInput, TextAreaInput, SelectInput } from '../components/input';
import { BlockWidget, TransactionWidget } from '../components/widgets';
import InfoPanel from '../components/InfoPanel';
import SendTransactionWidget from '../components/widgets/SendTransactionWidget';
import CallActionWidget from '../components/widgets/CallActionWidget';
import MyAccountWidget from '../components/widgets/MyAccountWidget';
import { Account, NodeInfo, Block, Transaction } from '../types';
import useMessageDialog from '../providers/useMessageDialog';
import { getApplicationUrl, updateStatesOnNewBlock, updateStatesOnNewTransaction } from '../utils';
import useRefState from '../utils/useRefState';

const nodeInfoDefaultValue: NodeInfo = {
	version: '',
	networkVersion: '',
	networkIdentifier: '',
	syncing: false,
	unconfirmedTransactions: 0,
	height: 0,
	finalizedHeight: 0,
	lastBlockID: '',
	registeredModules: [],
	genesisConfig: {
		communityIdentifier: '',
		blockTime: 0,
		maxPayloadLength: 0,
		bftThreshold: 0,
		rewards: { milestones: [], offset: 0, distance: 0 },
		minFeePerByte: 0,
		baseFees: [],
	},
};

const connectionErrorMessage = (
	<Text type={'h3'}>
		There were some error and we were unable to connect to node. Try again by refreshing the page.
	</Text>
);

interface DashboardState {
	connected: boolean;
	applicationUrl?: string;
}

const MainPage: React.FC = () => {
	const { showMessageDialog } = useMessageDialog();

	// API Client object
	const [client, setClient] = React.useState<apiClient.APIClient>();
	// To cover apiClient.APIClient | undefined behavior
	const getClient = () => client as apiClient.APIClient;

	// Data States
	const [accounts] = React.useState<Account[]>([]);
	const [dashboard, setDashboard] = React.useState<DashboardState>({
		connected: false,
	});
	const [nodeInfo, setNodeInfo] = React.useState<NodeInfo>(nodeInfoDefaultValue);
	const [peersInfo, setPeerInfo] = React.useState({ connected: 0, disconnected: 0, banned: 0 });
	const [blocks, setBlocks, blocksRef] = useRefState<Block[]>([]);
	const [confirmedTransactions, setConfirmedTransactions, confirmedTransactionsRef] = useRefState<
		Transaction[]
	>([]);
	const [
		unconfirmedTransactions,
		setUnconfirmedTransactions,
		unconfirmedTransactionsRef,
	] = useRefState<Transaction[]>([]);
	const [events, setEvents, eventsRef] = useRefState<Event[]>([]);
	const [actions, setActions] = React.useState<string[]>([]);

	// Dialogs related States
	const [showAccount, setShowAccount] = React.useState<Account>();
	const [nodeInfoDialog, setNodeInfoDialog] = React.useState(false);
	const [peersInfoDialog, setPeersInfoDialog] = React.useState(false);

	const newBlockListener = React.useCallback(
		async event => {
			const result = updateStatesOnNewBlock(
				getClient(),
				(event as { block: string }).block,
				blocksRef.current,
				confirmedTransactionsRef.current,
				unconfirmedTransactionsRef.current,
			);
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
					getClient(),
					(event as { transaction: string }).transaction,
					unconfirmedTransactionsRef.current,
				),
			);
		},
		[dashboard.connected],
	);

	const newEventListener = React.useCallback(
		event => {
			setEvents([...eventsRef.current, event]);
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

	const subscribeEvents = async () => {
		getClient().subscribe('app:block:new', newBlockListener);
		getClient().subscribe('app:transaction:new', newTransactionListener);

		const allEvents = ((await getClient().invoke(
			'app:getRegisteredEvents',
		)) as unknown) as string[];
		for (const event of allEvents) {
			getClient().subscribe(event, newEventListener);
		}

		const allActions = ((await getClient().invoke(
			'app:getRegisteredActions',
		)) as unknown) as string[];
		setActions(allActions);
	};

	const loadNodeInfo = async () => {
		setNodeInfo(await getClient().node.getNodeInfo());
	};

	const loadPeersInfo = async () => {
		const info = await getClient().node.getNetworkStats();
		setPeerInfo({
			connected: info.incoming.connects + info.outgoing.connects,
			disconnected: info.incoming.disconnects + info.outgoing.disconnects,
			banned: info.banning.totalBannedPeers,
		});
	};

	// Get connection string
	React.useEffect(() => {
		const initConnectionStr = async () => {
			setDashboard({ ...dashboard, applicationUrl: await getApplicationUrl() });
		};

		initConnectionStr().catch(console.error);
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
			subscribeEvents().catch(console.error);
			loadNodeInfo().catch(console.error);
			loadPeersInfo().catch(console.error);
		}
	}, [dashboard.connected]);

	return (
		<section className={styles.root}>
			<Grid container>
				<Grid row>
					<Grid>
						<Logo name={'My Custom Alpha Beta'} />
					</Grid>
				</Grid>

				<Grid row>
					<Grid md={3}>
						<InfoPanel title={'Current height'}>
							<Text color="green" type="h3">
								14,612,068
							</Text>
						</InfoPanel>
					</Grid>
					<Grid md={3}>
						<InfoPanel
							title={'Current height'}
							onClick={() => console.info('iclick')}
							mode={'light'}
						>
							14,612,068
						</InfoPanel>
					</Grid>
				</Grid>

				<Grid row>
					<Grid md={6}>
						<Icon name={'info'} size={'xl'} />
						<CopiableText text="11111764222293342222L" />
						<Text color="pink" type="h1">
							143,160,552
						</Text>
						<Text color="white" type="p">
							bd81020ded87d21bbfedc45ed...5d90
						</Text>
						<TextInput placeholder={'Some text'} onChange={val => console.info(val)} />
						<br />
						<TextAreaInput
							placeholder={JSON.stringify({ key: 'tokenTransfer', value: 'token:transfer' })}
							size={'l'}
							onChange={val => console.info(val)}
						/>
						<br />
						<Text color="white" type="h2">
							Single Select
						</Text>
						<SelectInput
							options={[
								{ label: 'tokenTransfer', value: 'token:transfer' },
								{ label: 'dposRegisterDelegate', value: 'dpos:register:delegate' },
							]}
							multi={false}
							selected={{ label: 'tokenTransfer', value: 'token:transfer' }}
							onChange={val => console.info(val)}
						/>
						<Text color="white" type="h2">
							Multi Select
						</Text>
						<SelectInput
							options={[
								{ label: 'tokenTransfer', value: 'token:transfer' },
								{ label: 'dposRegisterDelegate', value: 'dpos:register:delegate' },
							]}
							multi
							selected={[
								{ label: 'tokenTransfer', value: 'token:transfer' },
								{ label: 'dposRegisterDelegate', value: 'dpos:register:delegate' },
							]}
							onChange={val => console.info(val)}
						/>
						<Button size={'m'}>Button</Button>
						<IconButton icon={'add'} size={'m'} />
					</Grid>
				</Grid>

				<Grid row>
					<Grid md={12}>
						<Button onClick={() => setPeersInfoDialog(!peersInfoDialog)}>Peers Info Dialog</Button>
						<Button onClick={() => setNodeInfoDialog(!nodeInfoDialog)}>Node Info Dialog</Button>
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

			<Grid container>
				<Grid row>
					<Grid md={6}>
						<BlockWidget title="Recent Blocks" blocks={blocks}></BlockWidget>
					</Grid>
					<Grid md={6}>
						<TransactionWidget
							title="Recent Transactions"
							transactions={confirmedTransactions}
						></TransactionWidget>
					</Grid>
				</Grid>
				<Grid row>
					<Grid md={6}>
						<TransactionWidget
							title="Unconfirmed Transactions"
							transactions={unconfirmedTransactions}
						></TransactionWidget>
					</Grid>
					<Grid md={6}>
						<MyAccountWidget accounts={accounts} onSelect={account => setShowAccount(account)} />
					</Grid>
				</Grid>
				<Grid row>
					<Grid md={6}>
						<SendTransactionWidget
							modules={nodeInfo.registeredModules}
							onSubmit={data => console.info(data)}
						/>
					</Grid>
					<Grid md={3}>
						<Text type={'p'}>{JSON.stringify(events)}</Text>
					</Grid>

					<Grid md={3}>
						<Text type={'p'}>{JSON.stringify(actions)}</Text>
					</Grid>
				</Grid>

				<Grid row>
					<Grid md={6} xs={12}>
						<CallActionWidget
							actions={['app:getNodeInfo', 'app:getAccount']}
							onSubmit={data => console.info(data)}
						/>
					</Grid>
				</Grid>
			</Grid>
		</section>
	);
};

export default MainPage;
