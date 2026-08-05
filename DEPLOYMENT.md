# Enbilir Production Deployment Rehberi

Bu dokuman, Enbilir projesinin bir VPS uzerinde production ortaminda kurulmasi ve calistirilmasi icin hazirlanmistir. Hedef, projeyi kuracak teknik kisinin kaynak kodu sunucuya aldiktan sonra ortam degiskenlerini, veritabanini, build surecini, process yonetimini, domain yonlendirmesini ve HTTPS kurulumunu tamamlayabilmesidir.

Komut ornekleri Ubuntu/Debian tabanli Linux sunucular icindir. Farkli bir dagitim kullaniliyorsa paket yoneticisi komutlari uyarlanmalidir.

## 1. Genel bilgi

### Proje teknolojileri

- Next.js 16.2.12
- React 19.2.7
- TypeScript
- Tailwind CSS 4
- Prisma 7.9.1
- MySQL 8 (`utf8mb4_0900_ai_ci`), `@prisma/adapter-mariadb` ile
- Node.js uzerinde calisan production Next.js server

### Node.js versiyon onerisi

Bu Next.js surumu icin minimum Node.js gereksinimi `20.9` seviyesindedir. Production icin Node.js `22 LTS` onerilir. Node.js 20 LTS de kullanilabilir, ancak 20.9 altina inilmemelidir.

Kontrol:

```bash
node -v
npm -v
```

## 2. Sunucu hazirligi

### Node.js kurulumu

Ubuntu/Debian uzerinde NodeSource ile Node.js 22 kurulumu:

```bash
sudo apt update
sudo apt install -y curl ca-certificates gnupg
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Kurulumu dogrulayin:

```bash
node -v
npm -v
```

### npm kurulumu

NodeSource ile kurulan Node.js paketi `npm` ile birlikte gelir. Ayrica kurulum gerekmiyorsa su komut sadece versiyon kontrolu icin yeterlidir:

```bash
npm -v
```

Gerekirse npm guncellenebilir:

```bash
sudo npm install -g npm@latest
```

### Gerekli paketler

Temel sistem paketleri:

```bash
sudo apt install -y git build-essential nginx mysql-client
```

PM2 daha sonra global npm paketi olarak kurulacaktir.

### Kilitli uygulama kullanicisi

Next.js process'i root olarak calistirilmaz. Bir kez kilitli servis hesabi olusturun:

```bash
sudo groupadd --system enbilir-app
sudo useradd --system --gid enbilir-app --no-create-home \
  --home-dir /nonexistent --shell /usr/sbin/nologin enbilir-app
sudo passwd --lock enbilir-app
id enbilir-app
```

`id -G enbilir-app` yalniz `id -g enbilir-app` ile ayni primary GID'yi gostermelidir.
Servis hesabina supplementary grup, sudo yetkisi, login shell veya home dizini vermeyin.

## 3. Projeyi sunucuya alma

### Git clone ile yukleme

Ornek dizin:

```bash
sudo install -d -o root -g enbilir-app -m 0750 /srv/enbilir
sudo install -d -o "$USER" -g "$USER" -m 0750 /srv/enbilir/build
cd /srv/enbilir/build
git clone <REPO_URL> enbilir
cd enbilir
```

`<REPO_URL>` yerine projenin gercek Git repository adresi yazilmalidir.

### Zip ile yukleme

Kod zip olarak aktarilacaksa:

```bash
sudo install -d -o root -g enbilir-app -m 0750 /srv/enbilir
sudo install -d -o "$USER" -g "$USER" -m 0750 /srv/enbilir/build
mkdir -p /srv/enbilir/build/enbilir
cd /srv/enbilir/build/enbilir
unzip /path/to/enbilir.zip
```

Zip icinden proje dosyalari alt klasore aciliyorsa, `package.json` dosyasinin bulundugu klasore gecilmelidir.

### Klasor yapisi

Onerilen production klasor yapisi:

```text
/srv/enbilir/
  build/enbilir/       # Temiz build calisma agaci; canli trafik almaz
  artifacts/<git-sha>/ # Kaynak artifact; root-owned ve degismez
  releases/<git-sha>/  # Dogrulanmis release kopyasi; root-owned ve degismez
  runtimes/<git-sha>/  # Non-root calisma kopyasi; kod salt-okunur
  current -> runtimes/<git-sha>  # Aktif runtime baglantisi
  backups/             # MySQL dump ve upload iceren gunluk backup setleri
  uploads/             # Kalici chat ve admin yuklemeleri
  legacy-source/       # Yalniz gecis sirasinda, salt-okunur SQLite ETL kaynagi
```

Artifact ve release SHA dizinleri yerinde degistirilmez. Runtime, dogrulanmis release'in ayri
bir kopyasidir; yalniz `.next/cache` yazilabilir. `current` sembolik baglantisi yalnizca
hazirlanmis ve non-root smoke testi gecmis bir `runtimes/<git-sha>` dizinine atomik olarak
cevrilir. `backups` ve `uploads` runtime disinda kalicidir. `legacy-source` normal runtime
depolamasi degildir; yalniz SQLite'dan MySQL'e tek seferlik kontrollu gecis sirasinda
bulunur ve cutover/reconciliation sonrasinda uygulama tarafindan kullanilmaz.

## 4. Environment degiskenleri

Secret ve ortam ayarlari release dizinine yazilmaz. Tek production ortam dosyasini release
disinda `/etc/enbilir/enbilir.env` olarak olusturun:

```bash
sudo install -d -m 750 -o root -g root /etc/enbilir
umask 077
sudoedit /etc/enbilir/enbilir.env
sudo chown root:root /etc/enbilir/enbilir.env
sudo chmod 600 /etc/enbilir/enbilir.env
```

Ornek production ortam dosyasi:

```env
ENBILIR_ENV="production"
NEXT_PUBLIC_SITE_URL="https://enbilir.com"
DATABASE_URL="mysql://enbilir_app:URL-ENCODED-PASSWORD@127.0.0.1:3306/enbilir_production"
MYSQL_DATABASE="enbilir_production"
MYSQL_DEFAULTS_FILE="/etc/enbilir/mysql-backup.cnf"
AUTH_SECRET="change-this-to-a-random-64-character-production-secret"
MASTER_ADMIN_EMAIL="hakan@ultraakil.com"
GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="no-reply@example.com"
SMTP_PASSWORD="your-smtp-password"
SMTP_FROM="Enbilir <no-reply@example.com>"
OPENAI_API_KEY="your-openai-api-key"
AI_AGENT_CRON_SECRET="guvenli-rastgele-cron-secret"
AI_AGENT_CRON_ORIGIN="http://127.0.0.1:3006"
VIP_RESEARCH_CRON_SECRET="ayri-guvenli-rastgele-secret"
VIP_AGENTS_CRON_SECRET="ayri-guvenli-rastgele-secret"
AI_SIGNAL_EVALUATION_CRON_SECRET="ayri-guvenli-rastgele-secret"
SUBSCRIPTION_CRON_SECRET="ayri-guvenli-rastgele-secret"
WEEKLY_COMPETITION_CRON_SECRET="ayri-guvenli-rastgele-secret"
RATE_LIMIT_HASH_SECRET="ayri-guvenli-rastgele-secret"
CHAT_UPLOAD_DIR="/srv/enbilir/uploads/chat"
ADMIN_UPLOAD_DIR="/srv/enbilir/uploads/admin"
BACKUP_DIR="/srv/enbilir/backups"
BACKUP_HEALTH_GID="<enbilir-app grubunun sayisal GID degeri>"
OPERATIONS_LOG_DIR="/var/log/enbilir"
REQUIRED_JOB_HEARTBEATS="ai-agent:120,subscription-emails:1560,weekly-competition:11640,chat-upload-cleanup:1560"
VIP_RESEARCH_MODEL="gpt-5.6-terra"
VIP_SUBSCRIPTION_WEBHOOK_SECRET="guvenli-rastgele-vip-webhook-secret"
```

Degisken aciklamalari:

- `NEXT_PUBLIC_SITE_URL`: Sitenin public adresidir. Production icin `https://enbilir.com` kullanilmalidir.
- `DATABASE_URL`: Uygulamanin MySQL 8 baglantisidir. Runtime'da yalniz `enbilir_app`
  kullanicisini kullanin; parola URL-encode edilmelidir. Bu dosya `0600` oldugu icin URL'yi
  komut satirina, loga veya process argumanina yazmayin.
