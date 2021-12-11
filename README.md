# それっぽい開発環境を構築する

## 目的

Webサーバー、APPサーバー、DBサーバーをひととおり構築してみる。<br>
<br>



## 謝辞

先人たちの知恵に敬意と多謝。

<br>

---

## 環境

- ホスト
  - Windows10
  - Vagrant
  - VirtualBox
- ゲスト
  - Ubuntu 20.04
    - IPアドレス：192.1698.33.50


### ●ディレクトリ構成

以下の内容のディレクトリをホスト側に設置し、Vagrant の共有機能でゲスト側と連携。

```
.
├ docker-compose.yml
├ environment.env
├ nginx
│ ├ Dockerfile
│ ├ etc
│ │ └ nginx
│ │   └ nginx.conf
│ └ html
│   └ index.html
├ app
│ ├ Dockerfile
│ └ src
│   └ webserver.js
├ db
│ ├ master
│ │ ├ Dockerfile
│ │ ├ etc
│ │ │ └ mysql
│ │ │   └ mysql_master.cnf
│ │ ├ init_data
│ │ │ └ 001-GRANT_REPLICATION.sh
│ │ └ log
│ └ slave
│   ├ Dockerfile
│   ├ etc
│   │ └ mysql
│   │   └ mysql_slave.cnf
│   ├ init_data
│   │ └ 001-START_REPLICA.sh
│   └ log
└ README.md

```

<br>

---

## ■ リバースプロキシ(Nginx)

### 参考URL

nginx のリバースプロキシを Docker-Compose で試してみる<br>
https://neos21.net/blog/2020/06/24-01.html

実践編ーDockerを使ってnginxでリバースプロキシを立ててみる<br>
https://qiita.com/zawawahoge/items/d58ab6b746625e8d4457

docker-composeのNginxから複数の別composeにリバースプロキシする<br>
https://a-records.info/multiple-docker-compose-with-nginx-reverse-proxy/

<br>

---

## ■ APPサーバー(Node.js)

### 参考URL

Cannot find module 'express' | dockerでNode.js<br>
https://qiita.com/nikoro/items/13d08056063f334df911

Node.js を動かす Dockerfile のサンプル<br>
https://qiita.com/niwasawa/items/9673d31ee2a6c532dc5b

Docker-composeを使ってnode.jsの環境構築をしてみたのよ。<br>
https://qiita.com/art_porokyu/items/8363334c358c67adb61a




---

## ■ MySQL

### ■起動のエラー
```
mysqld: [Warning] World-writable config file '/etc/mysql/conf.d/mysql_read.cnf' is ignored.   
mysqld: [Warning] World-writable config file '/etc/mysql/conf.d/mysql_source.cnf' is ignored.
```
↓↓  
ネットでは、ホスト側でファイルをリードオンリーにするとDocker側で動くと説明する記事があったが、動かない。<br>
実際は、Dockerfile内に COPY を使ってコンテナ内へコピーする必要がある。

```
FROM mysql:8.0.23

COPY ./master/etc/mysql/mysql_master.cnf /etc/mysql/my.cnf
RUN chmod 644 /etc/mysql/my.cnf
RUN mkdir /var/lib/mysql-files
```

### ■entrypointのシェルスクリプトファイル

今回はマスターに **001-GRANT_REPLICATION.sh** を、スレイブに **001-START_REPLICA.sh** を用意しているが、拡張子は小文字にしておかないと実行されない。  
また、有効な拡張子は「.sh」「.sql」「.sql.gz」  

・参考URL
Docker MySQLコンテナ起動時に初期データを投入する<br>
https://qiita.com/NagaokaKenichi/items/ae037963b33a85df33f5


### ■MySQLのレプリケーションユーザー作成

- master, slave共に bind-addressを0.0.0.0として、dockerのネットワークエイリアスで繋ぐ
- masterのMySQLにレプリケーション用のユーザーを作成するが、MySQL8.0ではGRANT構文でのユーザを作成できない

```
create user 'slave_user'@'%' identified by 'password';
grant replication slave on *.* to 'slave_user'@'%' with grant option;
flush privileges;
```

・参考URL
MySQLのmaster slave構成をDockerで試す<br>
https://raahii.github.io/posts/docker-mysql-master-slave-replication/

<br>

---

### ■MySQL8.0のレプリケーションについて

**5.7と8.0では変更されている箇所が多い。**

```
error connecting to master 'repl_user@192.168.33.50:3306' - retry-time: 60 
retries: 1 
message: Authentication plugin 'caching_sha2_password' reported 
error: Authentication requires secure connection.
```

MySQL8から「caching_sha2_password」認証プラグインがデフォルトになった。  
「安全な接続」または「RSAベースのパスワード交換」を使用することが公式リファレンスマニュアル上で随所に記載がある。

- レプリケーション用ユーザーの認証プラグインをmysql_native_password にする。

- レプリケーション用ユーザーの認証プラグインを caching_sha2_password のままとし、「安全な接続」または「RSAベースのパスワード交換」で接続する。


「安全な接続」はmaster/slaveにSSL証明書を作成する必要がある。  
今回は、「RSAベースのパスワード交換」を行う

```
MASTER_SSL = 1,
GET_MASTER_PUBLIC_KEY = 1; \
```

・参考URL  
MySQL8.0で新たに追加されているレプリケーション接続オプション<br>
https://blog.s-style.co.jp/2020/03/5861/

ＭｙＳＱＬ８．０のインストールと初期セットアップ<br>
https://qiita.com/nanorkyo/items/94a80683c6753f61316a#fn7

<br>

---

### ■MySQLコンテナの日本語対応

MySQLコンテナは基本的にロケール設定はないので、Dockerfile にてロケール設定を行う。

```
RUN apt-get update && \
    apt-get install -y locales && \
    rm -rf /var/lib/apt/lists/* && \
    echo "ja_JP.UTF-8 UTF-8" > /etc/locale.gen && \
    locale-gen ja_JP.UTF-8
ENV LC_ALL ja_JP.UTF-8

RUN { \
    echo '[mysqld]'; \
    echo 'character-set-server=utf8mb4'; \
    echo 'collation-server=utf8mb4_general_ci'; \
    echo '[client]'; \
    echo 'default-character-set=utf8mb4'; \
} > /etc/mysql/conf.d/charset.cnf
```

参考URL  
MacでDocker上に日本語環境のMySQL8.0を建てる<br>
https://qiita.com/oono_yoshi/items/4c9c2ea554b5626ff50c

<br>


### ■dbeaverでDB接続

ホストOS上のdbeaverからコンテナのMySQLへ接続する際に「Publick Key Retrieval is not allowed」エラーが表示される。  
接続先プロファイルのドライバー設定から「allowPublicKeyRetrieval」をtrueにする必要がある。

<br>

---

### ■コンテナへ入るコマンド

### ●マスター
```
$ docker exec -it t015_db_master bash
```

### ●スレーブ
```
$ docker exec -it t015_db_slave bash
```
