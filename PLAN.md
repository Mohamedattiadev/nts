# Nts — yapılacaklar listesi

Sahibin geri bildirimleri: `design/feedback-*.png`, logo: `design/logo-source.png` (2026-11-20).
Kurallar: vanilla JS (derleme yok), arayüz Türkçe. Her arayüz değişikliğinden sonra Playwright ekran görüntüsü
(masaüstü 1366×768 + telefon 390×844, açık + koyu tema), konsol hatası yok, `node --check app.js` geçmeli.
Playwright: `/home/ati/Attia-Pro/Projects/Fluent365/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs`.
Sunucu: `python3 -m http.server 8790 --bind 127.0.0.1` ya da köprünün sunduğu `http://localhost:8787` (Claude bağlı olan bu).
Bitince maddenin başındaki `[ ]` → `[x]`. Commit/push sadece sahip söyleyince.

## A. Önce bunlar
- [x] 1. Son oturumun commit'lenmemiş işini `git diff` ile gözden geçir, sahibe sor, onaylarsa commit at
       (pano + sürükleme, sol araç çubuğu, sohbet kutusu, ortada açılan pencere, link önizlemesi (microlink),
       Supabase Google girişi + senkron, köprüde oEmbed başlıkları ve 25 etiket sınırı, YouTube oynatıcı).
- [x] 2. `../Fluent365`teki 2 dosyalık değişikliği (Gym/Nts giriş kodunu doğru uygulamaya iletme) sahibe sor, commit at.
- [ ] 3. Google girişini sahiple gerçek cihazlarda dene: PC ve telefon aynı hesap → aynı kayıtlar, dosyalar ikisinde de açılıyor.
       (`supabase/schema.sql` çalıştırıldı, redirect adresleri eklendi.)
- [ ] 3a. Google'dan dönünce (`/nts/?code=…`) boş beyaz sayfa kaldı, yenileyince giriş oldu (sahip, PC, 2026-11-20).
       Çözüm: kod takası ekranı bekletmesin (önce çiz, sonra takas, zaman aşımı), JS hatasında açılış ekranı kalksın,
       service worker sayfa için önce ağ (yeni sürümle eski önbellek karışmasın).
- [ ] 3b. Senkron anlık değil: bir cihazda eklenen öbüründe sayfa yenilenmeden görünmüyor. Çözüm: Supabase Realtime
       yayını (`nts-<uid>` kanalı): kaydeden cihaz "değişti" der, öbürleri hemen çeker; yedek olarak açıkken sık yoklama.

## B. Hatalar
- [x] 4. Sayfa içinde sürüklenen şey (resim, seçili yazı) kutuya kopya olarak düşüyor. Sebep: `wire()` içindeki pencere
       düzeyi `dragenter/drop` her sürüklemeyi alıyor. Çözüm: belge içinden başlayan sürüklemeyi `dragstart`'ta işaretle
       ve yok say; küçük resimlere `draggable="false"`.
- [x] 5. Uzaklaşınca gün başlıkları okunmuyor. Başlıklar her yakınlıkta okunur boyutta kalsın; %70 altında kartlarda tarih görünsün.
- [x] 6. Açık temada pano %48'de boş görünüyor (`feedback-21`). Görünüm/tema değişince `fit()` kartları ekranın dışında bırakmasın.
- [x] 7. Yazı kutusu listenin üstünde zor görünüyor (`feedback-19`). Kutunun arkasına düz/yumuşak geçişli arka plan, koyu temada daha belirgin kenar.
- [x] 8. Kayıt penceresi boş ve kötü (`feedback-16`). Resim sol tarafı doldursun, bilgi sütunu sıkı, "Bağlantılı" küçük çipler,
       işlemler alttaki büyük çubuk yerine üstte ince bir çubukta.

## C. Claude bağlantısı ve ayarlar
- [x] 9. Claude kendiliğinden bağlansın (`feedback-22`). Sebep: köprü servisi durdurulmuştu ve 8790 gibi başka bir
       localhost portunun kendi veritabanı var, token'ı yok. Çözüm: her `http://localhost:*` sayfasında
       `http://127.0.0.1:8787/config`'ten token al (köprüde `/config`'i localhost kaynaklarına aç); servise `Restart=always`.