- `MYSQL_DATABASE`: CLI backup/ETL araclarinin hedef database adidir. `DATABASE_URL` yolundaki
  database ile birebir ayni, yalniz harf/rakam/alt cizgi iceren bir ad olmalidir.
- `MYSQL_DEFAULTS_FILE`: Backup CLI'sinin `[client]` kimlik bilgilerini okudugu, release
  disindaki absolute `0600` option-file yoludur. Dosya icinde database secmeyin; hedef
  `MYSQL_DATABASE` ile belirlenir.
- `AUTH_SECRET`: Oturum ve token imzalama islemleri icin kullanilir. En az 32 karakterlik, tahmin edilemez bir deger olmalidir.
- `MASTER_ADMIN_EMAIL`: Master admin kabul edilecek e-posta adresidir. Gercek admin e-postasi ile degistirilmelidir.
- `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET`: Google ile giris icin gerekli OAuth kimlik bilgileri.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` ve `SMTP_FROM`:
  Production e-posta teslimati icin zorunludur. Port `465` kullaniliyorsa `SMTP_SECURE=true`;
  STARTTLS portu `587` kullaniliyorsa `SMTP_SECURE=false` olmalidir. `SMTP_FROM`, saglayicida
  dogrulanmis domain/gonderici olmali; production ve staging farkli hesap kullanmalidir.
- `OPENAI_API_KEY`: VIP katalizor ve makro arastirmasindaki kaynakli web aramasi icin kullanilir. Anahtar yoksa rapor nicel izleme moduna duser ve `AL` notu uretmez.
- Her cron route'u kendine ait, en az 32 karakterlik farkli bir secret kullanir. Secret'lar birbiriyle paylasilmaz.
- `AI_AGENT_CRON_ORIGIN`: Sunucu icindeki cron isteklerinin ulastigi lokal Enbilir adresidir; mevcut production PM2 portu icin `http://127.0.0.1:3006` kullanilir.
- `CHAT_UPLOAD_DIR` ve `ADMIN_UPLOAD_DIR`: Release disinda kalan kalici medya dizinleridir.
- `BACKUP_DIR`: Dogrulanan MySQL `mysqldump` ve upload backup setlerinin release disindaki dizinidir.
- `BACKUP_HEALTH_GID`: Readiness surecinin yalnizca backup metadata'sini okuyabilmesi icin
  `enbilir-app` servis grubunun pozitif sayisal GID degeridir. Grup adi veya tahmini bir sayi
  yazmayin. Sunucuda `getent group enbilir-app` ve `id -g enbilir-app` ciktilarinin ayni GID'yi
  gosterdigini dogrulayin; ortam dosyasina yalnizca bu sayisal degeri kaydedin.
- `OPERATIONS_LOG_DIR`: Redakte edilmis ve boyuta gore dondurulen cron loglarinin dizinidir.
- `VIP_RESEARCH_MODEL`: VIP arastirma modelidir; varsayilan `gpt-5.6-terra` degeridir.
- `VIP_SUBSCRIPTION_WEBHOOK_SECRET`: Guvenilir bir odeme dogrulama katmaninin `/api/vip/subscription/activate` JSON endpoint'ine yaptigi cagrilari korur.

Mevcut 100 TL Param `paymentrequest` baglantisi bir i-Sube Odeme Talebi baglantisidir; callback, hesap kimligi veya imzali ozel alan tasimaz. Kullanici odemeden sonra Param dekont numarasini VIP paywall uzerinden bildirir. Admin, i-Sube kaydinda tutar ve dekontu dogrulayip admin panelindeki VIP odeme kuyrugundan onaylar; onay bir aylik VIP erisimini idempotent olarak acar.

Odeme Talebi formunun `Ext_Data` veya e-posta alaniyla otomatik VIP acmayin: bu alanlar Param callback hash kapsaminda degildir. Tam otomatik aktivasyon ancak Param'in kullaniciya ozel `Order_ID`/`TransactionId` ureten API entegrasyonu, `CLIENT_CODE`, `CLIENT_USERNAME`, `CLIENT_PASSWORD`, `GUID`, IP/domain tanimi ve hesap baglantili checkout kaydi ile kurulabilir. Mevcut form callback route'u bu guvenli esleme yoksa istegi reddeder.

Guvenli secret uretmek icin:

```bash
openssl rand -base64 48
```

Ortam dosyasi Git'e commit edilmemeli ve Linux'ta `chmod 600` ile korunmalidir. Degerleri
`echo`, process listesi veya loglarla yazdirmayin. Varlik kontrolu icin `test -n "$DEGISKEN"` kullanin.
Uygulama veya cron baslatmadan once root yonetim shell'inde
`set -a; . /etc/enbilir/enbilir.env; set +a` ile yukleyin.

Development, test, staging ve production ayni MySQL database/kullanicilarini, upload/backup/log dizinini,
OAuth istemcisini, SMTP gondericisini, payment endpoint'ini veya cron secret'ini paylasmamalidir.
`ENBILIR_ENV` hedefi acikca belirtir. Production server eksik, placeholder, kisa, tekrar kullanilmis
secret; relative/dev database; release icindeki kalici storage veya HTTP public URL ile baslamaz.
Staging de ayri domain, ayri test odeme hesabi ve ayri alici allowlist'i kullanmalidir.

