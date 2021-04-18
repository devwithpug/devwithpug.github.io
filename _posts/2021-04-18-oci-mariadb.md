---
layout: post
title: '[오라클 클라우드] 외부 접속이 가능한 MariaDB 서버 구축기'
comments: true
categories:
    - mariadb
---

# 1. 개요

- - -

최근 JPA 공부를 시작하면서 항상 로컬에서 생성된 H2 DB를 사용했었다. 집에서 데스크탑으로 DB를 이용하는 것은 문제가 없었지만 외부의 환경에서 DB에 접속해야 할 때가 있었다. 따라서 미루지 말고 DB 전용 서버를 구성해야 겠다고 생각했다.

## Google Cloud Platform 에서의 실패

먼저, 본인은 GCP 무료 등급의 클라우드 환경이 있었는데 컴퓨트 엔진 성능은 아래와 같다.

* 클라우드 Region 제한 (미국 서버)
* vCPU 1개 (0.6GB 메모리)
* 614MB RAM
* 30GB HDD
* 유동 IP

미국 서버라 레이턴시가 아쉬웠지만 간단한 24시간 봇을 돌리기에는 전혀 부족함 없는 환경이었고 잘 사용해왔었기 때문에 MariaDB 서버 설치를 시도해봤다.

```console
-- Unit mariadb.service has begun starting up.
Apr 18 02:38:25 instance-1 mysqld[12887]: 2021-04-18  2:38:25 0 [Note] /usr/sbin/mysqld (mysqld 10.4.18-MariaDB-log) starting as process 12887 ...
Apr 18 02:38:25 instance-1 mysqld[12887]: 2021-04-18  2:38:25 0 [Warning] Could not increase number of max_open_files to more than 16384 (request: 32132)
Apr 18 02:38:25 instance-1 kernel: type=1400 audit(1618681105.871:3080990): avc:  denied  { write } for  pid=12887 comm="mysqld" name="mysql-data" dev="sda2" ino=1454
Apr 18 02:38:25 instance-1 kernel: type=1300 audit(1618681105.871:3080990): arch=c000003e syscall=2 success=no exit=-13 a0=7ffddfabca10 a1=80042 a2=1b6 a3=88 items=0
Apr 18 02:38:25 instance-1 kernel: type=1327 audit(1618681105.871:3080990): proctitle="/usr/sbin/mysqld"
Apr 18 02:38:25 instance-1 mysqld[12887]: 2021-04-18  2:38:25 0 [Warning] Can't create test file /data/mysql/mysql-data/instance-1.lower-test
Apr 18 02:38:25 instance-1 mysqld[12887]: /usr/sbin/mysqld: Can't create file '/home/mysql/log/error/mysql.err' (errno: 13 "Permission denied")
Apr 18 02:38:25 instance-1 mysqld[12887]: 2021-04-18  2:38:25 0 [ERROR] mysqld: File '/home/mysql/log/binary/mysql-bin.index' not found (Errcode: 13 "Permission denie
Apr 18 02:38:25 instance-1 mysqld[12887]: 2021-04-18  2:38:25 0 [ERROR] Aborting
Apr 18 02:38:26 instance-1 systemd[1]: mariadb.service: main process exited, code=exited, status=1/FAILURE
Apr 18 02:38:26 instance-1 systemd[1]: Failed to start MariaDB 10.4.18 database server.
```

CentOS 7 환경에서 설치까지는 문제가 없었지만 __mysql 서비스를 시작할 때 오류가 발생했다!__ 해결 방법을 열심히 찾아보았지만... 해결하지 못했고 이미 봇을 돌리고 있었기 때문에 __메모리 점유율도 80%에 가까워서 포기하게 되었다.__

## 오라클 클라우드 무료 티어?

사용중인 GCP에 DB를 구성하는 것은 포기했지만 다른 무료 클라우드 서비스를 찾아보았고 오라클 클라우드에 무료 티어를 선택했는데 이유는 다음과 같다.

* 클라우드 Region 상관 없이 모두 무료(Seoul, Korea)
* oCPU 1개 (2 vCPU와 비슷한 성능)
* 1GB RAM
* 100GB HDD
* 무료 고정 IP

무엇보다 __공인 IP 제공 무료__ 라는 점이 마음에 들었던 것 같다.

# 2. 오라클 클라우드

- - -

## VM 생성

