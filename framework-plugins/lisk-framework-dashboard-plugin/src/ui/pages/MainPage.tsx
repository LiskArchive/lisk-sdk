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
import styles from './MainPage.module.scss';
import Text from '../components/Text';
import Icon from '../components/Icon';
import Logo from '../components/Logo';
import CopiableText from '../components/CopiableText';
import { Widget, WidgetHeader, WidgetBody } from '../components/widget';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
import { Dialog, DialogHeader, DialogBody } from '../components/dialog';
import MessageDialog from '../components/dialogs/MessageDialog';
import AccountDialog from '../components/dialogs/AccountDialog';
import PeersInfoDialog from '../components/dialogs/PeersInfoDialog';
import NodeInfoDialog from '../components/dialogs/NodeInfoDialog';
import Grid from '../components/Grid';
import { SelectInput, TextAreaInput, TextInput } from '../components/Input';

const MainPage: React.FC = () => {
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const [successDialog, setSuccessDialog] = React.useState(false);
	const [accountDialog, setAccountDialog] = React.useState(false);
	const [nodeInfoDialog, setNodeInfoDialog] = React.useState(false);
	const [peersInfoDialog, setPeersInfoDialog] = React.useState(false);

	return (
		<section className={styles.root}>
			<Grid container>
				<Grid row>
					<Grid>
						<Logo name={'My Custom Alpha Beta'} />
					</Grid>
				</Grid>

				<Grid row>
					<Grid md={6}>
						<Icon name={'info'} size={'xl'} />
						<CopiableText text="11111764222293342222L" />
						<Text color="pink" type="h1">
							143,160,552
						</Text>
						<Text color="white" type="h2">
							My Accounts
						</Text>
						<Text color="white" type="p">
							bd81020ded87d21bbfedc45ed...5d90
						</Text>

						<TextInput placeholder={'Some text'} />
						<br />
						<TextAreaInput
							placeholder={JSON.stringify({ key: 'tokenTransfer', value: 'token:transfer' })}
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
						/>

						<Button size={'m'}>Button</Button>
						<IconButton icon={'add'} size={'m'} />
					</Grid>
					<Grid md={6}>
						<Widget>
							<WidgetHeader>
								<Text type={'h2'}>Widget title</Text>
							</WidgetHeader>
							<WidgetBody size={'m'} scrollbar={true}>
								<h2>Nazar</h2>
								<p>
									Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin neque est, placerat
									eget ornare id, dignissim quis turpis. Integer tincidunt ante nec aliquet finibus.
									Phasellus dapibus dignissim mattis. Quisque porttitor tempus risus quis mattis.
									Donec vel maximus metus. Vivamus mattis mollis nibh, nec bibendum urna tristique
									at. Vestibulum nec libero nec quam aliquam gravida vel eu lorem. Sed nec auctor
									lorem. Nunc tincidunt lectus diam, eget semper est tempor a. Curabitur convallis
									nunc et diam finibus, in gravida neque posuere. Maecenas in dolor et dolor sodales
									accumsan. Etiam dui augue, laoreet eu augue ut, dapibus cursus augue. Vestibulum
									vitae vehicula lectus. Maecenas eget tincidunt mauris. Nam dignissim elit a sem
									pellentesque, nec consequat enim faucibus. Aenean id arcu purus.
								</p>

								<p>
									Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin neque est, placerat
									eget ornare id, dignissim quis turpis. Integer tincidunt ante nec aliquet finibus.
									Phasellus dapibus dignissim mattis. Quisque porttitor tempus risus quis mattis.
									Donec vel maximus metus. Vivamus mattis mollis nibh, nec bibendum urna tristique
									at. Vestibulum nec libero nec quam aliquam gravida vel eu lorem. Sed nec auctor
									lorem. Nunc tincidunt lectus diam, eget semper est tempor a. Curabitur convallis
									nunc et diam finibus, in gravida neque posuere. Maecenas in dolor et dolor sodales
									accumsan. Etiam dui augue, laoreet eu augue ut, dapibus cursus augue. Vestibulum
									vitae vehicula lectus. Maecenas eget tincidunt mauris. Nam dignissim elit a sem
									pellentesque, nec consequat enim faucibus. Aenean id arcu purus.
								</p>

								<p>
									Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin neque est, placerat
									eget ornare id, dignissim quis turpis. Integer tincidunt ante nec aliquet finibus.
									Phasellus dapibus dignissim mattis. Quisque porttitor tempus risus quis mattis.
									Donec vel maximus metus. Vivamus mattis mollis nibh, nec bibendum urna tristique
									at. Vestibulum nec libero nec quam aliquam gravida vel eu lorem. Sed nec auctor
									lorem. Nunc tincidunt lectus diam, eget semper est tempor a. Curabitur convallis
									nunc et diam finibus, in gravida neque posuere. Maecenas in dolor et dolor sodales
									accumsan. Etiam dui augue, laoreet eu augue ut, dapibus cursus augue. Vestibulum
									vitae vehicula lectus. Maecenas eget tincidunt mauris. Nam dignissim elit a sem
									pellentesque, nec consequat enim faucibus. Aenean id arcu purus.
								</p>

								<p>
									Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin neque est, placerat
									eget ornare id, dignissim quis turpis. Integer tincidunt ante nec aliquet finibus.
									Phasellus dapibus dignissim mattis. Quisque porttitor tempus risus quis mattis.
									Donec vel maximus metus. Vivamus mattis mollis nibh, nec bibendum urna tristique
									at. Vestibulum nec libero nec quam aliquam gravida vel eu lorem. Sed nec auctor
									lorem. Nunc tincidunt lectus diam, eget semper est tempor a. Curabitur convallis
									nunc et diam finibus, in gravida neque posuere. Maecenas in dolor et dolor sodales
									accumsan. Etiam dui augue, laoreet eu augue ut, dapibus cursus augue. Vestibulum
									vitae vehicula lectus. Maecenas eget tincidunt mauris. Nam dignissim elit a sem
									pellentesque, nec consequat enim faucibus. Aenean id arcu purus.
								</p>

								<p>
									Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin neque est, placerat
									eget ornare id, dignissim quis turpis. Integer tincidunt ante nec aliquet finibus.
									Phasellus dapibus dignissim mattis. Quisque porttitor tempus risus quis mattis.
									Donec vel maximus metus. Vivamus mattis mollis nibh, nec bibendum urna tristique
									at. Vestibulum nec libero nec quam aliquam gravida vel eu lorem. Sed nec auctor
									lorem. Nunc tincidunt lectus diam, eget semper est tempor a. Curabitur convallis
									nunc et diam finibus, in gravida neque posuere. Maecenas in dolor et dolor sodales
									accumsan. Etiam dui augue, laoreet eu augue ut, dapibus cursus augue. Vestibulum
									vitae vehicula lectus. Maecenas eget tincidunt mauris. Nam dignissim elit a sem
									pellentesque, nec consequat enim faucibus. Aenean id arcu purus.
								</p>
							</WidgetBody>
						</Widget>
					</Grid>
				</Grid>

				<Grid row>
					<Grid md={12}>
						<Button onClick={() => setDialogOpen(!dialogOpen)}>Open</Button>
						<Button onClick={() => setSuccessDialog(!successDialog)}>Sucess Dialog</Button>
						<Button onClick={() => setAccountDialog(!accountDialog)}>Account Dialog</Button>
						<Button onClick={() => setPeersInfoDialog(!peersInfoDialog)}>Peers Info Dialog</Button>
						<Button onClick={() => setNodeInfoDialog(!nodeInfoDialog)}>Node Info Dialog</Button>
					</Grid>
				</Grid>
			</Grid>

			<Dialog
				open={dialogOpen}
				onClose={() => {
					setDialogOpen(false);
				}}
			>
				<DialogHeader>
					<Text type={'h1'}>Dialog Title</Text>
				</DialogHeader>
				<DialogBody>
					<Text type={'p'}>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin neque est, placerat eget
						ornare id, dignissim quis turpis. Integer tincidunt ante nec aliquet finibus. Phasellus
						dapibus dignissim mattis. Quisque porttitor tempus risus quis mattis. Donec vel maximus
						metus. Vivamus mattis mollis nibh, nec bibendum urna tristique at. Vestibulum nec libero
						nec quam aliquam gravida vel eu lorem. Sed nec auctor lorem. Nunc tincidunt lectus diam,
						eget semper est tempor a. Curabitur convallis nunc et diam finibus, in gravida neque
						posuere. Maecenas in dolor et dolor sodales accumsan. Etiam dui augue, laoreet eu augue
						ut, dapibus cursus augue. Vestibulum vitae vehicula lectus. Maecenas eget tincidunt
						mauris. Nam dignissim elit a sem pellentesque, nec consequat enim faucibus. Aenean id
						arcu purus.
					</Text>

					<Text type={'p'}>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin neque est, placerat eget
						ornare id, dignissim quis turpis. Integer tincidunt ante nec aliquet finibus. Phasellus
						dapibus dignissim mattis. Quisque porttitor tempus risus quis mattis. Donec vel maximus
						metus. Vivamus mattis mollis nibh, nec bibendum urna tristique at. Vestibulum nec libero
						nec quam aliquam gravida vel eu lorem. Sed nec auctor lorem. Nunc tincidunt lectus diam,
						eget semper est tempor a. Curabitur convallis nunc et diam finibus, in gravida neque
						posuere. Maecenas in dolor et dolor sodales accumsan. Etiam dui augue, laoreet eu augue
						ut, dapibus cursus augue. Vestibulum vitae vehicula lectus. Maecenas eget tincidunt
						mauris. Nam dignissim elit a sem pellentesque, nec consequat enim faucibus. Aenean id
						arcu purus.
					</Text>

					<Text type={'p'}>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin neque est, placerat eget
						ornare id, dignissim quis turpis. Integer tincidunt ante nec aliquet finibus. Phasellus
						dapibus dignissim mattis. Quisque porttitor tempus risus quis mattis. Donec vel maximus
						metus. Vivamus mattis mollis nibh, nec bibendum urna tristique at. Vestibulum nec libero
						nec quam aliquam gravida vel eu lorem. Sed nec auctor lorem. Nunc tincidunt lectus diam,
						eget semper est tempor a. Curabitur convallis nunc et diam finibus, in gravida neque
						posuere. Maecenas in dolor et dolor sodales accumsan. Etiam dui augue, laoreet eu augue
						ut, dapibus cursus augue. Vestibulum vitae vehicula lectus. Maecenas eget tincidunt
						mauris. Nam dignissim elit a sem pellentesque, nec consequat enim faucibus. Aenean id
						arcu purus.
					</Text>

					<Text type={'p'}>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin neque est, placerat eget
						ornare id, dignissim quis turpis. Integer tincidunt ante nec aliquet finibus. Phasellus
						dapibus dignissim mattis. Quisque porttitor tempus risus quis mattis. Donec vel maximus
						metus. Vivamus mattis mollis nibh, nec bibendum urna tristique at. Vestibulum nec libero
						nec quam aliquam gravida vel eu lorem. Sed nec auctor lorem. Nunc tincidunt lectus diam,
						eget semper est tempor a. Curabitur convallis nunc et diam finibus, in gravida neque
						posuere. Maecenas in dolor et dolor sodales accumsan. Etiam dui augue, laoreet eu augue
						ut, dapibus cursus augue. Vestibulum vitae vehicula lectus. Maecenas eget tincidunt
						mauris. Nam dignissim elit a sem pellentesque, nec consequat enim faucibus. Aenean id
						arcu purus.
					</Text>

					<Text type={'p'}>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin neque est, placerat eget
						ornare id, dignissim quis turpis. Integer tincidunt ante nec aliquet finibus. Phasellus
						dapibus dignissim mattis. Quisque porttitor tempus risus quis mattis. Donec vel maximus
						metus. Vivamus mattis mollis nibh, nec bibendum urna tristique at. Vestibulum nec libero
						nec quam aliquam gravida vel eu lorem. Sed nec auctor lorem. Nunc tincidunt lectus diam,
						eget semper est tempor a. Curabitur convallis nunc et diam finibus, in gravida neque
						posuere. Maecenas in dolor et dolor sodales accumsan. Etiam dui augue, laoreet eu augue
						ut, dapibus cursus augue. Vestibulum vitae vehicula lectus. Maecenas eget tincidunt
						mauris. Nam dignissim elit a sem pellentesque, nec consequat enim faucibus. Aenean id
						arcu purus.
					</Text>
				</DialogBody>
			</Dialog>

			<MessageDialog
				open={successDialog}
				onClose={() => {
					setSuccessDialog(false);
				}}
				title={'Success'}
				backBtn={true}
			>
				<Text type={'p'}>
					Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin neque est, placerat eget
					ornare id, dignissim quis turpis. Integer tincidunt ante nec aliquet finibus. Phasellus
					dapibus dignissim mattis. Quisque porttitor tempus risus quis mattis. Donec vel maximus
					metus. Vivamus mattis mollis nibh, nec bibendum urna tristique at. Vestibulum nec libero
					nec quam aliquam gravida vel eu lorem. Sed nec auctor lorem. Nunc tincidunt lectus diam,
					eget semper est tempor a. Curabitur convallis nunc et diam finibus, in gravida neque
					posuere. Maecenas in dolor et dolor sodales accumsan. Etiam dui augue, laoreet eu augue
					ut, dapibus cursus augue. Vestibulum vitae vehicula lectus. Maecenas eget tincidunt
					mauris. Nam dignissim elit a sem pellentesque, nec consequat enim faucibus. Aenean id arcu
					purus.
				</Text>
			</MessageDialog>

			<AccountDialog
				open={accountDialog}
				onClose={() => {
					setAccountDialog(false);
				}}
				account={{
					binaryAddress: 'bd81020ded87d21bbfedc45ed24a081bb4905d90',
					base32Address: 'lskfxs5s8cnahtevckky6dmr8jt3c9oqgd5gjbs85',
					publicKey: '5f0a7f66a2e32dc9c6bd4521b6baad37cd70de1f8a6e51491932052f3d38ede4',
					passphrase:
						'ipsum dolor sit amet, consectetur adipiscing elit. Proin neque est, placerat eget ornare id consectetur adipiscing elit consectetur adipiscing elit',
				}}
			></AccountDialog>

			<PeersInfoDialog
				open={peersInfoDialog}
				onClose={() => {
					setPeersInfoDialog(false);
				}}
				peersInfo={{ connected: 6, disconnected: 10, banned: 4 }}
			></PeersInfoDialog>

			<NodeInfoDialog
				open={nodeInfoDialog}
				onClose={() => {
					setNodeInfoDialog(false);
				}}
				nodeInfo={{
					version: '3.0.0-beta.4.9fa842f',
					networkVersion: '2.0',
					networkIdentifier: '01e47ba4e3e57981642150f4b45f64c2160c10bac9434339888210a4fa5df097',
					lastBlockId: 'e3da90a99aa5116eeb8d603ada9c1c5349744cf94333d5e4cd2237b391138445',
					syncing: true,
					unconfirmedTransactions: 5,
					blockTime: 10,
					communityIdentifier: 'Lisk',
					maxPayloadLength: 15360,
					bftThreshold: 68,
					minFeePerByte: 1000,
					fees: [
						{ moduleId: 5, assetId: 2, baseFee: 1000 },
						{ moduleId: 4, assetId: 1, baseFee: 1020 },
					],
				}}
			></NodeInfoDialog>
		</section>
	);
};

export default MainPage;
