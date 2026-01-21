# 疎通トラブルシューティング

## 問題: testnet.symboldev.network の OpenAPI に到達できない

試行したURL:
- https://testnet.symboldev.network:3001/openapi

確認内容:
- ローカルDNSで名前解決が失敗（SERVFAIL）。
- 公開DNS（8.8.8.8）でも同様に失敗。
- `curl` はホスト名解決ができずタイムアウト。

結論:
- その時点でドメインが解決できなかったため、OpenAPIに到達できなかった。
- 代替として `https://testnet.symbol.services/nodes` から稼働中ノードを取得する。
