Kanka, bunu doğrudan bir coding agent'a verebileceğin şekilde hazırladım. task.md proje anayasası gibi çalışacak: önce plan, sonra modül modül implementasyon, test, güvenlik, deploy ve en son production kontrolü. Yarım yamalak “çalışıyor herhalde” kabul edilmeyecek. 😄

Aşağıdaki içeriği doğrudan task.md olarak kaydedebilirsin.

🚀 Minimal Paste — Project Task Specification

«Proje: 24 Saatlik Minimal Paste Service
Ana amaç: Kullanıcının metin/kod yapıştırıp anında paylaşılabilir bir URL almasını sağlamak. Paste'ler maksimum 24 saat yaşar ve sonrasında otomatik olarak silinir.

Temel prensip: Gereksiz özellik yok. Dosya upload yok. Kullanıcı hesabı yok. Karmaşık UI yok. Küçük, hızlı, güvenli ve kolay deploy edilebilir bir sistem.»

---

0. AGENT ÇALIŞMA PROTOKOLÜ

0.1 Ana kural

Projeyi tek seferde rastgele kodlayıp bırakma.

Önce:

1. Gereksinimleri analiz et.
2. Teknik mimariyi belirle.
3. Riskleri çıkar.
4. Dosya yapısını planla.
5. "task.md" içindeki görevleri sırayla uygula.
6. Her modülün testini tamamla.
7. Bir sonraki modüle ancak önceki modül doğrulandıktan sonra geç.
8. Placeholder/TODO bırakarak modülü tamamlanmış kabul etme.
9. Çalışmayan veya doğrulanmamış özelliğe "COMPLETED" deme.

---

1. PROJE HEDEFİ

Basit bir web tabanlı paste servisi oluştur.

Kullanıcı:

Siteyi açar
    ↓
Textarea'ya metin/kod yapıştırır
    ↓
5 MB kontrolü
    ↓
PASTE OLUŞTUR
    ↓
Benzersiz URL oluşturulur
    ↓
Kullanıcı URL'yi kopyalar
    ↓
Paste 24 saat kullanılabilir
    ↓
24 saat sonunda erişilemez ve storage'dan temizlenir

---

2. KESİN GEREKSİNİMLER

2.1 Frontend

Frontend mümkün olduğunca basit olmalıdır.

Ana kullanıcı arayüzü:

- Textarea
- Gerçek zamanlı boyut göstergesi
- 5 MB limit göstergesi
- Paste oluşturma butonu
- Loading durumu
- Başarı durumu
- Oluşturulan URL
- Copy URL butonu
- Hata mesajı
- Paste'in 24 saat sonra silineceği bilgisi

2.2 Dosya yükleme

KESİNLİKLE OLMAYACAK:

- Dosya seçme
- Drag & drop file upload
- Image upload
- PDF upload
- ZIP upload
- Multipart file upload

Sistem yalnızca:

textarea → text content → paste

mantığıyla çalışacak.

---

3. PASTE LIMITI

Maksimum paste boyutu:

5 MiB

Hesap:

5 * 1024 * 1024

Boyut karakter sayısıyla hesaplanmayacak.

UTF-8 byte boyutu esas alınacak.

Frontend:

new Blob([content]).size

veya eşdeğer güvenilir byte hesaplama kullanılabilir.

Backend/API tarafında aynı kontrol MUTLAKA tekrar yapılacak.

Frontend kontrolü güvenlik mekanizması kabul edilmeyecek.

---

4. EXPIRATION

Her paste oluşturulduğunda:

createdAt
expiresAt

alanları oluşturulacak.

Expiration:

createdAt + 24 saat

olacak.

Kullanıcı:

- Süreyi değiştiremez.
- 24 saatten uzun süre seçemez.
- Süresiz paste oluşturamaz.

4.1 Kritik davranış

Bir paste'in "expiresAt" zamanı geçtiyse:

GET /paste/:id

ve

GET /raw/:id

