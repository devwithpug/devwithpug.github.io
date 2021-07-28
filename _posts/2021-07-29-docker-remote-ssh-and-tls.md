---
title: 'SSH, TLS를 통한 Docker 원격 서버 보안 접속하기'
categories: devops
tags: ['devops', 'docker', 'cloud', 'ssh', 'tls']
header:
    teaser: /assets/teasers/docker.jpg
---

# 개요

`Docker` 에서 제공하는 API 를 이용하면 간단히 도커 원격 서버에 접속할 수 있다. 하지만 클라우드 환경과 같은 원격(remote) 서버에 접근 할때는 무엇보다 보안이 가장 중요하다.

따라서 `Docker` 에서는 `SSH`, `TLS(HTTPS)` 와 같은 보안 프로토콜을 통해 `Docker daemon socket` 을 보호하도록 권장하고 있다.

공식 개발 문서에서 설명하는 방법을 통해 원격 서버에 접속 방법에 대해 자세하게 정리한 후에, 다음 글에서는 원격 서버의 Docker Context 환경을 효과적으로 사용하는 방법에 대해 정리해보려고 한다.

# 환경

> 🌎 __원격 서버__   
> 클라우드 서버 : Oracle Cloud Infrastructure - 프리 티어   
> 운영 체제 : ubuntu:18.04   
> Docker 버전 : 20.10.7   
> 원격 서버 접속에 사용할 포트 : __2376__ (포트포워딩 필수)
> 
> 💻 __로컬 환경__   
> 운영 체제 : MacOS Big Sur (Apple silicone M1)   
> Docker 버전 : 20.10.7   


# SSH 접속

오라클, AWS, GCP 등 클라우드 서비스의 컴퓨트 인스턴스 환경은 초기 접속이 SSH를 통해 이루어지므로 SSH 접속을 위한 키를 새롭게 생성할 필요가 없다.

기존에 클라우드 서버에 접속하던 ssh 키를 이용하면된다!

## Docker Context

remote docker daemon 에 연결하기 위해서 `Docker Context` 를 사용해야 한다.

### Docker Context 생성

```bash
$ docker context create [context-이름] --docker host=ssh://[유저이름]@[외부접속IP]
```

> 포트를 추가적으로 명시해주어도 되며 기본 값은 __22__ 이다.

`docker context ls` 명령어를 통해 현재 로컬 도커 환경에 생성된 컨텍스트 목록을 확인할 수 있으며 기본으로 사용되는 값은 `default` 이다.

### Docker Context 사용

```bash
$ docker context use [context-이름]
```

`use` 명령어로 생성한 컨텍스트를 사용할 수 있으며 기존 Docker 명령어와 동일하게 `rm`, `ls` 등 명령어를 사용하면 된다.

그다음 `docker ps` 또는 `docker info` 와 같은 명령어를 통해 원격 서버에 정상적으로 연결되는지 테스트를 해보면 된다.

이 때 아래와 같은 에러가 나타날 수 있다.

```bash
error during connect: Get "http://docker/v1.24/images/json": command [ssh -l {user} -- {myIP} docker system dial-stdio]
has exited with exit status 255, please make sure the URL is valid, and Docker 18.09 or later is installed on the remote host:
stderr={user}@{myIP}: Permission denied (publickey).
```

당연하게도(?) ssh 접속에 필요한 key를 명시해야 하는데 앞에서 생성한 Docker 컨텍스트에서는 그런 내용이 없었기 때문에 `Permission denied (publickey).` 와 같이 친절하게 에러 원인을 알려준다 ㅎㅎ

