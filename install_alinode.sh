wget --no-check-certificate -O-  https://raw.githubusercontent.com/aliyun-node/tnvm/master/install.sh | bash
source $HOME/.bash_profile
source $HOME/.bashrc
echo TRAVIS_NODE_VERSION = $TRAVIS_NODE_VERSION

if [ $TRAVIS_NODE_VERSION -eq '6' ];then
    tnvm install alinode-v2.9.0
    tnvm use alinode-v2.9.0
elif [ $TRAVIS_NODE_VERSION -eq '8' ];then
    tnvm install alinode-v3.16.0
    tnvm use alinode-v3.16.0
elif [ $TRAVIS_NODE_VERSION -eq '10' ];then
    tnvm install alinode-v4.13.2
    tnvm use alinode-v4.13.2
else
    tnvm install alinode-v6.4.4
    tnvm use alinode-v6.4.4
fi

tnvm current

echo 'which node'
which node

source $HOME/.bash_profile
source $HOME/.bashrc