erişimlerinde paste geçersiz kabul edilecek.

Örnek:

404 Not Found

veya uygun bir expiration response kullanılabilir.

Storage temizliği henüz gerçekleşmemiş olsa bile expiration kontrolü erişimi engellemelidir.

---

5. URL YAPISI

Önerilen yapı:

/

Ana paste sayfası.

/p/:id

Paste görüntüleme.

/raw/:id

Paste'in ham içeriği.

API:

/api/paste

Paste oluşturma.

Health:

/api/health

Sistemin çalışıp çalışmadığını kontrol etmek için.

---

6. RAW ENDPOINT

"/raw/:id" endpoint'i özellikle önemli.

Amaç:

Paste içeriğini:

text/plain

olarak döndürmek.

HTML içeriklerini HTML olarak execute ettirmek yerine raw text olarak sunmak tercih edilir.

Örneğin paste içeriği:

<script>alert(1)</script>

ise "/raw/:id" bunu çalıştırmamalı.

Sadece:

<script>alert(1)</script>

metnini döndürmelidir.

---

7. XSS / CONTENT SECURITY

Kullanıcının paste içeriği güvenilmeyen veridir.

Paste görüntüleme sayfasında:

innerHTML

kullanarak kullanıcı içeriğini doğrudan DOM'a basma.

Tercih:

textContent

veya güvenli escape mekanizması.

Özellikle:

<script>
<img>
<iframe>
<object>
<svg>

gibi içeriklerin çalıştırılması engellenmelidir.

Paste sistemi kullanıcı kodunu saklar ve gösterir.

Kullanıcı kodunu çalıştıran sandbox sistemi değildir.

---

8. PASTE ID

ID tahmin edilemez olmalıdır.

Örneğin:

crypto.randomUUID()

veya güvenli random byte tabanlı ID kullanılabilir.

ID:

- yeterince uzun
- tahmin edilemez
- URL-safe
- collision ihtimali pratikte yok denecek kadar düşük

olmalıdır.

Sequential ID:

1
2
3
4

KESİNLİKLE kullanılmayacak.

---

9. STORAGE MİMARİSİ

GitHub:

source code
workflow
automation

için kullanılacak.

GitHub repository paste storage olarak kullanılmayacak.

Paste içerikleri Git commit'leri içine yazılmayacak.

Sebep:

- repository şişmesi
- Git history'de silinememe
- 24 saatlik deletion modelinin bozulması
- gereksiz GitHub API kullanımı

Storage ayrı tutulacak.

Tercih edilen çözüm:

Vercel
+
uygun persistent storage

Storage seçimi implementasyon öncesi güncel servis limitleri ve Vercel uyumluluğu açısından doğrulanmalıdır.

Adaylar:

Vercel Blob
Cloudflare R2
uygun KV/database çözümü

Agent, güncel platform koşullarını kontrol ederek en basit ve güvenilir çözümü seçmelidir.

---

10. STORAGE DATA MODEL

Minimum metadata:

{
  "id": "Ab7xK92",
  "content": "...",
  "createdAt": "...",
  "expiresAt": "..."
}

Gereksiz metadata tutulmayacak.

İhtiyaç yoksa:

user account
email
name
title
tags
language

gibi bilgiler tutulmayacak.

---

11. DELETE / CLEANUP

24 saat dolmuş paste'ler storage'dan temizlenmeli.

İki katmanlı yaklaşım kullanılmalı:

Katman 1 — Lazy expiration

Paste okunurken:

now >= expiresAt

ise erişim reddedilir.

Katman 2 — Scheduled cleanup

GitHub Actions veya uygun scheduler:

düzenli aralıklarla

expired paste'leri temizler.

Ancak GitHub Actions'ın paste storage'a erişmesi gerekiyorsa gerekli secret/token güvenli şekilde GitHub Secrets üzerinden yönetilmelidir.

---

12. GITHUB ACTIONS

GitHub Actions proje otomasyon merkezi olarak kullanılacak.

