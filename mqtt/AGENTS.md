## 概要

mqttサーバーでのpub/subの仕組みを勉強します。

## 構成

* docker-compose.yml(mqttサーバーとして`eclipse-mosquitto`をserviceとして起動)
* sctipts
  * subscriber.py(トピックサブスクライブをするスクリプト)
  * publisher.py(トピックパブリッシュをするスクリプト)
  * common(pub/sub共通処理をまとめる)