[Docker docs](https://docs.docker.com/engine/reference/commandline/dockerd/#daemon-socket-option){:target="_blank"} 에서 이와 관련된 내용을 찾을 수 있는데, `ssh-agent` 를 이용하여 ssh를 설정해야 한다고 나와있다.

>To use SSH connection, you need to set up ssh so that it can reach the remote host with public key authentication. Password authentication is not supported. If your key is protected with passphrase, you need to set up ssh-agent.

### ssh-agent에 ssh 키 등록

ssh 파일이 로컬 디렉토리에 존재하지만 ssh-agent에 이를 직접 등록해주어야 한다.

기본적으로는 `~/.ssh` 에서 관리한다.

ssh-add 명령어를 통해 아래와 같이 ssh를 등록할 수 있다.

```bash
$ ssh-add ~/.ssh/[등록하려는-ssh-key]

Enter passphrase for /Users/puggg/.ssh/rsa-oci-key: 
Identity added: /Users/puggg/.ssh/rsa-oci-key (/Users/puggg/.ssh/rsa-oci-key)
```

```bash
$ ssh-add -l
2048 SHA256:1MGjc2BhWloFASlKfL3Zr79d5FTsgrTcrdVYHoPs3gM /Users/puggg/.ssh/rsa-oci-key (RSA)
```

## 결과

ssh 키를 ssh-agent에 정상적으로 등록했다면 다시 docker 명령어를 실행해보자!

```bash
$ docker info

Client:
 Context:    my-remote-ssh
 Debug Mode: false
 Plugins:
  buildx: Build with BuildKit (Docker Inc., v0.5.1-docker)
  compose: Docker Compose (Docker Inc., v2.0.0-beta.6)
  scan: Docker Scan (Docker Inc., v0.8.0)

Server:
 Containers: 1
  Running: 0
  Paused: 0
  Stopped: 1
 Images: 4
```

원격 서버와도 연결이 된 것을 확인할 수 있다.

# TLS(HTTPS) 접속

## CA, server, client key 생성

먼저 TLS 통신에 필요한 인증서와 키들을 생성해주어야 한다.

클라우드 서버로 접속한 후 home 디렉토리에 `.docker` 디렉토리를 생성해주었다. 해당 경로가 Docker에 설정된 기본 경로이다.

```bash
$ mkdir ~/.docker
$ cd ~/.docker
```

Docker Daemon 모드(원격 서버)에서는 해당 CA에서 서명한 인증서로 인증된 클라이언트의 연결만 허용하며 Client 모드(로컬 서버)에서는 해당 CA에서 서명한 인증서가 있는 서버에만 연결할 수 있다.

### CA keys 생성

```bash
$ openssl genrsa -aes256 -out ca-key.pem 4096

Generating RSA private key, 4096 bit long modulus (2 primes)
..............................................................++++
.........................................................++++
e is 65537 (0x010001)
Enter pass phrase for ca-key.pem:
Verifying - Enter pass phrase for ca-key.pem:
```

```bash
$ openssl req -new -x509 -days 365 -key ca-key.pem -sha256 -out ca.pem

Enter pass phrase for ca-key.pem:
Can't load /home/ubuntu/.rnd into RNG
139997251666368:error:2406F079:random number generator:RAND_load_file:Cannot open file:../crypto/rand/randfile.c:88:Filename=/home/ubuntu/.rnd
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [AU]:KR
State or Province Name (full name) [Some-State]:Seoul
Locality Name (eg, city) []:
Organization Name (eg, company) [Internet Widgits Pty Ltd]:devwithpug
Organizational Unit Name (eg, section) []:
Common Name (e.g. server FQDN or YOUR name) []:$HOST
Email Address []:zmfjscl789@gmail.com
```

> Common Name 의 경우 Docker에 연결하는 데 사용하는 호스트 이름과 일치해야 한다. ("echo $HOST" 로 확인)

이제 CA를 생성했으므로 서버 키와 인증서 서명 요청(CSR)을 생성할 수 있다.

만약 위와 같이 `Can't load /home/ubuntu/.rnd into RNG ... ` 경고가 뜨는 것은 리눅스 시스템에서 난수 생성기를 찾을 수 없다는 뜻이며 CA 키를 다시 생성할 필요는 없다.

하지만 CA로 다른 키들을 생성할 때 오류가 생길 수 있으므로 `/etc/ssl/openssl.cnf` 파일을 다음과 같이 수정해주면 된다.

```bash
$ sudo vi /etc/ssl/openssl.cnf

# This definition stops the following lines choking if HOME isn't
# defined.
HOME                    = .
# RANDFILE 경로를 정확하게 맞춰주거나 아래와 같이 주석처리해도 무방함.
#RANDFILE               = $ENV::HOME/.rnd
```

### 서버 key, CSR 생성

* 서버 key 생성

```bash
$ openssl genrsa -out server-key.pem 4097

Generating RSA private key, 4096 bit long modulus (2 primes)
................++++
.............................................................................................................................................................................................................................++++
e is 65537 (0x010001)
```

* CSR 생성

```bash
$ openssl req -subj "/CN=$HOST" -sha256 -new -key server-key.pem -out server.csr
```

> $HOST는 알맞은 호스트 명으로 반드시 명시해주자.

### CA로 public key에 서명

이제 앞에서 생성한 CA로 공개 키에 서명을 할 것이다.

TLS 연결은 DNS, IP 모두 접속이 가능하기 때문에 자신이 접속할 주소를 알맞게 명시해주어야 한다.

여기서는 컴퓨트 인스턴스의 외부 IP 접속 주소를 사용했다.

```bash
$ echo subjectAltName = DNS:$HOST,IP:[외부접속IP],IP:127.0.0.1 >> extfile.cnf
```

또한 확장 속성 파일 `extfile.cnf`를 서버 인증에만 사용하도록 설정해주었다.

```bash
$ echo extendedKeyUsage = serverAuth >> extfile.cnf
```

### 서버 key로 서명된 인증서 생성

그 다음은 서명된 인증서를 생성해주면 된다.

```bash
$ openssl x509 -req -days 365 -sha256 -in server.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem -extfile extfile.cnf

Signature ok
subject=CN = [외부접속IP]
Getting CA Private Key
Enter pass phrase for ca-key.pem:
```

### 클라이언트 key, CSR 생성

이제는 로컬 환경에서 필요한 키와 인증서를 생성해야 한다.

위와 동일한 방법으로 진행하면 된다.

* 클라이언트 key 생성

```bash
$ openssl genrsa -out key.pem 4096

Generating RSA private key, 4096 bit long modulus (2 primes)
..............................................................++++
.................................................................................................++++
e is 65537 (0x010001)
```

* CSR 생성

```bash
$ openssl req -subj '/CN=client' -new -key key.pem -out client.csr
```

* 클라이언트 인증에만 사용하도록 extfile 생성

```bash
$ echo extendedKeyUsage = clientAuth > extfile-client.cnf
```

### 클라이언트 key로 서명된 인증서 생성

클라이언트에서 사용하는 인증서를 생성했다.

```bash
$ openssl x509 -req -days 365 -sha256 -in client.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out cert.pem -extfile extfile-client.cnf

Signature ok
subject=CN = client
Getting CA Private Key
Enter pass phrase for ca-key.pem:
```

### CSR, extfile 삭제

`cert.pem` 과 `server-cert.pem` 을 정상적으로 생성한 후에는 CSR, extfile은 안전하게 삭제해주면 된다.

```bash
$ rm -v client.csr server.csr extfile.cnf extfile-client.cnf

removed 'client.csr'
removed 'server.csr'
removed 'extfile.cnf'
removed 'extfile-client.cnf'
```

### key 인가 권한 수정

생성된 키들은 기본 인가 권한 __022__ 를 가지며 키가 수정되거나 손상되는 것을 막기 위해 쓰기 권한을 없애주고 다른 사람들이 읽을 수 없게 권한 설정을 해주었다.

```bash
$ chmod -v 0400 ca-key.pem key.pem server-key.pem

mode of 'ca-key.pem' changed from 0600 (rw-------) to 0400 (r--------)
mode of 'key.pem' changed from 0600 (rw-------) to 0400 (r--------)
mode of 'server-key.pem' changed from 0600 (rw-------) to 0400 (r--------)
```

생성된 인증서들은 모두가 읽을 수 있지만 수정은 불가능 하도록 권한을 수정하였다.

```bash
$ chmod -v 0444 ca.pem server-cert.pem cert.pem

mode of 'ca.pem' changed from 0664 (rw-rw-r--) to 0444 (r--r--r--)
mode of 'server-cert.pem' changed from 0664 (rw-rw-r--) to 0444 (r--r--r--)
mode of 'cert.pem' changed from 0664 (rw-rw-r--) to 0444 (r--r--r--)
```

### 클라이언트 key 로컬 서버로 다운로드

이제 원격 서버 접속을 위해 생성한 클라이언트 키들을 로컬 환경으로 가져와야 한다.

`scp` 명령어를 이용하여 ssh 접속으로 원격 서버의 파일을 다운로드할 수 있다.

```bash
$ scp -r [유저이름]@[외부접속IP]:~/.docker/ .

cert.pem                                                                          100% 1870   417.8KB/s   00:00    
server-cert.pem                                                                   100% 1858   436.7KB/s   00:00    
ca.pem                                                                            100% 2045   453.6KB/s   00:00    
ca-key.pem                                                                        100% 3326   754.8KB/s   00:00    
server-key.pem                                                                    100% 3243   784.5KB/s   00:00    
ca.srl                                                                            100%   41    10.7KB/s   00:00    
key.pem                                                                           100% 3243   874.9KB/s   00:00  
```

`.docker` 내부 파일들이 모두 다운로드 되었으며 `ca.pem`, `cert.pem`, `key.pem` 를 제외한 다른 파일들은 삭제해줘도 된다.

## docker.service 수정

원격 Docker 서버에 접속할 때 반드시 HTTPS를 통해서만 접속이 가능하도록 설정을 해야한다. 따라서 먼저 내부 설정 파일의 경로를 확인해야한다.

```bash
$ service docker status

● docker.service - Docker Application Container Engine
   Loaded: loaded (/lib/systemd/system/docker.service; enabled; vendor preset: enabled)
   Active: active (running) since Mon 2021-07-26 20:12:43 KST; 1h 31min ago
     Docs: https://docs.docker.com
 Main PID: 23078 (dockerd)
    Tasks: 10
   CGroup: /system.slice/docker.service
           └─23078 /usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
```

위 결과에서 Loaded 부분을 보면 Docker 서비스가 시작될 때 어떤 설정파일을 불러오는지 확인할 수 있으며 Main Pid 가 `dockerd(Docker daemon)` 인 것을 참고하자.

해당 경로의 docker.service 파일 내용을 수정해야 한다.

```bash
$ sudo vi /lib/systemd/system/docker.service
```

```bash
[Service]
Type=notify
# the default is not to use systemd for cgroups because the delegate issues still
# exists and systemd currently does not support the cgroup feature set required
# for containers run by docker

# ExecStart 라인 수정
ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock --tlsverify --tlscacert=/home/ubuntu/.docker/ca.pem --tlscert=/home/ubuntu/.docker/server-cert.pem --tlskey=/home/ubuntu/.docker/server-key.pem -H=0.0.0.0:2376

ExecReload=/bin/kill -s HUP $MAINPID
TimeoutSec=0
RestartSec=2
Restart=always
```

`--tlsverify` 커맨드를 통해 TLS 인증을 선언하고 앞에서 생성한 `~/.docker/` key 들을 명시해주고 HOST 아이피를 설정해주면 된다.

> 기본 포트 값은 __2375__ 이며, Docker 공식 문서에서는 __2376__ 포트를 개방했다.

적용을 위해 Docker 서비스를 재시작 해주면 된다.

```bash
$ sudo systemctl daemon-reload
$ sudo systemctl restart docker
```

## Docker Context

ssh 접속 방법과 동일하지만 TLS key들을 추가적으로 명시해주어야 한다.
컨텍스트를 생성할 때 TLS key 들의 경로가 정확해야 한다. (생성한 이후에는 디렉토리와 관련없이 명시한 TLS key 사용 가능)

```bash
$ docker context create [context-이름] --docker "host=tcp://[원격서버IP]:2376,ca=ca.pem,cert=cert.pem,key=key.pem"
$ docker context use [context-이름]
```

오류 없이 정상적으로 생성되었으면 `docker context use` & `docker ps` 명령어를 통해 정상적으로 접속되는지 확인해보자!

## 결과

![image](https://user-images.githubusercontent.com/69145799/126995044-21a4a30e-be45-4613-bb33-ebf9383182cc.png){:.align-center}

정상적으로 원격 서버의 정보를 가져올 수 있었다.

# 응용

위에서 생성한 TLS key들을 가지고 VSCODE, IntelliJ 와 같은 IDE 에서 원격 도커 서버에 접속하는 방법을 정리해보았다.

## VSCODE 연동

### 1. extension 설치

1. `Docker`
2. `Remote - Containers`

### 2. 설정파일 수정

* `CMD + SHIFT + P` 를 입력하여 명령 팔레트를 연 후에 `기본 설정: 설정 열기(JSON)`

![image](https://user-images.githubusercontent.com/69145799/127136303-4616b7a2-7aeb-495d-a683-d871c51d7509.png){:.align-center}

* `settings.json` 아래 값 추가

```json
{
    "docker.host": "https://[외부접속IP]:2376",
    "docker.certPath": "/Volumes/SSD/downloads" // 외부 서버로 부터 다운받은 key 파일 경로
}
```

### 3. 테스트

![image](https://user-images.githubusercontent.com/69145799/127138819-cd053128-fe46-454e-b429-55cf19809dbf.png){:.align-center}

왼쪽 탭에서 Docker 아이콘을 선택하면 원격 서버의 이미지들이 나오는 것을 확인할 수 있다.

## IntelliJ 연동

### 1. Docker Connection 생성

* `SHIFT + SHIFT` 입력한 후 `New Docker Connection` 검색하여 선택

![image](https://user-images.githubusercontent.com/69145799/127139110-e6199a42-7c8b-44a1-9928-cc1f1755f89d.png){:.align-center}

* `호스트 IP`, `Certificates folder` 경로 기입

![image](https://user-images.githubusercontent.com/69145799/127139400-5e9100a0-6f23-4849-b8b3-be31887a5e4a.png){:.align-center}

> ⬆ 접속에 성공하면 하단에 __Connection successful__ 메세지가 나타남

* `Services` 탭에서 도커 원격 서버 확인 가능

![image](https://user-images.githubusercontent.com/69145799/127139809-7ca3d576-2c54-4161-89e8-eb5fe0423d97.png){:.align-center}

이후 원격 서버에서 사용하려는 도커 이미지를 IDE에서 바로 사용할 수 있다!

# References

* [Docker docs - Protect the Docker socket](https://docs.docker.com/engine/security/protect-access/){:target="_blank"}
* [Visual Studio Code docs - Connect to remote Docker over SSH](https://code.visualstudio.com/docs/containers/ssh){:target="_blank"}
* [imbang.net - Remote API 적용을 위한 SSL 인증서 적용](https://imbang.net/2019/07/05/remote-api-%EC%A0%81%EC%9A%A9%EC%9D%84-%EC%9C%84%ED%95%9C-ssl-%EC%9D%B8%EC%A6%9D%EC%84%9C-%EC%A0%81%EC%9A%A9/){:target="_blank"}
* [archlinux community - docker context create](https://man.archlinux.org/man/community/docker/docker-context-create.1.en){:target="_blank"}
* [skylit.tistory.com - SCP를 이용하여 여러 개의 파일 보내기/받기](https://skylit.tistory.com/90){:target="_blank"}
* [Docker Community Forums - Failed to start Docker Application Container Engine](https://forums.docker.com/t/failed-to-start-docker-application-container-engine/35594){:target="_blank"}