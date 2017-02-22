#!/bin/bash

npm install travis-encrypt -g
echo -e 'n'|ssh-keygen -q -b 2048 -t rsa -N "" -f ~/.ssh/travis_rsa
cat ~/.ssh/travis_rsa.pub
base64 --wrap=0 ~/.ssh/travis_rsa > ~/.ssh/travis_rsa_64
#cd ..
#save private key in travis field as encrypted variable
ENCRYPTION_FILTER="echo \$(echo \"-\")\$(travis-encrypt -a -r MaciejBaj/lisk \"\$FILE='\`cat $FILE\`'\" | grep secure:)"
split --bytes=100 --numeric-suffixes --suffix-length=2 --filter="$ENCRYPTION_FILTER" ~/.ssh/travis_rsa_64 id_rsa_
cat .travis.yml
#now copy password to .travis.yml file on repo