- [x] 10. Claude kapalıyken sade açıklama + tek işlem: PC'de "Köprüyü başlat" (kopyalanabilir
        `systemctl --user start hizli-note-bridge`), telefonda "Bilgisayar kapalı ya da Tailscale bağlı değil".
- [x] 11. Ayarları sadeleştir: sadece 3 bölüm. **Hesap** (Google girişi, senkron durumu, şifre), **Görünüm** (tema, ana renk),
        **Claude** (tek durum satırı + "Bağlan"; adres/token "Elle ayarla" altında). WhatsApp içe aktarma, yedek, geri yükleme
        "Kayıtları taşı" alt sayfasına; eski GitHub senkronu en altta "Gelişmiş"e.

## D. Ekranı sadeleştir
- [x] 12. **Karar (sahip, 2026-11-20): olduğu gibi kalsın**, değişiklik yok. Önce sahibe 2 seçeneği ekran görüntüsüyle göster, seçtiğini yap. Önerim: Pano/Liste/Galeri geçişi sol araç
        çubuğunun en üstüne (üst ortadaki kalkar); yakınlaştırma araçları sadece yakınlaştırırken/pano üstündeyken görünsün,
        boş yere çift tık = hepsini göster; sağ üstte sadece ayarlar; altta sadece kutu.
- [x] 13. Açılır menüler daha güzel olsun (filtre/konular menüsü, arama sonuçları): yumuşak gölge, büyük satırlar, ikonlar,
        bölüm başlıkları, arama sonuçlarında ↑/↓/Enter ile gezinme.

- [x] 13a. **Sol araç çubuğuna "Fotoğraflar" filtresi** (sahip, 2026-11-20): şu an Tümü / Link / Not / Dosya / Yıldızlı / Konular var;
        resimler ayrı bir ikonla (resim ikonu) kendi filtresine gelsin, "Dosya" resim olmayan dosyaları göstersin. Telefondaki filtre menüsünde de olsun.

- [x] 14. **Yazı kutusundaki ikonlar tam ortalı değil** (`feedback-23`): `+`, ✦ ve ↑ yazı satırıyla aynı hizada değil.
        Tek satırda hepsi dikey ortada; kutu büyüdükçe (çok satır) düğmeler altta hizalı kalsın. Ekran görüntüsünde yakından kontrol et.