## 5. MySQL 8 veritabani kurulumu

### Database ve ayrik kullanicilar

MySQL 8 sunucusunu uygulama hostundan erisilebilir, firewall ile sinirli ve TLS/loopback
politikasina uygun kurun. Database `utf8mb4` ve `utf8mb4_0900_ai_ci` ile olusturulmalidir.
Asagidaki SQL'i `sudo mysql` gibi kimlik bilgisini process argumanina koymayan bir DBA
oturumunda calistirin; ornek parolalari gercek, birbirinden farkli rastgele degerlerle
interaktif olarak degistirin:

```sql
CREATE DATABASE `enbilir_production`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'enbilir_app'@'127.0.0.1' IDENTIFIED BY 'REPLACE_APP_PASSWORD';
CREATE USER 'enbilir_migrate'@'127.0.0.1' IDENTIFIED BY 'REPLACE_MIGRATE_PASSWORD';
CREATE USER 'enbilir_backup'@'127.0.0.1' IDENTIFIED BY 'REPLACE_BACKUP_PASSWORD';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE TEMPORARY TABLES
  ON `enbilir_production`.* TO 'enbilir_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES,
      CREATE VIEW, SHOW VIEW, TRIGGER
  ON `enbilir_production`.* TO 'enbilir_migrate'@'127.0.0.1';
GRANT CREATE, DROP, SELECT, INSERT, UPDATE, DELETE, ALTER, INDEX, REFERENCES,
      CREATE VIEW, SHOW VIEW, TRIGGER
  ON `\_enbilir\_restore\_%`.* TO 'enbilir_migrate'@'127.0.0.1';
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT
  ON `enbilir_production`.* TO 'enbilir_backup'@'127.0.0.1';
GRANT SHOW_ROUTINE ON *.* TO 'enbilir_backup'@'127.0.0.1';
```

`enbilir_app` schema degistiremez. `enbilir_migrate` yalniz hedef schema ve restore-prova
prefix'i icin DDL yapabilir. `enbilir_backup` veri degistiremez. Uzak MySQL kullaniliyorsa
host kisitini gercek uygulama/operasyon kaynak IP'sine daraltin; `%` kullanmayin. Kurulumdan
sonra `SHOW GRANTS FOR ...` ile beklenmeyen global veya yonetim yetkisi bulunmadigini kontrol
edin. User/database olusturma bir kez yapilan DBA isidir; release scriptine eklenmez.

### Credential-safe CLI option dosyalari

Backup ve migration kimlik bilgilerini release agacina veya shell history'ye yazmayin.
Root tarafindan iki ayri MySQL option file olusturun:

```bash
sudo install -d -o root -g root -m 0750 /etc/enbilir
sudoedit /etc/enbilir/mysql-backup.cnf
sudoedit /etc/enbilir/mysql-migrate.cnf
sudo chown root:root /etc/enbilir/mysql-backup.cnf /etc/enbilir/mysql-migrate.cnf
sudo chmod 0600 /etc/enbilir/mysql-backup.cnf /etc/enbilir/mysql-migrate.cnf
```

Dosya bicimi (her dosyada kendi kullanicisi ve farkli parolasi):

```ini
[client]
host=127.0.0.1
port=3306
protocol=tcp
user=enbilir_backup
password=REPLACE_WITH_SECRET
```

Migration dosyasinda `user=enbilir_migrate` kullanin. `MYSQL_DEFAULTS_FILE` varsayilan olarak
backup dosyasini gosterir; restore provasi ve ETL komutlari migration dosyasini yalniz o child
process icin override eder. `mysql -p...`, `mysqldump -p...`, URL'yi `echo` etme veya parolayi
environment'a ayri bir degisken olarak koyma kullanilmaz. CLI araclari option file'in absolute,
regular ve grup/diger kullanicilara kapali (`0600`) olmasini zorunlu tutar.

Migration baglantisi icin ayri `/etc/enbilir/enbilir-migrate.env` dosyasini root-owned `0600`
olusturun. Yalniz asagidaki uc anahtari icerir; `DATABASE_URL` parolasi URL-encode edilir:

```env
DATABASE_URL="mysql://enbilir_migrate:URL-ENCODED-PASSWORD@127.0.0.1:3306/enbilir_production"
MYSQL_DATABASE="enbilir_production"
MYSQL_DEFAULTS_FILE="/etc/enbilir/mysql-migrate.cnf"
```

### Aktif migration history

Production MySQL icin tek aktif Prisma gecmisi `prisma/migrations-mysql/` dizinidir;
`prisma.config.ts` yalniz bu dizini deploy eder. `prisma/migrations/` ve
`prisma/schema.sqlite.prisma` legacy SQLite kaynak gecmisidir ve MySQL'e uygulanmaz.
Migration'i bu asamada calistirmayin. Once hedef ve fallback runtime smoke testlerini,
guncel MySQL backup/restore provasini, disposable MySQL clone migration provasini ve release
guard'i tamamlayin. Gercek `npm run db:deploy` trafik gecisinden hemen once temiz exact-SHA
build agacinda, migration kimligiyle calistirilir.

### Legacy SQLite kaynagindan tek seferlik ETL

Bu alt bolum normal MySQL runtime kurulumu degildir. Yalniz mevcut SQLite production verisini
ilk kez MySQL'e tasimak icindir. Uygulama MySQL cutover sonrasinda SQLite dosyasini acmaz.

1. Once anonimlestirilmis/disposable kopya ve disposable MySQL database ile tam prova yapin.
2. Production cutover penceresinde eski uygulamayi bakim moduna alin ve tum yazmalari durdurun.
3. SQLite dosyasini, varsa WAL ile tutarli uygulama backup mekanizmasindan alin; kaynak kopyayi
   `/srv/enbilir/legacy-source/production.db` altinda root-owned `0600` ve salt-okunur tutun.
4. Bos MySQL hedefinde `prisma/migrations-mysql` baseline'ini deploy edin.
5. ETL'yi once `--apply` olmadan calistirin. Bu asama source integrity, hedef metadata,
   uzunluk/enum/tarih ve iliski kurallarini denetler; hedef sayim eslesmesi beklenmez.
6. Release guard PASS ve acik production yetkisi sonrasinda `--apply --confirm-production`
   ile yukleyin. Cikti yalniz tablo bazinda aggregate row-count/checksum bilgisi icermelidir.
7. Her tablo icin `matched: true`, source/target count ve checksum esitligi olmadan cutover
   yapmayin. Kisisel satirlari veya payload'lari loga almayin.

```bash
sudo -i
cd /srv/enbilir/build/enbilir
set -a; . /etc/enbilir/enbilir.env; . /etc/enbilir/enbilir-migrate.env; set +a
npm run db:deploy
npm run db:sqlite-to-mysql -- --source /srv/enbilir/legacy-source/production.db
npm run db:sqlite-to-mysql -- --source /srv/enbilir/legacy-source/production.db \
  --apply --confirm-production
```

