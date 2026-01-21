import { PrivateKey } from 'symbol-sdk';
import { SymbolFacade } from 'symbol-sdk/symbol';
import fs from 'fs';
import "dotenv/config"

const privateKey = PrivateKey.random();
const facade = new SymbolFacade('testnet');
const account = facade.createAccount(privateKey);

console.log('privateKey:', privateKey.toString());
console.log('publicKey:', account.publicKey.toString());
console.log('address:', account.address.toString());

const { MY_ACCOUNT_ADDRESS, MY_PRIVATE_KEY, MY_PUBLIC_KEY } = process.env;

// .envへのaccount情報の書き込み
// もし.envが存在すれば、変数を上書きする。
const envFilePath = ".env";

let envContent = "";
if (fs.existsSync(envFilePath)) {
	envContent = fs.readFileSync(envFilePath, "utf8");
}

const envLines = envContent.split(/\r?\n/).filter(Boolean);
const nextEnv = new Map();

for (const line of envLines) {
	const match = line.match(/^([^=]+)=(.*)$/);
	if (match) {
		nextEnv.set(match[1], match[2]);
	}
}

nextEnv.set("MY_ADDRESS", account.address.toString());
nextEnv.set("MY_PRIVATE_KEY", privateKey.toString());
nextEnv.set("MY_PUBLIC_KEY", account.publicKey.toString());

const updatedEnvContent = Array.from(nextEnv.entries()).map(([key, value]) => `${key}=${value}`).join("\n") + "\n";

fs.writeFileSync(envFilePath, updatedEnvContent, "utf8");
console.log(".env updated:", envFilePath);