Workflow 1 — Cleanup

Örnek:

cleanup.yml

Görevi:

1. Expired paste'leri bul.
2. Storage'dan sil.
3. Başarılı/başarısız işlemleri raporla.
4. Gereksiz çıktı üretme.

Cron sıklığı storage maliyetine göre belirlenebilir.

Örneğin:

schedule:
  - cron: "*/30 * * * *"

veya daha uygun bir aralık.

Agent platform limitlerini kontrol etmelidir.

---

13. HEALTH CHECK

Aşağıdaki endpoint oluştur:

GET /api/health

Başarılı durumda:

{
  "status": "ok"
}

döndür.

GitHub Actions ile periyodik health check yapılabilir.

Health check:

- API
- storage bağlantısı
- temel uygulama durumu

gibi kritik bileşenleri kontrol edebilir.

---

14. VERCEL DEPLOYMENT

Deployment:

GitHub Repository
        ↓
Vercel
        ↓
Automatic Deployment

GitHub repository Vercel projesine bağlanacak.

Her production branch push'u sonrasında deployment yapılabilmeli.

Secrets:

storage token
API token
cleanup secret

gibi hassas bilgiler repository içine yazılmayacak.

".env" dosyaları Git'e commit edilmeyecek.

".gitignore" hazırlanacak.

---

15. FRONTEND TASARIM

Mobil-first.

Ana ekran mümkün olduğunca sade.

Örnek:

┌──────────────────────────────┐
│          MY PASTE            │
├──────────────────────────────┤
│                              │
│  Paste your text here...     │
│                              │
│                              │
│                              │
│                              │
├──────────────────────────────┤
│ 0 B / 5 MB                   │
└──────────────────────────────┘

       [ CREATE PASTE ]

       Deletes after 24h

Paste oluşturulduktan sonra:

┌──────────────────────────────┐
│       PASTE CREATED          │
│                              │
│ https://domain/p/Ab7xK92     │
│                              │
│       [ COPY LINK ]          │
│                              │
│ Expires in 24 hours          │
└──────────────────────────────┘

---

16. TEK DOSYA FRONTEND

Frontend:

index.html

içerisinde olmalı.

Mümkünse:

HTML
CSS
JavaScript

aynı dosyada tutulacak.

Build sistemi zorunlu olmayacak.

React:

KULLANMA

Vite:

KULLANMA

Webpack:

KULLANMA

Tailwind build pipeline:

KULLANMA

Harici framework ancak gerçekten zorunlu bir teknik gereksinim ortaya çıkarsa değerlendirilebilir.

Amaç:

git clone
+
deploy
=
çalışan proje

---

17. FRONTEND STATE

Minimum state:

idle
checking
creating
success
error

Button spam engellenmeli.

Örneğin kullanıcı 20 kez:

CREATE
CREATE
CREATE

basarak 20 paste oluşturmamalı.

Request sırasında buton disabled olabilir.

---

18. NETWORK ERROR

API erişilemezse kullanıcıya:

Paste oluşturulamadı.
Lütfen tekrar deneyin.

gibi anlaşılır hata göster.

Ham server error:

stack trace
token
internal path
database details

kullanıcıya gösterilmemeli.

---

19. RATE LIMIT

Paste servisi abuse edilebilir.

Minimum rate limit mekanizması düşünülmeli.

Örneğin:

IP başına
dakikada X paste

veya uygun provider tabanlı rate limit.

Rate limit uygulanırken:

429 Too Many Requests

döndürülebilir.

Exact değer implementation sırasında belirlenmeli.

---

20. EMPTY PASTE

Boş paste oluşturulmasına izin verme.

Örneğin:

content.trim().length === 0

durumunda:

Paste cannot be empty.

hatası göster.

Not:

Paste'in başındaki/sonundaki boşlukları kullanıcı istemeden değiştirme.

Yani:

trim()

ile içeriği mutate etme.

Sadece boşluk kontrolü için kullanılabilir.