ETL source'u query-only acar, `_prisma_migrations` tablosunu veri tasima kapsamindan cikarir,
MySQL'e ozel `AuditChainHead` kaydini dogrulanmis `AuditEvent` zincirinin sonundan turetir,
foreign-key load sirasi kullanir ve aggregate reconciliation basarisizsa hata verir. Freeze
sonrasinda source degisirse onceki sonucu kullanmayin; yeniden tutarli kaynak alin ve provayi
tekrarlayin. MySQL cutover, rollback siniri ve ilk MySQL backup'i asagidaki bolumlerdeki sabit
siranin parcasidir.

### Kalici uygulama dizinleri

```bash
sudo install -d -o enbilir-app -g enbilir-app -m 0750 /srv/enbilir/uploads
sudo install -d -o root -g root -m 0700 /srv/enbilir/backups
```

### VIP sabah raporu cron'u

Mevcut AI cron kurulumu VIP route'unu da her saat kontrol eder; route yalnizca Europe/Istanbul saat diliminde 07.00'de rapor uretir, aktif VIP uyelere e-posta yollar, vadesi gelen 1/3/6/12 aylik performans kayitlarini kapatir ve SABİT/OLGUN/YILDIRIM sanal portfoylerini calistirir. Her ajan 1.100.000 USD toplam bakiye ile baslar; 100.000 USD rezerve edilir ve butun pozisyon/getiri hesaplari sabit 1.000.000 USD performans tabani uzerinden yapilir:

```bash
sudo -i
cd /srv/enbilir/current
set -a; . /etc/enbilir/enbilir.env; set +a
npm run agent:install-cron
npm run subscription:install-cron
npm run weekly:install-cron
npm run operations:install-cron
```

Bu kurulumlar root crontab'ina yazilir; ozellikle backup sahiplik islemleri nedeniyle
operations cron'u root kalmalidir. Her cron kendi `/tmp/enbilir-*.lock` kilidini kullanir. Cron komutlari
`run-with-heartbeat.mjs` uzerinden calisir; sonuc veritabanina kalp atisi olarak yazilir,
yanit govdelerindeki secret, token ve e-posta degerleri redakte edilir ve loglar dondurulur.
Haftalik is Istanbul saatine gore Pazartesi 00.05'te calisir.

Cron'u beklemeden kontrollu test icin:

```bash
flock -n /tmp/enbilir-ai-agent.lock npm run agent:run -- --force
```

Yalnizca ajanlari idempotent olarak elle calistirmak gerekirse `AI_AGENT_CRON_SECRET` ile korunan `POST /api/vip-agents/run` endpoint'i kullanilabilir.

Cronlar runtime `DATABASE_URL` uzerinden MySQL'e baglanir. Migration komutu cron kurulumunun
parcasi degildir; yalniz kontrollu release akisi `prisma/migrations-mysql` gecmisini uygular.

## 6. Build ve calistirma

Standalone production build yalnizca `/srv/enbilir/build/enbilir` altindaki temiz Git
calisma agacinda yapilir. `/srv/enbilir/current` altinda `npm ci`, `git pull` veya build
calistirilmaz.

## 7. Immutable release, runtime ve PM2

### Artifact ve release hazirlama

Canli runtime veya release dizininde `git pull`, `npm ci` ya da build calistirmayin. Temiz
build calisma agacinda exact hedef SHA icin preflight ve artifact olusturun:

```bash
cd /srv/enbilir/build/enbilir
git status --short
npm ci
npm run release:preflight
TARGET_SHA="$(git rev-parse HEAD)"
sudo install -d -o root -g root -m 0750 \
  /srv/enbilir/artifacts /srv/enbilir/releases
sudo install -d -o root -g enbilir-app -m 0550 /srv/enbilir/runtimes
sudo npm run release:artifact -- --output /srv/enbilir/artifacts
sudo cp -a "/srv/enbilir/artifacts/$TARGET_SHA" "/srv/enbilir/releases/$TARGET_SHA"
sudo chown -R root:root \
  "/srv/enbilir/artifacts/$TARGET_SHA" "/srv/enbilir/releases/$TARGET_SHA"
sudo find "/srv/enbilir/artifacts/$TARGET_SHA" "/srv/enbilir/releases/$TARGET_SHA" \
  -type d -exec chmod 0550 {} +
sudo find "/srv/enbilir/artifacts/$TARGET_SHA" "/srv/enbilir/releases/$TARGET_SHA" \
  -type f -exec chmod 0440 {} +
sudo npm run release:verify -- \
  --release "/srv/enbilir/artifacts/$TARGET_SHA" --commit "$TARGET_SHA"
sudo npm run release:verify -- \
  --release "/srv/enbilir/releases/$TARGET_SHA" --commit "$TARGET_SHA"
```

Artifact ve release strict verification sonrasinda degismezdir. Bunlara cache, log, upload,
PID veya runtime dosyasi yazilmaz.

### Non-root runtime olusturma ve sertlestirme

Runtime, dogrulanmis release'in ayri kopyasidir:

```bash
sudo cp -a "/srv/enbilir/releases/$TARGET_SHA" "/srv/enbilir/runtimes/$TARGET_SHA"
sudo chown -R root:enbilir-app "/srv/enbilir/runtimes/$TARGET_SHA"
sudo find "/srv/enbilir/runtimes/$TARGET_SHA" -type d -exec chmod 0550 {} +
sudo find "/srv/enbilir/runtimes/$TARGET_SHA" -type f -exec chmod 0440 {} +
sudo install -d -o enbilir-app -g enbilir-app -m 0700 \
  "/srv/enbilir/runtimes/$TARGET_SHA/.next/cache"
sudo chown -R enbilir-app:enbilir-app \
  "/srv/enbilir/runtimes/$TARGET_SHA/.next/cache"
sudo find "/srv/enbilir/runtimes/$TARGET_SHA/.next/cache" -type d -exec chmod 0700 {} +
sudo find "/srv/enbilir/runtimes/$TARGET_SHA/.next/cache" -type f -exec chmod 0600 {} +
sudo diff -qr --exclude=cache \
  "/srv/enbilir/releases/$TARGET_SHA" "/srv/enbilir/runtimes/$TARGET_SHA"
sudo -u enbilir-app test ! -w "/srv/enbilir/runtimes/$TARGET_SHA/server.js"
```

Runtime kod dizinleri `root:enbilir-app 0550`, dosyalari `root:enbilir-app 0440` olmalidir.
Tek istisna `.next/cache` olup `enbilir-app:enbilir-app 0700`, icindeki dosyalar `0600`
olabilir. Release ile runtime envanterini `.next/cache` haric karsilastirin; runtime'da bunun
disinda eksik veya fazla entry kabul etmeyin. Artifact ve release icin `release:verify`
kontrolunu runtime kopyasindan sonra tekrar calistirin.

