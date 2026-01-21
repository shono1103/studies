import 'dotenv/config';
import YAML from 'yaml';
import { pickTestnetWebApiNode } from './webapi_client.js';

const DEFAULT_OPENAPI_URL = 'https://symbol.github.io/symbol-openapi/v1.0.4/openapi3.yml';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_NODE_LIMIT = 30;
const DEFAULT_METHODS = new Set(['get', 'post']);

const readArgValue = (name) => {
	const prefix = `--${name}=`;
	const hit = process.argv.find((arg) => arg.startsWith(prefix));
	return hit ? hit.slice(prefix.length) : undefined;
};

const getEnvValue = (keys) => {
	for (const key of keys) {
		if (process.env[key]) {
			return process.env[key];
		}
	}
	return undefined;
};

const fetchText = async (url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			throw new Error(`Failed to fetch ${url} (${response.status} ${response.statusText})`);
		}
		return response.text();
	} finally {
		clearTimeout(timeoutId);
	}
};

const fetchResponse = async (url, { timeoutMs = DEFAULT_TIMEOUT_MS, ...options } = {}) => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...options, signal: controller.signal });
	} finally {
		clearTimeout(timeoutId);
	}
};

const parseOpenApi = (yamlText) => YAML.parse(yamlText);

const buildPathWithParams = (pathTemplate, params) =>
	pathTemplate.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(params[key] ?? `{${key}}`));

const buildQueryParams = (params) => {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null) {
			search.set(key, String(value));
		}
	}
	return search.toString();
};

const DEFAULT_PARAM_VALUES = {
	address: getEnvValue(['MY_ADDRESS', 'SYMBOL_ADDRESS']),
	publicKey: getEnvValue(['MY_PUBLIC_KEY', 'SYMBOL_PUBLIC_KEY']),
	mosaicId: getEnvValue(['SYMBOL_MOSAIC_ID']),
	namespaceId: getEnvValue(['SYMBOL_NAMESPACE_ID']),
	hash: getEnvValue(['SYMBOL_HASH']),
	transactionId: getEnvValue(['SYMBOL_TRANSACTION_ID']),
	blockId: getEnvValue(['SYMBOL_BLOCK_ID']),
	accountId: getEnvValue(['SYMBOL_ACCOUNT_ID'])
};

const fallbackValueFromSchema = (schema) => {
	if (!schema) {
		return undefined;
	}
	if (schema.example !== undefined) {
		return schema.example;
	}
	if (schema.default !== undefined) {
		return schema.default;
	}
	if (Array.isArray(schema.enum) && schema.enum.length > 0) {
		return schema.enum[0];
	}
	if (schema.type === 'integer' || schema.type === 'number') {
		return 1;
	}
	if (schema.type === 'boolean') {
		return true;
	}
	if (schema.type === 'string') {
		return '0';
	}
	return undefined;
};

const resolveParamValue = (param) => {
	const name = param?.name;
	if (name && DEFAULT_PARAM_VALUES[name]) {
		return DEFAULT_PARAM_VALUES[name];
	}
	if (param?.example !== undefined) {
		return param.example;
	}
	if (param?.schema?.example !== undefined) {
		return param.schema.example;
	}
	if (param?.schema?.default !== undefined) {
		return param.schema.default;
	}
	if (Array.isArray(param?.schema?.enum) && param.schema.enum.length > 0) {
		return param.schema.enum[0];
	}
	return fallbackValueFromSchema(param?.schema);
};

const buildRequestBody = (operation) => {
	const content = operation?.requestBody?.content;
	if (!content) {
		return undefined;
	}
	const json = content['application/json'] ?? content['application/octet-stream'];
	if (!json) {
		return undefined;
	}
	if (json.example !== undefined) {
		return json.example;
	}
	if (json.examples) {
		const examples = Object.values(json.examples);
		if (examples.length > 0) {
			const first = examples[0];
			if (first?.value !== undefined) {
				return first.value;
			}
		}
	}
	if (json.schema?.example !== undefined) {
		return json.schema.example;
	}
	if (json.schema?.default !== undefined) {
		return json.schema.default;
	}
	return {};
};