---

21. CONTENT INTEGRITY

Kullanıcı ne yapıştırdıysa storage'a mümkün olduğunca aynı içerik kaydedilmeli.

Otomatik:

formatlama
minify
newline değiştirme
indent değiştirme
HTML parsing

YAPILMAYACAK.

Özellikle büyük HTML/JS dosyalarında byte/content integrity korunmalı.

---

22. HTTP HEADERS

Raw endpoint için uygun content type:

text/plain; charset=utf-8

kullan.

Gerekli güvenlik header'larını değerlendir:

X-Content-Type-Options: nosniff
Content-Security-Policy
Referrer-Policy
X-Frame-Options

Kullanılan Vercel/server modeline uygun şekilde uygula.

---

23. CORS

Gereksiz CORS açma.

Eğer API sadece kendi frontend'i tarafından kullanılacaksa:

Access-Control-Allow-Origin: *

gibi gereksiz geniş izinler verme.

API'nin gerçek kullanım senaryosuna göre minimum izin uygula.

---

24. SECRET YÖNETİMİ

KESİNLİKLE source code içinde:

API_KEY
TOKEN
SECRET
DATABASE_URL
STORAGE_TOKEN

hard-code edilmeyecek.

GitHub Secrets / Vercel Environment Variables kullanılacak.

Ayrıca:

.env
.env.local

".gitignore" içinde olmalı.

---

25. LOGGING

Loglarda paste içeriği yazdırma.

Örneğin:

YANLIŞ:

Created paste:
<script>...</script>

DOĞRU:

Created paste:
id=Ab7xK92
size=1.42MB
expiresAt=...

Secret veya kullanıcı içeriği loglara düşmemeli.

---

26. ERROR RESPONSE STANDARDI

API response'ları tutarlı olsun.

Örnek başarılı:

{
  "ok": true,
  "id": "Ab7xK92",
  "url": "https://example.com/p/Ab7xK92",
  "rawUrl": "https://example.com/raw/Ab7xK92",
  "expiresAt": "..."
}

Örnek hata:

{
  "ok": false,
  "error": "PAYLOAD_TOO_LARGE"
}

Frontend buna göre kullanıcı mesajı gösterecek.

---

27. TEST PLANI

Test 1

Boş paste:

Beklenen:
reddedilir

Test 2

1 KB paste:

Beklenen:
başarılı

Test 3

5 MB'den küçük paste:

Beklenen:
başarılı

Test 4

Tam 5 MiB:

Beklenen:
başarılı olabilir

Boundary davranışı net ve tutarlı olmalı.

Test 5

5 MiB + 1 byte:

Beklenen:
reddedilir

Test 6

HTML:

<script>alert(1)</script>

Beklenen:
çalıştırılmaz
metin olarak gösterilir

Test 7

Türkçe karakter:

şğüİıöç

Beklenen:
içerik bozulmaz

Test 8

Emoji:

🚀🔥💻

Beklenen:
içerik bozulmaz

Test 9

10.000+ satır HTML:

Beklenen:
içerik kaybolmaz

Test 10

Paste URL'si:

Beklenen:
doğru paste'i açar

Test 11

Raw URL:

Beklenen:
tam içeriği text/plain döndürür

Test 12

Expired paste:

Beklenen:
404/expired

Test 13

Geçersiz ID:

/p/abc-not-found

Beklenen:
404

Test 14

Spam button:

Beklenen:
tek request

Test 15

Network failure:

Beklenen:
kullanıcı dostu hata

---

28. SECURITY TESTLERİ

Aşağıdakileri test et:

<script>alert(1)</script>
<img src=x onerror=alert(1)>
<iframe src="...">
<svg onload=alert(1)>
javascript:

Beklenen:

XSS çalışmamalı.

Ayrıca:

SQL injection
path traversal
ID manipulation
oversized request
malformed JSON
duplicate request
rate limit bypass

kontrollerini değerlendir.