### Hedef ve fallback non-root smoke

Migration veya cutover'dan once hem hedef runtime hem de onceki dogrulanmis fallback runtime
hazir, salt-okunur ve non-root smoke testini gecmis olmalidir. Fallback yoksa yayin yapmayin.
Root PM2 parent'i ortam dosyasini yukler; child process servis hesabina dusurulur:

```bash
sudo -i
TARGET_SHA="<exact-git-sha>"
set -a; . /etc/enbilir/enbilir.env; set +a
PORT=3017 HOSTNAME=127.0.0.1 pm2 start \
  "/srv/enbilir/runtimes/$TARGET_SHA/server.js" \
  --name "enbilir-candidate-$TARGET_SHA" \
  --cwd "/srv/enbilir/runtimes/$TARGET_SHA" --interpreter node \
  --uid enbilir-app --gid enbilir-app
curl --fail --silent http://127.0.0.1:3017/api/health/live > /dev/null
curl --fail --silent http://127.0.0.1:3017/api/health/ready > /dev/null
CANDIDATE_PID="$(pm2 pid "enbilir-candidate-$TARGET_SHA")"
grep -E '^(Uid|Gid|Groups|CapEff):' "/proc/$CANDIDATE_PID/status"
pm2 delete "enbilir-candidate-$TARGET_SHA"
```

Onceki exact `FALLBACK_SHA` icin ayni testi farkli bir loopback portunda, ornegin `3018`,
`/srv/enbilir/runtimes/$FALLBACK_SHA/server.js` ve ayri PM2 adi ile tekrarlayin. Smoke
processleri public interface'e baglanmaz; Nginx hala mevcut `127.0.0.1:3006` servisine gider.

### Process kimligi ve capability dogrulamasi

Her candidate ve production baslangicindan sonra child PID'yi ve kernel kimligini kontrol edin:

```bash
APP_PID="$(sudo pm2 pid enbilir)"
sudo grep -E '^(Uid|Gid|Groups|CapEff):' "/proc/$APP_PID/status"
```

`Uid` alanindaki tum degerler `id -u enbilir-app`, `Gid` alanindaki tum degerler
`id -g enbilir-app` olmalidir. `Groups` yalniz ayni primary GID'yi icermeli, `CapEff`
`0000000000000000` olmalidir. Child root, supplementary gruplu veya capability sahibi ise
restart yeterli degildir; process'i silip asagidaki `--uid/--gid` komutuyla yeniden olusturun.

### Migration ve atomik cutover

Yayin sirasi sabittir:

1. Hedef ve fallback artifact/release strict verification.
2. Hedef ve fallback runtime non-root smoke; hedefi disposable MySQL clone ile dogrulama.
3. Guncel MySQL backup ve izole restore provasi.
4. Production MySQL'in disposable klonunda `db:deploy`, migration ve readiness kontrolu.
5. Legacy ilk geciste ayrica SQLite kaynak freeze, ETL provasi ve rollback karar noktasi.
6. Release guard PASS ve acik Production yayin yetkisi.
7. Gercek `db:deploy`; ilk geciste ETL/reconciliation; hedef runtime gecisi ve non-root PM2.
8. Liveness/readiness PASS, ilk MySQL backup ve restore provasi; sonra bakim modunu kapatma.

Gercek migration temiz exact-SHA build agacinda ve yalniz migration kullanicisi ile
calistirilir. `DATABASE_URL` veya parola komut argumaninda bulunmaz:

```bash
sudo -i
TARGET_SHA="<exact-git-sha>"
cd /srv/enbilir/build/enbilir
test "$(git rev-parse HEAD)" = "$TARGET_SHA"
set -a; . /etc/enbilir/enbilir.env; . /etc/enbilir/enbilir-migrate.env; set +a
npm run db:deploy
```

Migration tamamlaninca ayni shell'i runtime baslatmak icin kullanmayin. Runtime process'i
yalniz `/etc/enbilir/enbilir.env` icindeki `enbilir_app` URL'siyle yeni bir environment'ta
baslatilir. MySQL schema sahipligi dosya `chown/chmod` komutlariyla yonetilmez; `SHOW GRANTS`
ve migration history ile dogrulanir.

Cutover'da `current` yalniz hedef runtime'a atomik cevrilir. Nginx konfigurasyonu ve upstream
portu degismez:

```bash
TARGET_SHA="<exact-git-sha>"
sudo ln -s "/srv/enbilir/runtimes/$TARGET_SHA" "/srv/enbilir/.current-$TARGET_SHA"
sudo mv -Tf "/srv/enbilir/.current-$TARGET_SHA" /srv/enbilir/current
sudo -i
TARGET_SHA="<exact-git-sha>"
set -a; . /etc/enbilir/enbilir.env; set +a
pm2 delete enbilir
PORT=3006 HOSTNAME=127.0.0.1 pm2 start /srv/enbilir/current/server.js \
  --name enbilir --cwd /srv/enbilir/current --interpreter node \
  --uid enbilir-app --gid enbilir-app
pm2 save
curl --fail --silent http://127.0.0.1:3006/api/health/live > /dev/null
curl --fail --silent http://127.0.0.1:3006/api/health/ready > /dev/null
```

Process kimligi/capability kontrolunu, `current` hedefini, runtime envanterini ve immutable
artifact/release strict verification'i yeniden calistirin.

### PM2 otomatik restart

PM2 parent root tarafindan yonetilir, child her zaman `enbilir-app` olur:

```bash
sudo pm2 startup
sudo pm2 save
```

Startup komutunun root PM2 process listesini geri yukledigini ve kayitli Enbilir process'inde
`--uid enbilir-app --gid enbilir-app` kimliginin korundugunu kontrollu reboot testinde
dogrulayin.

## 8. Domain yonlendirme

### enbilir.com

Domain DNS panelinde asagidaki kayitlari VPS IP adresine yonlendirin:

```text
A     enbilir.com      <VPS_IP>
```

IPv6 kullaniliyorsa:

```text
AAAA  enbilir.com      <VPS_IPV6>
```

### www yonlendirmesi

`www.enbilir.com` icin iki secenek vardir:

```text
CNAME www              enbilir.com
```

veya:

```text
A     www.enbilir.com  <VPS_IP>
```

Onerilen davranis: `www.enbilir.com` adresini kalici olarak `https://enbilir.com` adresine yonlendirmek.

DNS degisiklikleri genellikle birkac dakika ile 24 saat arasinda yayilir.

## 9. Reverse proxy

Next.js uygulamasi lokal olarak `127.0.0.1:3006` uzerinde calismali, dis trafigi Nginx veya Apache HTTPS uzerinden almalidir.

### Nginx canonical config

