# Nts — UX incelemesi (a), 2026-11-20

15 ve 29–42 bittikten sonra. Ekran görüntüleri `design/ux/` altında (öncesi / sonrası).

## Yöntem
- **Görev bazlı yürüyüş**, Playwright ile gerçekten tıklayarak, masaüstü 1366×768 (açık tema) ve telefon 390×844 (koyu tema).
  Her görev için dokunuş sayısı ve takıldığı yer kaydedildi (`ux/walk-before.txt`, `ux/walk-after.txt`).
- **Otomatik denetim**, 5 ekranda (pano, liste, yapılacaklar, kayıt penceresi, ayarlar) × 4 yapılandırma:
  44 px altı dokunma hedefleri, adı olmayan düğmeler, WCAG AA metin kontrastı, Tab ile 25 adımda görünür odak.
- **3 persona** ile ekran görüntülerinin üzerinden geçildi.
- **Kontrol listesi:** Nielsen'in 10 ilkesi ve aşağıdaki maddeler.

## Görevler (düzeltmeden sonra, ikisi de aynı)

| Görev | Masaüstü | Telefon | Not |
|---|---|---|---|
| Not kaydet | 2 | 2 | yaz + Enter |
| Link kaydet | 2 | 2 | aynı kutu |
| Foto/dosya ekle | 2 | 2 | + → seç → kaydet |
| Bul (arama) | 2 | 2 | yazınca sonuçlar, birine dokun |
| Claude'a sor | 3 | 3 | yaz → Tab (telefonda "Claude'a sor" çipi) → Sor |
| Görev ekle + bitir | 4 | 4 | "- ekmek al" + Enter → Göster → işaretle |
| Panoda taşı | 2 | 2 | sürükle bırak |
| Kayıt penceresi | 1 | 1 | |
| Şifrelerim | 2 | 2 | ⋯ Daha fazla → Şifrelerim (telefonda filtre menüsü) |
| Ayarlar / Google girişi | 1 | 1 | Google düğmesi ilk bölümde |
| İçe aktarma | 2 | 2 | Ayarlar → Kayıtları taşı |

Hiçbir görevde takılma olmadı. En uzun yol "görev ekle + bitir" (4), o da bildirimdeki "Göster" sayesinde.

## Personalar: nerede kafası karıştı
**1. Sabırsız telefon kullanıcısı**
- Açınca pano geliyordu, kartlar okunamayacak kadar küçüktü (%35); ne olduğunu anlamadan kapatır. → **K1**
- "Claude'a sor" yolunu bulamadı: telefonda Tab yok, çip sadece yazı `?` ile bitince çıkıyordu. → **K3**
- Claude'un cevabının üstüne çizim araçları biniyordu. → **Ö3**
- Kart, düğme ve sekmeler parmakla vurmak için küçük (28–33 px). → **Ö1**

**2. Çok kayıtlı masaüstü kullanıcısı**
- Klavyeyle kutudan çıkamıyor: Tab kutuda mod değiştiriyor (klavye tuzağı). → **K2**
- Tarih, sayı gibi soluk yazılar okunmuyor (kontrast 3,1). → **Ö2**
- Sol çubuk artık kısa ve gizlenebiliyor; Daha fazla menüsü listeleri ve konuları birlikte gösteriyor. İyi.
- Büyük veride pano ve liste hızı ayrıca ölçülecek (madde 51–64).

**3. Teknolojiden anlamayan biri**
- "Claude köprüsü kapalı. Ayarlar → Claude → Köprüyü başlat" yazıyordu ama öyle bir düğme yok. → **Ö4**
- Ayarlarda "köprü", "Tailscale", `systemctl` gibi sözcükler var. PC'de tek satır komut ve Kopyala düğmesiyle kabul edilebilir;
  kurulum betiği (`install.sh`) çoğunu ortadan kaldırıyor. → **Küçük**
- Kayıt penceresinde başlık ile not aynı metni iki kez gösteriyor ("ekmek al" / "ekmek al"). → **Küçük**

