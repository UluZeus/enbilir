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
- SQLite, `@prisma/adapter-better-sqlite3` ile
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
sudo apt install -y git build-essential nginx sqlite3
```

PM2 daha sonra global npm paketi olarak kurulacaktir.

## 3. Projeyi sunucuya alma

### Git clone ile yukleme

Ornek dizin:

```bash
sudo mkdir -p /srv/enbilir
sudo chown -R $USER:$USER /srv/enbilir
mkdir -p /srv/enbilir/build
cd /srv/enbilir/build
git clone <REPO_URL> enbilir
cd enbilir
```

`<REPO_URL>` yerine projenin gercek Git repository adresi yazilmalidir.

### Zip ile yukleme

Kod zip olarak aktarilacaksa:

```bash
sudo mkdir -p /srv/enbilir/build/enbilir
sudo chown -R $USER:$USER /srv/enbilir
cd /srv/enbilir/build/enbilir
unzip /path/to/enbilir.zip
```

Zip icinden proje dosyalari alt klasore aciliyorsa, `package.json` dosyasinin bulundugu klasore gecilmelidir.

### Klasor yapisi

Onerilen production klasor yapisi:

```text
/srv/enbilir/
  build/enbilir/       # Temiz build calisma agaci; canli trafik almaz
  releases/<git-sha>/  # Degismez release dizinleri
  current -> releases/<git-sha>  # Aktif release baglantisi
  data/                # Kalici SQLite veritabani dosyasi
  backups/             # Gunluk veritabani yedekleri
  uploads/             # Kalici chat ve admin yuklemeleri
```

Release dizinleri yerinde degistirilmez. `current` sembolik baglantisi yalnizca dogrulanmis bir
Git SHA dizinine atomik olarak cevrilir. `data`, `backups` ve `uploads` release disinda kalicidir.

## 4. Environment degiskenleri

Secret ve ortam ayarlari release dizinine yazilmaz. Tek production ortam dosyasini release
disinda `/etc/enbilir/enbilir.env` olarak olusturun:

```bash
sudo install -d -m 750 -o "$USER" -g "$USER" /etc/enbilir
umask 077
nano /etc/enbilir/enbilir.env
chmod 600 /etc/enbilir/enbilir.env
```

Ornek production ortam dosyasi:

```env
ENBILIR_ENV="production"
NEXT_PUBLIC_SITE_URL="https://enbilir.com"
DATABASE_URL="file:/srv/enbilir/data/production.db"
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
OPERATIONS_LOG_DIR="/var/log/enbilir"
REQUIRED_JOB_HEARTBEATS="ai-agent:120,subscription-emails:1560,weekly-competition:11640,chat-upload-cleanup:1560"
VIP_RESEARCH_MODEL="gpt-5.6-terra"
VIP_SUBSCRIPTION_WEBHOOK_SECRET="guvenli-rastgele-vip-webhook-secret"
```

Degisken aciklamalari:

- `NEXT_PUBLIC_SITE_URL`: Sitenin public adresidir. Production icin `https://enbilir.com` kullanilmalidir.
- `DATABASE_URL`: SQLite dosyasinin konumudur. Production icin proje klasoru disinda kalici bir konum onerilir.
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
- `BACKUP_DIR`: Dogrulanan SQLite ve upload backup setlerinin release disindaki dizinidir.
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
Uygulama veya cron baslatmadan once `set -a; . /etc/enbilir/enbilir.env; set +a` ile yukleyin.

Development, test, staging ve production ayni database dosyasini, upload/backup/log dizinini,
OAuth istemcisini, SMTP gondericisini, payment endpoint'ini veya cron secret'ini paylasmamalidir.
`ENBILIR_ENV` hedefi acikca belirtir. Production server eksik, placeholder, kisa, tekrar kullanilmis
secret; relative/dev database; release icindeki kalici storage veya HTTP public URL ile baslamaz.
Staging de ayri domain, ayri test odeme hesabi ve ayri alici allowlist'i kullanmalidir.