const buildRequests = (spec, methodsFilter) => {
	const requests = [];
	const paths = spec?.paths ?? {};
	for (const [pathTemplate, pathItem] of Object.entries(paths)) {
		for (const [method, operation] of Object.entries(pathItem ?? {})) {
			const normalizedMethod = method.toLowerCase();
			if (!methodsFilter.has(normalizedMethod)) {
				continue;
			}
			if (!operation || typeof operation !== 'object') {
				continue;
			}
			const parameters = [
				...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
				...(Array.isArray(operation.parameters) ? operation.parameters : [])
			];
			const pathParams = {};
			const queryParams = {};
			for (const param of parameters) {
				const value = resolveParamValue(param);
				if (param?.in === 'path') {
					pathParams[param.name] = value ?? '0';
				} else if (param?.in === 'query') {
					if (value !== undefined) {
						queryParams[param.name] = value;
					} else if (param?.required) {
						queryParams[param.name] = '0';
					}
				}
			}
			requests.push({
				method: normalizedMethod.toUpperCase(),
				pathTemplate,
				pathParams,
				queryParams,
				operationId: operation.operationId ?? `${normalizedMethod.toUpperCase()} ${pathTemplate}`,
				requestBody: buildRequestBody(operation)
			});
		}
	}
	return requests;
};

const runWithConcurrency = async (tasks, limit) => {
	let index = 0;
	const runners = Array.from({ length: limit }, async () => {
		while (index < tasks.length) {
			const current = index;
			index += 1;
			await tasks[current]();
		}
	});
	await Promise.all(runners);
};

const probeEndpoint = async (nodeUrl, request, timeoutMs) => {
	const path = buildPathWithParams(request.pathTemplate, request.pathParams);
	const query = buildQueryParams(request.queryParams);
	const url = `${nodeUrl}${path}${query ? `?${query}` : ''}`;
	const options = {
		method: request.method,
		headers: { Accept: 'application/json' }
	};
	if (request.method === 'POST' && request.requestBody !== undefined) {
		options.headers['Content-Type'] = 'application/json';
		options.body = JSON.stringify(request.requestBody);
	}
	try {
		const response = await fetchResponse(url, { timeoutMs, method: options.method, headers: options.headers, body: options.body });
		if (response.ok) {
			console.log(`[OK] ${request.method} ${path} (${request.operationId})`);
			return true;
		}
		const text = await response.text();
		console.log(`[ERR] ${request.method} ${path} (${request.operationId}) -> ${response.status} ${response.statusText}: ${text.slice(0, 200)}`);
		return false;
	} catch (error) {
		console.log(`[ERR] ${request.method} ${path} (${request.operationId}) -> ${error.message}`);
		return false;
	}
};

const main = async () => {
	const nodeUrlArg = readArgValue('node-url') ?? getEnvValue(['SYMBOL_WEBAPI_NODE_URL']);
	const openApiUrl = readArgValue('openapi-url') ?? getEnvValue(['SYMBOL_OPENAPI_URL']) ?? DEFAULT_OPENAPI_URL;
	const timeoutMs = Number(readArgValue('timeout-ms') ?? getEnvValue(['SYMBOL_TIMEOUT_MS']) ?? DEFAULT_TIMEOUT_MS);
	const concurrency = Number(readArgValue('concurrency') ?? getEnvValue(['SYMBOL_PROBE_CONCURRENCY']) ?? DEFAULT_CONCURRENCY);
	const methodsArg = readArgValue('methods') ?? getEnvValue(['SYMBOL_PROBE_METHODS']);
	const methods = methodsArg
		? new Set(methodsArg.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean))
		: DEFAULT_METHODS;

	const nodeUrl = await pickTestnetWebApiNode({
		nodeUrl: nodeUrlArg,
		limit: DEFAULT_NODE_LIMIT,
		ssl: true
	});

	const openApiYaml = await fetchText(openApiUrl, { timeoutMs });
	const spec = parseOpenApi(openApiYaml);
	const requests = buildRequests(spec, methods);

	console.log(`Node: ${nodeUrl}`);
	console.log(`OpenAPI: ${openApiUrl}`);
	console.log(`Requests: ${requests.length} (methods: ${Array.from(methods).join(', ')})`);

	let successCount = 0;
	let errorCount = 0;
	const tasks = requests.map((request) => async () => {
		const ok = await probeEndpoint(nodeUrl, request, timeoutMs);
		if (ok) {
			successCount += 1;
		} else {
			errorCount += 1;
		}
	});
	await runWithConcurrency(tasks, Math.max(1, concurrency));
	console.log(`Done: ok=${successCount}, error=${errorCount}`);
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