Storage provider'a özel güvenlik kuralları da incelenmeli.

---

29. PERFORMANCE

Hedef:

Ana sayfa hızlı açılmalı.

Frontend minimum JS kullanmalı.

Harici kütüphane mümkün olduğunca kullanılmamalı.

Amaç:

HTML
+
CSS
+
vanilla JS

ile işi bitirmek.

Paste oluşturma request'i gereksiz yere büyük response üretmemeli.

Paste görüntüleme sayfası sadece gerekli içeriği çekmeli.

---

30. LARGE CONTENT TEST

Özellikle 5 MB sınırına yakın içerik oluştur.

Örneğin:

4.9 MB

HTML/JS içeriği.

Kontrol:

upload
storage
retrieve
raw
browser rendering

aşamalarının hiçbirinde içerik truncate olmamalı.

Bu test proje için KRİTİK.

---

31. GITHUB REPOSITORY

Repository minimum:

/
├── index.html
├── api/
├── lib/
├── .github/
│   └── workflows/
├── .gitignore
├── README.md
└── task.md

Exact yapı kullanılan Vercel runtime/storage çözümüne göre değişebilir.

Ama gereksiz klasör ve framework eklenmemeli.

---

32. README

README şunları içermeli:

Project description
Features
Architecture
Local development
Environment variables
Vercel deployment
GitHub Actions
Storage configuration
API endpoints
Limits
Security notes

Kurulum:

clone
environment variables
deploy

şeklinde açıkça anlatılmalı.

---

33. LOCAL DEVELOPMENT

Local çalıştırma yöntemi net olmalı.

Örneğin:

npm install
npm run dev

gerekiyorsa README'de anlat.

Ancak frontend'in tek "index.html" olması korunmalı.

Vercel Functions local test yöntemi ayrıca belirtilmeli.

---

34. DEPLOYMENT CHECKLIST

Production öncesi:

- [ ] Vercel project oluşturuldu
- [ ] GitHub repository bağlandı
- [ ] Environment variables tanımlandı
- [ ] Storage çalışıyor
- [ ] API çalışıyor
- [ ] Frontend çalışıyor
- [ ] Paste oluşturuluyor
- [ ] Paste görüntüleniyor
- [ ] Raw endpoint çalışıyor
- [ ] 5 MB limit çalışıyor
- [ ] 24 saat expiration çalışıyor
- [ ] Cleanup çalışıyor
- [ ] GitHub Actions çalışıyor
- [ ] Rate limit çalışıyor
- [ ] XSS testleri geçildi
- [ ] Production URL test edildi

---

35. GITHUB ACTIONS CHECKLIST

- [ ] Cleanup workflow
- [ ] Scheduled trigger
- [ ] Manual "workflow_dispatch"
- [ ] Secret configuration
- [ ] Failed cleanup handling
- [ ] Health check
- [ ] Gereksiz log yok
- [ ] Paste içeriği loglanmıyor

---

36. OBSERVABILITY

Minimum:

created
retrieved
expired
deleted
error

event'leri gerektiğinde sayısal olarak takip edilebilir.

Ama kullanıcı içeriği loglanmayacak.

---

37. ABUSE KORUMASI

İlk sürümde minimum:

5 MB max
rate limit
random ID
24h expiration

uygula.

İleride:

IP-based rate limit
global rate limit
bot detection
abuse reporting
maximum active pastes

eklenebilir.

İlk sürüm gereksiz yere karmaşıklaştırılmamalı.

---

38. UX KURALLARI

Kullanıcı paste yaptıktan sonra URL'yi görmek için başka sayfaya zorlanmamalı.

Başarı ekranında:

URL
COPY
OPEN

gibi basit aksiyonlar olabilir.

Clipboard API başarısız olursa fallback davranışı düşünülmeli.

Mobil Chrome/Safari uyumluluğu test edilmeli.

Textarea:

resize
font
line-height
padding

açısından kod yapıştırmaya uygun olmalı.