## 5. Veritabani kurulumu

### SQLite dosya konumu

Production veritabani icin onerilen konum:

```text
/srv/enbilir/data/production.db
```

`.env` icinde bunun karsiligi:

```env
DATABASE_URL="file:/srv/enbilir/data/production.db"
```

### Kalici klasor olusturma

```bash
sudo mkdir -p /srv/enbilir/data
sudo chown -R $USER:$USER /srv/enbilir/data
chmod 750 /srv/enbilir/data
```

SQLite dosyasi migration calistiginda yoksa olusturulur.

### Migration calistirma

Migration, canli release dizininde degil temiz build calisma agacinda calistirilir:

```bash
cd /srv/enbilir/build/enbilir
set -a; . /etc/enbilir/enbilir.env; set +a
npm ci
npm run db:deploy
```

### VIP sabah raporu cron'u

Mevcut AI cron kurulumu VIP route'unu da her saat kontrol eder; route yalnizca Europe/Istanbul saat diliminde 07.00'de rapor uretir, aktif VIP uyelere e-posta yollar, vadesi gelen 1/3/6/12 aylik performans kayitlarini kapatir ve SABİT/OLGUN/YILDIRIM sanal portfoylerini calistirir. Her ajan 1.100.000 USD toplam bakiye ile baslar; 100.000 USD rezerve edilir ve butun pozisyon/getiri hesaplari sabit 1.000.000 USD performans tabani uzerinden yapilir:

```bash
cd /srv/enbilir/current
npm run agent:install-cron
npm run subscription:install-cron
npm run weekly:install-cron
npm run operations:install-cron
```

Her cron kendi `/tmp/enbilir-*.lock` kilidini kullanir. Cron komutlari
`run-with-heartbeat.mjs` uzerinden calisir; sonuc veritabanina kalp atisi olarak yazilir,
yanit govdelerindeki secret, token ve e-posta degerleri redakte edilir ve loglar dondurulur.
Haftalik is Istanbul saatine gore Pazartesi 00.05'te calisir.

Cron'u beklemeden kontrollu test icin:

```bash
flock -n /tmp/enbilir-ai-agent.lock npm run agent:run -- --force
```

Yalnizca ajanlari idempotent olarak elle calistirmak gerekirse `AI_AGENT_CRON_SECRET` ile korunan `POST /api/vip-agents/run` endpoint'i kullanilabilir.

Bu komut `prisma/migrations` altindaki migration dosyalarini `DATABASE_URL` ile belirtilen SQLite veritabanina uygular.

## 6. Build ve calistirma

Standalone production build yalnizca `/srv/enbilir/build/enbilir` altindaki temiz Git
calisma agacinda yapilir. `/srv/enbilir/current` altinda `npm ci`, `git pull` veya build
calistirilmaz.

### Production server baslatma

Enbilir production servisi reverse proxy arkasinda `3006` portunda calisir; portu acikca belirtin:

```bash
cd /srv/enbilir/current
set -a; . /etc/enbilir/enbilir.env; set +a
PORT=3006 HOSTNAME=127.0.0.1 node server.js
```

Farkli port kullanmak icin:

```bash
PORT=<PORT> HOSTNAME=127.0.0.1 node server.js
```

Sunucu icinden test:

```bash
curl -I http://127.0.0.1:3006
```

## 7. Surekli calistirma

### PM2 kurulumu

```bash
sudo npm install -g pm2
```

### PM2 ile baslatma

```bash
cd /srv/enbilir/current
set -a; . /etc/enbilir/enbilir.env; set +a
PORT=3006 HOSTNAME=127.0.0.1 pm2 start /srv/enbilir/current/server.js \
  --name enbilir --cwd /srv/enbilir/current --interpreter node
```

Durum kontrolu:

```bash
pm2 status
pm2 logs enbilir
```

### Otomatik restart

Sunucu yeniden basladiginda PM2 processlerinin otomatik acilmasi icin:

```bash
pm2 startup
```

Bu komut ekrana `sudo ...` ile baslayan bir komut yazdirir. Ekranda verilen komutu kopyalayip calistirin.

Ardindan mevcut process listesini kaydedin:

```bash
pm2 save
```

Yeni surum icin mevcut release dizininde `git pull` veya yerinde build yapmayin. Once temiz
bir calisma agacinda release preflight ve immutable artifact olusturun:

```bash
cd /srv/enbilir/build/enbilir
npm ci
npm run release:preflight
npm run release:artifact -- --output /srv/enbilir/releases
npm run release:verify -- --release /srv/enbilir/releases/$(git rev-parse HEAD) --commit $(git rev-parse HEAD)
```

Artifact araci `.next/BUILD_ID` degerinin `HEAD` SHA ile ayni olmasini zorunlu tutar, calisabilir
standalone `server.js`, public/statik varliklar, cron scriptleri ve migration envanterini kopyalar;
manifestte server dahil tum payload dosyalarinin SHA-256 degerini yazar. Linux'ta release
dosyalari salt-okunur (`0440`), dizinleri salt-okunur/gecisli (`0550`) olur. Release SHA
dizininde manifestteki commit SHA, eksik/fazla dosya bulunmadigi, boyutlar ve tum SHA-256
degerleri `release:verify` ile yeniden dogrulanmadan aktif symlink'i degistirmeyin. Veritabani backup
ve restore provasi guncel degilse migration veya trafik gecisi yapmayin. Migration yalnizca
ayni veritabaninin disposable klonunda `db:deploy` basarili olduktan sonra gercek hedefe
uygulanir. Trafik gecisi `current` sembolik baglantisini yeni SHA dizinine atomik cevirmek,
`/etc/enbilir/enbilir.env` dosyasini yeniden yuklemek ve PM2'yi `--update-env` ile yeniden
baslatmaktir. Bu adimlar, ancak kullanicinin acik production
yayin yetkisi ve release guard PASS karariyla uygulanir.

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

### Nginx ornek config

`/etc/nginx/sites-available/enbilir.com` dosyasini olusturun:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name www.enbilir.com;

    return 301 http://enbilir.com$request_uri;
}

