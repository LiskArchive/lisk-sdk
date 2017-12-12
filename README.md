# Lisk

Lisk is a next generation crypto-currency and decentralized application platform, written entirely in JavaScript. For more information please refer to our website: https://lisk.io/.

[![Build Status](https://travis-ci.org/LiskHQ/lisk.svg?branch=development)](https://travis-ci.org/LiskHQ/lisk)
[![Coverage Status](https://coveralls.io/repos/github/LiskHQ/lisk/badge.svg?branch=development)](https://coveralls.io/github/LiskHQ/lisk?branch=development)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)
[![Join the chat at https://gitter.im/LiskHQ/lisk](https://badges.gitter.im/LiskHQ/lisk.svg)](https://gitter.im/LiskHQ/lisk?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

**NOTE:** The following information is applicable to: **Ubuntu 14.04, 16.04 (LTS) or 16.10 - x86_64**.

## Prerequisites - In order

This sections provides details on what you need install on your system in order to run Lisk.

###System Install

- Tool chain components -- Used for compiling dependencies

    - Linux:
    
        ```
        sudo apt-get update
        sudo apt-get install -y python build-essential curl automake autoconf libtool`
        ```
        
    - Mac:
    
        Make sure that you have both XCode and Brew installed on your machine.
        
        Update homebrew:
        
        ```
        brew update
        brew doctor
        ```
        
        Install Lunchy for easier starting and stoping of services:
        
        ```
        gem install lunchy
        ```

- Git (<https://github.com/git/git>) -- Used for cloning and updating Lisk

    - Linux:

        ```
        sudo apt-get install -y git
        ```
        
    - Mac:
    
        ```
        brew install git
        ```

###Node.js (<https://nodejs.org/>) 

- Node.js serves as the underlying engine for code execution.

    Install System wide via package manager:

    Linux:

    ```
    curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

    Mac:
    
    ```
    brew install node
    ```
    
- (Optional) Install n -- Used for Node.js version management
    
    ```
    npm install -g n
    n 8.9.2
    ```
        
- ####Special note about NPM 5
    
    Due to an issue with NPM 5.4.x and higher, node-sodium cannot be built. Therefore it is recommended to fixate the local NPM version at v5.3.x
    
    All Systems - This may require sudo depending on your environment:
    
    ```
    npm install -g npm@5.3.0
    ```
    
- PM2 (<https://github.com/Unitech/pm2>) -- PM2 manages the node process for Lisk (Optional)

  ```
  npm install -g pm2
  ```

###PostgreSQL (version 9.6.6):

   - Linux:

        ```
        curl -sL "https://downloads.lisk.io/scripts/setup_postgresql.Linux" | bash -
        sudo -u postgres createuser --createdb $USER
        createdb lisk_test
        createdb lisk_main
        sudo -u postgres psql -d lisk_test -c "alter user "$USER" with password 'password';"
        sudo -u postgres psql -d lisk_main -c "alter user "$USER" with password 'password';"
        ```
      
   - Mac:
    
        When installing a different version, replace 9.6.6 with your version in the following commands:
        
        ```
        brew install postgresql
        initdb /usr/local/var/postgres -E utf8
        mkdir -p ~/Library/LaunchAgents
        cp /usr/local/Cellar/postgresql/9.6.6/homebrew.mxcl.postgresql.plist ~/Library/LaunchAgents/
        lunchy start postgres
        createdb lisk_test
        createdb lisk_main
        ```

###Installing Redis

   - Linux:
        
        ```
        wget http://download.redis.io/redis-stable.tar.gz
        tar xvzf redis-stable.tar.gz
        cd redis-stable
        make
        sudo make install
        ```
        
        start redis-server:
        ```
        redis-server redis.conf --daemonize yes
        ```
        
        stop redis-server: 
        ```
        redis-cli 
        shutdown
        ```
        
        If you run into any problems during the redis-setup, please check out the official redis docs: https://redis.io/topics/quickstart
        
   - Mac:
    
        ```
        brew install redis
        ```
        start redis-server:
        ```
        lunchy start redis
        ```
        
        stop redis-server: 
        ```
        lunchy stop redis
        ```
        
**NOTE:** Lisk does not run on the redis default port of 6379. Instead it is configured to run on port: 6380. Because of this, in order for Lisk to run, you have one of two options:

####Change The Lisk Configuration

Update the redis port configuration in both `config.json` and `test/data/config.json`. Note that this is the easiest option, however, be mindfull of reverting the changes should you make a pull request.

####Change The Redis Launch configuration

Update the launch configuration file on your system. Note that their a number of ways to do this. The following is one way:

1. Stop Redis on your computer.
2. Open the `redis.conf` file and change this: `port 6379` to `port 6380`
3. Restart Redis.

Now confirm that redis is running on port 6380.

```
redis-cli -p 6380
ping
```

and you should get the result of 'PONG'

## Installation Steps

Clone the Lisk repository using Git and initialize the modules.

```
git clone https://github.com/LiskHQ/lisk.git
cd lisk
git checkout 0.9.11
npm install
```

## Managing Lisk

To test that Lisk is built and configured correctly, run the following command:

```
node app.js
```

Once the process is verified as running correctly, `CTRL+C` and start the process with `pm2`. This will fork the process into the background and automatically recover the process if it fails.

```
pm2 start --name lisk app.js
```

After the process is started, its runtime status and log location can be retrieved by issuing the following command:

```
pm2 show lisk
```

To stop Lisk after it has been started with `pm2`, issue the following command:

```
pm2 stop lisk
```

**NOTE:** The **port**, **address** and **config-path** can be overridden by providing the relevant command switch:

```
pm2 start --name lisk app.js -- -p [port] -a [address] -c [config-path]
```

## Tests

Before running any tests, please ensure Lisk is configured to run on the same testnet that is used by the test-suite.

Replace **config.json** and **genesisBlock.json** with the corresponding files under the **test** directory:

```
cp test/config.json test/genesisBlock.json .
```

**NOTE:** If the node was started with a different genesis block previous, trauncate the database before running tests.

```
dropdb lisk_test
createdb lisk_test
```

**NOTE:** The master passphrase for this genesis block is as follows:

```
wagon stock borrow episode laundry kitten salute link globe zero feed marble
```

Launch Lisk (runs on port 4000):

```
node app.js
```

Run the test suite:

```
npm test
```

Run individual tests:

```
npm test -- test/lib/accounts.js
npm test -- test/lib/transactions.js
```

## Contributors

https://github.com/LiskHQ/lisk/graphs/contributors

## License

Copyright © 2016-2017 Lisk Foundation

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the [GNU General Public License](https://github.com/LiskHQ/lisk/tree/master/LICENSE) along with this program.  If not, see <http://www.gnu.org/licenses/>.

***

This program also incorporates work previously released with lisk `0.7.0` (and earlier) versions under the [MIT License](https://opensource.org/licenses/MIT). To comply with the requirements of that license, the following permission notice, applicable to those parts of the code only, is included below:

Copyright © 2016-2017 Lisk Foundation  
Copyright © 2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
