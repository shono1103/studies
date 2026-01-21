const DEFAULT_TESTNET_SERVICE_BASE = 'https://testnet.symbol.services';
const DEFAULT_TIMEOUT_MS = 10_000;

const buildUrl = (baseUrl, path, params) => {
	const url = new URL(path, baseUrl);
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== null) {
				url.searchParams.set(key, String(value));
			}
		}
	}
	return url;
};

const fetchJson = async (url, options = {}) => {
	const controller = new AbortController();
	const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Request failed (${response.status} ${response.statusText}): ${text.slice(0, 200)}`);
		}
		return response.json();
	} finally {
		clearTimeout(timeoutId);
	}
};

const toWebApiUrl = (value) => {
	if (!value) {
		return null;
	}
	try {
		const parsed = new URL(value);
		if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
			return null;
		}
		if (parsed.port !== '3001' && parsed.port !== '3000') {
			return null;
		}
		return parsed.toString();
	} catch {
		return null;
	}
};

const extractNodeUrls = (nodesPayload) => {
	const nodes = Array.isArray(nodesPayload)
		? nodesPayload
		: Array.isArray(nodesPayload?.data)
			? nodesPayload.data
			: [];

	const urls = nodes
		.flatMap((node) => {
			if (typeof node === 'string') {
				const apiUrl = toWebApiUrl(node);
				return apiUrl ? [apiUrl] : [];
			}
			if (node?.url) {
				const apiUrl = toWebApiUrl(node.url);
				return apiUrl ? [apiUrl] : [];
			}
			if (node?.endpoint) {
				const apiUrl = toWebApiUrl(node.endpoint);
				return apiUrl ? [apiUrl] : [];
			}
			if (node?.host) {
				const apiUrls = [];
				if (node?.apiSslPort) {
					apiUrls.push(`https://${node.host}:${node.apiSslPort}`);
				}
				if (node?.apiPort) {
					apiUrls.push(`http://${node.host}:${node.apiPort}`);
				}
				if (apiUrls.length) {
					return apiUrls;
				}
				const port = node?.port === 3000 || node?.port === 3001 ? node.port : 3001;
				return [`https://${node.host}:${port}`];
			}
			return [];
		})
		.filter(Boolean);

	return [...new Set(urls)];
};

export const fetchTestnetNodes = async ({
	baseUrl = DEFAULT_TESTNET_SERVICE_BASE,
	limit = 10,
	ssl = true,
	timeoutMs
} = {}) => {
	const url = buildUrl(baseUrl, '/nodes', { limit, ssl });
	return fetchJson(url.toString(), { timeoutMs });
};

const isWebApiUrl = (url) => {
	if (!url) {
		return false;
	}
	try {
		const parsed = new URL(url);
		return (parsed.port === '3001' || parsed.port === '3000')
			&& (parsed.protocol === 'https:' || parsed.protocol === 'http:');
	} catch {
		return false;
	}
};

export const fetchTestnetNodeUrls = async (options = {}) => {
	const payload = await fetchTestnetNodes(options);
	const urls = extractNodeUrls(payload);
	const webApiUrls = urls.filter(isWebApiUrl);
	return webApiUrls.length ? webApiUrls : urls;
};

export const pickTestnetNodeUrl = async (options = {}) => {
	const urls = await fetchTestnetNodeUrls(options);
	if (!urls.length) {
		throw new Error('No testnet nodes returned from Symbol Statistic Service.');
	}
	return urls[Math.floor(Math.random() * urls.length)];
};

export const fetchFromTestnetNode = async (
	path,
	{ nodeUrl, timeoutMs, ...fetchOptions } = {}
) => {
	const baseUrl = nodeUrl ?? (await pickTestnetNodeUrl());
	const url = buildUrl(baseUrl, path);
	return fetchJson(url.toString(), { timeoutMs, ...fetchOptions });
};

export { DEFAULT_TESTNET_SERVICE_BASE };
export { extractNodeUrls };