server {
    listen 80;
    listen [::]:80;
    server_name enbilir.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktif edin:

```bash
sudo ln -s /etc/nginx/sites-available/enbilir.com /etc/nginx/sites-enabled/enbilir.com
sudo nginx -t
sudo systemctl reload nginx
```

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

SQLite dosyasini isletim sistemi seviyesinde dogrudan kopyalamayin. Projedeki backup araci
SQLite online backup API'sini kullanir, kopyada `integrity_check` calistirir, migration
gecmisini dogrular, chat/admin upload dizinlerini ayni backup setine alir ve her dosya icin
SHA-256 kaydeder. Tamamlanmamis set atomik ad degisikliginden once `.partial-*` olarak kalir
ve hata halinde temizlenir.

Once dry-run:

```bash
cd /srv/enbilir/current
npm run operations:backup
```

Onayli backup:

```bash
npm run operations:backup -- --apply
```

`operations:install-cron` bu islemi her gun 03.15'te kilit, redakte log ve kalp atisiyla
calistirir. Backup setleri ayri bir hesap/depolama alanina kopyalanmali; yerel VPS tek kopya
olmamalidir. Otomatik saklama silme politikasi eklenmemistir; silme ayri, gozden gecirilen
bir politika olmalidir.

Restore provasi canli veritabaninin uzerine yazmaz. Secilen set gecici bir dizine kopyalanir;
tum checksumlar, SQLite butunlugu ve migration gecmisi dogrulanir:

```bash
npm run operations:rehearse-restore -- --set enbilir-YYYYMMDDTHHMMSSZ --record
```

`--record`, readiness kontrolunun kullandigi son basarili prova isaretini backup dizinine
yazar. Production yayini icin backup en fazla 26 saat, restore provasi en fazla 31 gun eski
olmalidir.

### Rollback

Uygulama rollback'i, onceki dogrulanmis SHA release dizinine `current` baglantisini geri
cevirip PM2'yi yeniden baslatmaktir. Migration geriye uyumluysa veritabani geri alinmaz.
Geriye uyumsuz veya veri donusumu yapan migration'da:

1. Trafigi bakim moduna alin ve yazmalari durdurun.
2. Basarisiz release sonrasindaki veriyi ayri bir dosyada koruyun.
3. Yalnizca checksum ve restore provasi basarili deploy-oncesi backup setini yeni bir dosyaya acin.
4. `DATABASE_URL` hedefini atomik ve izinleri korunmus sekilde degistirin.
5. Readiness PASS olmadan trafigi acmayin.

Migration dosyalarini silmek veya SQLite schema'sini elle geriye cevirmek rollback degildir.

### Health ve readiness

- `GET /api/health/live`: Sadece process'in istek cevaplayabildigini bildirir; database'e dokunmaz.
- `GET /api/health/ready`: Production ayarlari, SQLite okuma/yazma, migration seviyesi, bos disk,
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

### `Production icin DATABASE_URL tanimlanmalidir`

Sebep: Production ortam dosyasi yuklenmemistir veya `DATABASE_URL` tanimli degildir.

Cozum:

```bash
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
pm2 restart enbilir --update-env
```

### Production e-postasi gonderilmiyor

Ortami yukledikten sonra degerlerin yalnizca tanimli oldugunu kontrol edin; degerleri ekrana
yazdirmayin:

```bash
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
pm2 restart enbilir --update-env
```

### Prisma migration hatasi

Sebep: `DATABASE_URL` yanlis, SQLite klasoru yazilabilir degil veya migration dosyalari eksik olabilir.

Kontrol:

```bash
cd /srv/enbilir/build/enbilir
set -a; . /etc/enbilir/enbilir.env; set +a
test -n "$DATABASE_URL" && echo "DATABASE_URL tanimli"
ls -la /srv/enbilir/data
npm run db:deploy
```

Production ortam dosyasindaki `DATABASE_URL` degeri:

```env
DATABASE_URL="file:/srv/enbilir/data/production.db"
```

### SQLite permission hatasi

Sebep: Uygulamayi calistiran kullanicinin `/srv/enbilir/data` klasorune yazma izni yoktur.

Cozum:

```bash
sudo chown -R $USER:$USER /srv/enbilir/data
chmod 750 /srv/enbilir/data
```

PM2 farkli bir kullanici ile calisiyorsa klasor sahibi o kullanici olmalidir.

### `npm run build` basarisiz

Kontrol edilecekler:

```bash
node -v
npm install
npm run db:deploy
npm run build
```

Node.js surumu `20.9` altindaysa Node.js 22 LTS'e gecilmelidir.

### Site 502 Bad Gateway veriyor

Sebep: Nginx/Apache Next.js uygulamasina ulasamiyordur.

Kontrol:

```bash
pm2 status
pm2 logs enbilir
curl -I http://127.0.0.1:3006
sudo nginx -t
sudo systemctl status nginx
```

PM2 process calismiyorsa:

```bash
cd /srv/enbilir/current
set -a; . /etc/enbilir/enbilir.env; set +a
PORT=3006 HOSTNAME=127.0.0.1 pm2 start /srv/enbilir/current/server.js \
  --name enbilir --cwd /srv/enbilir/current --interpreter node
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

`current` sembolik baglantisinin beklenen Git SHA release dizinini gosterdigini, release
manifestini ve PM2'nin calisma dizinini kontrol edin. Canli release dizininde `git pull` veya
yerinde build yapmayin. Dogru SHA'ya atomik gecis ve restart, yalnizca release guard PASS
sonrasinda uygulanir.

PM2 loglari:

```bash
pm2 logs enbilir
```