오라클 클라우드 무료 티어 가입에 대해 잘 설명된 블로그들을 참고하며 쉽게 가입할 수 있었고 컴퓨트 엔진 인스턴스를 생성해주었다.

![image](https://user-images.githubusercontent.com/69145799/115122165-7a234a80-9ff1-11eb-8740-dff5b989517e.png)

## SSH 연결

오라클 클라우드의 특이한 점은 __컴퓨트 인스턴스를 생성할 때 SSH 연결용 암호화 키를 설정해주는데 생성이 완료된 이후에 이를 변경할 방법이 없다는 것__ 이다..

사실 RSA 암호화 키를 생성할 때 문제가 생겨서 VM 인스턴스를 다시 생성했었다. 두번째는 문제없이 SSH 키를 설정하였고 윈도우 PowerShell에서 openSSH를 통해 접속을 시도했는데 오류가 발생했다.

* SSH 접속 명령어

```console
$ ssh -i [rsa 개인 키 경로] [접속ID]@[IP주소]
```

```console
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!
Someone could be eavesdropping on you right now (man-in-the-middle attack)!
It is also possible that a host key has just been changed.
The fingerprint for the ECDSA key sent by the remote host is
SHA256:@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@.
Please contact your system administrator.
Add correct host key in C:\\Users\\zmfjs/.ssh/known_hosts to get rid of this message.
Offending ECDSA key in C:\\Users\\zmfjs/.ssh/known_hosts:2
ECDSA host key for ***.***.***.*** has changed and you have requested strict checking.
Host key verification failed.
```

조금 당황했지만 오류 메세지에 나와있는 `.ssh/known_hosts` 파일에 문제가 있었다.

맨 처음 VM 인스턴스를 생성하고 SSH 연결을 하면서 오류가 났었는데, __그 때 연결을 시도 했던 host 정보가 known_hosts 파일에 저장되있어서 충돌이 발생했던 것__ 이었다.

`.ssh/known_hosts` 파일에 기존에 생성된 정보를 제거하여 문제를 해결했다.

```console
Welcome to Ubuntu 18.04.5 LTS (GNU/Linux 5.4.0-1041-oracle x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage

  System information as of Sat Apr 17 16:24:10 UTC 2021

  System load:  0.14              Processes:           113
  Usage of /:   3.2% of 44.97GB   Users logged in:     0
  Memory usage: 27%               IP address for ens3: 10.0.0.13
  Swap usage:   0%


0 packages can be updated.
0 of these updates are security updates.

New release '20.04.2 LTS' available.
Run 'do-release-upgrade' to upgrade to it.



The programs included with the Ubuntu system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Ubuntu comes with ABSOLUTELY NO WARRANTY, to the extent permitted by
applicable law.

See "man sudo_root" for details.

ubuntu@devwithpug:~$
```

윈도우 환경에서 PowerShell을 통한 SSH 연결에 성공했다! 이후에 개인 키를 맥북에도 넣어주었고 MacOS 환경에서 정상적으로 연결되는 것을 확인했다.

## 공용 서브넷 포트 설정

그 다음에는 __DB 외부 접속을 위해 오라클 클라우드 VCN 포트를 개방해주었다.__ MariaDB의 기본적인 포트는 3306이며 다른 포트를 사용할 생각이 없었기 때문에 3306 포트를 개방했다.

`오라클 클라우드 홈페이지 - 네트워킹 - 가상 클라우드 네트워크 - (개인 vcn) - 보안 목록`

위의 경로를 접속하면 VCN에 대한 송수신 규칙을 설정해 줄 수 있다.

![image](https://user-images.githubusercontent.com/69145799/115122667-177f7e00-9ff4-11eb-87b4-2f5109cebe7f.png)

이처럼 어디서나 접속할수 있는 환경을 위해 모든 IP에 대해 3306 포트를 열어주었다.

# 3. Ubuntu 설정, MariaDB 설치

- - -

## Ubuntu 초기 설정

먼저 우분투의 root 계정에 대한 비밀번호를 설정해주었다.

```console
$ sudo passwd root
Enter new UNIX password:
Retype new UNIX password:
passwd: password updated successfully
```

그 다음 우분투의 시간대를 변경해주었다. 기본적으로는 UTC로 설정되어 있다.

```console
$ date
Sat Apr 17 16:46:38 UTC 2021

$ sudo dpkg-roconfigigure tzdata

Current default time zone: 'Asia/Seoul'
Local time is now:      Sun Apr 18 01:47:09 KST 2021.
Universal Time is now:  Sat Apr 17 16:47:09 UTC 2021.
```

다음으로는 apt 패키지 관리자를 업데이트 / 업그레이드 해주었다.

```console
$ sudo apt update

$ sudo apt upgrade
```

## MariaDB 설치

우분투에 대한 설정은 완료된 것 같아서 MariaDB를 설치해주었다.

[MariaDB 공식 홈페이지](https://downloads.mariadb.org/mariadb/repositories/){:target="_blank"}의 설치법을 보고 진행하였다. MariaDB의 버전은 가장 최신 Stable 버전인 10.5를 설치했다.

```console
$ sudo apt-get install software-properties-common
$ sudo apt-key adv --fetch-keys 'https://mariadb.org/mariadb_release_signing_key.asc'
$ sudo add-apt-repository 'deb [arch=amd64,arm64,ppc64el] https://mirror.yongbok.net/mariadb/repo/10.5/ubuntu bionic main'

$ sudo apt update
$ sudo apt install mariadb-server
```

## MariaDB 암호 설정

정상적으로 MariaDB가 설치되었다면 다음으로는 암호를 설정해주어야 한다.

```console
$ sudo mysql_secure_installation
```

* 기존의 root 암호 입력 / 없으면 엔터

```console
Enter current password for root (enter for none):
OK, successfully used password, moving on...
```

* Unix socket 인증 방식 사용 여부

```console
You already have your root account protected, so you can safely answer 'n'.

Switch to unix_socket authentication [Y/n] n
 ... skipping.
```

* root 암호 설정

```console
Change the root password? [Y/n] y
New password:
Re-enter new password:
Password updated successfully!
Reloading privilege tables..
 ... Success!
```

* 아무나 로그인 할수 있는 익명 유저 삭제 여부

```console
By default, a MariaDB installation has an anonymous user, allowing anyone
to log into MariaDB without having to have a user account created for
them.  This is intended only for testing, and to make the installation
go a bit smoother.  You should remove them before moving into a
production environment.

Remove anonymous users? [Y/n] y
 ... Success!
```

* root 계정 외부 접속 거부 여부

```console
Normally, root should only be allowed to connect from 'localhost'.  This
ensures that someone cannot guess at the root password from the network.

Disallow root login remotely? [Y/n] n
 ... skipping.
```

* 테스트용 'test' 데이터베이스 삭제 여부

```console
By default, MariaDB comes with a database named 'test' that anyone can
access.  This is also intended only for testing, and should be removed
before moving into a production environment.

Remove test database and access to it? [Y/n] y
 - Dropping test database...
 ... Success!
 - Removing privileges on test database...
 ... Success!
```

* 기존 테이블 설정 reload

```console
Reloading the privilege tables will ensure that all changes made so far
will take effect immediately.

Reload privilege tables now? [Y/n] y
 ... Success!

Cleaning up...

All done!  If you've completed all of the above steps, your MariaDB
installation should now be secure.

Thanks for using MariaDB!
```

암호 설정도 끝이 났고 MariaDB 서비스가 정상적으로 작동하는지 확인해보았다. 아래와 같이 __active (running)__ 으로 표시되면 정상적으로 작동하고 있는 것이다.

```console
$ service mysql status

● mariadb.service - MariaDB 10.5.9 database server
   Loaded: loaded (/lib/systemd/system/mariadb.service; enabled; vendor preset: enabled)
  Drop-In: /etc/systemd/system/mariadb.service.d
           └─migrated-from-my.cnf-settings.conf
   Active: active (running)
```

이후 생성한 root 계정으로 MariaDB에 접속하여 앞으로 사용할 DB를 만들어주었다.

```console
$ mysql -u root -p

Enter password:

Welcome to the MariaDB monitor.  Commands end with ; or \g.

MariaDB [(none)]> create database devwithpug;
Query OK, 1 row affected (0.000 sec)

MariaDB [(none)]> show databases;
+--------------------+
| Database           |
+--------------------+
| devwithpug         |
| information_schema |
| mysql              |
| performance_schema |
+--------------------+
4 rows in set (0.000 sec)
```

## 외부 접속이 가능한 'root' 유저 생성

다음으로는 루트 권한을 가진 사용자로 외부에서 접속이 가능하도록 설정해주었다.

먼저 `root` 라는 이름의 유저를 만들고 모든 권한을 위임해주었다.

`flush privileges` 명령어를 통해 DB의 변경사항을 바로 reload 해줄 수 있다.

```console
MariaDB [(none)]> CREATE USER 'root'@'%' IDENTIFIED VIA mysql_native_password USING PASSWORD ("password");
Query OK, 0 rows affected (0.003 sec)

MariaDB [(none)]> GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
Query OK, 0 rows affected (0.001 sec)

MariaDB [(none)]> flush privileges;
Query OK, 0 rows affected (0.000 sec)
```

다음은 외부에서 연결이 가능하도록 IP를 설정하고 포트를 개방해주었다.

우분투 기준 `/etc/mysql/my.cnf` 파일에서 3306 포트를 열어주었다.

```console
$ sudo vi /etc/mysql/my.cnf

[client-server]
# Port or socket location where to connect
port = 3306
```

그리고 `/etc/mysql/mariadb.conf.d/50-server.cnf` 파일에서 `bind-address` 값을 변경해주었다. `bind-address` 값은 해당 주소에서만 접속을 허용한다는 의미이다.

```console
$ sudo vi /etc/mysql/mariadb.conf.d/50-server.cnf

[mysqld]

#bind-address            = 127.0.0.1
bind-address = 0.0.0.0
```

변경된 설정을 적용하기 위해 mysql 서비스를 재시작 해주었다.

```console
$ sudo systemctl restart mysql
```

__하지만 이 상태로 외부 접속을 성공하지는 못했다!__

# 4. 리눅스 포트 개방

- - -

## 연결 실패 원인

모든 설정을 완료했다고 생각했는데 외부에서 접속을 할 수가 없었다... 관련 정보들을 찾아보면서 우분투의 방화벽에서도 포트를 개방해야 한다는 것을 알게되었다.

이해가 쉽게 예로 들자면 __이전에 오라클 클라우드 서비스에서 개방한 포트는 인터넷 or 모뎀에서 허용한 인바운드 규칙인 것__ 이고 이번에 하는 것은 __운영체제의 방화벽에서 인바운드 규칙을 설정해 주는 것이다.__

먼저 우분투 개방된 LISTEN 포트들을 확인해보았다. __우분투 내에 3306 포트에 대한 인바운드 규칙이 없어서 연결이 안되는 것__ 이었다.

```console
$ netstat -nap | grep LISTEN
(Not all processes could be identified, non-owned process info
 will not be shown, you would have to be root to see it all.)
tcp        0      0 0.0.0.0:111             0.0.0.0:*               LISTEN      -                   
tcp        0      0 127.0.0.53:53           0.0.0.0:*               LISTEN      -                   
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      -                   
tcp6       0      0 :::111                  :::*                    LISTEN      -                   
tcp6       0      0 :::22                   :::*                    LISTEN      - 
```

## 인바운드 규칙 추가

`iptables` 명령어를 통해 인바운드 규칙을 추가해주었다. 이때 `ens3`는 네트워크 인터페이스의 한 종류이다.

```console
$ sudo iptables -I INPUT 5 -i ens3 -p tcp --dport 3306 -m state --state NEW,ESTABLISHED -j ACCEPT
```

`iptables` 의 목록을 보면 `mysql(3306)` 포트에 대한 인바운드 규칙이 추가되었음을 확인할 수 있다.

```console
$ sudo iptables -L
Chain INPUT (policy ACCEPT)
target     prot opt source               destination
ACCEPT     all  --  anywhere             anywhere             state RELATED,ESTABLISHED
ACCEPT     icmp --  anywhere             anywhere
ACCEPT     all  --  anywhere             anywhere
ACCEPT     udp  --  anywhere             anywhere             udp spt:ntp
ACCEPT     tcp  --  anywhere             anywhere             tcp dpt:mysql state NEW,ESTABLISHED
```

# 5. 연결 성공

- - -

![img](https://user-images.githubusercontent.com/69145799/115138523-b0031600-a067-11eb-95b6-b13047edf51f.png)

# References

* [How to Install MariaDB on Ubuntu 18.04](https://linuxize.com/post/how-to-install-mariadb-on-ubuntu-18-04/){:target="_blank"}

* [네이버 블로그 - Ubuntu에서 mariaDB 포트 변경](https://blog.naver.com/6116949/221991858055){:target="_blank"}

* [제타위키 - 리눅스 네트워크 인터페이스 이름 규칙](https://zetawiki.com/wiki/리눅스_네트워크){:target="_blank"}