- [ ] 15. **Sahibin kararı (2026-11-20):** "Not" ve "Sor" modu arasında **Tab** ile geçilsin; "sonu ? ise sorar" fikri iyi
        ama çok hassas olmasın (sonu ? ile biten bir not yanlışlıkla Claude'a gitmesin): ? ile bitince otomatik sorma, sadece
        "Tab: Claude'a sor" ipucu çıksın. ✦ ve ↑ yerine anlaşılır tek düğme. Aşağıdaki eski not bilgi için:
       **Kutudaki düğmeler kafa karıştırıyor** (`feedback-23`): ↑ ok "kaydet" diye anlaşılmıyor, ✦ (Claude) düğmesi
        ne olduğu belli değil. Çözüm önerisi: ayrı ✦ düğmesini kaldır; sağda tek, yazılı düğme: normalde "Kaydet",
        yazı soruysa (sonu `?`) "Claude'a sor" olur ve rengi değişir. Kutunun içinde ya da altında küçük ipucu:
        "Enter: kaydet · sonu ? ise Claude'a sorar". Telefonda yazı sığmazsa ikon + kısa yazı ("Kaydet" / "Sor").
        İstersen solda küçük bir seçici: "Not | Sor" (sorma modunu `?` beklemeden açar). Sahibe 2 seçeneği ekran görüntüsüyle göster.

## E. Yeni özellikler
- [x] 16. **Otomatik yapılacaklar listesi (numaralı: 1- 2- 3-).** Claude her yeni kaydı düzenlerken görev mi diye bakar
        (`bridge/server.mjs` organize çağrısı, `ORGANIZE_SCHEMA`'ya `todo: { text, due? }`). "Yarın 10:30 diş randevusu" →
        tarihli görev. "Yapılacaklar" görünümü: numaralı liste (1., 2., 3. …), onay kutusu, sürükleyerek sıra değiştirme,
        tarihi yaklaşan üstte, geçen kırmızı; işaretlenen biter ve senkronlanır. Elle de görev eklenebilir
        (kutuda "- " ya da "1. " ile başlayan satırlar → her satır bir görev).
- [x] 17. **Akıllı listeler, otomatik.** Claude her kaydı birkaç sabit listeye koyar: "Bakılacaklar", "Beğendiklerim",
        "Önemli", "Yapılacaklar" + proje listeleri (ör. poultrycare). `lists: [...]`; sahip elle taşırsa Claude dokunmaz
        (`userLists: true`). Düğme yok: bilgisayar açık ve köprü bağlıyken arka planda kendisi yapar; telefondan
        kaydedilenler PC açılınca sıralanır. Listeler sol çubukta sayılarıyla; ad değiştirme/gizleme ayarlarda.
- [x] 18. **Renk ve öncelik.** Ayarlarda uygulamanın ana rengini seç (hazır renkler + özel; açık/koyu için `--accent`,
        `theme-color`). Kayıtlara renk etiketi (kırmızı/turuncu/sarı/yeşil/mavi/mor) ve öncelik (yüksek/normal/düşük):
        kartta/satırda renkli kenar; filtrele ve sırala; pencereden ve sağ tık / uzun basma menüsünden değiştir.
- [x] 19. **Panoda not ve çizim (Excalidraw gibi).** Boş yere çift tık → yerinde yazılan yapışkan not. Küçük araç paleti:
        seç, not, kalem, ok, dikdörtgen, yazı, silgi. Çizimler kendi kayıt türü (`type: 'draw'`, pano koordinatında SVG yolları),
        senkronlanır. Excalidraw'ı (MIT) CDN'den gömmek mi, küçük kendi katmanımız mı: telefonda da çalışan hafif olanı seç.
- [x] 20. **Listede ve galeride üzerine gelince önizleme.** Sağda büyük önizleme kartı (resim, PDF ilk sayfa, link görseli +
        açıklama, not metni) + hızlı işlemler; tıklayınca pencere açılır. Sadece masaüstü.
- [x] 21. **Tanıtım turu.** İlk açılışta (ve ayarlarda "Nasıl kullanılır?") 5–6 adım, Geri / İleri / Atla; her adım bir
        parçayı gösterir: kutu, sol çubuk, kart sürükleme, `?` ile Claude'a sorma, Google girişi.
- [x] 22. **Logo: sadece ikon.** `design/logo-source.png`tan yazısız ikon: yuvarlak köşeli not, çizgiler, turuncu kalem ve
        parıltı, koyu çerçeve. Temiz SVG (`icons/icon.svg`), `icon-192/512.png` + maskable, CSS `.mark`, manifest.
        Varsayılan ana renk turuncu olabilir.

## F. Rakip incelemesinden (Linkwarden, Karakeep, linkding, Readeck, Raindrop, mymind, Readwise Reader)
- [x] 23. Linkin okunur kopyasını sakla (köprü makale metni + ana görsel) ve okuma görünümü + metin işaretleme.
- [x] 24. Nts için MCP sunucusu (köprü: ara / ekle / listele) → Claude Code'dan "geçen hafta ne kaydettim?".
- [ ] 25. Kendi link önizleme servisimiz (Supabase Edge Function), microlink yerine: sınır yok, linkler başka yere gitmez.
       Kod hazır (`supabase/functions/link-preview`, uygulama onu kullanıyor, yoksa microlink'e düşüyor). Kalan: `supabase functions deploy link-preview --project-ref tsnlhzuhbteqgjvxobbx` (CLI + sahip girişi).
- [x] 26. "Kaydettin ama bakmadın" haftalık liste.
- [x] 27. Tarayıcı yer imlerini içe aktar (Netscape HTML dosyası).
- [x] 28. **Şifrelerim: özel kasa** (sahip, 2026-11-20). Kendi şifrelerim, kartlarım, kodlarım için ayrı bir yer: ayrı ana şifreyle açılır
       (uygulama kilidinden bağımsız), içerik cihazda şifrelenir (WebCrypto AES-GCM, PBKDF2), Supabase'e sadece şifreli gider,
       Claude'a ve aramaya hiç gitmez, listede/panoda görünmez. Kayıt: ad, kullanıcı adı, şifre, not; göster/kopyala (kopyalayınca
       30 sn sonra panoyu temizle), şifre üretici. Birkaç dakika boşta kalınca kendini kilitler.

## G. Sahibin 2. geri bildirimi (2026-11-20, ekran görüntüleri sohbette)
- [ ] 29. **Liste + sağdaki önizleme kartı ortalı dursun:** önizleme çıkınca liste ile kart birlikte ekranın ortasına gelsin
        (liste sola kaysın, kart listenin hemen yanında), kart ekranın kenarına yapışmasın.
- [ ] 30. **Logo sıfırdan:** `design/logo-source.png`a benzer (yuvarlak köşeli not, çizgiler, turuncu kalem + dalga + parıltı)
        ama elle temiz çizilmiş, dengeli kalınlıklar; küçük boyda (24px sol üst, sekme ikonu) da net okunsun. Mevcut hâli kötü.
- [ ] 31. **Şifrelerim formu kaydırmadan sığsın** (yeni kayıt penceresi): alanlar sıkı, not alanı küçük, Vazgeç/Kaydet hep görünür.
- [ ] 32. **Kayıt penceresi hataları:** resimli/dosyalı kayıtta sağ sütunda başlık özetin altında kalıp kesiliyor, "Claude anlatsın"
        alttan kesiliyor; sağ sütun düzeni bir tık karışık (renk, öncelik, görev, listeler, konu hepsi alt alta): sadeleştir,
        örn. tek "Etiketle" satırı (renk noktası + öncelik + listeler bir menüde), başlık her zaman en üstte ve tam görünür.
- [ ] 33. **Paylaş düğmesi** üst çubukta anlaşılmıyor (ok ikonu): ikon + ipucu netleşsin.
- [ ] 34. **Daha çok dosya türü önizlensin:** .md (biçimli), .txt/.toc/.log/.csv/.json/kod (metin), .docx (metin çıkar),
        .xlsx/.csv (tablo), .pptx (slayt metni); bilinmeyen türde de metin gibi okumayı dene.
- [ ] 35. **Claude tamamen kendiliğinden bağlansın, "Elle ayarla" kalksın.** PC'de zaten oto; telefonda da: köprü kendi
        Tailscale adresini ve anahtarını Google hesabına (Supabase, şifreli) yazar, telefon giriş yapınca oradan alır.
- [ ] 36. **README:** tek komutla her şey kurulsun (`curl … | bash` ya da `./install.sh`: köprü servisi, nts komutu, MCP kaydı,
        Tailscale ipucu); kısa, ekran görüntülü, iyi bir README.
- [ ] 37. **Ayarlar Hesap bölümü:** "Google ile giriş yap" ve "Şifre koy" yan yana, düğmelerde yazı ortalı.
- [ ] 38. **"- " ile yazınca hemen yapılacaklara düşsün ve hızlı olsun** (şu an yavaş hissettiriyor): anında listeye ekle, kısa
        animasyon, "Yapılacaklara eklendi · Göster" bildirimi. Claude da sahibin eklediği kayıtlarda görev görürse ekler (var, kontrol et).
- [ ] 39. **Arama sonuçları açılır menüsü yavaş ve sert:** yumuşak açılma/kapanma animasyonu, sonuçlar yazarken titremesin.
- [ ] 40. **Sol çubuk açılıp kapanabilsin** (toggle) ve daha kısa olsun (az kullanılanlar bir "Daha fazla" altına).
- [ ] 41. **Çizim paleti sol çubuktan açılsın:** sol çubuğun sağ kenarında küçük bir ">" oku; basınca çizim araçları yandan kayarak çıkar.
- [ ] 42. **Modlar:** "Okuma ve araştırma" modu (okuma görünümü, işaretlemeler, Claude'a sorma, kaynakları yan yana) ve
        "Yazma ve çizim" modu (geniş yazı alanı + pano/çizim araçları). Üstte tek tıkla geçiş.

## H. Sahibin seçtiği öneriler (2026-11-20)
- [ ] 43. **Görev hatırlatması:** saati gelen görev için PC'de köprü masaüstü bildirimi (`notify-send`), telefonda uygulama açıkken bildirim.
- [ ] 44. **Resim/PDF içinde arama:** Claude düzenlerken resimdeki ve taranmış PDF'teki yazıyı da çıkarıp `ocr` alanına koyar, arama onu da tarar.
- [ ] 45. **Çöp kutusu (30 gün):** silinen kayıtlar 30 gün "Çöp" listesinde, geri al / kalıcı sil; sonra kendiliğinden temizlenir.
- [ ] 46. **Markdown / Obsidian'a dışa aktar:** her kayıt bir `.md` (ön bilgi: tarih, konu, link) + dosyalar `attachments/`, tek zip.
- [ ] 47. **Ana ekran kısayolları:** manifest `shortcuts`: "Yeni not", "Yapılacaklar", "Şifrelerim" (ikona uzun basınca).

## I. Büyük veri: dosyalar için GitHub repoları + WhatsApp 1 GB içe aktarma (sahip, 2026-11-20)
- [ ] 48. **Depolama ayrımı:** yazılar/kayıt bilgisi Supabase'de (küçük, hızlı senkron); dosyalar (resim, video, PDF) sahibin
        **private GitHub repolarında** `nts-files-1`, dolunca (~900 MB) `nts-files-2`, `-3` … kendiliğinden açılır ve bağlanır.
        Eski GitHub senkronunda yarısı var (`checkSize` + köprüde `/new-repo`), eksik: her yeni repo için elle token.
- [ ] 49. **GitHub'ı bir kez bağla:** Ayarlar → "GitHub'ı bağla" (Supabase GitHub girişi, `repo` izni). Anahtar Google hesabına
        şifreli kaydedilir; telefon da Google ile girince otomatik alır. Repoları uygulama açar, elle hiçbir şey yok.
- [ ] 50. **WhatsApp içe aktarma köprüde (PC):** `nts import whatsapp.zip`: önce deneme raporu (kaç mesaj/foto/video, sıkıştırınca
        kaç MB), sonra içe aktarma: aynı dosyayı bir kez al (hash), fotoğrafları küçült (~1600 px), büyük videolarda seçenek
        (sakla / sadece küçük resim), parça parça yükle, kaldığı yerden devam et. Claude geceleri gruplar halinde düzenler.

**Kararlar (sahip, 2026-11-20):** dosyalar **GitHub** private repolarında (Drive değil). WhatsApp'tan **her şey görünsün**:
videolar dahil tamamı saklanır. GitHub'da tek dosya en çok 100 MB → 95 MB'tan büyük videolar `ffmpeg` ile (PC'de var) 95 MB altına
yeniden kodlanır (H.264, kalite korunarak çözünürlük/bit hızı düşürülür); orijinal PC'de `~/.local/share/nts/originals/` altında kalır.
Fotoğraflar küçültülür (~1600 px, webp/jpg) ama orijinali de istenirse aynı yerde. Repo ~900 MB olunca sıradaki repo açılır.
PC'de `gh` girişli (Mohamedattiadev) → köprü repoları `gh` ile açabilir; telefon için madde 49'daki bağlantı gerekir.

## Her sürümde
- `sw.js` içindeki `VERSION`'ı artır.
