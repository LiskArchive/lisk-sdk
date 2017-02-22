#!/bin/bash

if [ -z "$id_rsa_{0..22}" ]; then echo 'No $id_rsa_{0..22} found !' ; exit 1; fi

echo -n $id_rsa_{00..22} >> ~/.ssh/travis_rsa_64
base64 --decode --ignore-garbage ~/.ssh/travis_rsa_64 > ~/.ssh/id_rsa

chmod 600 ~/.ssh/id_rsa
mv -fv .travis/ssh-config ~/.ssh/config
eval `ssh-agent -s`
ssh-add ~/.ssh/id_rsa
ssh-keygen -f ~/.ssh/id_rsa -y > ~/.ssh/id_rsa.pub
