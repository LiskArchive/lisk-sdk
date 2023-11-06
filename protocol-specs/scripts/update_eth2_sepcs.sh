# 
#  Copyright © 2021 Lisk Foundation
#  
#  See the LICENSE file at the top-level directory of this distribution
#  for licensing information.
# 
#  Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
#  no part of this software, including this file, may be copied, modified, 
#  propagated, or distributed except according to the terms contained in the
#  LICENSE file.
#  
#  Removal or modification of this copyright notice is prohibited.
#  

cd eth2_spec_tests
wget https://github.com/ethereum/eth2.0-spec-tests/releases/download/v1.1.0-alpha.7/general.tar.gz
tar -zxvf general.tar.gz
rm general.tar.gz
for d in ./tests/general/phase0/* ; do
  if [ $d != "./tests/general/phase0/bls" ]; then 
    rm -r $d
  fi
done
