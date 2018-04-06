def initBuild() {
  sh '''#!/bin/bash
  pkill -f app.js -9 || true
  sudo service postgresql restart
  dropdb lisk_test || true
  createdb lisk_test
  '''
  deleteDir()
  checkout scm
}

def buildDependency() {
  try {
    sh '''#!/bin/bash
    # Install Deps
    npm install

    # Install Nodejs
    tar -zxf ~/lisk-node-Linux-x86_64.tar.gz
    '''
  } catch (err) {
    currentBuild.result = 'FAILURE'
    error('Stopping build, installation failed')
  }
}

def startLisk() {
  try {
    sh '''#!/bin/bash
    cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
    cp test/config.json test/genesisBlock.json .
    export NODE_ENV=test
    JENKINS_NODE_COOKIE=dontKillMe ~/start_lisk.sh
    '''
  } catch (err) {
    currentBuild.result = 'FAILURE'
    error('Stopping build, Lisk failed')
  }
}

lock(resource: "Lisk-Core-Nodes", inversePrecedence: true) {
  stage ('Prepare Workspace') {
    parallel(
      "Build Node-01" : {
        node('node-01') {
          initBuild()
        }
      },
      "Build Node-02" : {
        node('node-02') {
          initBuild()
        }
      },
      "Build Node-03" : {
        node('node-03') {
          initBuild()
        }
      },
      "Initialize Master Workspace" : {
        node('master-01') {
          sh '''
          cd /var/lib/jenkins/coverage/
          rm -rf node-0*
          rm -rf *.zip
          rm -rf coverage-unit/*
          rm -rf lisk/*
          rm -f merged-lcov.info
          '''
          deleteDir()
          checkout scm
        }
      }
    )
  }

  stage ('Build Dependencies') {
    parallel(
      "Build Dependencies Node-01" : {
        node('node-01') {
          buildDependency()
        }
      },
      "Build Dependencies Node-02" : {
        node('node-02') {
          buildDependency()
        }
      },
      "Build Dependencies Node-03" : {
        node('node-03') {
          buildDependency()
        }
      }
    )
  }

  stage ('Start Lisk') {
    parallel(
      "Start Lisk Node-01" : {
        node('node-01') {
          startLisk()
        }
      },
      "Start Lisk Node-02" : {
        node('node-02') {
          startLisk()
        }
      },
      "Start Lisk Node-03" : {
        node('node-03') {
          startLisk()
        }
      }
    )
  }

  stage ('Parallel Tests') {
    parallel(
      // Begin node-01 tests
      "ESLint" : {
        node('node-01') {
          sh '''
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run eslint
          '''
        }
      },
      "Functional API - Accounts" : {
        node('node-01') {
          sh '''
          export TEST=test/api/accounts.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional API - Blocks" : {
        node('node-01') {
          sh '''
          export TEST=test/api/blocks.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional API - Delegates" : {
        node('node-01') {
          sh '''
          export TEST=test/api/delegates.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional API - Dapps" : {
        node('node-01') {
          sh '''
          export TEST=test/api/dapps.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional API - Loader" : {
        node('node-01') {
          sh '''
          export TEST=test/api/loader.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional API - Multisignatures" : {
        node('node-01') {
          sh '''
          export TEST=test/api/multisignatures.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional API - Multisignatures - Transactions" : {
        node('node-01') {
          sh '''
          export TEST=test/api/multisignatures.transactions.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional API - Peers" : {
        node('node-01') {
          sh '''
          export TEST=test/api/peers.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional API - Signatures" : {
        node('node-01') {
          sh '''
          export TEST=test/api/signatures.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional API - Transactions" : {
        node('node-01') {
          sh '''
          export TEST=test/api/transactions.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      }, // End node-01 tests

      // Begin node-02 tests
      "Functional Transport - Peer" : {
        node('node-02') {
          sh '''
          export TEST=test/transport/peer.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional Transport - Peer - Dapp" : {
        node('node-02') {
          sh '''
          export TEST=test/transport/peer.dapp.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional Transport - Peer - Blocks" : {
        node('node-02') {
          sh '''
          export TEST=test/transport/peer.blocks.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional Transport - Peer - Signatures" : {
        node('node-02') {
          sh '''
          export TEST=test/transport/peer.signatures.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional Transport - Peer - Transactions Collision" : {
        node('node-02') {
          sh '''
          export TEST=test/transport/peer.transactions.collision.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional Transport - Peer - Transactions Delegates" : {
        node('node-02') {
          sh '''
          export TEST=test/transport/peer.transactions.delegates.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional Transport - Peer - Transactions Main" : {
        node('node-02') {
          sh '''
          export TEST=test/transport/peer.transactions.main.js  TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional Transport - Peer - Transactions Multisignatures" : {
        node('node-02') {
          sh '''
          export TEST=test/transport/peer.transactions.multisignatures.js  TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional Transport - Peer - Transactions Multisignatures Advanced" : {
        node('node-02') {
          sh '''
          export TEST=test/transport/peer.transactions.multisignatures.advanced.js  TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional Transport - Peer - Transactions Signatures" : {
        node('node-02') {
          sh '''
          export TEST=test/transport/peer.transactions.signatures.js  TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional Transport - Peer - Votes" : {
        node('node-02') {
          sh '''
          export TEST=test/transport/peer.transactions.votes.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      }, // End node-02 tests

      // Begin node-03 tests
      "Unit - Helpers" : {
        node('node-03') {
          sh '''
          export TEST=test/unit/helpers/*.js TEST_TYPE='UNIT'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Unit - Modules" : {
        node('node-03') {
          sh '''
          export TEST=test/unit/modules/*.js TEST_TYPE='UNIT'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Unit - Modules - Blocks" : {
        node('node-03') {
          sh '''
          export TEST=test/unit/modules/blocks/*.js TEST_TYPE='UNIT'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Unit - SQL" : {
        node('node-03') {
          sh '''
          export TEST=test/unit/sql/*.js TEST_TYPE='UNIT'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Unit - Logic" : {
        node('node-03') {
          sh '''
          export TEST=test/unit/logic/*.js TEST_TYPE='UNIT'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional System - Multisignature" : {
        node('node-03') {
          sh '''
          export TEST=test/system/multisignature.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      },
      "Functional Transport - Stress - Transactions" : {
        node('node-03') {
          sh '''
          export TEST=test/transport/peer.transactions.stress.js TEST_TYPE='FUNC'
          cd "$(echo $WORKSPACE | cut -f 1 -d '@')"
          npm run jenkins
          '''
        }
      } // End node-03 tests
    )
  }

  stage ('Gather Coverage') {
    parallel(
      "Gather Coverage Node-01" : {
        node('node-01') {
          sh '''#!/bin/bash
          export HOST=127.0.0.1:4000
          npm run fetchCoverage
          # Submit coverage reports to Master
          scp test/.coverage-func.zip jenkins@master-01:/var/lib/jenkins/coverage/coverage-func-node-01.zip
          '''
        }
      },
      "Gather Coverage Node-02" : {
        node('node-02') {
          sh '''#!/bin/bash
          export HOST=127.0.0.1:4000
          npm run fetchCoverage
          # Submit coverage reports to Master
          scp test/.coverage-func.zip jenkins@master-01:/var/lib/jenkins/coverage/coverage-func-node-02.zip
          '''
        }
      },
      "Gather Coverage Node-03" : {
        node('node-03') {
          sh '''#!/bin/bash
          export HOST=127.0.0.1:4000
          npm run fetchCoverage
          # Submit coverage reports to Master
          scp test/.coverage-unit/* jenkins@master-01:/var/lib/jenkins/coverage/coverage-unit/
          scp test/.coverage-func.zip jenkins@master-01:/var/lib/jenkins/coverage/coverage-func-node-03.zip
          '''
        }
      }
    ) // End parallel coverage
  }

  stage ('Submit Coverage') {
    node('master-01') {
      sh '''
      cd /var/lib/jenkins/coverage/
      unzip coverage-func-node-01.zip -d node-01
      unzip coverage-func-node-02.zip -d node-02
      unzip coverage-func-node-03.zip -d node-03
      bash merge_lcov.sh . merged-lcov.info
      cp merged-lcov.info $WORKSPACE/merged-lcov.info
      cp .coveralls.yml $WORKSPACE/.coveralls.yml
      cd $WORKSPACE
      cat merged-lcov.info | coveralls -v
      '''
    }
  }

  stage ('Cleanup') {
    parallel(
      "Cleanup Node-01" : {
        node('node-01') {
          sh '''
          pkill -f app.js -9
          '''
        }
      },
      "Cleanup Node-02" : {
        node('node-02') {
          sh '''
          pkill -f app.js -9
          '''
        }
      },
      "Cleanup Node-03" : {
        node('node-03') {
          sh '''
          pkill -f app.js -9
          '''
        }
      },
      "Cleanup Master" : {
        node('master-01') {
          sh '''
          cd /var/lib/jenkins/coverage/
          rm -rf node-0*
          rm -rf *.zip
          rm -rf coverage-unit/*
          rm -f merged-lcov.info
          rm -rf lisk/*
          '''
        }
      }
    )
  }

  stage ('Set milestone') {
    milestone 1
    currentBuild.result = 'SUCCESS'
  }
}
