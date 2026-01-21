# API と OpenAPI

## OpenAPI（当初の試行）

- URL: `https://testnet.symboldev.network:3001/openapi`
- DNS解決に失敗したため到達できなかった（詳細は connectivity-troubleshooting.md 参照）。

## フォーセット

- テストネットフォーセット: https://testnet.symbol.tools/

## Symbol Statistic Service（ノード一覧API）

Symbol にはノード一覧と稼働状況を取得できる API がある。
OpenAPI は以下で公開されている。

- テストネット: https://testnet.symbol.services
- メインネット: https://symbol.services
- OpenAPI ドキュメント: https://symbol.services/openapi/
- OpenAPI YAML: https://symbol.services/openapi/openapi.yml

### 主要エンドポイント

- `GET /nodes`（ノード一覧）
- `GET /nodes?limit=10&ssl=true`（上限指定、HTTPSのみ）
- `GET /nodes/{publicKey}`
- `GET /nodes/nodePublicKey/{nodePublicKey}`