Depodaki izlenebilir tek kaynak `deploy/nginx/enbilir.com.conf` dosyasidir. Bu dosya HTTP
trafigini apex HTTPS adresine `308` ile yonlendirir, apex ve `www` HTTPS bloklarinda HSTS
uygular, Next.js'i yalnizca `127.0.0.1:3006` uzerinden proxy'ler ve upstream
`X-Powered-By` header'ini gizler. HSTS HTTP blokunda bulunmaz.

Let's Encrypt sertifikasi ve dosyada belirtilen Certbot TLS include dosyalari mevcut olduktan
sonra canonical dosyayi kurun. Canli sunucuda degisiklik yapmak ayri, acik bir yayin onayi ve
sunucu preflight kontrolu gerektirir:

```bash
sudo install -m 0644 deploy/nginx/enbilir.com.conf /etc/nginx/sites-available/enbilir.com
sudo ln -s /etc/nginx/sites-available/enbilir.com /etc/nginx/sites-enabled/enbilir.com
sudo nginx -t
sudo systemctl reload nginx
```

Her config degisikliginden sonra `sudo nginx -t` basarili olmadan reload yapmayin. Kurulumdan
sonra hem `https://enbilir.com` hem `https://www.enbilir.com` yanitlarinda exact
`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` degerini ve
`X-Powered-By` header'inin bulunmadigini dogrulayin.

Varsayilan site gerekiyorsa kapatilabilir:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Apache ornek config

Gerekli Apache modulleri:

```bash
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo systemctl reload apache2
```

`/etc/apache2/sites-available/enbilir.com.conf`:

```apache
<VirtualHost *:80>
    ServerName www.enbilir.com
    Redirect permanent / http://enbilir.com/
</VirtualHost>

<VirtualHost *:80>
    ServerName enbilir.com

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "http"

    ProxyPass / http://127.0.0.1:3006/
    ProxyPassReverse / http://127.0.0.1:3006/
</VirtualHost>
```

Aktif edin:

```bash
sudo a2ensite enbilir.com.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Nginx ve Apache ayni anda 80/443 portlarini dinlememelidir. Sunucuda yalnizca biri reverse proxy olarak kullanilmalidir.

## 10. SSL / HTTPS

### Let's Encrypt ile Nginx

Certbot kurulumu:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Sertifika alma:

```bash
sudo certbot --nginx -d enbilir.com -d www.enbilir.com
```

Certbot, Nginx config dosyasini HTTPS icin gunceller ve otomatik yenileme zamanlayicisini kurar.

Yenileme testi:

```bash
sudo certbot renew --dry-run
```

### Let's Encrypt ile Apache

```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d enbilir.com -d www.enbilir.com
sudo certbot renew --dry-run
```

### Alternatif

Cloudflare veya baska bir TLS terminasyon servisi kullaniliyorsa:

- DNS kayitlari dogru VPS IP adresine gitmelidir.
- Origin tarafinda yine 80/443 reverse proxy yapisi korunmalidir.
- `NEXT_PUBLIC_SITE_URL` degeri `https://enbilir.com` olarak kalmalidir.

## 11. Yedekleme stratejisi

Production backup'i `mysqldump` ile tutarli MySQL snapshot'i alir. Arac
`MYSQL_DEFAULTS_FILE` kimlik bilgisini kullanir; parola process argumanina eklenmez.
Tamamlanan manifest v2 setinde `database.sql`, tamamlanmis Prisma migration sayisi,
opsiyonel chat/admin upload payload'lari ve her dosyanin SHA-256 degeri bulunur.
Tamamlanmamis set atomik ad degisikliginden once `.partial-*` olarak kalir ve hata halinde
temizlenir. MySQL veri dizinini veya volume'unu dosya seviyesinde kopyalamak bu backup'in
yerine gecmez.

Once dry-run:

```bash
cd /srv/enbilir/current
set -a; . /etc/enbilir/enbilir.env; set +a
npm run operations:backup
```

Onayli backup:

```bash
npm run operations:backup -- --apply
```

`operations:install-cron` bu islemi her gun 03.15'te kilit, redakte log ve kalp atisiyla
calistirir. Backup setleri ayri bir hesap/depolama alanina kopyalanmali; yerel VPS tek kopya
olmamalidir. Yerel diskte tutulan set sayisi varsayilan olarak 3'tur; bu sayi
`BACKUP_RETENTION_COUNT` ile (en az 2) ayarlanabilir. Saklama islemi ancak ana backup
basarili olduktan sonra ayni kilitli calisma icinde calisir. Silmeden once harici kopyanin
SHA-256, manifest v2, `database.sql` ve migration sayisi dogrulanmalidir. Elle incelemek icin:

```bash
npm run operations:prune-backups
```

Uygulamak icin:

```bash
npm run operations:prune-backups -- --apply
```

Windows operasyon bilgisayarinda harici kopya almak icin `scripts/sync-offsite-backup.ps1`
gunde bir kez calistirilmalidir. Betik en yeni tamamlanmis seti atomik olarak alir ve
manifestteki SHA-256 ile dogrular; yerel kopya dogrulanmadan sunucu backup'i silinmez.

Backup araci sahiplik ve mod degisikligi yaptigi ve `mysql-backup.cnf` root-only oldugu icin
production backup cron'u `root`
crontab'i altinda calismali, restore-prova komutu da root tarafindan elle calistirilmalidir.
Kurulumdan sonra `sudo crontab -l` ile yalniz zamanlanan `operations:backup` komutunun root
tarafindan calistirildigini dogrulayin; `operations:install-cron` restore provasi zamanlamaz.
Uygulama process'i root olarak calistirilmaz; `enbilir-app` kullanicisinin ek grubu
bulunmamali ve primary GID degeri `BACKUP_HEALTH_GID` ile ayni olmalidir.

Restore provasi canli database'in uzerine yazmaz. Manifest v2 ve tum checksumlar dogrulanir,
`database.sql` rastgele adli izole `_enbilir_restore_*` database'ine yuklenir, tamamlanmis
migration sayisi manifest ile karsilastirilir ve prova database'i sonunda silinir. Bu islem
backup kullanicisi ile degil, restore prefix'iyle sinirli migration kullanicisi ile calisir:

```bash
MYSQL_DEFAULTS_FILE=/etc/enbilir/mysql-migrate.cnf \
  npm run operations:rehearse-restore -- --set enbilir-YYYYMMDDTHHMMSSZ --record
```

`--record`, readiness kontrolunun kullandigi son basarili prova isaretini backup dizinine
yazar. Production yayini icin backup en fazla 26 saat, restore provasi en fazla 31 gun eski
olmalidir.

Bu izin modelini ilk kez devreye alirken MySQL backup araci ile yeni manifest v2 seti uretin.
Eski SQLite/v1 setini MySQL backup'i gibi yeniden adlandirmayin. `/srv/enbilir/backups`
altindan exact `enbilir-YYYYMMDDTHHMMSSZ` adli en yeni tamamlanmis v2 seti belirleyin ve
yukaridaki restore-prova komutunu root olarak calistirin. Komut checksum, izole MySQL restore,
migration kontrolleri ve yeni marker hazirligi tamamlanmadan onceki iyi marker'i degistirmez.
Son durumda:

- backup root, secili set ve manifestteki dosyalarin gerekli ust dizinleri `root:enbilir-app 0750`;
- yalniz `manifest.json` ve `last-restore-rehearsal.json` `root:enbilir-app 0640`;
- `database.sql` ve upload payload dosyalari `root:root 0600`

olmalidir. Payload dosyalarini servis grubuna okunur yapmayin.

### Rollback

Uygulama rollback'i yalniz onceden strict-verify edilmis, hazirlanmis ve non-root smoke
testini gecmis exact `/srv/enbilir/runtimes/$FALLBACK_SHA` dizinine yapilir. Nginx
konfigurasyonu degismez:

```bash
FALLBACK_SHA="<exact-onceki-git-sha>"
sudo ln -s "/srv/enbilir/runtimes/$FALLBACK_SHA" \
  "/srv/enbilir/.current-rollback-$FALLBACK_SHA"
sudo mv -Tf "/srv/enbilir/.current-rollback-$FALLBACK_SHA" /srv/enbilir/current
sudo -i
FALLBACK_SHA="<exact-onceki-git-sha>"
set -a; . /etc/enbilir/enbilir.env; set +a
pm2 delete enbilir
PORT=3006 HOSTNAME=127.0.0.1 pm2 start /srv/enbilir/current/server.js \
  --name enbilir --cwd /srv/enbilir/current --interpreter node \
  --uid enbilir-app --gid enbilir-app
pm2 save
curl --fail --silent http://127.0.0.1:3006/api/health/live > /dev/null
curl --fail --silent http://127.0.0.1:3006/api/health/ready > /dev/null
```

Rollback sonrasinda PID `Uid/Gid/Groups/CapEff`, exact `current` runtime hedefi ve immutable
fallback artifact/release dogrulamasi tekrar kontrol edilir. Fallback runtime MySQL schema'si
ile uyumluysa database geri alinmaz. Geriye uyumsuz veya veri donusumu yapan migration'da:

1. Trafigi bakim moduna alin ve yazmalari durdurun.
2. Basarisiz release sonrasindaki MySQL verisini ayri, erisimi sinirli bir backup setinde koruyun.
3. Yalnizca checksum ve restore provasi basarili deploy-oncesi `database.sql` dosyasini yeni,
   bos ve izole bir MySQL database'ine geri yukleyip migration/reconciliation kontrollerini yapin.
4. App kullanicisinin yetkisini yeni database ile sinirlayin ve korumali ortam dosyasindaki
   `DATABASE_URL`/`MYSQL_DATABASE` hedefini birlikte degistirin.
5. Readiness PASS olmadan trafigi acmayin.

Migration dosyalarini silmek veya MySQL schema'sini elle geriye cevirmek rollback degildir.

Ilk SQLite-to-MySQL cutover'inda ek bir karar siniri vardir: MySQL runtime'a trafik verilmeden
once rollback, degismemis SQLite kaynak ve onceki immutable runtime'a donmektir. MySQL'e yeni
production yazilari basladiktan sonra SQLite'a otomatik geri donmeyin; iki kaynak ayrisir.
Bakim modunda MySQL backup'ini koruyun ve veri kaybi etkisini degerlendiren ayri onayli bir
forward-fix veya restore plani uygulayin.

Backup metadata izin degisikligi uygulama runtime rollback'inden bagimsizdir ve normal SHA
rollback'inde korunur. Pre-permission bir SHA'ya donulurse root backup cron'unun eski scriptle
yeni `0700` set uretmesine izin vermeyin: cron'u gecici durdurun veya bu surumdeki/yeni uyumlu
operations scriptine sabitleyin. Tam izin rollback'i zorunluysa once non-root uygulamayi ve
root cronlarini durdurun; backup root/set dizinlerini `root:root 0700`, manifest ve marker'i
`root:root 0600` yapin, sonra `BACKUP_HEALTH_GID` ayarini kaldirin. Bu geri alis non-root
readiness backup kontrollerini bilincli olarak bozar; trafik ancak secilen fallback runtime'in
readiness kontrolu PASS olduktan sonra acilmalidir.

### Health ve readiness

- `GET /api/health/live`: Sadece process'in istek cevaplayabildigini bildirir; database'e dokunmaz.
- `GET /api/health/ready`: Production ayarlari, MySQL okuma/yazma (temporary table probe),
  `migrations-mysql` seviyesi, bos disk,
  backup/prova tazeligi ve zorunlu cron kalp atislarini kontrol eder. Ic hata, path veya secret
  dondurmez. Herhangi bir zorunlu kontrol basarisizsa HTTP 503 verir.

Nginx/PM2 gozlemi liveness'i, trafige alma ve release dogrulamasi readiness'i kullanmalidir:

```bash
curl --fail --silent http://127.0.0.1:3006/api/health/live > /dev/null
curl --fail --silent http://127.0.0.1:3006/api/health/ready > /dev/null
```

Yeni kurulumda cron heartbeat kayitlari bos olacagi icin ilgili cronlari kontrollu bir kez
calistirin; zorunlu job kaydini elle uydurmayin. Disk, backup veya restore kontrolunu gecici
olarak kapatmak readiness PASS sayilmaz.

## 12. Sorun giderme

Asagidaki `pm2 restart ... --update-env` komutlari yalniz mevcut child process'in
`enbilir-app` Uid/Gid'si, tek primary grubu ve sifir `CapEff` degeri daha once dogrulanmissa
kullanilir. Process root veya yanlis kimlikle calisiyorsa restart yeterli degildir; process'i
silip runtime bolumundeki root PM2 parent + `--uid enbilir-app --gid enbilir-app` komutuyla
yeniden olusturun.

### `Production icin DATABASE_URL tanimlanmalidir`

Sebep: Production ortam dosyasi yuklenmemistir veya `DATABASE_URL` tanimli degildir.

Cozum:

```bash
sudo -i
test -r /etc/enbilir/enbilir.env && echo "production ortam dosyasi okunabilir"
set -a; . /etc/enbilir/enbilir.env; set +a
test -n "$DATABASE_URL" && echo "DATABASE_URL tanimli"
pm2 restart enbilir --update-env
```

### `AUTH_SECRET` hatasi

Sebep: `AUTH_SECRET` bos, cok kisa veya production icin guvensizdir.

Cozum: `/etc/enbilir/enbilir.env` icinde en az 32 karakterlik guvenli bir deger tanimlayin:

```bash
openssl rand -base64 48
```

Ardindan:

```bash
sudo -i
set -a; . /etc/enbilir/enbilir.env; set +a
pm2 restart enbilir --update-env
```

