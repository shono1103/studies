import { PrivateKey, PublicKey } from 'symbol-sdk';
import { SymbolFacade } from 'symbol-sdk/symbol';
import fs from 'fs';
import "dotenv/config";
import { exit } from 'process';
import { generateKey } from 'crypto';

const accountSource = process.argv[2];
const facade = new SymbolFacade('testnet');

const generateAccountFromPrivateKey = (key) => {
	const privateKey = new PrivateKey(key);
	const account = facade.createAccount(privateKey);
	return account

}

const generateAccountFromPublicKey = (key) => {
	const publicKey = new PublicKey(key);
	const account = facade.createPublicAccount(publicKey);
	return account
}

const generateAccountFromAddress = (address) => {
	console.log("未完成");
}

switch (accountSource) {
	case 'privateKey': {
		const account = generateAccountFromPrivateKey(process.env.MY_PRIVATE_KEY)
		console.log(account);
		break;
	}
	case 'publicKey': {
		const account = generateAccountFromPublicKey(process.env.MY_PUBLIC_KEY)
		console.log(account);
		break;
	}
	case 'address': {
		const account = generateAccountFromAddress(process.env.MY_ADDRESS);
		console.log(account);
		break;
	}
	default: {
		console.log("bad arg");
		exit(1);
	}
}