---

39. ACCESSIBILITY

Minimum:

- label
- keyboard navigation
- focus state
- button disabled state
- readable contrast
- hata mesajlarının erişilebilir olması

sağlanmalı.

---

40. BROWSER COMPATIBILITY

En azından:

Chrome Android
Chrome Desktop
Firefox
Safari

üzerinde temel fonksiyonlar test edilmeli.

---

41. FINAL ARCHITECTURE REVIEW

Kod tamamlandıktan sonra üç farklı perspektiften inceleme yapılacak.

Perspektif A — Senior Developer

Kontrol:

Kod çalışıyor mu?
Mimari sade mi?
Gereksiz bağımlılık var mı?
Error handling yeterli mi?

Perspektif B — Adversarial Engineer

Şu soruları sor:

Nasıl abuse edilir?
5 MB limiti nasıl bypass edilir?
XSS mümkün mü?
ID tahmin edilebilir mi?
Storage şişirilebilir mi?
Rate limit bypass edilebilir mi?
24 saat kuralı bypass edilebilir mi?
Concurrent request problemi var mı?

Perspektif C — Software Architecture Review

Kontrol:

Bu sistem gereğinden fazla karmaşık mı?
Vercel'e uygun mu?
Storage seçimi doğru mu?
GitHub Actions gerçekten gerekli mi?
Maliyet artabilir mi?
10x kullanımda ne olur?
100x kullanımda ne olur?

Sonrasında üç inceleme birleştirilerek nihai mimari kararı verilecek.

---

42. ACCEPTANCE CRITERIA

Proje ancak aşağıdaki şartların tamamı sağlanırsa:

PRODUCTION-READY

olarak kabul edilebilir.

Functional

- [ ] Paste oluşturulabiliyor
- [ ] URL oluşuyor
- [ ] URL açılıyor
- [ ] Raw URL çalışıyor
- [ ] 5 MB sınırı çalışıyor
- [ ] 24 saat expiration çalışıyor
- [ ] Expired paste erişilemiyor
- [ ] Cleanup çalışıyor
- [ ] Copy çalışıyor

Security

- [ ] XSS engelli
- [ ] Secrets source code'da yok
- [ ] ID güvenli
- [ ] Oversized request engelli
- [ ] Rate limit var
- [ ] Kullanıcı içeriği loglanmıyor

Deployment

- [ ] GitHub → Vercel deployment çalışıyor
- [ ] GitHub Actions çalışıyor
- [ ] Production environment variables doğru
- [ ] Storage production'da çalışıyor

UX

- [ ] Mobil uyumlu
- [ ] Basit
- [ ] Hızlı
- [ ] Hata mesajları anlaşılır
- [ ] 5 MB göstergesi doğru

---

43. DURUM SİSTEMİ

Her görev aşağıdaki durumlardan birini kullanmalı:

PLANNED
IN_PROGRESS
IMPLEMENTED
TESTING
VERIFIED
BLOCKED
PRODUCTION-READY

Bir özellik sadece kodlandığı için "VERIFIED" kabul edilmeyecek.

Kanıt:

test
command output
HTTP response
screenshot
workflow result

gibi gerçek evidence ile desteklenmeli.

---

44. ÇALIŞMA SIRASI

Agent aşağıdaki sırayı takip etmeli:

PHASE 0
Gereksinim ve mimari

↓

PHASE 1
Repository + task altyapısı

↓

PHASE 2
Tek dosya frontend

↓

PHASE 3
Paste API

↓

PHASE 4
Storage

↓

PHASE 5
Paste retrieval

↓

PHASE 6
Raw endpoint

↓

PHASE 7
Expiration

↓

PHASE 8
Cleanup

↓

PHASE 9
GitHub Actions

↓

PHASE 10
Security

↓

PHASE 11
Testing

↓

PHASE 12
Vercel deployment

↓

PHASE 13
Production verification

↓

PHASE 14
Final architecture review

