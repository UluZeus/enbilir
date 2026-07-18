# Enbilir Production Deployment Rehberi

Bu dokuman, Enbilir projesinin bir VPS uzerinde production ortaminda kurulmasi ve calistirilmasi icin hazirlanmistir. Hedef, projeyi kuracak teknik kisinin kaynak kodu sunucuya aldiktan sonra ortam degiskenlerini, veritabanini, build surecini, process yonetimini, domain yonlendirmesini ve HTTPS kurulumunu tamamlayabilmesidir.

Komut ornekleri Ubuntu/Debian tabanli Linux sunucular icindir. Farkli bir dagitim kullaniliyorsa paket yoneticisi komutlari uyarlanmalidir.

## 1. Genel bilgi

### Proje teknolojileri

- Next.js 16.2.4
- React 19.2.4
- TypeScript
- Tailwind CSS 4
- Prisma 7.8.0
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
cd /srv/enbilir
git clone <REPO_URL> app
cd app
```

`<REPO_URL>` yerine projenin gercek Git repository adresi yazilmalidir.

### Zip ile yukleme

Kod zip olarak aktarilacaksa:

```bash
sudo mkdir -p /srv/enbilir/app
sudo chown -R $USER:$USER /srv/enbilir
cd /srv/enbilir/app
unzip /path/to/enbilir.zip
```

Zip icinden proje dosyalari alt klasore aciliyorsa, `package.json` dosyasinin bulundugu klasore gecilmelidir.

### Klasor yapisi

Onerilen production klasor yapisi:

```text
/srv/enbilir/
  app/                 # Proje kaynak kodu
  data/                # Kalici SQLite veritabani dosyasi
  backups/             # Gunluk veritabani yedekleri
```

`app` klasoru deployment sirasinda guncellenebilir. `data` ve `backups` klasorleri kalici tutulmalidir.

## 4. Environment degiskenleri (.env)

Proje kok dizininde, yani `/srv/enbilir/app/.env` dosyasi olusturun:

```bash
cd /srv/enbilir/app
nano .env
```

Ornek production `.env`:

```env
NEXT_PUBLIC_SITE_URL="https://enbilir.com"
DATABASE_URL="file:/srv/enbilir/data/production.db"
AUTH_SECRET="buraya-en-az-32-karakterlik-guvenli-rastgele-bir-deger-yazin"
MASTER_ADMIN_EMAIL="hakan@ultraakil.com"
GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
OPENAI_API_KEY="your-openai-api-key"
AI_AGENT_CRON_SECRET="guvenli-rastgele-cron-secret"
VIP_RESEARCH_MODEL="gpt-5.6-terra"
VIP_SUBSCRIPTION_WEBHOOK_SECRET="guvenli-rastgele-vip-webhook-secret"
PARAM_CLIENT_CODE="param-client-code"
PARAM_GUID="param-uye-isyeri-guid"
```

Degisken aciklamalari:

- `NEXT_PUBLIC_SITE_URL`: Sitenin public adresidir. Production icin `https://enbilir.com` kullanilmalidir.
- `DATABASE_URL`: SQLite dosyasinin konumudur. Production icin proje klasoru disinda kalici bir konum onerilir.
- `AUTH_SECRET`: Oturum ve token imzalama islemleri icin kullanilir. En az 32 karakterlik, tahmin edilemez bir deger olmalidir.
- `MASTER_ADMIN_EMAIL`: Master admin kabul edilecek e-posta adresidir. Gercek admin e-postasi ile degistirilmelidir.
- `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET`: Google ile giris icin gerekli OAuth kimlik bilgileri.
- `OPENAI_API_KEY`: VIP katalizor ve makro arastirmasindaki kaynakli web aramasi icin kullanilir. Anahtar yoksa rapor nicel izleme moduna duser ve `AL` notu uretmez.
- `AI_AGENT_CRON_SECRET`: AI ve VIP zamanlanmis route'larini korur.
- `VIP_RESEARCH_MODEL`: VIP arastirma modelidir; varsayilan `gpt-5.6-terra` degeridir.
- `VIP_SUBSCRIPTION_WEBHOOK_SECRET`: Odeme dogrulama katmaninin `/api/vip/subscription/activate` JSON endpoint'ine yaptigi cagrilari korur.
- `PARAM_CLIENT_CODE` ve `PARAM_GUID`: Param form callback hash dogrulamasi icin gereklidir. Param Return/Callback URL'i `https://enbilir.com/api/vip/subscription/activate` olmalidir; Enbilir e-postasi callback `Ext_Data` ilk alaninda iletilmelidir.

Guvenli secret uretmek icin:

```bash
openssl rand -base64 48
```

`.env` dosyasi Git'e commit edilmemelidir.

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

Once bagimliliklari kurun:

```bash
cd /srv/enbilir/app
npm install
```

Ardindan production migration calistirin:

```bash
npm run db:deploy
```

### VIP sabah raporu cron'u

Mevcut AI cron kurulumu VIP route'unu da her saat kontrol eder; route yalnizca Europe/Istanbul saat diliminde 07.00'de rapor uretir, aktif VIP uyelere e-posta yollar, vadesi gelen 1/3/6/12 aylik performans kayitlarini kapatir ve SABİT/OLGUN/YILDIRIM sanal portfoylerini calistirir. Her ajan 1.100.000 USD toplam bakiye ile baslar; 100.000 USD rezerve edilir ve butun pozisyon/getiri hesaplari sabit 1.000.000 USD performans tabani uzerinden yapilir:

```bash
cd /srv/enbilir/app
npm run agent:install-cron
```

Cron'u beklemeden kontrollu test icin:

```bash
npm run agent:run -- --force
```

Yalnizca ajanlari idempotent olarak elle calistirmak gerekirse `AI_AGENT_CRON_SECRET` ile korunan `POST /api/vip-agents/run` endpoint'i kullanilabilir.

Bu komut `prisma/migrations` altindaki migration dosyalarini `DATABASE_URL` ile belirtilen SQLite veritabanina uygular.

## 6. Build ve calistirma

### Bagimlilik kurulumu

```bash
cd /srv/enbilir/app
npm install
```

### Production build

```bash
npm run build
```

Build basarili olmadan PM2 veya reverse proxy adimina gecilmemelidir.

### Production server baslatma

Next.js varsayilan olarak `3000` portunda calisir:

```bash
npm run start
```

Farkli port kullanmak icin:

```bash
PORT=3000 npm run start
```

Sunucu icinden test:

```bash
curl -I http://127.0.0.1:3000
```

## 7. Surekli calistirma

### PM2 kurulumu

```bash
sudo npm install -g pm2
```

### PM2 ile baslatma

```bash
cd /srv/enbilir/app
pm2 start npm --name enbilir -- run start
```

Port belirtmek istenirse:

```bash
cd /srv/enbilir/app
PORT=3000 pm2 start npm --name enbilir -- run start
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

Yeni deploy sonrasi restart:

```bash
cd /srv/enbilir/app
git pull
npm install
npm run db:deploy
npm run build
pm2 restart enbilir
pm2 save
```

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

Next.js uygulamasi lokal olarak `127.0.0.1:3000` uzerinde calismali, dis trafigi Nginx veya Apache HTTPS uzerinden almalidir.

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
        proxy_pass http://127.0.0.1:3000;
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

    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
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

### SQLite yedekleme

SQLite dosyasini dogrudan kopyalamak yerine SQLite'in backup komutunu kullanmak daha guvenlidir:

```bash
mkdir -p /srv/enbilir/backups
sqlite3 /srv/enbilir/data/production.db ".backup '/srv/enbilir/backups/production-$(date +%F).db'"
```

Yedekleri sikistirma:

```bash
gzip -f /srv/enbilir/backups/production-$(date +%F).db
```

### Gunluk backup onerisi

Root veya deploy kullanicisinin crontab dosyasina gunluk backup ekleyin:

```bash
crontab -e
```

Ornek cron:

```cron
15 3 * * * mkdir -p /srv/enbilir/backups && sqlite3 /srv/enbilir/data/production.db ".backup '/srv/enbilir/backups/production-$(date +\%F).db'" && gzip -f /srv/enbilir/backups/production-$(date +\%F).db && find /srv/enbilir/backups -name 'production-*.db.gz' -mtime +14 -delete
```

Bu ornek her gun 03:15'te yedek alir ve 14 gunden eski yedekleri siler.

Oneriler:

- Backup dosyalari sadece ayni VPS uzerinde tutulmamali, harici bir storage alanina da aktarilmalidir.
- Restore proseduru periyodik olarak test edilmelidir.
- Deployment oncesinde manuel backup alinmalidir.

Manuel backup:

```bash
sqlite3 /srv/enbilir/data/production.db ".backup '/srv/enbilir/backups/manual-before-deploy-$(date +%F-%H%M).db'"
```

## 12. Sorun giderme

### `Production icin DATABASE_URL tanimlanmalidir`

Sebep: Production ortaminda `.env` dosyasi yoktur veya `DATABASE_URL` tanimli degildir.

Cozum:

```bash
cd /srv/enbilir/app
cat .env
pm2 restart enbilir --update-env
```

### `AUTH_SECRET` hatasi

Sebep: `AUTH_SECRET` bos, cok kisa veya production icin guvensizdir.

Cozum: `.env` icinde en az 32 karakterlik guvenli bir deger tanimlayin:

```bash
openssl rand -base64 48
```

Ardindan:

```bash
pm2 restart enbilir --update-env
```

### Google ile giris calismiyor

Kontrol edilecekler:

```bash
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
echo $NEXT_PUBLIC_SITE_URL
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
cd /srv/enbilir/app
echo $DATABASE_URL
ls -la /srv/enbilir/data
npm run db:deploy
```

`.env` dosyasindaki `DATABASE_URL` degeri:

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
curl -I http://127.0.0.1:3000
sudo nginx -t
sudo systemctl status nginx
```

PM2 process calismiyorsa:

```bash
cd /srv/enbilir/app
pm2 start npm --name enbilir -- run start
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

Yeni kod alindiktan sonra build ve restart adimlari tekrar calistirilmalidir:

```bash
cd /srv/enbilir/app
git pull
npm install
npm run db:deploy
npm run build
pm2 restart enbilir --update-env
```

PM2 loglari:

```bash
pm2 logs enbilir
```