## Kontrol listesi
| Madde | Durum |
|---|---|
| Sistem durumunun görünürlüğü | ✓ kaydedince bildirim, Claude düzenlerken soluk kart, senkron satırı |
| Gerçek dünya dili / tutarlı Türkçe | ✓ "kayıt, not, pano, görev, konu, liste" her yerde aynı; README'deki "Board" kaldırıldı |
| Kullanıcı kontrolü, geri alma | ✓ silme, görev bitirme, silgi: hepsi "Geri al"; Esc her pencereyi kapatır |
| Tutarlılık | ✓ tek kutu, tek düğme (Kaydet ↑ / Sor ✦) |
| Hata önleme | ✓ ? ile biten not kendiliğinden Claude'a gitmiyor; aynı link ikinci kez kaydedilmiyor |
| Hatırlama yerine tanıma | ✓ ipucu çipleri (Tab: Claude'a sor), boş durumlarda örnekler |
| Esneklik | ✓ kısayollar: `/` kutu, `[` çubuk, V/N/P/A/R/T/E araçlar, Shift+1 hepsini göster |
| Sade tasarım | ✓ sol çubuk 15 → 10 düğme, kayıt penceresinde tek "Etiketle" satırı |
| Hatalardan kurtulma | ✓ Claude kapalıyken ne yapılacağı yazıyor |
| Yardım | ✓ 6 adımlık tur, Ayarlar → Nasıl kullanılır? |
| Boş / yükleniyor / hata durumları | ✓ boş liste, iskelet yükleme, "önizleme açılamadı" |
| Dokunma hedefleri ≥ 44 px | ~ ana düğmeler 40 px (WCAG AA 24 px'i geçiyor), ayarlardaki küçük renk ve tema düğmeleri 30–36 px |
| Klavye + görünür odak | ✓ `:focus-visible` halkası, K2 düzeltildi |
| Ekran okuyucu etiketleri | ✓ adı olmayan düğme yok (otomatik denetim: 0) |
| Kontrast (WCAG AA) | ✓ düzeltmeden sonra 0 sorun (öncesi her ekranda 2–5) |
| `prefers-reduced-motion` | ✓ tüm animasyonlar kapanıyor |
| 100 ms içinde tepki | ✓ "- görev" 7 ms, arama 80 ms bekleyip süzüyor |

## Sorunlar
### Kritik (düzeltildi)
- **K1. Telefonda ilk ekran okunmuyor.** Varsayılan görünüm panoydu ve "hepsini göster" %35'e kadar küçültüyordu.
  Çözüm: telefonda ilk açılış Liste; panoda telefonda en az %70, sığmazsa en yeni günden başlar.
  `ux/c1-once-telefon-ilk-ekran.png` → `ux/c1-sonra-telefon-ilk-ekran.png`, `ux/c1b-once-pano-telefon.png` → `ux/c1b-sonra-pano-telefon.png`
- **K2. Klavye tuzağı.** Kutuda Tab her zaman Not/Sor değiştiriyordu, Tab ile kutudan çıkılamıyordu.
  Çözüm: kutu boşken Tab normal çalışır (sonraki öğeye geçer); yazı varken mod değiştirir; Esc kutudan çıkar.
- **K3. Telefonda Claude'a sormanın yolu yok.** Telefonda Tab tuşu yok, çip sadece `?` ile bitince çıkıyordu.
  Çözüm: dokunmatik ekranda yazı yazılınca "✦ Claude'a sor" çipi her zaman çıkar (masaüstünde sahibin kuralı aynen: sadece `?` ile bitince ipucu).
  `ux/c3-sonra-telefon-sor-cipi.png`

### Önemli (düzeltildi)
- **Ö1. Telefonda küçük dokunma hedefleri.** Üstteki görünüm düğmeleri 33×28, pano araçları 28×28, görev kutusu 22×22.
  Çözüm: 40×38 / 40×40 / 30 px kutu + 46 px dokunma alanı; filtre ve ayarlar düğmeleri 40 px; pencere düğmeleri 40 px.
  Telefonda 38 px altı hedef: 43 → 20 (kalanlar ayarlarda renk/tema seçicileri ve kayıt penceresindeki 36 px çipler).
- **Ö2. Kontrast.** Soluk yazı (`--muted`) açıkta 3,1, koyuda 3,9; açık temada turuncu yazı/düğme 4,3.
  Çözüm: `--muted` açık #6b6b74, koyu #8a8a95; açık tema turuncusu #c2410c (beyaz yazıyla 5,2). Otomatik denetimde 0 sorun.
  `ux/i2-once-kontrast.png` → `ux/i2-sonra-kontrast.png`
- **Ö3. Telefonda üst üste binme.** Çizim araçları Claude cevabının ve arama sonuçlarının üstüne biniyordu; bildirim, ekli dosya varken kutuya yakındı.
  Çözüm: cevap ya da arama sonuçları açıkken araçlar gizlenir; bildirim kutunun gerçek yüksekliğinin üstünde durur.
  `ux/i3-once-cevap-ustune-araclar.png` → `ux/i3-sonra-cevap.png`
- **Ö4. Eskimiş metin.** "Ayarlar → Claude → Köprüyü başlat" → "Claude bağlı değil: bilgisayardaki Nts köprüsü kapalı. Ayarlar → Claude."

### Küçük (sonraki tura)
- Ayarlardaki tema (Açık/Koyu) ve renk seçicileri telefonda 30–36 px.
- Kayıt penceresinde başlık notla aynıysa not alanı tekrar ediyor.
- Telefonda pano paleti "Bitti · Geri al" bildiriminin yanına sıkışıyor.
- Ayarlarda teknik sözcükler (köprü, Tailscale); kurulum betiğiyle çoğu görünmez oluyor.
- Galeride önizleme kartı yandaki kartları örtüyor (üzerine gelinen kartı örtmüyor).

---

# Nts — UX incelemesi (b), 2026-11-21

En sonda, 56–64, 74 ve 76–81 bittikten sonra. Ekran görüntüleri `design/ux/b-*.png` (repoya girmiyor, sadece bu dosya giriyor).

## Yöntem
- **Görev bazlı yürüyüş**, Playwright ile gerçekten tıklayarak, 4 yapılandırmada (masaüstü 1366×768 ve telefon 390×844, açık + koyu).
  Veri: 3 yıla yayılmış ~530 kayıt (WhatsApp sohbetleri, yer imleri, PC, telefon, geçen yılın bugünü), 2 resim, bir `.tex` dosyası.
- **Otomatik denetim** (`audit.mjs`, genişletildi): 9 ekran × 4 yapılandırma. Yeni ekranlar: galeri, ⋯ menüsü, Tarihe git (ısı haritası), LaTeX kaydı.
- **3 persona** ile ekran görüntülerinin üzerinden geçildi, **kontrol listesi** (a) turundaki gibi.

## Görevler (tık/dokunuş sayısı, 4 yapılandırmada aynı sonuç)
| Görev | Masaüstü | Telefon | Not |
|---|---|---|---|
| Not kaydet | 1 | 1 | yaz + Enter |
| Bul | 2 | 2 | yaz, sonuca dokun |
| Tarihe git → bir gün | 2 | 2 | ısı haritasında güne dokun → "2 Ocak 2026 ve öncesi" |
| Zamanda kaydır | 1 sürükleme | 1 sürükleme | sağ kenardaki kaydırıcı, "May 2025" balonu |
| Geçen yıl bugün | 1 | 1 | listenin başındaki kartta "Göster" |
| WhatsApp sohbetine göre süz | 2 | 2 | ⋯ (telefonda "Tümü") → Kaynak → Annem |
| Aramayı sabitle | 3 | 3 → **takıldı, düzeltildi** | yaz → "N sonucun hepsini göster" → Sabitle |
| Sabit aramayı aç | 1 | 2 | masaüstünde sol çubukta iki harfli düğme; telefonda menü → Kayıtlı aramalar |
| Galeride önizleme | 0 (üzerine gel) | – | sağdaki sabit panelde, kartları örtmüyor; 3 kart arka arkaya |
| LaTeX dosyası + ham metin | 1 + 1 | 1 + 1 | biçimli görünüm, KaTeX matematik, "Ham metin" |
| Çizim + geri al | Ctrl+Z | – | çizgi, silgi, yapışkan not; Ctrl+Shift+Z / Ctrl+Y yineler |
| Claude telefonda | 0 kurulum | 0 kurulum | aynı Google hesabı yeterli (Supabase rölesi, şifreli) |

## Otomatik denetim
| | Öncesi | Sonrası |
|---|---|---|
| Adı olmayan düğme | 0 | 0 |
| Kontrast (gerçek) | 0 | 0 |
| Masaüstü Tab odağı halkasız | 0 | 0 |
| Telefonda ısı haritası hücresi | 11 px (93 hedef) | 20 px, 24 px aralık (WCAG 2.5.8 aralık kuralını geçer) |

Denetimin "düşük kontrast" bulduğu satırların hepsi açık pencerenin arkasında kalan, karartılmış öğeler (arka plan rengi perdeden geliyor), gerçek sorun değil.
Telefonda 44 px altı kalanlar: kayıt penceresindeki 36 px çipler, ayarlardaki renk/tema seçicileri (a)'daki gibi (küçük).

## Personalar: nerede kafası karıştı
**1. Sabırsız telefon kullanıcısı**
- Isı haritasında güne dokunmak neredeyse imkânsız: hücreler 11 px. → **Ö1**
- Listeyi sağ başparmakla kaydırırken sağ kenardaki zaman kaydırıcısını tutuyor, liste kaymıyor, aniden 2025'e atlıyor. → **Ö2**
- Bir aramayı sabitlemek istedi: telefonda "sonuçların hepsini göster" yolu yok, sadece tek tek sonuçlar. → **Ö5**

**2. Çok kayıtlı masaüstü kullanıcısı**
- Isı haritası + ay ızgarası + kaydırıcı + gün özetleri birlikte iyi çalışıyor; "2 Ocak 2026 ve öncesi" şeridi nerede olduğunu söylüyor.
- Kayıtlı aramalar sol çubukta önce aynı iğne ikonuyla görünüyordu, ikisi ayırt edilemiyordu → ilk iki harf ("An", "Fa") yapıldı (bu turda düzeltildi).
- Galeri önizlemesi artık yandaki kartı örtmüyor (77). Ctrl+Z panoda çalışıyor (81).

**3. Teknolojiden anlamayan biri**
- Ayarlarda "Çıkış yap" kırmızı yazı olarak boşlukta, düğmelerin altında tek başına, ne olduğu belirsiz. → **Ö4**
- Ayarlardaki `tailscale serve` komutu kalktı (74); telefonda "bilgisayar üzerinden, şifreli" yazıyor, komut yok.
- LaTeX dosyası açınca artık okunur bir belge görüyor, "Ham metin" düğmesi ne yaptığını söylüyor.

## Kontrol listesi
| Madde | Durum |
|---|---|
| Sistem durumunun görünürlüğü | ✓ "… ve öncesi" şeridi, kaydırıcı balonu, "Claude çalışıyor · gün özetlerini yazıyor" |
| Tutarlı Türkçe | ✓ Kaynak, Kayıtlı aramalar, Sabitle, Tarihe git; aynı şeye aynı ad |
| Geri alma | ✓ çizimde Ctrl+Z / yinele; silgi "Geri al"; kayıtlı aramada × |
| Hata önleme | ✓ aynı arama ikinci kez sabitlenmez ("Zaten kayıtlı") |
| Tanıma | ✓ ısı haritası günlerinde kayıt sayısı + Claude özeti (title) |
| Esneklik | ✓ kaydırıcı ok tuşlarıyla, ısı haritası Tab ile gezilir |
| Boş durumlar | ✓ galeri paneli "Bir kartın üzerine gel…", ısı haritası boş yılda yok |
| Dokunma hedefleri | ~ ısı haritası düzeltildi; 36 px çipler kaldı |
| Klavye + odak | ✓ Tab 25 adım, halkasız odak 0 (masaüstü) |
| Ekran okuyucu | ✓ kaydırıcı `role=slider` + `aria-valuetext`, ısı haritası günlerinde `aria-label` |
| Kontrast | ✓ 0 gerçek sorun |
| `prefers-reduced-motion` | ✓ yeni animasyon yok (kaydırıcı sadece opaklık) |
| Hız | ✓ 530 kayıtta ısı haritası anında; özetler arka planda (16 gün + 4 ay, 14 sn, köprüde) |

## Sorunlar
### Kritik
Yok.

### Önemli (düzeltildi)
- **Ö1. Telefonda ısı haritası hücreleri 11 px.** Çözüm: dokunmatikte 20 px hücre, 4 px aralık; şerit yana kayar ve açılınca en yeni günlere gider.
  `ux/b-o1-once-isi-haritasi-telefon.png` → `ux/b-o1-sonra-isi-haritasi-telefon.png`
- **Ö2. Telefonda zaman kaydırıcısı kaydırmayı yutuyor** (`touch-action: none`, kenarda 30 px). Çözüm: dokunmatikte sadece kaydırırken görünür,
  1,8 sn sonra kaybolur ve dokunmayı almaz; 26 px. `ux/b-o2-once-kaydirici-telefon.png` (sonrasında kaydırma dışında görünmüyor)
- **Ö3. Telefon menüsünün en üstünde boş ayırıcı çizgi** (kayıtlı arama yokken). `ux/b-o3-once-menu-cizgi.png` → `ux/b-o3-sonra-menu.png`
- **Ö4. "Çıkış yap" boşlukta tek başına.** Çözüm: tam genişlik, ince kırmızı çerçeveli düğme. `ux/b-o4-once-cikis.png` → `ux/b-o4-sonra-cikis.png`
- **Ö5. Telefonda "sonuçların hepsini göster" yoktu** (yalnız masaüstünde), arama sabitlenemiyordu. Çözüm: telefonda da görünür (40 px).
  `ux/b-o5-sonra-hepsini-goster-telefon.png`

### Küçük (sonraki tura)
- Kayıt penceresinde 36 px çipler; ayarlarda renk/tema seçicileri 30–36 px.
- Kayıtlı aramanın adı otomatik ("poultrycare · linkler"); yeniden adlandırma yok.
- KaTeX çevrimdışıyken yüklenmez: matematik TeX olarak görünür (sayfa yine okunur).
- Ay özetleri sadece ≥5 kayıtlı geçmiş aylar, gün özetleri ≥2 kayıtlı geçmiş günler için yazılır; bugün ve bu ay yazılmaz.
- Logo (80) sahibin seçimini bekliyor: `ux/b-80-logo-secenekler.png`.