Her phase bitmeden sonraki phase'e geçme.

---

45. AGENT ÇIKTI STANDARDI

Her phase sonunda:

## STATUS

Phase:
Status:

Implemented:
- ...

Tested:
- ...

Evidence:
- ...

Known issues:
- ...

Next:
- ...

formatında kısa rapor üret.

---

46. TODO MASTER LIST

PHASE 0 — ANALYSIS

- [ ] Requirements analysis
- [ ] Architecture decision
- [ ] Storage decision
- [ ] Vercel compatibility verification
- [ ] GitHub Actions design
- [ ] Security threat model
- [ ] API contract
- [ ] Data model

PHASE 1 — PROJECT

- [ ] Repository setup
- [ ] ".gitignore"
- [ ] README
- [ ] "task.md"
- [ ] Environment variable strategy

PHASE 2 — FRONTEND

- [ ] "index.html"
- [ ] CSS
- [ ] textarea
- [ ] byte counter
- [ ] 5 MB validation
- [ ] submit state
- [ ] success UI
- [ ] error UI
- [ ] clipboard
- [ ] mobile responsive
- [ ] accessibility

PHASE 3 — API

- [ ] POST "/api/paste"
- [ ] validation
- [ ] size limit
- [ ] ID generation
- [ ] storage write
- [ ] response format
- [ ] error handling

PHASE 4 — STORAGE

- [ ] Provider configuration
- [ ] write
- [ ] read
- [ ] delete
- [ ] metadata
- [ ] expiration metadata

PHASE 5 — VIEW

- [ ] "/p/:id"
- [ ] safe text rendering
- [ ] not found
- [ ] expired
- [ ] mobile view

PHASE 6 — RAW

- [ ] "/raw/:id"
- [ ] "text/plain"
- [ ] UTF-8
- [ ] security headers
- [ ] expiration validation

PHASE 7 — EXPIRATION

- [ ] "createdAt"
- [ ] "expiresAt"
- [ ] server-side expiration
- [ ] expired response

PHASE 8 — CLEANUP

- [ ] cleanup API
- [ ] scheduled execution
- [ ] delete expired
- [ ] failure handling

PHASE 9 — GITHUB ACTIONS

- [ ] cleanup workflow
- [ ] health workflow
- [ ] manual trigger
- [ ] secrets
- [ ] logs

PHASE 10 — SECURITY

- [ ] XSS
- [ ] injection
- [ ] rate limit
- [ ] ID security
- [ ] secret audit
- [ ] request size
- [ ] abuse testing

PHASE 11 — TESTING

- [ ] empty
- [ ] small
- [ ] 1 MB
- [ ] 4.9 MB
- [ ] 5 MB
- [ ] >5 MB
- [ ] Unicode
- [ ] emoji
- [ ] large HTML
- [ ] XSS
- [ ] expired
- [ ] invalid ID
- [ ] network failure
- [ ] duplicate submit
- [ ] raw endpoint

PHASE 12 — DEPLOY

- [ ] Vercel
- [ ] environment variables
- [ ] domain
- [ ] production deployment
- [ ] GitHub integration
- [ ] Actions

PHASE 13 — PRODUCTION

- [ ] End-to-end test
- [ ] 5 MB test
- [ ] Raw test
- [ ] expiration test
- [ ] cleanup test
- [ ] mobile test
- [ ] security test
- [ ] performance test

PHASE 14 — FINAL

- [ ] Senior review
- [ ] Adversarial review
- [ ] Architecture review
- [ ] Fix findings
- [ ] Final regression
- [ ] Documentation
- [ ] "PRODUCTION-READY"Bu task.md'nin kritik tarafı şu: frontend gerçekten tek index.html, paste sadece text, sınır 5 MiB, yaşam süresi tam 24 saat, GitHub ise kod + Actions, storage ise ayrı. Böylece proje basit kalırken sonradan GitHub Actions üzerinden otomasyon eklemek için de kapıyı açık bırakıyoruz.