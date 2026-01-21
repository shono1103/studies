# SDKメモ

## 本プロジェクトのSDK

- 本プロジェクトは npm パッケージ `symbol-sdk` を使用しており、`package.json` では `^3.3.0` を指定している。
- `symbol-sdk-typescript-javascript` のGitHubリポジトリではタグが `v2.0.6` まで確認できる。
- したがって、リポジトリのタグ系列と本プロジェクトの `symbol-sdk` は系統が異なる。

## symbol-sdk-typescript-javascript タグ（リポジトリ確認）

- 確認できた最新タグ: `v2.0.6`
- リポジトリ: https://github.com/symbol/symbol-sdk-typescript-javascript

## 機能に関するメモ

- 現在の `symbol-sdk` パッケージは、署名・シリアライズ・トランザクション作成などの低レベル機能が中心。
- アカウントのモザイク一覧を返す高レベルなRESTクライアントは提供されていない。
- アカウントの保有モザイクは Symbol REST API（例: `GET /accounts/{accountId}`）のレスポンス `mosaics` を参照する。
