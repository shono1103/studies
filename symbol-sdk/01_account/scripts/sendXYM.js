import 'dotenv/config';
import { PrivateKey } from 'symbol-sdk';
import { SymbolFacade, Address, descriptors, models } from 'symbol-sdk/symbol';
import { requestWebApi } from './api/webapi_client.js';

const MICRO_XYM = 1_000_000n;
const DEFAULT_FEE_MULTIPLIER = 100;
const DEFAULT_DEADLINE_SECONDS = 2 * 60 * 60;

const readArgValue = (name) => {
	const prefix = `--${name}=`;
	const hit = process.argv.find((arg) => arg.startsWith(prefix));
	return hit ? hit.slice(prefix.length) : undefined;
};

const parseXymToMicro = (value) => {
	const [whole, fraction = ''] = value.split('.');
	const padded = (fraction + '000000').slice(0, 6);
	return BigInt(whole || '0') * MICRO_XYM + BigInt(padded);
};

const resolveAmount = () => {
	const amountMicro = process.env.AMOUNT_MICRO ?? readArgValue('amount-micro');
	if (amountMicro) {
		return BigInt(amountMicro);
	}
	const amountXym = process.env.AMOUNT_XYM ?? process.env.AMOUNT ?? readArgValue('amount-xym');
	if (!amountXym) {
		throw new Error('AMOUNT_XYM (or AMOUNT_MICRO) is required.');
	}
	return parseXymToMicro(amountXym);
};

const extractCurrencyMosaicId = (payload) => {
	const chain = payload?.chain ?? payload?.network?.chain;
	const candidates = [
		chain?.currencyMosaicId,
		chain?.currencyMosaicIdHex,
		payload?.currencyMosaicId,
		payload?.currencyMosaicIdHex
	];
	for (const candidate of candidates) {
		if (typeof candidate === 'string' && candidate.length > 0) {
			return candidate;
		}
	}
	return undefined;
};

const resolveMosaicId = async (nodeUrl) => {
	const envValue = process.env.SYMBOL_XYM_MOSAIC_ID ?? process.env.XYM_MOSAIC_ID ?? readArgValue('mosaic-id');
	if (envValue) {
		return envValue;
	}
	const response = await requestWebApi({
		nodeUrl,
		path: '/network/properties',
		method: 'GET'
	});
	const resolved = extractCurrencyMosaicId(response.payload);
	if (!resolved) {
		throw new Error('Failed to resolve currency mosaic id from /network/properties.');
	}
	return resolved;
};

const normalizeMosaicId = (value) => {
	const trimmed = value.trim();
	if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
		return BigInt(trimmed);
	}
	return BigInt(`0x${trimmed}`);
};

const main = async () => {
	const privateKeyHex = process.env.MY_PRIVATE_KEY ?? readArgValue('private-key');
	if (!privateKeyHex) {
		throw new Error('MY_PRIVATE_KEY is required.');
	}

	const recipientAddress = process.env.RECIPIENT_ADDRESS ?? process.env.TO_ADDRESS ?? readArgValue('to');
	if (!recipientAddress) {
		throw new Error('RECIPIENT_ADDRESS (or TO_ADDRESS) is required.');
	}

	const nodeUrl = process.env.SYMBOL_WEBAPI_NODE_URL ?? readArgValue('node-url');
	const amount = resolveAmount();
	const mosaicId = normalizeMosaicId(await resolveMosaicId(nodeUrl));
	const message = process.env.MESSAGE ?? readArgValue('message');
	const feeMultiplier = Number(process.env.FEE_MULTIPLIER ?? readArgValue('fee-multiplier') ?? DEFAULT_FEE_MULTIPLIER);
	const deadlineSeconds = Number(process.env.DEADLINE_SECONDS ?? readArgValue('deadline-seconds') ?? DEFAULT_DEADLINE_SECONDS);

	const facade = new SymbolFacade('testnet');
	const account = facade.createAccount(new PrivateKey(privateKeyHex));

	const mosaics = [
		new descriptors.UnresolvedMosaicDescriptor(
			new models.UnresolvedMosaicId(mosaicId),
			new models.Amount(amount)
		)
	];
	const transferDescriptor = new descriptors.TransferTransactionV1Descriptor(
		new Address(recipientAddress),
		mosaics,
		message
	);

	const transaction = facade.createTransactionFromTypedDescriptor(
		transferDescriptor,
		account.publicKey,
		feeMultiplier,
		deadlineSeconds
	);
	const signature = account.signTransaction(transaction);
	const payload = facade.transactionFactory.static.attachSignature(transaction, signature);

	console.log('announce:', {
		nodeUrl: nodeUrl ?? '(auto)',
		recipientAddress,
		amount: amount.toString(),
		mosaicId: `0x${mosaicId.toString(16).toUpperCase()}`,
		fee: transaction.fee.toString()
	});

	const result = await requestWebApi({
		nodeUrl,
		path: '/transactions',
		method: 'PUT',
		body: { payload }
	});

	console.log('result:', result.payload);
};

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
