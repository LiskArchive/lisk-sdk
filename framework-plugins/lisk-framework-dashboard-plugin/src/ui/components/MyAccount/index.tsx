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
import { Widget, WidgetBody, WidgetHeader } from '../widget';
import IconButton from '../IconButton';
import Text from '../Text';

interface AccountInfo {
	readonly binaryAddress: string;
	readonly publicKey: string;
}

interface MyAccountProps {
    accounts: ReadonlyArray<AccountInfo>;
    // onSelect?: () => void;
    // onCopy?: () => void;
}

const MyAccount: React.FC<MyAccountProps> = props => {
    const { accounts } = props;

	return (
            <Widget>
                    <WidgetHeader>
                        <Text type={'h2'}>My Accounts</Text>
                    </WidgetHeader>
                <WidgetBody size={'m'}> 
                    // TODO: Waiting for TableComponent to be implemented
                    { accounts?.length ? (accounts.map((account: AccountInfo) => <span><Text>{account.binaryAddress}</Text><IconButton icon={'content_copy'} size={'m'}/></span>)) : (<Text>You don't have any accounts</Text>) }
                    // TODO: Waiting for AccountModal to be implemented
                </WidgetBody>
            </Widget>
	);
};

export default MyAccount;