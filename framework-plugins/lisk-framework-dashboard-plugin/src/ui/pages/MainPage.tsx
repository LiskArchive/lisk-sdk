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

const MainPage: React.FC = () => (
	<section className={styles.root}>
		<Logo name={'My Custom Alpha Beta'} />
		{/* text sample */}
		<div>
			<Icon name={'info'} size={'xl'} />
		</div>
		<div>
			<Text color="pink" type="h1">
				143,160,552
			</Text>
			<Text color="white" type="h2">
				My Accounts
			</Text>
			<Text color="white" type="p">
				bd81020ded87d21bbfedc45ed...5d90
			</Text>
		</div>
	</section>
);

export default MainPage;
