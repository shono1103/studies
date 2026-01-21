import 'dotenv/config';
import { PrivateKey, PublicKey } from 'symbol-sdk';
import { SymbolFacade } from 'symbol-sdk/symbol';
import { requestWebApi } from './api/webapi_client.js';

const readArgValue = (name) => {
	const prefix = `--${name}=`;
	const hit = process.argv.find((arg) => arg.startsWith(prefix));
	return hit ? hit.slice(prefix.length) : undefined;
};

const resolveAddress = () => {
	if (process.env.MY_ADDRESS) {
		return process.env.MY_ADDRESS;
	}

	const facade = new SymbolFacade('testnet');
	if (process.env.MY_PUBLIC_KEY) {
		const account = facade.createPublicAccount(new PublicKey(process.env.MY_PUBLIC_KEY));
		return account.address.toString();
	}

	if (process.env.MY_PRIVATE_KEY) {
		const account = facade.createAccount(new PrivateKey(process.env.MY_PRIVATE_KEY));
		return account.address.toString();
	}

	throw new Error('MY_ADDRESS or MY_PUBLIC_KEY or MY_PRIVATE_KEY is required.');
};

const main = async () => {
	const nodeUrl = readArgValue('node-url') ?? process.env.SYMBOL_WEBAPI_NODE_URL;
	const address = resolveAddress();

	const nodeInfo = await requestWebApi({
		nodeUrl,
		path: '/node/info',
		method: 'GET'
	});
	console.log('nodeUrl:', nodeInfo.url);
	console.log('node:', nodeInfo.payload);

	const chainInfo = await requestWebApi({
		nodeUrl,
		path: '/chain/info',
		method: 'GET'
	});
	console.log('chain:', chainInfo.payload);

	const accountInfo = await requestWebApi({
		nodeUrl,
		path: '/accounts/{accountId}',
		method: 'GET',
		pathParams: { accountId: address }
	});
	console.log('account:', accountInfo.payload);

	const multisigInfo = await requestWebApi({
		nodeUrl,
		path: '/account/{address}/multisig',
		method: 'GET',
		pathParams: { address }
	});
	console.log('multisig:', multisigInfo.payload);
};

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
