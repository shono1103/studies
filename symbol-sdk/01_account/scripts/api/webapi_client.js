import 'dotenv/config';
import { fetchTestnetNodeUrls } from './testnet.js';

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_NODE_LIMIT = 30;
const DEBUG = process.env.SYMBOL_DEBUG === '1';

const fetchResponse = async (url, { timeoutMs = DEFAULT_TIMEOUT_MS, ...options } = {}) => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...options, signal: controller.signal });
	} finally {
		clearTimeout(timeoutId);
	}
};

const buildPathWithParams = (pathTemplate, params = {}) =>
	pathTemplate.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(params[key] ?? `{${key}}`));

const buildQueryString = (params = {}) => {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null) {
			search.set(key, String(value));
		}
	}
	const query = search.toString();
	return query ? `?${query}` : '';
};

export const pickTestnetWebApiNode = async ({
	nodeUrl,
	limit = DEFAULT_NODE_LIMIT,
	ssl = true
} = {}) => {
	if (nodeUrl) {
		return nodeUrl;
	}
	const urls = await fetchTestnetNodeUrls({ limit, ssl });
	if (!urls.length) {
		throw new Error('No testnet WebAPI nodes returned.');
	}
	return urls[Math.floor(Math.random() * urls.length)];
};

const expandFallbackUrls = (url) => {
	const candidates = [url];
	try {
		const parsed = new URL(url);
		if (parsed.protocol === 'https:') {
			const httpUrl = new URL(url);
			httpUrl.protocol = 'http:';
			if (httpUrl.port === '3001') {
				httpUrl.port = '3000';
			}
			candidates.push(httpUrl.toString());
		}
	} catch {
		// keep original only
	}
	return candidates;
};

const uniqueUrls = (urls) => {
	const seen = new Set();
	return urls.filter((url) => {
		if (seen.has(url)) {
			return false;
		}
		seen.add(url);
		return true;
	});
};

const buildRequestUrl = (nodeUrl, path, pathParams, queryParams) => {
	const resolvedPath = buildPathWithParams(path, pathParams);
	return `${nodeUrl}${resolvedPath}${buildQueryString(queryParams)}`;
};

const buildRequestOptions = (method, body) => {
	const headers = { Accept: 'application/json' };
	const options = { method: method.toUpperCase(), headers };
	if (options.method === 'POST' && body !== undefined) {
		headers['Content-Type'] = 'application/json';
		options.body = JSON.stringify(body);
	}
	return options;
};

export const requestWebApi = async ({
	nodeUrl,
	path,
	method = 'GET',
	pathParams,
	queryParams,
	body,
	timeoutMs = DEFAULT_TIMEOUT_MS
}) => {
	if (!path) {
		throw new Error('path is required');
	}
	const options = buildRequestOptions(method, body);

	const attempt = async (baseUrl) => {
		const url = buildRequestUrl(baseUrl, path, pathParams, queryParams);
		const response = await fetchResponse(url, { timeoutMs, ...options });
		const contentType = response.headers.get('content-type') ?? '';
		const payload = contentType.includes('application/json')
			? await response.json()
			: await response.text();
		if (!response.ok) {
			const message = typeof payload === 'string' ? payload.slice(0, 200) : JSON.stringify(payload).slice(0, 200);
			throw new Error(`Request failed (${response.status} ${response.statusText}): ${message}`);
		}
		return { url, status: response.status, payload };
	};

	if (nodeUrl) {
		const directCandidates = uniqueUrls(expandFallbackUrls(nodeUrl));
		for (const candidate of directCandidates) {
			try {
				return await attempt(candidate);
			} catch (error) {
				if (DEBUG) {
					console.warn(`[webapi] ${candidate} -> ${error.message}`);
				}
				throw new Error(`Request failed for ${candidate}: ${error.message}`);
			}
		}
	}

	const baseCandidates = await fetchTestnetNodeUrls({ limit: DEFAULT_NODE_LIMIT, ssl: true });
	const candidates = uniqueUrls(baseCandidates.flatMap(expandFallbackUrls));
	let lastError;
	for (const candidate of candidates) {
		try {
			return await attempt(candidate);
		} catch (error) {
			if (DEBUG) {
				console.warn(`[webapi] ${candidate} -> ${error.message}`);
			}
			lastError = error;
		}
	}
	throw new Error(`All WebAPI nodes failed (${candidates.length} tried). Last error: ${lastError?.message ?? 'unknown'}`);
};
