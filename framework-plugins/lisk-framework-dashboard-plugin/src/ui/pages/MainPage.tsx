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
import { apiClient } from '@liskhq/lisk-client';
import * as React from 'react';
import Box from '../components/Box';
import Button from '../components/Button';
import AccountDialog from '../components/dialogs/AccountDialog';
import NodeInfoDialog from '../components/dialogs/NodeInfoDialog';
import PeersInfoDialog from '../components/dialogs/PeersInfoDialog';
import Grid from '../components/Grid';
import InfoPanel from '../components/InfoPanel';
import Logo from '../components/Logo';
import Text from '../components/Text';
import { BlockWidget, TransactionWidget } from '../components/widgets';
import CallActionWidget from '../components/widgets/CallActionWidget';
import MyAccountWidget from '../components/widgets/MyAccountWidget';
import SendTransactionWidget from '../components/widgets/SendTransactionWidget';
import useMessageDialog from '../providers/useMessageDialog';
import { Account, Block, NodeInfo, Transaction } from '../types';
import { getApplicationUrl, updateStatesOnNewBlock, updateStatesOnNewTransaction } from '../utils';
import useRefState from '../utils/useRefState';
import styles from './MainPage.module.scss';

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
	const [events, setEvents] = React.useState<string[]>([]);
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

		setEvents(await getClient().invoke<string[]>('app:getRegisteredEvents'));
		setActions(await getClient().invoke<string[]>('app:getRegisteredActions'));
	};

	const loadNodeInfo = async () => {
		console.info(await getClient().node.getNodeInfo());
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

	const CurrentHeightPanel = () => (
		<InfoPanel title={'Current height'}>
			<Text color="green" type="h1">
				{nodeInfo.height.toLocaleString()}
			</Text>
		</InfoPanel>
	);

	const FinalizedHeightPanel = () => (
		<InfoPanel title={'Finalized height'}>
			<Text color="pink" type="h1">
				{nodeInfo.finalizedHeight.toLocaleString()}
			</Text>
		</InfoPanel>
	);

	const NextBlockPanel = () => (
		<InfoPanel title={'Next block'}>
			<Text color="yellow" type="h1">
				99s
			</Text>
		</InfoPanel>
	);

	const PeersInfoPanel = () => (
		<InfoPanel title={'Peers'} onClick={() => setPeersInfoDialog(true)}>
			<Text color="blue" type="h1">
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
			<Grid container>
				<Grid row alignItems={'center'}>
					<Grid xs={6} md={8}>
						<Box mt={6}>
							<Logo name={'My Custom Alpha Beta'} />
						</Box>
					</Grid>
					<Grid xs={6} md={4}>
						<Box mt={6} textAlign={'right'}>
							<Button>Generate new account</Button>
						</Box>
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

			<Grid container columns={12} colSpacing={4}>
				<Grid row>
					<Grid md={6} xs={12}>
						<MyAccountWidget accounts={accounts} onSelect={account => setShowAccount(account)} />
					</Grid>
					<Grid md={6} xs={12}>
						<BlockWidget title="Recent Blocks" blocks={blocks}></BlockWidget>
					</Grid>
				</Grid>

				<Grid row>
					<Grid md={6} xs={12}>
						<TransactionWidget
							title="Recent Transactions"
							transactions={confirmedTransactions}
						></TransactionWidget>
					</Grid>
					<Grid md={6} xs={12}>
						<TransactionWidget
							title="Unconfirmed Transactions"
							transactions={unconfirmedTransactions}
						></TransactionWidget>
					</Grid>
				</Grid>

				<Grid row>
					<Grid md={6} xs={12}>
						<SendTransactionWidget
							modules={nodeInfo.registeredModules}
							onSubmit={data => console.info(data)}
						/>
					</Grid>
					<Grid md={6} xs={12}>
						<CallActionWidget actions={actions} onSubmit={data => console.info(data)} />
					</Grid>
				</Grid>

				<Grid row>
					<Grid xs={12}>{events}</Grid>
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