### Production e-postasi gonderilmiyor

Ortami yukledikten sonra degerlerin yalnizca tanimli oldugunu kontrol edin; degerleri ekrana
yazdirmayin:

```bash
sudo -i
set -a; . /etc/enbilir/enbilir.env; set +a
for key in SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASSWORD SMTP_FROM; do
  test -n "$(printenv "$key")" || echo "$key eksik"
done
```

`SMTP_PORT=465` icin `SMTP_SECURE=true`, `SMTP_PORT=587` icin `SMTP_SECURE=false` kullanin.
Saglayicida `SMTP_FROM` domainini dogrulayin; staging alici allowlist'i ile production
gonderimini ayirin. Kimlik bilgilerini komuta arguman, log veya destek ciktisi olarak eklemeyin.

### Google ile giris calismiyor

Kontrol edilecekler:

```bash
sudo -i
set -a; . /etc/enbilir/enbilir.env; set +a
test -n "$GOOGLE_CLIENT_ID" && echo "GOOGLE_CLIENT_ID tanimli"
test -n "$GOOGLE_CLIENT_SECRET" && echo "GOOGLE_CLIENT_SECRET tanimli"
test -n "$NEXT_PUBLIC_SITE_URL" && echo "NEXT_PUBLIC_SITE_URL tanimli"
```

Google Cloud Console tarafinda OAuth istemcisinin yetkili yeniden yonlendirme URL'si su adrese birebir uymali:

```text
https://enbilir.com/api/auth/google/callback
```

Eger uygulama farkli bir domain, preview URL veya reverse proxy arkasinda calisiyorsa `NEXT_PUBLIC_SITE_URL` degerini o public adrese gore ayarlayin ve uygulamayi yeniden baslatin:

```bash
sudo -i
set -a; . /etc/enbilir/enbilir.env; set +a
pm2 restart enbilir --update-env
```

### Prisma migration hatasi

Sebep: Migration `DATABASE_URL` degeri yanlis, MySQL 8 erisilemiyor, `enbilir_migrate`
yetkileri eksik veya `prisma/migrations-mysql` history'si hedefle uyusmuyor olabilir.

Kontrol:

```bash
sudo -i
cd /srv/enbilir/build/enbilir
set -a; . /etc/enbilir/enbilir.env; . /etc/enbilir/enbilir-migrate.env; set +a
case "$DATABASE_URL" in mysql://*) echo "MySQL migration URL semasi uygun";; *) echo "URL semasi hatali";; esac
test "$MYSQL_DATABASE" = "enbilir_production" && echo "MYSQL_DATABASE uygun"
test -f "$MYSQL_DEFAULTS_FILE" && test ! -L "$MYSQL_DEFAULTS_FILE"
test "$(stat -c '%a' "$MYSQL_DEFAULTS_FILE")" = "600"
npx prisma migrate status
```

Production runtime ortam dosyasindaki URL app kullanicisini, migration ortam dosyasindaki URL
migration kullanicisini kullanmalidir:

```env
DATABASE_URL="mysql://enbilir_app:URL-ENCODED-PASSWORD@127.0.0.1:3306/enbilir_production"
```

`npx prisma migrate status` basarisizsa hata detayini secret redaksiyonuyla inceleyin.
`npm run db:deploy` komutunu troubleshooting denemesi olarak tekrar tekrar calistirmayin;
yalniz release akisinda ve exact-SHA icin calistirin.

### MySQL access denied / connection hatasi

Sebep: App/migration/backup kullanicisi karismis, host eslesmesi yanlis, parola URL-encode
edilmemis, option file izinleri guvensiz veya MySQL/firewall erisimi kapali olabilir.

Kimlik bilgilerini yazdirmadan kontrol edin:

```bash
sudo -i
set -a; . /etc/enbilir/enbilir.env; set +a
test -n "$DATABASE_URL" && echo "DATABASE_URL tanimli"
test -n "$MYSQL_DATABASE" && echo "MYSQL_DATABASE tanimli"
test -f "$MYSQL_DEFAULTS_FILE" && test ! -L "$MYSQL_DEFAULTS_FILE"
stat -c '%a %U:%G %n' "$MYSQL_DEFAULTS_FILE"
curl --fail --silent http://127.0.0.1:3006/api/health/ready > /dev/null
```

Option file `root:root 0600` olmali. Uygulama runtime'i migration/backup kullanicisini
kullanmamali. MySQL kullanici yetkilerini DBA oturumunda `SHOW GRANTS` ile dogrulayin; sorunu
genis global yetki vererek gecici olarak maskelemeyin.

### `npm run build` basarisiz

Kontrol edilecekler:

```bash
node -v
npm ci
npm run build
```

Node.js surumu `20.9` altindaysa Node.js 22 LTS'e gecilmelidir.

### Site 502 Bad Gateway veriyor

Sebep: Nginx/Apache Next.js uygulamasina ulasamiyordur.

Kontrol:

```bash
sudo pm2 status
sudo pm2 logs enbilir
curl -I http://127.0.0.1:3006
sudo nginx -t
sudo systemctl status nginx
```

PM2 process calismiyorsa:

```bash
sudo -i
cd /srv/enbilir/current
set -a; . /etc/enbilir/enbilir.env; set +a
PORT=3006 HOSTNAME=127.0.0.1 pm2 start /srv/enbilir/current/server.js \
  --name enbilir --cwd /srv/enbilir/current --interpreter node \
  --uid enbilir-app --gid enbilir-app
pm2 save
```

### Domain acilmiyor

Kontrol:

```bash
dig enbilir.com
dig www.enbilir.com
curl -I http://enbilir.com
```

DNS kayitlari VPS IP adresini gostermelidir. Firewall 80 ve 443 portlarina izin vermelidir:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw status
```

Apache kullaniliyorsa `Nginx Full` yerine Apache profili veya manuel `80,443/tcp` izni verilmelidir.

### HTTPS sertifikasi alinamiyor

Kontrol:

```bash
sudo nginx -t
sudo systemctl status nginx
curl -I http://enbilir.com
```

Let's Encrypt dogrulamasi icin `enbilir.com` ve `www.enbilir.com` DNS kayitlari dogru VPS IP adresine gitmeli ve 80 portu disaridan erisilebilir olmalidir.

### Degisiklikler deploy sonrasi gorunmuyor

`current` sembolik baglantisinin beklenen exact Git SHA runtime dizinini gosterdigini,
artifact/release manifestlerini, runtime'in `.next/cache` disinda release ile ayni oldugunu
ve PM2 child kimligini kontrol edin. Canli runtime, artifact veya release dizininde `git pull`,
`npm ci` ya da yerinde build yapmayin. Dogru runtime SHA'sina atomik gecis ve non-root PM2
baslangici yalnizca release guard PASS sonrasinda uygulanir.

PM2 loglari:

```bash
sudo pm2 logs enbilir
```
