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
- [x] 15. **Sahibin kararı (2026-11-20):** "Not" ve "Sor" modu arasında **Tab** ile geçilsin; "sonu ? ise sorar" fikri iyi
        ama çok hassas olmasın (sonu ? ile biten bir not yanlışlıkla Claude'a gitmesin): ? ile bitince otomatik sorma, sadece
        "Tab: Claude'a sor" ipucu çıksın. ✦ ve ↑ yerine anlaşılır tek düğme.
        **KESİN ÇÖZÜLECEK (sahip, 2026-11-20, ekran görüntüsü):** yazı soru olunca kutunun sağında yan yana **iki tane ✦ düğmesi**
        çıkıyor (biri koyu ✦ "Claude'a sor", öbürü turuncu ✦ gönder). İkisi aynı görünüyor, hangisi ne belli değil. Hiçbir durumda
        iki benzer düğme olmasın: tek düğme, üstünde yazı ("Kaydet" / "Claude'a sor"), telefonda ikon + kısa yazı. Ekran görüntüsüyle
        4 durumda (açık/koyu × not/soru) kontrol et. Aşağıdaki eski not bilgi için:
       **Kutudaki düğmeler kafa karıştırıyor** (`feedback-23`): ↑ ok "kaydet" diye anlaşılmıyor, ✦ (Claude) düğmesi
        ne olduğu belli değil. Çözüm önerisi: ayrı ✦ düğmesini kaldır; sağda tek, yazılı düğme: normalde "Kaydet",
        yazı soruysa (sonu `?`) "Claude'a sor" olur ve rengi değişir. Kutunun içinde ya da altında küçük ipucu:
        "Enter: kaydet · sonu ? ise Claude'a sorar". Telefonda yazı sığmazsa ikon + kısa yazı ("Kaydet" / "Sor").
        İstersen solda küçük bir seçici: "Not | Sor" (sorma modunu `?` beklemeden açar). Sahibe 2 seçeneği ekran görüntüsüyle göster.
- [x] 15a. **"Kaydet" yazısı fazla geliyor** (sahip, 2026-11-20, ekran görüntüsü): not modunda yazılı düğme yerine daha sade,
        uygun bir ikon (yuvarlak, gönder oku; ipucu "Kaydet (Enter)"). Sor modunda turuncu "✦ Sor" kalsın ki ikisi karışmasın.
- [x] 19a. **Panoda yazı aracı hatası** (sahip, 2026-11-20, ekran görüntüsü): Yazı (T) ile yazılan yazı silgiyle silinmiyor,
        büyütülüp küçültülemiyor. Silgi yazıyı da silsin; seçince köşeden tutup boyutu değişsin (ve taşınabilsin).

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
- [x] 29. **Liste + sağdaki önizleme kartı ortalı dursun:** önizleme çıkınca liste ile kart birlikte ekranın ortasına gelsin
        (liste sola kaysın, kart listenin hemen yanında), kart ekranın kenarına yapışmasın.
- [x] 29a. **Galeride önizleme kartı bozuk** (sahip, 2026-11-20, ekran görüntüsü): resim kartın içine sığmıyor, başlık ve
        açıklamanın üstüne taşıyor (yazı resmin altında kalıyor); kart galerideki kartların üstüne biniyor. Resim kendi kutusunda
        (`object-fit: contain`, en fazla ~%55 yükseklik), yazı onun altında; kart galeri kartlarını örtmesin (boş tarafa ya da yanına).
- [x] 30. **Logo sıfırdan:** `design/logo-source.png`a benzer (yuvarlak köşeli not, çizgiler, turuncu kalem + dalga + parıltı)
        ama elle temiz çizilmiş, dengeli kalınlıklar; küçük boyda (24px sol üst, sekme ikonu) da net okunsun. Mevcut hâli kötü.
- [x] 31. **Şifrelerim formu kaydırmadan sığsın** (yeni kayıt penceresi): alanlar sıkı, not alanı küçük, Vazgeç/Kaydet hep görünür.
- [x] 32. **Kayıt penceresi hataları:** resimli/dosyalı kayıtta sağ sütunda başlık özetin altında kalıp kesiliyor, "Claude anlatsın"
        alttan kesiliyor; sağ sütun düzeni bir tık karışık (renk, öncelik, görev, listeler, konu hepsi alt alta): sadeleştir,
        örn. tek "Etiketle" satırı (renk noktası + öncelik + listeler bir menüde), başlık her zaman en üstte ve tam görünür.
- [x] 33. **Paylaş düğmesi** üst çubukta anlaşılmıyor (ok ikonu): ikon + ipucu netleşsin.
- [x] 34. **Daha çok dosya türü önizlensin:** .md (biçimli), .txt/.toc/.log/.csv/.json/kod (metin), .docx (metin çıkar),
        .xlsx/.csv (tablo), .pptx (slayt metni); bilinmeyen türde de metin gibi okumayı dene.
- [x] 35. **Claude tamamen kendiliğinden bağlansın, "Elle ayarla" kalksın.** PC'de zaten oto; telefonda da: köprü kendi
        Tailscale adresini ve anahtarını Google hesabına (Supabase, şifreli) yazar, telefon giriş yapınca oradan alır.
- [x] 36. **README:** tek komutla her şey kurulsun (`curl … | bash` ya da `./install.sh`: köprü servisi, nts komutu, MCP kaydı,
        Tailscale ipucu); kısa, ekran görüntülü, iyi bir README.
- [x] 37. **Ayarlar Hesap bölümü:** "Google ile giriş yap" ve "Şifre koy" yan yana, düğmelerde yazı ortalı.
- [x] 38. **"- " ile yazınca hemen yapılacaklara düşsün ve hızlı olsun** (şu an yavaş hissettiriyor): anında listeye ekle, kısa
        animasyon, "Yapılacaklara eklendi · Göster" bildirimi. Claude da sahibin eklediği kayıtlarda görev görürse ekler (var, kontrol et).
- [x] 39. **Arama sonuçları açılır menüsü yavaş ve sert:** yumuşak açılma/kapanma animasyonu, sonuçlar yazarken titremesin.
- [x] 40. **Sol çubuk açılıp kapanabilsin** (toggle) ve daha kısa olsun (az kullanılanlar bir "Daha fazla" altına).
- [x] 41. **Çizim paleti sol çubuktan açılsın:** sol çubuğun sağ kenarında küçük bir ">" oku; basınca çizim araçları yandan kayarak çıkar.
- [x] 42. **Modlar:** "Okuma ve araştırma" modu (okuma görünümü, işaretlemeler, Claude'a sorma, kaynakları yan yana) ve
        "Yazma ve çizim" modu (geniş yazı alanı + pano/çizim araçları). Üstte tek tıkla geçiş.

## H. Sahibin seçtiği öneriler (2026-11-20)
- [x] 43. **Görev hatırlatması:** saati gelen görev için PC'de köprü masaüstü bildirimi (`notify-send`), telefonda uygulama açıkken bildirim.
- [x] 44. **Resim/PDF içinde arama:** Claude düzenlerken resimdeki ve taranmış PDF'teki yazıyı da çıkarıp `ocr` alanına koyar, arama onu da tarar.
- [x] 45. **Çöp kutusu (30 gün):** silinen kayıtlar 30 gün "Çöp" listesinde, geri al / kalıcı sil; sonra kendiliğinden temizlenir.
- [x] 46. **Markdown / Obsidian'a dışa aktar:** her kayıt bir `.md` (ön bilgi: tarih, konu, link) + dosyalar `attachments/`, tek zip.
- [x] 47. **Ana ekran kısayolları:** manifest `shortcuts`: "Yeni not", "Yapılacaklar", "Şifrelerim" (ikona uzun basınca).

## I. Büyük veri: dosyalar için GitHub repoları + WhatsApp 1 GB içe aktarma (sahip, 2026-11-20)
- [x] 48. **Depolama ayrımı:** yazılar/kayıt bilgisi Supabase'de (küçük, hızlı senkron); dosyalar (resim, video, PDF) sahibin
        **private GitHub repolarında** `nts-files-1`, dolunca (~900 MB) `nts-files-2`, `-3` … kendiliğinden açılır ve bağlanır.
        Eski GitHub senkronunda yarısı var (`checkSize` + köprüde `/new-repo`), eksik: her yeni repo için elle token.
- [x] 49. **GitHub'ı bir kez bağla:** Ayarlar → "GitHub'ı bağla" (Supabase GitHub girişi, `repo` izni). Anahtar Google hesabına
        şifreli kaydedilir; telefon da Google ile girince otomatik alır. Repoları uygulama açar, elle hiçbir şey yok.
- [x] 50. **WhatsApp içe aktarma köprüde (PC):** `nts import whatsapp.zip`: önce deneme raporu (kaç mesaj/foto/video, sıkıştırınca
        kaç MB), sonra içe aktarma: aynı dosyayı bir kez al (hash), fotoğrafları küçült (~1600 px), büyük videolarda seçenek
        (sakla / sadece küçük resim), parça parça yükle, kaldığı yerden devam et. Claude geceleri gruplar halinde düzenler.

**Kararlar (sahip, 2026-11-20):** dosyalar **GitHub** private repolarında (Drive değil). WhatsApp'tan **her şey görünsün**:
videolar dahil tamamı saklanır. GitHub'da tek dosya en çok 100 MB → 95 MB'tan büyük videolar `ffmpeg` ile (PC'de var) 95 MB altına
yeniden kodlanır (H.264, kalite korunarak çözünürlük/bit hızı düşürülür); orijinal PC'de `~/.local/share/nts/originals/` altında kalır.
Fotoğraflar küçültülür (~1600 px, webp/jpg) ama orijinali de istenirse aynı yerde. Repo ~900 MB olunca sıradaki repo açılır.
PC'de `gh` girişli (Mohamedattiadev) → köprü repoları `gh` ile açabilir; telefon için madde 49'daki bağlantı gerekir.

## J. Çok veriyle pano (2023'ten beri WhatsApp, binlerce kayıt) — sahip, 2026-11-20
Ölçüm (10.000 sahte kayıt, masaüstü): arama 10 ms, liste 0,3 sn (ilk 300 kayıt) sorunsuz; **pano 1,4–1,7 sn ve sadece
en yeni 600 kartı gösteriyor**, eskiler panoda hiç yok. Yapılacaklar:
- [x] 51. **WhatsApp mesajlarını grupla:** arka arkaya gelen mesajlar (aynı gün, aralarında ~30 dk'dan az) tek kayıt olur
        ("12 Mart 2024 · 14 mesaj"), fotoğraflar o kaydın içinde galeri. 8.000 mesaj → birkaç yüz kayıt.
- [x] 52. **İçe aktarılanlar "Arşiv"e:** WhatsApp/yer imi içe aktarımları listede, galeride ve aramada var ama panoyu doldurmaz;
        istenen kayıt panoya sürüklenir ya da "Panoya koy" ile gelir.
- [x] 53. **Pano çalışma alanı olsun, arşiv değil:** varsayılan son 30 gün + panoya koyduğun/taşıdığın kartlar; üstte zaman
        seçici (Bu hafta / Bu ay / 2024 / Tümü).
- [x] 54. **Anlamsal yakınlaştırma:** uzaklaşınca günler ay kutularına toplanır ("Mart 2024 · 312 kayıt" + küçük resim mozaiği),
        yaklaşınca günlere, sonra kartlara açılır. 2,5 yıl tek ekranda okunur kalır.
- [x] 55. **Sadece görünen kartları çiz (sanallaştırma):** ekranın dışındakiler DOM'da olmasın; panoda 10.000 kayıtta bile
        ~200 kart, açılış 0,3 sn altı. Listede de aynı (sonsuz kaydırma + aya atla takvimi).
- [x] 56. **(2026-11-21 doğrulandı: proje panosunda taşı → posBy bellekte + IndexedDB'de, yenileyince yerinde; önceki test yanlış fonksiyonu çağırıyordu.) (Büyük kısmı yapıldı 2026-11-21: pano seçici Genel/projeler/yeni pano, pano başına ayrı konum `posBy`, kayıt penceresinde "Panolar", liste/galeride yapışkan gün/ay başlıkları, galeride "Tarihe git". KALAN: proje panosunda kart taşıyınca `posBy` kaydı testte görünmedi, kontrol et + ekran görüntüsü.)** **Proje panoları:** birden fazla pano (ör. poultrycare, ev, öğrenme); Claude'un proje/konusuna göre kartları önerir.
        Liste ve galeride yıl/ay başlıkları yapışkan, "tarihe git" ile 2023'e tek tık.

## K. Hız ve düzen (araştırma: IndexedDB toplu okuma, Postgres jsonb/index, tuval culling) — 2026-11-20
Ölçüm (10.000 kayıt): IndexedDB'den yükle + indeksle 0,18 sn, arama 10 ms → veritabanı darboğaz değil; darboğaz pano (J).
Sunucuda sorgu tek: "şu tarihten beri değişenler", index'i var `(user_id, synced_at)`; filtre/arama cihazda. Kilit açıkken
veri şifreli olduğu için sunucu zaten indeksleyemez. Tam normalizasyon gerekmiyor (filtrelenen alan sunucuda yok).
- [x] 57. **Ağır alanları ayır:** `read` (okunur kopya), `content` (PDF metni), `ocr`, uzun `explain` → ayrı tablo `nts_heavy`
        (user_id, id, data/enc), sadece açılınca indirilir. `nts_items` satırları küçük kalır → telefonda ilk senkron saniyeler.
- [x] 58. **IndexedDB:** `ts` index'i; açılışta önce son 60 gün (getAll + IDBKeyRange), gerisi boşta toplu `getAll(range, 500)`
        ile; arama indeksini Web Worker'da kur (ana iş parçacığı donmasın). 50k+ kayıtta FlexSearch ya da SQLite WASM (FTS5) değerlendir.
- [x] 59. **Küçük resimler repoda:** her foto/video/PDF için ~20 KB webp önizleme `thumbs/` altında; galeri ve pano onları
        indirir, orijinal sadece açınca. Önizlemeler cihazda Cache Storage'da.
- [x] 60. (2026-11-21: "Tarihe git" içinde yıl ısı haritası, güne tıkla → o gün; liste/galeride sağ kenarda zaman kaydırıcısı) **Yıl takvimi (ısı haritası):** GitHub katkı takvimi gibi; hangi gün çok kayıt var renkle belli, güne tıkla → o gün.
        Liste/galeride yapışkan yıl/ay başlıkları + sağ kenarda zaman kaydırıcısı (2023 → bugün tek sürükleme).
- [x] 61. (2026-11-21: köprüde /summaries, gizli+senkronlu `summaries` kaydı, liste gün başlığında ve panodaki ay ızgarasında) **Gün ve ay özetleri:** Claude her gün/ay başlığına tek satır yazar ("12 Mart: poultrycare demo, 3 fatura, annemle konuşma").
- [x] 62. (2026-11-21: listenin başında "Geçen yıl bugün / N yıl önce bugün" kartı, Göster + bugün gizle; ayrı bir haftalık özet ekranı yok) **"Geçen yıl bugün"** kartı (varsa) ve haftalık özet içinde.
- [x] 63. (2026-11-21: ⋯ menüsünde "Kaynak": WhatsApp sohbetleri, Bilgisayar, Telefon, Yer imleri; yeni kayıtlar cihazını `dev` ile tutar) **Kaynağa ve kişiye göre filtre:** WhatsApp sohbet adı / kişi, yer imleri, PC, telefon; filtre çipleri.
- [x] 64. (2026-11-21: "Sabitle" düğmesi, gizli+senkronlu `saved` kaydı, sol çubukta ilk iki harf + ⋯ menüsünde "Kayıtlı aramalar") **Kaydedilmiş aramalar:** bir aramayı/filtreyi sol çubuğa sabitle ("2024 faturalar", "poultrycare linkleri").

## L. Tam UI/UX incelemesi (özellikle UX) — sahip, 2026-11-20
- [x] 65. **Baştan sona UX incelemesi**, iki kez (**(a) 2026-11-20, (b) 2026-11-21 → `design/ux-review.md`**; (b): kritik yok, 5 önemli düzeltildi): (a) 15 ve 29–42 bittikten sonra, (b) en sonda tekrar.
        - **Görev bazlı yürüyüş** (telefon 390×844 + masaüstü 1366×768, Playwright ile gerçekten tıklayarak, her adımın ekran
          görüntüsü): ilk açılış + tur, not kaydet, link kaydet, foto/dosya ekle, bul (arama), Claude'a sor, görev ekle/bitir,
          panoda taşı/çiz, kayıt penceresi, şifrelerim, ayarlar, Google girişi, içe aktarma. Her görev için tık sayısı ve takıldığı yer.
        - **3 persona** (önceki turdaki gibi): sabırsız telefon kullanıcısı, çok kayıtlı masaüstü kullanıcısı, teknolojiden
          anlamayan biri. Her biri için "nerede kafası karıştı" listesi.
        - **Kontrol listesi:** Nielsen'in 10 ilkesi; tutarlı Türkçe sözcükler (aynı şeye hep aynı ad); boş / yükleniyor / hata
          durumları; geri alınabilirlik; dokunma hedefleri ≥ 44 px; klavye ile tam kullanım + görünür odak; ekran okuyucu
          etiketleri; renk kontrastı (açık + koyu, WCAG AA); animasyonlar yumuşak ama `prefers-reduced-motion`'a uyuyor;
          hissedilen hız (her işlemde 100 ms içinde görsel tepki).
        - **Çıktı:** `design/ux-review.md`: öncelikli sorun listesi (kritik / önemli / küçük), her biri ekran görüntüsüyle;
          sonra kritik ve önemlileri düzelt, düzeltme öncesi/sonrası ekran görüntüsü.

## M. Sahibin 3. geri bildirimi (2026-11-20, ekran görüntüleri sohbette)
- [x] 66. **"Yaz" modu kalksın:** pano + soldaki kalem paleti zaten bunu yapıyor; kutunun kocaman büyümesine de gerek yok.
- [x] 67. **"Oku" modu baştan:** şu hâli kötü (resim bölmede kaydırma çubuğuyla sıkışıyor, liste + boş bölme). Okumaya daha uygun bir şey:
        sadece okunacak şeyler (makale, PDF, uzun not, belge), sakin tek sütun okuma sayfası, işaretleme, kaynaklar arası geçiş,
        "Claude'a sor" yan panelde. Üstteki "Oku / Yaz" yerine daha iyi bir giriş (ör. kayıt penceresinde ve listede "Oku" düğmesi,
        okunacaklar listesi).
- [x] 68. **"Daha fazla" (⋯) menüsü çok aşağıda açılıyor:** düğmenin hizasından yukarı doğru ya da ekranın ortasında, tamamı görünsün.
- [x] 69. **Yapılacaklar eksik hissettiriyor, büyüt:** hızlı ekleme satırı sayfanın içinde, bugün / yaklaşan / tarihsiz grupları, tarih ve
        öncelik seçme, alt görevler ya da not, tekrar eden görevler, bitenlerin düzgün görünümü, boş durum.
- [x] 70. **Kutuya yazarken panodaki kartlar yenileniyor (titriyor):** yazarken pano yeniden çizilmesin; arama sadece vurgulasın
        (sınıf değiştir), kartları baştan kurma.
- [x] 71. **Kart renk etiketi kötü görünüyor** (kırmızı seçince solda kalın, yuvarlak köşeye taşan şerit): daha zarif bir gösterim
        (ince üst çizgi ya da küçük renk noktası + hafif arka plan tonu), panoda, listede, galeride aynı.
- [x] 72. **Oku/Yaz yerine daha iyi bir şey** (66 + 67 ile birlikte): üstte sadece Pano / Liste / Galeri kalsın.
- [x] 73. **Claude çalışırken görünsün** (sahip, 2026-11-20): Claude arka planda bir şey yaparken (kayıt düzenleme, okunur kopya,
        açıklama, soru) ekranda belli olsun: küçük, sakin bir "Claude çalışıyor · 3 kayıt düzenleniyor" göstergesi, bitince kaybolur.
- [x] 74. (2026-11-21, sahip "evet": Supabase Realtime yayını üzerinden röle — mesajlar köprü anahtarıyla AES-GCM şifreli, hiçbir şey saklanmıyor, tablo gerekmiyor; köprü /relay-conf ile kanalı öğrenir; ayarlardaki tailscale satırı kalktı; install.sh Tailscale istemiyor) **Tailscale'siz telefon bağlantısı (sahibe sorulacak):** telefon soruyu/işi Supabase'e (Google hesabı) yazar, PC'deki köprü
        oradan alıp cevabı geri yazar (Realtime ile anında). Bilgisayar açıkken Tailscale gerekmez. Ayarlardaki `tailscale serve`
        komutu kalkar. Sahip "Tailscale'e ne gerek var?" diye sordu.

## N. Sahibin 4. geri bildirimi (2026-11-21)
- [x] 75. Pano araçları dağınıktı (Genel ^ / Son 30 gün): gruplar ayrıldı, küçük aşağı ok. Ayarlar ikonu tam ortalandı.
- [x] 76. (2026-11-21: sarı zeminli B uygulandı ama sahip beğenmedi → 80) **Logo hâlâ beğenilmedi** ("logoyu halletmedin daha"): sahibe ne beğenmediğini sor (2-3 seçenek çiz, ekran görüntüsüyle göster),
        sekme ikonu + sol üst `.mark` + PNG'ler + manifest birlikte değişsin; önbellek için `sw.js` VERSION artır.
- [x] 77. (2026-11-21: geniş ekranda galeride sağa sabit önizleme paneli, ızgara ona yer bırakıyor) **Galeride önizleme kartı yandaki kartın üstüne biniyor** (sahip, 2026-11-21, ekran görüntüsü): üzerine gelince açılan kart
        sağdaki kartı örttüğü için bir sonraki karta geçilemiyor. Çözüm: galeride kart boş tarafa (sağda yer yoksa solda, ikisi de yoksa
        kartın altına/üstüne) ya da sabit bir sağ panelde açılsın; fare kartın üstüne gelince kart kapanmasın ama altındaki kart da
        hover alabilsin (pointer-events), ya da liste gibi galeri+kart birlikte kaysın. Ekran görüntüsüyle 3 kart arka arkaya hover dene.
- [x] 78. (2026-11-21: tüm satırlar 18 px ikon kutusu + sağda sabit genişlikte tabular sayı, 0 gizli) **"Okuma listesi" satırı çok kötü** (⋯ menüsü, ekran görüntüsü): sayı ile yazı arasındaki boşluk/hiza, ikon, yazı tipi
        diğer satırlarla tutarsız. Menüdeki tüm satırlar aynı hizada, sayılar sağda sabit genişlikte, boş sayılar (0) gizli.
- [x] 79. (2026-11-21: Tex modülü — .toc numaralı + sayfa numaralı içindekiler, .tex bölüm/liste/tablo/dipnot/kaynak/ref, KaTeX cdnjs sadece açılınca, "Ham metin" düğmesi; kayıt penceresi + okuma sayfası) **LaTeX dosyaları biçimli görünsün** (sahip: "neden latex çevirmiyor"): .tex, .toc, .aux/.bbl gibi dosyalar ham metin
        görünüyor. .toc → başlık numarası, başlık ve sayfa numarasıyla düzgün bir içindekiler listesi (\contentsline{section}{\numberline{1}…}{5});
        .tex → bölümler/alt bölümler başlık, \textbf/\emph, itemize/enumerate, tablo ve matematik (KaTeX ya da MathJax CDN'den, sadece
        açılınca yüklensin) ile okunur görünüm; ham metne geçiş düğmesi. Okuma sayfasında da aynı.
- [x] 80. (2026-11-21: sahip B — mesaj balonu — seçti) **Logo sıfırdan** (sahip, 2026-11-21: "logo çok kötü, sıfırdan yapacaktın; neden arkası sarı, diğerlerine benzemiyor"): kısayol
        ikonlarıyla (sc-note/todo/lock: beyaz zemin, tek kalın sembol, #c2410c / #23262e / #f5a524) aynı aileden, kaynağın kopyası değil.
- [x] 81. (2026-11-21: pano geçmişi — çizgi, silgi ve yapışkan not için Ctrl+Z, Ctrl+Shift+Z / Ctrl+Y) **Çizimde Ctrl+Z çalışmıyor** (sahip, 2026-11-21): panoda kalemle çizince Ctrl+Z son çizgiyi geri alsın, Ctrl+Shift+Z / Ctrl+Y yinelesin.

## O. Otomatik ve akıllı senkron (sahip, 2026-11-21; Fluent365'teki "telefonda 3/6, bilgisayarda 1/6" hatasından ders)
Kural: senkron tamamen otomatik; "hangisi kalsın" diye asla sorulmaz, uygulama kendisi akıllıca karar verir
(skill `supabase-google-auth` §5). Nts zaten kayıt bazında birleştiriyor ve Realtime ile anında çekiyor; kalan açıklar:
- [x] 82. (2026-11-21: gizlenince/pagehide `Cloud.flush()`, keepalive istekler) **Çıkarken hemen gönder:** `visibilitychange` (hidden) ve `pagehide` olunca bekleyen değişiklik (`Cloud.schedule` 1,5 sn
        zamanlayıcısı) beklemeden gönderilsin. Telefon arka planda zamanlayıcıyı durdurur; son yazılan not diğer cihaza ancak telefon
        tekrar açılınca gider. Şu an sadece geri dönünce (`visible`) senkron var (app.js ~3614).
- [x] 83. (2026-11-21: `focus` → en çok 10 sn'de bir çek; `Live.check()` ölü soketi yeniden bağlar) **Pencere odağında çek:** masaüstünde sekme görünür kalıp başka pencereden dönünce (`focus`) de çek (10 sn aralıkla sınırla);
        Realtime bağlantısı kopmuşsa (uyku, ağ değişimi) yeniden bağlansın.
- [x] 84. (2026-11-21: `sb-base` ile düzenlemenin başladığı sürüm; gerçek çakışmada `mergeItem` alan bazında birleştirir, kaybeden `sb-lost`'ta) **Aynı kayıt iki cihazda değiştiyse soru yok, akıllı birleştir:** şu an kayıt bazında daha yeni olan kazanıyor olabilir
        (`GH.merge`, kontrol et). Alan bazında birleştir: metin daha yeni olan, etiketler/projeler/panolar birleşim, görev bitti
        bilgisi "bitti" kazanır, silinen kayıt (mezar taşı) daha yeniyse silinmiş kalır. Kaybolan taraf `Snapshot`'ta kalsın.
- [x] 85. (2026-11-21: Playwright iki profil + sahte Supabase + routeWebSocket; 4 senaryo geçti) **İki cihaz testi:** telefonda not yaz ve uygulamayı hemen kapat → bilgisayarda (aynı hesap) not görünür; iki cihazda
        çevrimdışı aynı kaydı değiştir → ikisi de birleşir, soru çıkmaz. Playwright ile iki profil + sahte Supabase (Gym'in
        `tools/test/cloud.mjs` örneği).

## P. Sahibin 5. geri bildirimi (2026-11-21, ekran görüntüleri sohbette)
- [x] 86. (2026-11-21: panoda kutu araçların soluna kayıp/daralıyor, 900–1920 px çakışma 0; asıl bozuk düğmeler: aynı görünüme tekrar geçince kamera boş kalıyordu → − / % / + hata veriyordu, düzeldi; sığdır, düzenle, pano/zaman seçici denendi) **Pano alt araçları kutuyla üst üste biniyor + bazıları çalışmıyor:** 1440 px'in altında (1366'da 9 px, 1280'de 52 px, 1100'de
        142 px) `#boardTools` (− % + · Genel · Son 30 gün · sığdır · düzenle) kutunun gönder düğmesinin üstüne biniyor. Dar ekranda
        araçlar kutunun üstüne/yanına çekilsin ya da kutu kısalsın; hiçbir genişlikte çakışma olmasın (1024–1920 tara). Sonra her düğmeyi
        tek tek dene (yakınlaştır/uzaklaştır, % tıklayınca %100, pano seçici, zaman seçici, sığdır, düzenle) ve çalışmayanı düzelt.
- [x] 87. (2026-11-21: ilk açılışta bir kez seçim penceresi (sonra tur), Ayarlar → Yapay zekâ → "Kullanılan"; kutu, ipucu, Tab, tur, ayarlar, "anlat", çalışıyor rozeti seçilen ada göre Türkçe ekiyle (Codex'e / Gemini'ye); köprü `conf.ai` + `/ai-conf` (+ röle), /health `have` ile kurulu olanları söyler, kurulu değilse kibar hata; codex exec gerçekten denendi (8 sn, doğru cevap), systemd PATH'ine ~/.npm-global/bin eklendi) **İlk açılışta yapay zekâ seçimi:** kullanıcı ilk girişte Claude / Codex / Gemini (/ başka) seçsin; kutunun yazısı, "X'e sor"
        çipi, Tab ipucu, ayarlar ve tur metinleri seçilene göre değişsin; Ayarlar'dan değiştirilebilsin. Köprü seçilen CLI'yi çalıştırsın
        (`claude -p`, `codex exec`, `gemini -p`; kurulu değilse kibarca söyle). Varsayılan Claude; mevcut kullanıcıya soru bir kez çıksın.
- [x] 88. (2026-11-21: sıralı: çubuk gider → palet bir an kalır, kayar → yalnız ">" sekmesi; sekmede kalem yok; ">" ikisini geri getirir) **Sol çubuk kapanınca:** şu an [> | kalem] kutusu paletin yanında kalıyor (çirkin). Kapatınca önce o kutu kalksın ve yalnız palet
        kalsın, sonra palet de kayıp yalnız küçük ">" sekmesi kalsın (yumuşak, sıralı animasyon); ">" ile hepsi geri gelsin.
- [x] 89. (2026-11-21: satır içi SVG, koyu temada koyu zemin, çizgiler + nokta accent rengi; logo, görünüm seçici, ayarlar masaüstünde hepsi 36 px aynı hizada) **Logo (.mark):** koyu temada arkası beyaz kalıyor → koyu olsun; diğer üst öğelere göre çok küçük ve hizasız → onlarla aynı boy
        (36–40 px) ve aynı dikey hizada; içindeki turuncu/sarı ana renge (accent) göre değişsin (inline SVG, CSS değişkenleri).
- [x] 90. (2026-11-21: Ink.end() canlı path'i yerinde kalıcıya çeviriyor, Ink.render() id ile fark alıyor → çizerken hiçbir path silinmiyor (Playwright: 3 çizgi, 0 silme); görünüm değişince yumuşak giriş, filtre menüsü kayarak kapanır, panoya yeni kart büyüyerek gelir, silgiyle silinen not küçülerek gider; reduced-motion kapatır) **Çizimde 0,1 sn yanıp sönme + genel akıcılık:** kalemle çizgiyi bitirince canlı çizgi silinip pano yeniden çizildiği için
        kısa bir titreme var. Bitince çizgi yerinde kalsın (canlı path kalıcıya dönüşsün, `#ink` baştan kurulmasın). Genel olarak yumuşak
        geçişler ekle: görünüm değişimi, panel/menü aç-kapa, kart ekleme/silme, sol çubuk; `prefers-reduced-motion`'a uy, 60 fps.

- [x] 88b. (2026-11-21: tek adım 150 ms; çubuk gider, palet panoda kalıp çubuğun yerine kayar, ">" tam "<"nin yerinde (Rail.place → --rt-top), palet kapalıysa yalnız ">") **88 düzeltmesi** (sahip, 2026-11-21): "tam kapatmak değil" — kapanınca sol filtre çubuğu gider, çizim paleti panoda kalır,
        "<" düğmesinin yerinde (paletin üstünde) küçük ">" durur (aynı yere tıkla: kapat/aç); palet kapalıysa yalnız ">". Animasyon ~150 ms, şu an çok yavaş.

- [x] 88c. (2026-11-21: çubuk kapalı + palet açık → ">" paletin sağ kenarından çıkan kulakçık (aynı zemin, ara çizgi yok, üst köşede); palet kapalıysa ">" sol kenarda tek başına; Rail.place → --rt-left/--rt-top + .ear; masaüstü açık/koyu) **">" sekmesi paletin SAĞINDAN çıksın, üstünde değil** (sahip, ekran görüntüsü 2026-11-21): çubuk kapalıyken ">" şu an paletin
        üstünde ayrı bir kutu gibi duruyor. Paletin sağ kenarına yapışık, sanki paletten dışarı çıkan küçük bir kulakçık/sekme olsun
        (paletle aynı zemin + kenarlık, dikeyde paletin ortasında veya üst köşesinde, aradaki çizgi yok). Palet kapalıysa ">" yine sol
        kenarda tek başına. Masaüstü açık + koyu, ekran görüntüsü.

## R. Sahibin 6. geri bildirimi (2026-11-21)
- [x] 91. (2026-11-21: kanıtlandı — kayıtta pos silinmiş ama kart 3000 px'te kalıyordu: render() `S.items` kimliği aynı diye erken çıkıyordu; tidy ve Geri al artık diziyi yeniliyor; ana pano + proje panosu (posBy) + Geri al Playwright'ta denendi) **"Düzenle" (katman düğmesi) "Günlere göre dizildi" diyor ama hiçbir şey dizilmiyor** (ekran görüntüsü: "Dün" etiketli taşınmış
        kart Bugün sütununda kaldı). Şüphe: `Board.tidy()` → `setPos(i, undefined)` + `savePos` kayıtları yerinde değiştiriyor, `S.items`
        dizisi yenilenmiyor → `visible()` önbelleği / `Board._key` / `Board.M` eski kalıyor (kural: items dizisi hep yenilenir, yerinde
        değiştirilmez). Proje panosunda `posBy` için de aynı. Taşınmış kart + Düzenle → kart kendi günüyle aynı sütuna dönmeli; Playwright ile kanıtla.
- [x] 92. (2026-11-21: her gün tek yumuşak bant (dönüşümlü ton), Bugün ana renkte bant + başlık, "Dün · 20 Kasım Cuma", iç sütun aralığı 12 px / günler arası 76 px; uzak görünümde bant kapalı) **Bugün ile dün yan yana ayırt edilmiyor:** gün sütunlarına hafif zemin bandı (günler dönüşümlü ton) ya da ince dikey ayırıcı,
        "Bugün" ana renkle vurgulu, başlıkta tarih + hafta günü ("Dün · 20 Kasım Cuma"), bir günün alt sütunları (4'erli) tek blok gibi dursun
        (aradaki boşluk küçük, günler arası boşluk büyük). Masaüstü + telefon, açık + koyu.
        + **92b [x] (2026-11-21: başlık hiç kesilmez - sığarsa tam, sığmazsa kısa "20 Kas 3", o da sığmazsa bandın üstünde dikey; uzakta bantlar kalır, günler arası en az 1 ekran px çizgi; %15–%200 tarandı)** (sahip, ekran görüntüsü) uzaklaşınca başlık "BU… 3" diye kesiliyor: gün başlığı hiçbir yakınlıkta kesilmesin (ellipsis yok),
        uzaktayken ters ölçekle (`--hs`) okunur boyda kalsın, sütundan taşarsa yanındaki sütunun üstüne değil kendi bandının içinde
        kısalmadan dursun (gerekirse "20 Kas" gibi kısa biçim + sayı). %10–%200 arası tara, ekran görüntüsü.
        + (sahip, uzak görünüm ekran görüntüsü) günler arasında ayrım görünmüyor: her gün kendi zemin bandında (dönüşümlü ton, Bugün accent
        tonlu) + aralarında ince dikey çizgi; ayrım HER yakınlıkta görünür (uzakta kaybolmaz, çizgi ≥ 1 px ekranda).
- [ ] 93. **Yapay zekâya pano hazırlat:** kutuya "poultrycare için pano hazırla" / "yazılımla ilgili ipuçlarını topla" yazınca seçili yapay zekâ
        (87) tüm kayıtlardan ilgilileri seçer, yeni proje panosu açar (`boards` + `posBy`), kartları başlıklı gruplara dizer (ör. Belgeler /
        Linkler / Görevler / Fikirler / Kişiler), en üste kısa özet yapışkan notu koyar; tek tıkla geri alınır. Köprüde yeni uç (`/board-plan`,
        sadece id + grup döner, metin göndermez fazlası). Kutudaki "Claude'a sor" cevabında "Pano yap" düğmesi de olsun.
- [ ] 94. **Daha native his + hız** (sahip: "daha native, daha hızlı, daha efektli olsun"):
        (a) görünüm geçişleri View Transitions API ile (Pano↔Liste↔Galeri, kayıt penceresi tıklanan karttan büyüyerek açılır/kapanır);
        (b) dokunma geri bildirimi: `:active` hafif küçülme, telefonda kısa titreşim (kaydet, görev bitti, sil), yalnız transform/opacity animasyonu;
        ✓ (a)+(b) 2026-11-21: görünüm değişimi View Transition (yalnız #main solar/belirir, üst öğeler kıpırdamaz; destek yoksa eski .vin); kayıt penceresi tıklanan karttan büyür, ×/Esc/dışına tık/Sil ile karta küçülerek döner (kart görünmüyorsa aşağı kayar) — `Morph`; :active küçülme (düğme, çip, satır, galeri kutusu); telefonda titreşim: kaydet 8 ms, görev bitti 12 ms, sil 14 ms (`haptic`); reduced-motion hepsini kapatır.
        (c) kalem: `getCoalescedEvents()` + `requestAnimationFrame` ile pürüzsüz çizgi, uzun çizimde canvas katmanı;
        (d) resimler `decode()` sonrası yumuşak belirsin, iskelet yükleme her yerde;
        ✓ (c)+(d) 2026-11-21: kalem getCoalescedEvents ile aradaki tüm noktaları alır, path kare başına bir kez çizilir (rAF), pano dikdörtgeni çizim başına bir kez ölçülür; küçük resimler hazırlanırken parıltılı iskelet (.loading), decode() bitince tek yumuşak geçiş; Peek büyük resmi de decode sonrası belirir. Canvas katmanı gerekmedi (SVG + rAF akıcı); uzun çizimde yavaşlık görülürse eklenir.
        (e) açılış: ilk ekranda gerekmeyen modülleri (LaTeX, şifreler, içe aktarma, okuma, KaTeX) sonradan yükle, kabuk SW'den anında;
            hedef telefonda ilk ekran < 300 ms, her dokunuşa < 100 ms tepki (Playwright ile ölç, bench.log'a yaz);
        (f) PWA: uygulama ikonunda bekleyen görev sayısı (Badging API), masaüstünde `display_override: window-controls-overlay`.
- [ ] 95. **Öneriler (sahip onayladı 2026-11-21, ayrı ayrı yap: 95a–95g):** sesli not (basılı tut → kaydet → yapay zekâ yazıya döker); sabah özeti bildirimi
        (dün kaydettiklerin + bugünkü görevler); okuma listesinde "3 gün sonra tekrar göster"; ekran görüntüsünde tarih görünce "göreve çevireyim mi";
        Ctrl+K komut paleti (her şeye tek yerden); ~~salt okunur paylaşılabilir pano linki~~ (95f KALDIRILDI, sahip); tarayıcı eklentisi (sağ tık → Nts'e gönder);
        gerçek native gerekirse aynı kodla Tauri (masaüstü) / Capacitor (telefon) sarmalayıcı.
        95a sesli not · 95b sabah özeti bildirimi · 95c okuma listesinde "3 gün sonra tekrar" · 95d resimde tarih → "göreve çevir?"
        · 95e Ctrl+K komut paleti · 95f salt okunur paylaşılan pano linki · 95g tarayıcı eklentisi (sağ tık → Nts'e gönder).
- [ ] 96. **Telefonda metni seçince ⋮ menüsünde "Nts'e kaydet"** (sahip): PWA o menüye giremez (Android'de sadece ACTION_PROCESS_TEXT
        alan native uygulama). Çözüm: Bubblewrap ile TWA Android paketi (aynı site, tam ekran) + içinde PROCESS_TEXT alan küçük bir
        aktivite → seçili metni `https://mohamedattiadev.github.io/nts/?do=new&text=…` ile açar, uygulama kaydeder ve "Kaydedildi" der.
        `assetlinks.json` (`.well-known`, Pages'te), imzalı APK `docs/` değil Releases'e; sahibe kurulum: APK'yı telefona at, kur.
        Bu arada "Paylaş → Nts" yolunun (share_target) Android'de metin için çalıştığını da doğrula. iPhone'da seçim menüsüne ekleme yok.

## S. Sahibin 7. geri bildirimi (2026-11-21)
- [x] 97. (2026-11-21: Ayarlar → Gelişmiş en altta kırmızı satır → kendi penceremiz: "Önce yedek indir", Sadece bu cihazdan / Her yerden (girişsizken kapalı), "SİL" yazınca düğme açılır; her yerden: nts-files klasörleri tek tek listelenip toplu silinir, nts_heavy (yoksa geçer), nts_items; sonra oturum kapanır, IndexedDB + Cache Storage + localStorage temizlenir, yeniden açılır; bulut silme hata verirse cihaza dokunulmaz; GitHub repoları silinmez, linki gösterilir; sahte Supabase ile 4 yapılandırmada denendi) **Tüm verileri sil** (Ayarlar → Gelişmiş, en altta kırmızı): onay penceresi (tarayıcı confirm değil, kendi penceremiz), "SİL" yazınca
        etkin olan düğme. İki seçenek: "Sadece bu cihazdan" (IndexedDB, Cache Storage, localStorage; Google oturumu kapanır) ve "Her yerden"
        (bu cihaz + Supabase'deki nts_items/nts_heavy satırları ve nts-files depolaması). GitHub repoları silinmez (söyle, linkini göster).
        Önce otomatik yedek dosyası indirmeyi öner. Sahte Supabase ile test et, gerçek veriye dokunma.
- [x] 98. (2026-11-21: telefonda %100 yakınlık, en yeni gün sağda, günler yana kayar (az kayıt sığarsa en az %70); palet yalnız yeni kalem düğmesiyle açılır (kalem seçili gelir, tekrar basınca kapanır, Seç'e döner); araçlar tek satır: kalem · pano · zaman · sığdır (Düzenle telefonda gizli); kutuyla çakışma yok; 390×844 + 360×740 açık/koyu) **Telefonda pano görünümü çok kötü** (ekran görüntüsü 390 px): kartlar okunmayacak kadar küçük, yatay çizim paleti ve pano araçları
        içeriğin üstünde, kutu ile araçlar sıkışık. Telefonda: varsayılan yakınlık en az %70 ve en yeni günden başla, çizim paleti sadece kalem
        düğmesine basınca açılsın (tek yüzen düğme), pano araçları tek satırda sade (pano seçici + zaman + sığdır), kutuyla çakışma yok,
        gün sütunları tam genişlik (yatay kaydır). 390×844 ve 360×740, açık + koyu.
- [ ] 99. **Görünümler birbirine benzemesin + yeni görünümler** (sahip: "galeri ve liste birbirine benziyor, başka view var mı?"):
        (a) Galeri gerçekten görsel olsun: yazısız büyük küçük resimler (masonry, oranları korunan), başlık sadece üzerine gelince; metin kaydı yok;
        (b) (sahip: şimdilik kalsın) Takvim görünümü: ay ızgarası, her günde kayıt sayısı + 2-3 küçük resim/başlık, güne tıkla → o gün (ısı haritasının büyük hali);
        (c) ~~Konular görünümü~~ KALDIRILDI (sahip: gerek yok; yerine 93 yapay zekâ panoları): proje/konu başına sütun (kanban gibi), kartı sürükleyip başka konuya taşı (zaten var olan renderTopics'ten).
        Üstteki görünüm seçici: Pano · Liste · Galeri · Takvim · Konular (telefonda simge, sığmazsa "⋯").

- [ ] 100. **(KÜÇÜLTÜLDÜ, sahip: 3 sütun yok) Yapılacaklar basit liste kalır, isteyen göreve küçük "Yapılıyor" etiketi koyar (listede üstte, ince işaret); `todo.doing`, birleştirmede done > doing.** Eski metin: Yapılacak · Yapılıyor · Bitti (sahip onayladı). Masaüstü: yan yana sütunlar, kartı sürükle
        (klavyeyle de taşınır). Telefon: üstte 3 sekme + kartı yana kaydırınca sonraki sütuna. Bugün/yaklaşan/tarihsiz grupları, tarih,
        öncelik, tekrar "Yapılacak" içinde aynen kalır. "Bitti" son 7 gün, gerisi "Eskiler" altında katlı. Yeni alan `todo.doing` (geriye uyumlu:
        done → Bitti, diğerleri → Yapılacak); senkron birleştirmede (mergeItem) done > doing > yapılacak. Bildirimler bozulmasın.

- [x] 101. (2026-11-22: phone-audit.mjs 8 yapılandırma × 22 ekran → 0; geri tuşu menü/cevapta uygulamadan çıkmıyor, okuma sayfası çift geri düzeldi, telefonda her düğme 44 px; tablo design/ux-review.md "(c)") **Telefon önce: tüm uygulama telefonda kusursuz** (sahip, 2026-11-21: "phone çok önemli, conflict / üst üste / boş / görünmeyen /
        yarım kalan olmasın, açılan sekme ve kapanması kolay olsun"). Önce otomatik telefon denetimi yaz (`phone-audit.mjs`, skill'e ekle):
        360×740, 375×667 (iPhone SE), 390×844, 412×915 × açık/koyu; ekranlar: pano, liste, galeri, takvim/konular (varsa), yapılacaklar,
        kayıt penceresi (not/link/resim/PDF/LaTeX), okuma sayfası, ⋯ menü, Tarihe git, ayarlar (tüm alt sayfalar), şifrelerim, çöp kutusu,
        Claude cevabı, arama sonuçları, bildirim (toast) açıkken, klavye açıkken (visualViewport küçült).
        Ölçülecekler: (1) üst üste binme: görünür sabit/yüzen öğelerin kesişimi + tıklanabilir öğenin üstünü başka öğe kapatıyor mu
        (`elementFromPoint` merkezde kendisi mi); (2) taşma/kesilme: öğe ekran dışında ya da `scrollWidth > clientWidth` (yatay kaydırma yok),
        yazı ellipsis olmadan kesiliyor mu; (3) boş görünen alan: içeriksiz kutular, boş durum metni var mı; (4) dokunma hedefi ≥ 44 px ve
        aralarında ≥ 8 px; (5) güvenli alan: çentik/alt çubuk; (6) her pencere/menü/sayfa: açılır ve Android geri tuşu, dışına dokunma, aşağı
        kaydırma, × ile kapanır, kapanınca arkada artık iz/kilitli kaydırma kalmaz. Sonuç tablosunu `design/ux-review.md`'ye "(c) telefon"
        olarak yaz, hepsini 0'a indir, öncesi/sonrası ekran görüntüsü. Bundan sonra her arayüz işinde phone-audit 0 hata olmadan "bitti" deme.

- [x] 102. **Hareket kuralları: tamamen akıcı, zıplama yok** (sahip): açılan her şey geldiği yere geri döner (kayıt penceresi tıklanan karta
        küçülür, menü düğmesine toplanır, panel kenarına kayar); öğe eklenince/silinince/sıralama değişince diğerleri yeni yerine FLIP ile
        kayar, hiçbir şey birden yukarı/aşağı zıplamaz (yükleme, resim gelince, bildirim çıkınca da). Süre 150–250 ms, tek easing, sadece
        transform/opacity, 60 fps; `prefers-reduced-motion` kapalı. Doğrulama: Playwright'ta `PerformanceObserver('layout-shift')` her
        ekranda ~0 (beklenmeyen kayma), açıp kapama videosu/kare dizisiyle bak; telefonda da (101'in denetimine ekle).
        YAPILDI (2026-11-23, A): Flip (app.js) — liste/galeri/görevler aynı görünümde yeniden çizilince kartlar eski yerinden 200 ms
        kayar, yeniler 180 ms belirir (yalnız transform/opacity, ekranda ≤150 kart, reduced-motion'da kapalı, görünüm değişiminde 94a).
        Resim önizlemesi: oran (AR) küçük resimden bilinir → pencere ilk karede doğru boyda; resim çözülünce growTo ile yumuşak büyür.
        Morph.revive: kapanırken tekrar açılan pencereyi eski kapanış kapatmıyordu (hata) → düzeldi. Ölçüm: layout-shift masaüstü
        0.0013, telefon 0; ekle/sil sonrası 6–7 kart FLIP ile kayıyor (4 yapılandırma, konsol hatası yok).

- [x] 103. (2026-11-23, B hattı: (b) yapıldı, aşağıdaki nota bak) **Arama listesi + tek kutu modları** (sahip, ekran görüntüleri):
        (a) [x] (2026-11-21: setView ve her pencere açılışında (Back.open) liste kapanır, yazı kalır; kutuya tıklayınca/yazınca geri gelir; liste açıkken .peek gizli) Görünüm/sayfa değişince (Pano/Liste/Galeri, yapılacaklar, ayarlar, kayıt penceresi) açık arama sonuç listesi kapansın; yazı kutuda
            kalabilir, yeni sayfada sadece süzme/vurgu. Arama listesi açıkken galeri önizleme paneli (ve başka yüzen kartlar) gizlensin, üst üste binmesin.
        (b) [x] (2026-11-23, B hattı: kutunun solunda ✎ Not · 🔍 Ara · ✦ Sor seçici (masaüstünde üçü görünür, seçilinin adı yazılı; telefonda tek düğme,
            dokununca kutunun üstünde küçük menü), Tab/Shift+Tab döner, son mod localStorage hn-mode'da; boş Not kutusuna "/" → Ara, "?" → Sor;
            sayfada "/" kısayolu Ara'ya geçer. Not: sonuç listesi açılmaz, yalnız "N benzer kayıt" çipi (dokununca Ara). Ara CANLI: her harfte
            sayfa süzülür ama yeniden çizilmez (LiveQ: eşleşmeyen satır/kutucuk .q-out sınıfıyla gider, boşalan gün/ay başlığı da; kalanlar FLIP ile
            kayar; panoda eşleşmeyenler solar), yalnız sayfada olmayan bir eşleşme gerekirse bir kez çizilir; kaydırma ve resimler yerinde kalır.
            Ara penceresi (130a): başta "fatura · 111 kayıt ×", tür çipleri sayılı (Hepsi · Resim · Not · Link · Dosya), en sık etiketler
            ("# logo 14", dokununca daraltır), altta ızgara (resim büyük, not küçük belge kartı, kutucuklar id ile korunur, yeni yerine kayar),
            ↑↓ gez, Enter ilk/seçili sonucu açar, Esc temizler, "Aramayı sabitle" + "Sayfada gör". Tab = etikete daraltma yapılmadı (Tab mod değiştirir).
            Ölçüm: yük altındaki makinede LiveQ 11–41 ms; content-visibility gruplarında satır ölçümü yalnız ekrandaki gruplarda.) Tek kutuda kaydet / ara / sor karışık (sahip: "oturtamadık"). Kutunun solunda her zaman görünen mod seçici: ✎ Not · 🔍 Ara · ✦ Sor
            (Sor = seçili yapay zekâ, 87). Yazı (placeholder), gönder simgesi ve Enter moda göre: Not = kaydet; Ara = sonuçlar açık, Enter ilk sonucu
            açar, "hepsini göster"; Sor = yapay zekâya sor. Not modunda sonuç listesi açılmaz, sadece "4 benzer kayıt" çipi (tekrar kaydetmeyi önler).
            Kısayol: Tab modlar arasında döner, "/" Ara, başta "?" Sor. Telefonda dokunarak seçilir, son mod hatırlanır. Turu ve ipuçlarını güncelle.
            Ara modu CANLI (sahip): Enter beklemeden her harfte (~100 ms) süzer; sayfa da süzülür (liste/galeri sadece eşleşenler, panoda
            eşleşmeyenler solar), kutunun üstünde "poul · 4 kayıt ×" çipi; harf silince sonuçlar geri gelir. Enter = ilk sonucu aç, ↑↓ gez,
            Esc temizle. 10k kayıtta da akıcı (bench.mjs ile ölç, tuş başına < 50 ms).
            TİTREME YOK (sahip): yazarken liste/galeri/pano baştan çizilmez (innerHTML yok); eşleşmeyenler sınıfla solup gizlenir, kalanlar
            FLIP ile kayarak toplanır, kaydırma yerinde kalır, resimler yeniden yüklenmez; harf silince geri gelenler de yumuşak.

- [ ] 104. **Akıllı arama** (sahip: "akıllı search olmalı, ona özel şeyler düşünülmeli"; 103b'den sonra):
        (a) doğal dil süzgeçleri: "geçen hafta / mart 2024 / dün" → tarih, "pdf / foto / link / video" → tür, "whatsapp annem / telefon" → kaynak;
            kutunun üstünde çip, × ile kalkar; (b) yazım hatası + Türkçe harf toleransı ("faturra", "sut", "gorev");
        (c) her yerde ara: OCR, PDF metni, okunur kopya, LaTeX, WhatsApp mesajları; sonuçta eşleşen yer vurgulu kısa alıntı;
        (d) anlamsal arama: cihazda küçük çok dilli gömme modeli (transformers.js, ~25 MB, bir kez iner, veri dışarı gitmez; Worker'da,
            vektörler IndexedDB'de) → "fatura" "makbuz/invoice" bulur; az sonuçta "Yapay zekâ ile ara" düğmesi (seçili yapay zekâ);
        (e) sıralama: başlıkta tam eşleşme > yıldızlı > sık açılan > yeni; sonuçlar türe göre gruplu + sayılı;
        (f) kutu boşken: son aramalar, kayıtlı aramalar, sık konular; (g) ifadeler: #etiket, proje:ad, "tam ifade", -hariç.
        10k kayıtta tuş başına < 50 ms (anlamsal kısım arka planda, sonuçlar gelince yumuşakça eklenir). Telefonda da.
        **104d–g ÇOK ÖNEMLİ (sahip): tam dikkat, yapılabilecek her şey.** Arama dili (tek ayrıştırıcı, testli):
        regex `/…/i` (hatalıysa çökmez, uyarır; ReDoS'a karşı zaman/uzunluk sınırı), joker `poul*` `f?tura`, mantık `VEYA`/`|`, `-hariç`,
        parantez, "tam ifade"; alanlar başlık: metin: url:/site: dosya: uzantı: etiket:/# proje: sohbet: kaynak:; tarih: 2024-03 / 2024-01..2024-03 /
        >2025-06 / son:7g / dün / geçen hafta; is:yıldızlı/görev/bitti/bakılmadı/silindi, has:resim/not/link/pdf; boyut:>5mb; sırala:yeni/eski/alaka.
        Yazarken otomatik tamamlama (etiket: → etiketler, proje: → projeler, sohbet: → sohbetler); kutunun yanında "?" sözdizimi kartı (örnekli).
        Anlamsal arama + "Yapay zekâ ile ara". Kayıtlı aramalar (64) bu dili saklar. Birim testleri: ayrıştırıcı için ≥ 60 örnek (node ile, tools/test/).
        **3 DİL (sahip): Arapça + İngilizce + Türkçe yazabilmeli ve arayabilmeli.** Giriş alanları ve gösterilen metin `dir="auto"` (Arapça
        sağdan sola, karışık satırda bidi bozulmaz); Arapça normalleştirme: hareke + tatvil yok say, أ إ آ→ا, ة→ه, ى→ي, Arapça/Farsça rakam→0-9;
        Türkçe İ/ı büyük-küçük doğru, şğüöç yazılmasa da bul; arama dili anahtar sözcükleri üç dilde (tarih:/date:/تاريخ:, etiket:/tag:/وسم:,
        is:yıldızlı/is:starred, VEYA/OR/أو, dün/yesterday/أمس …); anlamsal model üç dili birlikte bilen çok dilli model (fatura ↔ invoice ↔ فاتورة).
        Birim testlerinde her dilden örnek. Arayüz yazıları Türkçe kalır.
        [x] 104d (2026-11-23, A hattı): query.js = tek ayrıştırıcı (sözcük, "ifade", /regex/ ReDoS korumalı, joker, VEYA/OR/أو/|, -hariç,
            parantez, alanlar tr/en/ar, tarih/son:/is:/has:/boyut:/tür:/renk:/sırala:); sözdizimi yoksa eski hızlı bulanık arama. Bozuk parça
            çökertmez, metin olarak aranır + 1,2 sn sonra uyarı. norm() Arapça normalleştirme + Arapça sözcük bölme; kutu dir="auto".
            tools/test/query.test.mjs: 156 kontrol geçiyor, 10k kayıtta ~17 ms. Eksik: is:silindi çöpü göstermez (görünüm silinmişleri süzüyor).
        [x] 104a+b+c (2026-11-23, B hattı): (a) Ara modunda sözdizimsiz cümle → çipler (query.js natural(): dün/bugün/geçen hafta/bu ay/geçen yıl,
            "mart 2024"/"2024 mart"/"march 2024"/"مارس 2024", "son 7 gün"/"last 2 weeks"/"آخر 7 أيام", pdf/foto/resim/link/video/ses/notlar, whatsapp/telefon/
            bilgisayar/yer imleri, "whatsapp annem" → sohbet; Türkçe ekler ("telefondan", "fotoğraflar", "mart'ta")); çipler sonuç penceresinin başında,
            × tam o sözcükleri kutudan siler; birden çok tür/kaynak = VEYA. (b) near(): Damerau (takas dahil), 8+ harfte 2 hata, önek ±1 ("faturra" →
            faturası); sözcük çifti başına önbellek → 10k kayıtta 3–8 ms. (c) okunur kopya (read.blocks) ve metin dosyalarının içi (LaTeX/md/txt/kod;
            Inside: ilk 20k karakter, cihazdaki dosyadan, yapay zekâsız) aranır; başlıkta görünmeyen eşleşme için kısa vurgulu alıntı + nereden geldiği
            ("Okunur kopya", "PDF", "Resimdeki yazı", "Dosyanın içi"); resim kutusu OCR alıntısını gösterir. 219 birim testi.
            Eksik: yazım hatalı sözcük vurgulanmıyor (bulunuyor ama <mark> yok); ay adı yalnız yılla birlikte çip olur ("mart" tek başına sözcük kalır).
        [x] 104e (2026-11-23, B hattı): otomatik tamamlama: kutunun sonundaki "etiket:fa" / "#fa" / "proje:" / "sohbet:an" / is: has: tür: kaynak:
            renk: sırala: son: tarih: (tr/en/ar alan adları, query.js field()) → sonuç penceresinin başında değer satırı (etiket/proje/sohbet sayılı, en çok
            kullanılan önce, önce baştan sonra içinden eşleşen); Tab (masaüstü) ya da dokunuş tamamlar (boşluklu değer tırnaklı). "?" düğmesi: 16 örnekli
            sözdizimi kartı, örneğe dokununca kutuya girer. Sıralama: başlık = aranan > başlık onunla başlar > başlıkta geçer, + yıldızlı (puanda),
            + bu cihazda sık açılan (localStorage nts-opens, eşitlenmez), sonra yeni; sırala:yeni/eski'de dokunulmaz. Türe göre sayılar: mevcut tür çipleri
            (Hepsi/Resim/Not/Link/Dosya + sayı) — ayrı başlıklı gruplar YAPILMADI (ızgara + FLIP bozulur). Boş Ara kutusu (odakta): Son aramalar
            (sonuç açılınca ya da 2,5 sn sonuçla durunca, 8 tane, Temizle), Kayıtlı aramalar, Sık konular (en çok etiket + proje); hiçbiri yoksa sözdizimi kartı.
            phone-audit (arama, arama-bos, arama-dil) 0 hata; 10k kayıtta Find.list 2–14 ms. 104g'ye not: "etiket:fa" (eşleşmeyen alan değeri) runSearch 48 ms
            masaüstü / 75 ms telefon — query.js alan testi yavaş, tamamlama bunu sık yazdırır.
        [x] 104f (2026-11-23, B hattı): anlamsal arama cihazda: sem.js (modül Worker, transformers.js 3.5.1 CDN, Xenova/multilingual-e5-small q8;
            gerçek boyut ~118 MB model + ~22 MB wasm ≈ 140 MB, bir kez iner, tarayıcı önbelleğinde kalır; vektörler IndexedDB nts-sem, kayıt başına
            384 bayt int8; yalnız metni değişen kayıt yeniden gömülür). Açma: Ayarlar → Yapay zekâ → "Anlamsal arama" ya da az sonuçta Ara penceresindeki
            "Anlamca da ara". Kelime aramasından ~220 ms sonra gelir, kelime sonuçlarının altına eklenir, kutucukta ✦, alt satırda "N anlamca yakın";
            cümle çipleri (tarih/tür) bunları da süzer. Eşik: z puanı (sorgunun kendi kalabalığına göre) en iyisi ≥1.9, sonrakiler ≥1.5, en çok 12;
            14 kayıtlık tr/en/ar ölçüm: fatura→فاتورة ✓, uçak bileti→Flight ✓, dentist→diş ✓, soup recipe→lentil soup ✓, saçma "xqzv" boş ✓;
            invoice→fatura ✗ ve فاتورة→fatura ✗ (küçük modelin sınırı). Az sonuçta "<YZ> ile ara" düğmesi: seçili yapay zekâ kelime+anlam adaylarına
            bakıp id döndürür. Sorgu ~50–120 ms, 14 kayıt gömme 1,4 sn. phone-audit (arama*, ayarlar*) 0 hata, konsol hatası yok, 4 yapılandırma görüntüsü.
            104g'ye not: 10k kayıtta ilk gömme süresini ölç (Worker'da, arayüzü kilitlemez ama dakikalar sürebilir).
        [x] 104g (2026-11-23, A hattı): 10k kayıtta Ara'da gerçek yazma hızıyla (130 ms/tuş) 17 sorgu (düz, yazım hatası, alanlar, regex,
            Arapça, VEYA, renk:, tarih:) ölçüldü (skill: nts-playwright-test/keybench.mjs). Önce tuş → çizim 0,3–4 sn idi: Flip ölçümü ekran dışı
            content-visibility gruplarındaki her satırı yerleştiriyordu, aranan satır sayfada yoksa liste (300 satır) + kenar çubuğu her tuşta
            baştan çiziliyordu. Şimdi: Flip yalnız ekrana yakın grupları ölçer; >2000 kayıtta sayfa (liste/galeri/pano) yazı 280 ms durunca bir kez
            süzülür/çizilir, tuş başına yalnız arama + sonuç penceresi; canlı aramada liste 100 satır çizer (kaydırınca +300); sayfa yeniden çizilirken
            kenar çubuğu çizilmez; Find.list tuş başına bir kez sıralar; normalleştirilmiş başlık dizinde (Worker); ytId kayıt başına bir kez;
            pencere genişliği resize'dan (innerWidth her tuşta telefonda layout zorluyordu); query.js alan değerleri (etiket/proje/sohbet/url/başlık)
            kalıcı fold önbelleğinde, etiket jokeri bir kez derlenir. Sonuç (yüklü 4 çekirdekli makine): masaüstü tuş medyanı 12–59 ms (16/17 sorgu
            < 50), yazı durunca tek çizim 70–160 ms; telefon (390×844, 4× yavaş CPU) medyan 29–107 ms, 8/17 sorgu < 50. Kayıtlı arama sözdizimini
            aynen saklar ve geri açar ("etiket:fatura -proje son:400g" → 178/178). Kalan (104g2): çok geniş eşleşmede ("uzun bir" 8,5k sonuç)
            telefonda ~100 ms — Find.list'te en iyi 24'ü kısmi seçimle bulmak, sonuç penceresi FLIP ölçümünü azaltmak.
        [x] 104g2 (2026-11-23, A hattı): Find.list artık 8k sonucun hepsini sıralamıyor: sonuçlar {kayıt, puan} dizisi (kayıt başına dizi/
            sıralama yok), en iyi 500 (etiket çipleri için) quickselect (kth) ile sırasız seçilir, eşitlik tarihle kesilir, yalnız gösterilen 24
            gerçekten sıralanır (300 rastgele denemede tam sıralamayla birebir aynı); rankBonus döngüye gömüldü (tek indexOf, Opens Map).
            Sonuç penceresi FLIP'i yalnız yeri değişen kartları ölçer (sıra aynıysa hiç layout okumaz). Ölçüm (telefon 4× yavaş, 10k):
            Find.list 38–42 → 17–20 ms; keybench telefon 11/17 sorgu < 50 (önce 8/17), "mesaj" (10k sonuç) 97 → 42 ms, masaüstü 17/17 < 50.
            Kalan: "uzun bir" telefonda medyan ~86 ms (makine yüklüyken) — artık çoğu runSearch'teki puanlama (scoreItem × 8,5k), bu maddenin dışı.
            keybench.mjs: QS='["…"]' ile sorgu listesi verilebilir.

- [x] 105. **Çok akıllı ama çok basit arama** (sahip: "normal cümleyle yaz, sonucu al"; 104'ten sonra):
        (a) doğal cümle → süzgeç: "geçen ay annemin attığı fotoğraflar" → "Anladığım: Annem · fotoğraf · Ekim 2026" çipleri (dokununca kalkar);
            önce cihazda kurallarla (tr/en/ar), çözemezse yapay zekâ; sözdizimi (104d) sadece isteyene;
        (b) doğrudan cevap kartı: soru gibi aramalarda en üstte kısa cevap + kaynak kayıt ("Kümeste 12 sensör var" → kayda git);
        (c) asla boş sonuç yok: "Bunu mu demek istedin", en yakınlar, anlamca benzerler, "Yapay zekâ ile ara";
        (d) niyet tahmini: soru sözcüğü / "?" → Sor modunu öner (zorlamadan);
        (e) sesle arama: mikrofon (Web Speech, tr/ar/en), telefonda büyük dokunma alanı; desteklenmiyorsa düğme gizli;
        (f) resimle arama: ekran görüntüsünü yapıştır → OCR yazısıyla/benzer görsellerle bul;
        (g) kullandıkça öğren: bir aramadan sonra açılan kayıtlar benzer aramada üstte (yerel, cihazda);
        (h) her şey anında + çevrimdışı; sadece doğrudan cevap ve "Yapay zekâ ile ara" köprü ister.
        Sahibin ölçütü: teknolojiden anlamayan biri ilk denemede bulmalı → 3 persona ile 15 gerçekçi arama cümlesi (tr/en/ar) testi.
        [x] 105a+105c+105d (2026-11-23, B hattı): (a) Ara'da cümle çipleri artık "Anladığım:" ile başlar; sohbet adı cümlenin her yerinde
            Türkçe ekleriyle tanınır ("annemin", "Ali'den", "annemden" → [Annem]); yılsız ay ("ekimde", "martta", "geçen ekim", "in march",
            "في مارس" → son geçen o ay; çıplak "ocak/ekim/aralık/kasım/may" sözcük olarak kalır); dolgu sözcükleri düşer ("attığı, bana, göster,
            show me the, التي …", hepsi asla düşmez); "dünkü / geçen ayki" ekleri. "geçen ay annemin attığı fotoğraflar" → [Geçen ay][Annem][Resim].
            Yapay zekâ yedeği (kural çözemezse) yok: köprü işi, 105h'e bırakıldı. (c) boş sonuç yok: hepsini içeren yoksa "en yakınlar" (en çok
            sözcüğü tutanlar), çipler hiçbir şey bulmazsa önce tür/kaynak/tarih çipi bırakılır ("Hepsine uyan yok; “Resim” olmadan"), sonra
            süzgeçsiz; kimsenin yazmadığı sözcükte notlardaki sözcüklerden "Bunu mu demek istedin: sapiens" (2 harf, uzunda 3; dokununca kutuya
            girer, çipler kalır); az sonuçta "Anlamca da ara" + "Claude ile ara" zaten vardı, "en yakınlar"da da çıkar. (d) NtsQuery.intent():
            "?"/"؟" sonu, baştaki/sondaki soru sözcüğü (kaç, ne, nasıl, what, كم, هل …) ya da "… mi/mu" → Ara'da "✦ Soru gibi: Claude'a sor"
            düğmesi (yazı kalır, Sor moduna geçer; zorlamaz). 38 yeni birim testi (256 geçiyor), 4 yapılandırmada ekran görüntüsü, konsol hatası 0,
            phone-audit (arama ekranları) 0. Telefonda çipler alt satıra sarar (kesilmez).
        [x] 105b+105g (2026-11-24, B hattı): (b) Ara'da soru gibi aramada ("kümeste kaç sensör var?", "wifi şifresi ne?", "how much was the
            invoice?", "كم حساس في الحظيرة؟") en üstte "✓ Cevap · kayıtlarından, cihazda" kartı: en iyi 8 sonucun başlık/metin/OCR/dosya/özet/okunur
            kopya cümlelerinden sorunun sözcüklerinin ≥%60'ını tutan cümle (ekli biçimler de: kümeste~kümes, sensörler~sensör, الفاتورة~فاتورة),
            "kaç / ne kadar / how many / كم" sorusunda sayı olan cümle şart; altında kaynak kayıt düğmesi (dokun → kayıt açılır) + "Claude
            cevaplasın" (köprü: bulunan 12 kayıtla en çok 2 cümle, kaynaklarıyla, kartın içinde). Cümle yoksa kart çıkmaz. Kart varken "Soru gibi"
            düğmesi gizli (üç Claude düğmesi olmasın). Hata düzeltmesi: Ara'da sorunun sonundaki "?" joker sayılıyordu ("var?" → 0 sonuç); artık
            soru ise atılır. (g) kullandıkça öğren: Ara penceresinden açılan kayıt (dokunma, Enter, ↑↓) o aramanın sözcükleriyle bu cihazda saklanır
            (localStorage nts-learn, ≤300 arama, senkron yok); benzer aramada (NtsQuery.qsim ≥ .6: "fatura" ~ "faturalar" ~ "mart fatura") o kayıt
            +2.5…4.5 puanla üste çıkar, sözcükler tutmasa da sonuçlara girer (süzgeçlere uyarak), köşesinde küçük accent nokta. "Son aramaları
            temizle" öğrenileni de siler. NtsQuery.content/wantsNum/answer/qsim + 21 yeni test (277 geçiyor); 4 yapılandırmada ekran görüntüsü,
            konsol hatası 0, yatay taşma 0.
        [x] 105e+105f+105h (2026-11-24, B hattı): (e) Ara'da kutu boşken gönder düğmesinin yerinde mikrofon (Web Speech; yoksa gizli; telefonda
            44 px): duyulan sözcükler kutuya yazılır ve canlı arar (cümle çipleri de çalışır: "geçen ay fatura" → [Geçen ay]); dinlerken kutunun
            altında "Dinliyorum…" + TR/EN/AR dil çipleri (seçim saklanır, nts-mic; ilk seçim tarayıcı dilinden); tekrar dokun = durdur; izin yok /
            ses yok / ağ yok mesajları. (f) Ara'da resim yapıştır / sürükle / "+" (Ara'da "Resimle ara", yalnız resim): cihazda 64 bit dHash
            (72×64'ten 8×8 blok ortalaması, query.js dhash/hamming/imgSim) — aynı ekran görüntüsü küçültülüp JPEG'lense de ~7 bit fark, ≤10 bit
            "aynı resim" (en üstte), ≤~16 bit + ortak renk "benzer"; renk tek başına sonuç yapmaz. Parmak izleri önizlemeden bir kez yapılır,
            yalnız bu cihazda (IndexedDB kv 'ph', senkron yok). Resmin yazısı: TextDetector varsa cihazda, yoksa köprü açıksa /ocr → ocrWords
            (en çok 6 sözcük) kutuya girer, yazı sonuçları + görsel eşleşmeler birlikte. Başlıkta aranan resmin küçüğü; kutudaki yazı
            değiştirilirse normal aramaya döner; resim araması "son aramalar"a/öğrenmeye yazılmaz. (h) tools/test/persona.mjs: 3 persona
            (Ayşe 65 tr, John 40 en, Fatima 30 ar) × 5 gerçekçi cümle, 20 kayıtta (benzer tuzaklarla): 15/15 ilk sırada, AYNI test ağ kapalı
            (uygulama SW önbelleğinden) 15/15; doğrudan cevap kartı çevrimdışı da çıkıyor. Düzeltme: Arapça rakamlı cümle (٢٠٠) "كم" sorusunun
            cevabı sayılmıyordu. Çevrimdışı mikrofon: "sesle arama internet ister, yazarak arama çalışır". Köprü isteyenler (Claude cevaplasın /
            Claude ile ara / resmin yazısı) köprü yokken mesaj verir ya da atlanır. 17 yeni birim testi (294 geçiyor), 4 yapılandırmada ekran
            görüntüsü, konsol hatası 0, phone-audit (arama) 0. Sahip telefonda denesin: gerçek mikrofon (Android Chrome) ve gerçek ekran görüntüsü.

- [?] 106-0b. (2026-11-23, A hattı: design/rich-ui.html YÜKSELTİLDİ — sahibin 25 ✓'si (rich-ui-choices.json) yerli hisle yeniden çizildi: sistem yazı tipi (-apple-system/Segoe UI/Roboto), iOS/Android gri gruplu zemin, ince ayırıcılar, katmanlı yumuşak gölge, büyük başlık + bulanık yapışkan çubuk + kayan bölüm seçici, dokununca küçülme + titreşim (navigator.vibrate), yuvarlak onay kutuları, ✓/✗ segmentli. 16 YENİ örnek: a etkinlik/takvim, kişi kartı, tarif (kişi sayısı → miktar), fiş/fatura (tırtıklı kenar), sesli not dalga formu (oynat/ara + yazıya dökülmüş), alıntı; b "+" alt sayfa menüsü, seçince biçim çubuğu (kalın/italik/vurgu/link → Markdown); c gruplu ayar listesi (iOS anahtarları), kayan sekme seçici (FLIP), sil → "Geri al" bildirimi; d hava durumu bileşeni, alışkanlık serisi (bugüne dokun), odak sayacı; e karşılaştırma tablosu, kaynaklı cevap + devam soruları. Seçilmeyenler (a-link-C, a-pdf-B, a-code-A, a-note-B, c-cover-B, c-glass-A/B, c-empty-B, d-prog-A, d-check-B) çıkarıldı. Eski ✓'ler hazır işaretli ("seçtin"), yeniler "YENİ"; "Seçimlerimi indir" → rich-ui-choices.json (madde 106-0b). Telefon 390 + 1366, açık/koyu: konsol hatası 0, yatay taşma 0. Sahibin seçimi bekleniyor; 106a–e bu seçimden sonra.)
- [?] 106-0c. (2026-11-23, B hattı: design/rich-ui.html 3. TUR — 143-0 ertelendiği için yeni stil YOK: renk/yazı/kenar/köşe/gölge style.css'in bugünkü belirteçleri, simgeler app.js'teki çizgi simgeleri (emoji süsleri ve iOS kopyası renkli kareler çıktı), her örnek panonun noktalı zemininde; kartların üst satırı uygulamadaki gibi tür simgesi kendi renginde + site + zaman. Sahibin rich-ui-choices-2.json notları: a-event-A yeniden (kırmızı takvim yaprağı yerine o haftanın şeridi, etkinlik günü nefes alır) + a-event-B (o günün saatleri, çakışma görünür); a-media-B plak çıkıp döner + ekolayzır + sürüklenen zaman çubuğu; a-media-C tema renginde çizilmiş harita, rota kendini çizer, iğne düşer, yürü/araba/toplu; a-pdf-A GERÇEK kapak: vendor/pdf.min.js ile design/rich-ui-sample.pdf'in 1. sayfası (3 sayfa arası noktalarla), açılamazsa çizim; a-code-B küçük editör (sekmeler, satır no, satır vurgusu, durum çubuğu, kendi açık/koyu, kaydır, kopyala); a-wa-A tek sohbet 4 biçim (WhatsApp/Telegram/iMessage/e-posta zinciri); e-ans-B/C, e-cmp-A, e-src-A daha dolu (sayı kutuları, aylık/yıllık, uyarı, akışta adımlar + hava + tablo, 7 satırlı karşılaştırma + yalnız farklar, nem grafiği + çelişki uyarısı); d-timer-A saat halkanın içine göre boyutlanan HTML yazı (ölçüldü 52 px < 81 px); b-menu-A/B çıktı; 11 YENİ kart: uçuş, kitap, dizi, fiyat takibi, kargo, GitHub PR, gönderi, podcast bölümleri, el yazısı/çizim tekrar oynatma, ders notu+formül+çevrilen kart, ilaç hatırlatma. 51 örnek, önceki ✓'ler hazır işaretli, indir → rich-ui-choices-3.json. Test: 390/1366 × açık/koyu, konsol hatası 0, yatay taşma 0. Sahibin seçimi bekleniyor.)
- [?] 106-0. (2026-11-23, B hattı: ÖRNEK HAZIR design/rich-ui.html — 35 canlı örnek: a link A/B/C, medya A video/B müzik/C harita, PDF A/B, kod A/B, WhatsApp A/B, not mini belge A/B; b düzenleyici "/" menüsü A liste/B ızgara/C klavye üstü şerit (Markdown kısayolları + altta saklanan Markdown); c kapak A/B, cam A/B, boş durum A/B; d geri sayım A/B/C, ilerleme A/B, onay listesi A/B, CSV grafik A/B; e yapay zekâ cevabı A kartlar/B tablo+zaman çizelgesi/C akış (bilinmeyen parça → düz metin). Her örnekte ✓/✗ + not, "Seçimlerimi indir" → rich-ui-secimler.json, "Kopyala". Telefon 390 + masaüstü, açık/koyu, taşma 0, konsol hatası 0. Sahibin seçimi bekleniyor.) **ÖNCE ÖRNEK SAYFASI, sonra yapım** (sahip: "önce bana birkaç örnek göster, bu olur bu hayır"): `design/rich-ui.html`
        (tek dosya, uygulamanın renkleri/fontu, açık+koyu, telefon genişliğinde de) — 106a–e'nin her biri için 2–3 farklı canlı örnek
        (gerçekçi Türkçe/Arapça/İngilizce örnek verilerle: link kartı varyantları, gömülü video, PDF kapak, WhatsApp balonları, "/" menülü düzenleyici,
        kapaklı pano kartı, cam efekti, geri sayım/ilerleme parçaları, zengin yapay zekâ cevabı). Her örneğin altında ✓ Olur / ✗ Olmaz + not kutusu;
        seçimler kaydedilir ve "Seçimlerimi gönder" tek tıkla JSON'u `design/rich-ui-secimler.json`'a yazdırır (köprünün /inbox'una değil: sayfa
        indirme ile verir, sahip dosyayı klasöre koyar) ya da yayınlanmış bir Artifact sayfası olarak (kalıcı oy saklama ile) paylaşılır.
        Sahibe linki ver ve DUR ([?] bekle). 106a–e sadece ✓ alan örneklerle yapılır.
- [ ] 106. **Zengin arayüz (rich UI)** (sahip: "rich UI eklemek istiyorum" → önerilen sırayla, telefon önce + phone-audit 0):
        (a) zengin kart önizlemeleri: link büyük görsel + site rengi; YouTube/Spotify/Vimeo/harita kartta oynar (tıklayınca iframe, önce
            küçük resim); PDF ilk sayfa kapak; kod dosyası renkli (küçük, sonradan yüklenen vurgulayıcı); WhatsApp sohbeti balonlarla;
        (b) (sahip: TAM hâliyle kalsın, tablo + "/" menüsü dahil) zengin not düzenleyici: "/" blok menüsü (başlık, madde, onay listesi, alıntı, kod, tablo, resim, ayırıcı), Markdown kısayolları
            yazarken dönüşür (**kalın**, - madde, [ ] , # başlık), yapıştırılan HTML temizlenir; saklama yine Markdown (senkron/arama/Claude bozulmaz);
            okuma görünümü ve kart önizlemesi aynı biçimi gösterir; geri al/yinele;
        (c) daha canlı görünüm (ölçülü): pano kartında kapak resmi, üst çubuk/menülerde hafif cam efekti, boş durumlarda küçük çizimler,
            renkler daha belirgin ama sakin; açık + koyu; kontrast AA;
        (d) (sahip: kalsın; tasarım varyantlarını 106-0 örnek sayfasında göster) etkileşimli parçalar: geri sayım ("sınava 12 gün"), ilerleme çubuğu, onay listesi ilerlemesi (3/7), CSV'den grafik.
        (e) **zengin yapay zekâ cevapları (OpenUI fikri, kütüphanesi değil)** (sahip: "openui var"): thesysdev/openui (MIT) React + Zod +
            derleme istiyor → Nts'e almıyoruz; fikrini vanilla JS ile uygula: köprü cevabı izinli parçalar şemasıyla döner (--json-schema;
            Codex/Gemini'de şema desteğini kontrol et, yoksa JSON'u doğrula), uygulama sadece bilinen parçaları çizer: kayıt kartları, tablo, zaman
            çizelgesi, onay listesi, küçük grafik, cevap kartı, eylem düğmeleri (Pano yap / Göreve çevir / Kaydet / Aç). Bilinmeyen parça → düz metin.
            Akış (stream) varsa parçalar geldikçe çizilsin. Telefon önce.

- [ ] 107. **Genel öneriler (sahip onayladı 2026-11-21), telefon önce + phone-audit 0:**
        (a) "Gelen kutusunu temizle" kartları (telefon): günde bir, kartlar tek tek; sağ = sakla, sol = sil (geri alınır), yukarı = göreve çevir,
            aşağı = arşiv; masaüstünde ok tuşları; kaç kart kaldı sayacı;
        (b) Android ana ekran widget'ı (96'daki TWA paketiyle): yeni not, sesli not, son kayıtlar;
        (c) her yerden gönderme: e-posta adresine yazılan Nts'e (Supabase Edge Function + gelen e-posta servisi) ve Telegram botu
            (köprüde ya da Edge Function'da; sadece sahibin hesabı, gizli anahtar);
        (d) başka uygulamalardan taşıma: Google Keep (Takeout JSON), Apple Notes (HTML dışa aktarım), Notion (Markdown zip), Evernote (.enex),
            Telegram "Kaydedilen Mesajlar" (JSON) — WhatsApp içe aktarımı gibi önizleme + gruplama;
        (e) doğal dille hatırlatma: "yarın 9'da annemi ara" → görev + bildirim; bildirimde "1 saat ertele / yarın" düğmeleri;
        (f) kendiliğinden toparlama: aynı link/benzer not → "birleştireyim mi?" (geri alınır), kırık link işareti, aylardır açılmayanları arşive öner;
        (g) ~~şablonlar~~ KALDIRILDI (sahip): toplantı notu, alışveriş listesi, seyahat planı, kitap notu ("/" menüsünde ve kutuda);
        (h) ~~günlük modu~~ — KALDIRILDI (sahip: "gerek yok, kullanıcı orada kalmıyor, notunu atıp sonra bakıyor");
        (i) ~~birlikte kullanma~~ KALDIRILDI (sahip, "hızlı at, sonra bul" fikrine uymuyor): not/pano/liste paylaş (düzenleme ya da salt okuma), aile alışveriş listesi; Supabase RLS ile paylaşım tablosu;
        (j) dışa aktarma: panoyu PDF; Obsidian/Markdown klasörüyle eşitleme (köprü üzerinden, PC'de klasör);
        (k) erişilebilirlik ayarları: yazı boyutu (4 adım), yüksek kontrast, büyük dokunma modu, hareketi azalt anahtarı;
        (l) parmak izi/yüzle kilit açma (WebAuthn, mevcut uygulama kilidinin anahtarını sarar) + tek tek kayıtları gizle/kilitle;
        (m) ilk açılışta "örnek verilerle dene" (30 sn), sonra tek tıkla örnekleri sil.

- [x] 108. (2026-11-23, B hattı, v47: her bağ ayrı yol, karşılıklı en yakın kenarlardan dik çıkan eğri — farklı sütunda hep yan kenardan (aradaki kartların içinden inmez), üst üsteyse ortak genişliğin ortasından; çizgiler kartların altında, normalde silik (%16); fareyle üstüne gelince / telefonda dokununca o kartın bağları accent renkli, kalın, uçlarda nokta, ötekiler daha da sönük; telefonda pencere açılırken gelen sahte fare olayı yok sayılır, pencere kapanınca bağlar yanık kalır; %40 altında çizgi yok, kartta "🔗 N" rozeti; wires() yalnız takılı (görünen) kartlar, değişmeyen SVG yeniden yazılmaz. 4 yapılandırmada ekran görüntüsü, phone-audit board 0.) **Bağlı kartlar arasındaki çizgiler kötü** (sahip, ekran görüntüleri): şu an dar boşlukta dik iniyor, kartların arkasından/üstünden
        geçiyor, birbirine karışıyor. Çözüm: en yakın kenarlardan çıkan yumuşak eğri (bezier), kart gövdesini delmez (aradaki kartın kenarından
        dolaş ya da o kısım çok silik); normalde çok silik/gizli, karta gelince/seçince o kartın bağlantıları belirgin + renkli + uçlarda nokta;
        uzaklaşınca çizgi yok, sadece kartta "🔗 3"; Board.wires() sadece görünen kartlar için, kaydırırken akıcı (rAF). Masaüstü + telefon (dokununca göster).

## T. Sahibin 8. geri bildirimi (2026-11-22)
Hatalar (önce bunlar, telefon önce):
- [x] 109. (2026-11-22, v36: (a) kök nedenler: fare tekerleğinin bir tıkı e^1,2 = 3,3× zıplayıp sınıra çarpıyordu → tık başına 1,2×, dokunmatik yüzey yumuşak; uzak ay ızgarasında iki parmak ve kaydırma engelliydi (pointerdown #months'u yok sayıyordu, touch-action none) → pan-y + ızgarada da pinch; senkron/yeni kayıt gelince `anyVisible` yüzünden kamera fit'e fırlıyordu → yalnız S.cam yoksa fit; ikinci parmak uzun-basma zamanlayıcısını eziyordu → yakınlaştırırken kart menüsü açılabiliyordu; S.cam null iken tekerlek/dokunma hatası; hızlı +/− geçişi kesiyordu. (b) mergeItem/merge tüm kaydı daha yeni updatedAt'a göre alıyordu: telefonda yazı düzenlenince bilgisayardaki taşıma geri gidiyordu → `posAt` / `posByAt` (setPos damgalar), `keepPos()` konumu kendi zamanına göre seçer, eski konumlu yeni kayıt gelirse yerel konum korunup geri gönderilir. (c) ataç/kaydet/yapıştır/bırak tek tek denendi: yapışkan nota ve açık pencereye yapıştırma alttaki kutuya gidiyordu, kaydetme hata verince yazı+dosyalar kayboluyordu, ataç klavyeyle erişilemiyordu → hepsi düzeldi. (d) çizgi vardı ama günün bandı kadar kısa (1 kartlık günde çentik) ve sönüktü → en uzun gün boyunda (≥320 px), %22 metin rengi, Bugün'ün solunda accent; 4 yapılandırmada %25/50/100 ekran görüntüsü.) **Pano hataları**: (a) yakınlaştır/uzaklaştır bazen çalışmıyor (tekerlek, +/−, iki parmak — kök nedeni bul);
        (b) taşınan kartlar bazen kendiliğinden kötü yerlere gidiyor, özellikle bilgisayar ↔ telefon arasında (senkronda konum birleştirme:
        x/y için updatedAt alan bazında, eski konum yenisini ezmesin; Board.tidy / fit konumu kaydetmesin); (c) içerik ekleyen düğmeler
        (ataç, kaydet, dosya, yapıştır) bazen saçmalıyor — hepsini tek tek dene, kök nedenleri yaz; (d) günler arası çizgi HİÇ görünmüyor
        (92b'deki .day-band::before telefon/masaüstü, açık/koyu, her yakınlıkta gerçekten görünür olsun, ekran görüntüsüyle kanıtla).
- [ ] 110. **Senkron sadeleşsin** ("bi tık karışık"): kullanıcı ne olduğunu tek bakışta anlasın (tek durum noktası: ✓ eşit / ↻ gönderiyor /
        ! sorun + dokununca açıklama); iki cihaz testi (twodevice.mjs) konum + düzenleme + silme senaryolarıyla.
- [x] 111. (2026-11-22: kök neden Android Chrome "sitelerde koyu tema" otomatik karartması; açık temada `color-scheme: only light` + `<meta name="color-scheme" content="light dark">`, v34. Ayarlar düğmesi telefonda doğru çalışıyor. Gerçek telefonda sahip doğrulamalı.) **Açık tema telefonda çalışmıyor** — nedenini bul (prefers-color-scheme, meta theme-color, hn-theme), düzelt, 4 boyutta dene.
- [ ] 112. **Derin kullanıcı testi** ("teyze de kullanabilsin"): her düğmeye tek tek bas (masaüstü + telefon), beklenen sonucu yaz,
        çalışmayan/kafa karıştıran her şeyi düzelt; eksik akıcılık (geçiş, geri bildirim) ekle. Sonuç `design/ux-review.md` "(d) düğme düğme".
- [x] 113. (2026-11-22: logo 44 px = çubuk genişliği, aynı sol kenar/merkez; ">" Rail.place'te çubuğun ya da paletin dikey ortasında, v35) **Hizalar**: (a) sol çubuktan çıkan ">" sekmesi çubuğun DİKEY ORTASINDA olsun (üstte değil); (b) logo ile sol çubuk aynı hizada değil, hizala.
Arayüz:
- [~] 114. (2026-11-22, kısmen: etiketler her yerde simgeli renkli çip (tagChip, renk addan), pano kartında renkli tür kutucuğu + "…" yerine son satırda solma (Board.fades). Kalan: kaynak simgesi, listede de "…" yerine solma) **Liste ve galeri kartlarında etiket**: şu an sadece ad + tarih; etiketleri de uygun simgeyle göster (#iş → çanta vb., yoksa #);
        önerilen ekler: tür simgesi (link/PDF/resim), kaynak (WhatsApp/telefon/PC), görev ise tarih çipi, bağlantı sayısı "🔗 3" — sade kalsın.
- [ ] 115. **Üstteki görünüm seçici (Pano · Liste · Galeri…) kendini gizlesin**: 10 sn üzerine gelinmezse yumuşakça yukarı kayıp gizlenir,
        fare üst kenara yaklaşınca / telefonda yukarı kaydırınca geri iner (reduced-motion: anında). Klavyeyle odaklanınca da görünür.
- [ ] 116. **Logo boş duruyor → pano seçici**: sağ alttaki pano çubuğundaki (Genel vb.) pano seçimi logoya taşınsın: logo + pano adı, dokununca
        panolar listesi (yeni pano, yeniden adlandır). Sağ alttaki çubuk sadeleşir.
- [ ] 117. **Yazı kutusu üstündeki şeyleri görünür bıraksın**: panoda bir kartın üstündeyken kutu, logo, yan çubuklar, üstteki seçici ve ayarlar
        o kartı kapatıyorsa saydamlaşsın/kenara kaçsın (imleç ya da kart altında kalınca opaklık düşer, üzerine gelince geri gelir); kutu her zaman
        net okunur kalsın.
- [x] 118. (2026-11-23, B hattı, 103b ile: placeholder Not'ta "Not yaz · - görev · ? yapay zekâya sor · / ara" (telefonda kısa), Ara/Sor'da kendi cümlesi; kutu odaktayken masaüstünde mod düğmelerinin yanında küçük `Tab` ipucu; gönder simgesi Enter'ın yapacağını söyler: ↑ kaydet, ☐ "- " ile görev, 🔍 ilk sonucu aç, ✦ Sor; renk yalnız Sor'da accent) **Kutu modları ve ipuçları** (103b ile birlikte): placeholder anlaşılır bir cümle olsun: "Not yaz · - görev · ? yapay zekâya sor · / ara";
        küçük tuş ipucu (Tab ile mod değiştir: `Tab`); başa yazılan işarete göre (- / ? / ve sonra eklenenler) gönder düğmesinin simgesi değişsin
        (✎ not, ☐ görev, ✦ sor, 🔍 ara), renk uygunsa değişsin yoksa aynı kalsın.
- [ ] 119. **Uzaklaşınca anlamlı çizim (çok önemli, sahip: "bütün gücünü ver")**: çok uzaklaşınca kartlar okunmuyor; o yakınlıkta panoda
        güzel, tatlı, el çizimi havasında katman: kesik çizgili çerçeve/daireler ile kart kümelerini sarmak, kümeye başlık ("İş", "Aile"),
        kümeler arasında oklar "bu bununla ilgili" (etiket, bağlantı, proje, yapay zekâ benzerliği). Yaklaşınca yumuşakça kaybolur. Önce
        `design/zoomout.html` örnek sayfası (2–3 stil), sahip seçsin; sonra yapım. 108 ve 92b ile uyumlu, uzakta da 60 fps.
- [ ] 120. **Yapay zekâ imleci (Figma imleçleri gibi)**: Claude/Codex/Gemini bir şey yaparken (düzenle, pano hazırla 93, etiketle) panoda kendi
        imleci görünsün, kartları onunla taşısın/çizsin; imlecin yanında küçük ad etiketi ("Claude"), rengi yapay zekânın logo rengi (Claude
        turuncu, Gemini mavi, Codex yeşil/siyah). Kullanıcının kendi imleci de aynı güzel tasarımda (isteğe bağlı, ayarlardan). reduced-motion: atla.
- [ ] 121. **Cam (liquid glass) görünüm ayarı**: Ayarlar → Görünüm'de aç/kapat; tüm yüzen yüzeyler (kutu, çubuklar, pencereler) iPhone gibi
        bulanık cam; AA kontrast korunur, yavaş telefonda otomatik kapalı. İlk tanıtımın (tur) sonunda da sorulsun: yan yana 2 küçük örnek
        (Düz / Cam), seçer; sonra Ayarlar'dan değiştirebilir.
- [ ] 122. **İlk tanıtımda giriş seçimi**: "Google ile giriş yap" (önerilen: telefon ve bilgisayar aynı kayıtları görür) ya da "Misafir olarak
        devam et" (bu cihazda kalır, senkron yok, sonra Ayarlar'dan girebilir). Atla/İleri akışı içinde, sahte Supabase ile test.
Fikir (yeri belli değil, önce öneri):
- [ ] 123. **Kasa kilidi gibi yuvarlak çarklar**: kasa şifresi kadranları gibi döner sayılı halkalar → tarih seçici (yıl · ay · gün halkaları) ve
        bir halka da etiketler için. Önerilen yer: "Tarihe git" ve görev tarihi seçici (telefonda parmakla çevir), etiket halkası süzgeçte.
        Önce `design/dial.html` örneği, sahibe sor.
Site:
- [ ] 124. **Tanıtım sayfası (landing page)**: Igrek (Project_manager_suit) sitesi kalitesinde, animasyonlu, kısa video/GIF'li, uçuşan
        yapay zekâ imleçleri (120); şimdilik uygulama yalnız web olduğu için "Uygulamayı aç" bağlantısı; GitHub README'ye düğmeyle eklenir
        (github-readme skill). Ayrı klasör `site/`, Pages'te `/nts/site/` ya da kök.

## U. Sahibin 9. geri bildirimi + Locus incelemesi (2026-11-23, ekran görüntüleri sohbette)
- [x] 125. (2026-11-23: telefonda kutunun yazısı 4 px aşağıdaydı → textarea 44 px, +/gönder ile aynı orta çizgi; masaüstü zaten tam ortada, ölçüldü) Kutu tam ortada mı?
- [x] 126. (2026-11-23: kök neden kanıtlandı: sürüklerken gelen senkron Board.render ile tüm kartları silip yeniden kuruyordu, elde tutulan kart DOM'dan kopuyor, bırakınca offsetLeft 0 → x=0'a kaydediliyordu. Board.busy (kart taşıma, kalem, yazı boyutu) sürerken Board.render isteği Board.pending'e girer, bırakınca bir kez uygulanır; kopmuş kart asla kaydedilmez. İki cihaz testi: eski kod left 0, yeni kod kart elde, doğru yere (300,270) düştü, telefonun notu bırakınca geldi) **Taşırken kart başka yere kaçıyor (HATA, önce bu)**: sahip panoda kartı tutup taşırken kart birden en sola gitti ve sayfa
        "hızlı bir yenilendi". Şüphe: sürükleme sırasında senkron/Live/merge ya da render() pano DOM'unu baştan kuruyor, sürüklenen kartın
        yerine eski/uzak konum geliyor. Kural: sürükleme (ve kalem) sürerken gelen güncellemeler beklesin (S.dragging → kuyruk, bırakınca uygula),
        sürüklenen kartın konumunu hiçbir uzak güncelleme ezmesin; render "baştan çizme" değil yerinde fark. Twodevice ile kanıtla: A sürüklerken
        B bir kayıt eklesin/taşısın → A'daki kart elde kalmalı, titreme/yenilenme yok.
- [x] 127. (2026-11-23: Peek.show liste modunda kutunun (.dock) dikdörtgenini ölçer; aynı sütunları paylaşıyorsa kart dock.top-12'de biter, uzun kart içinde kayar (max-height). 1280/1366/1440/1920 × açık/koyu: çakışma 0. Telefonda peek yok (hover ≥1100)) **Liste görünümünde sağdaki önizleme kartı kutunun üstüne biniyor** (1366×768, sahibin ekranı): .peek kutunun (dock) üst kenarında
        bitsin (max-height / bottom = dock yüksekliği + boşluk) ya da kutu peek'in solunda kalsın; 1280–1920 genişlikte ve telefonda ölç, 0 çakışma.
- [x] 128. (2026-11-23: Board.metaLines(i) meta satırının genişliğini tahmin eder, sığmıyorsa est() ikinci satıra yer ayırır (.meta.m2); fades() sığmayan çipleri sondan kaldırıp tek bir "+N" çipi koyar, satırdan geniş çip önce gider; nowrap+overflow kaldırıldı. Masaüstü+telefon açık/koyu: kesik çip 0) **Pano kartında etiketler kesiliyor ("# y…")**: kart genişliği yetmiyorsa etiket çipleri alt satıra insin (flex-wrap), hiçbiri yarım
        görünmesin; çok etiket varsa son çip "+2". 114'teki maske/fade etiket satırına uygulanmasın.
- [x] 129. **"Düzenle" bağlı kartları çok yakın koyuyor, bağ çizgileri görünmüyor**: bağlantısı olan kartlar arasında en az ~48 px boşluk
        (çizginin kıvrımı görünür), bağlı kartlar yan yana/üst üste ama çizgi kartın altında kalmasın. 108 ile birlikte. YAPILDI (B hattı): oto dizilimde gün içinde bağlı kartlar (aynı grup / related / links) arka arkaya, aralarında 48 px (diğerleri 14), bağlı dizi sütun arasında bölünmez (sütun en çok +2 büyür); 4 yapılandırmada ölçüldü.
- [x] 130. (2026-11-23, B hattı: (b) köprünün /ocr ve /organize şemasına `labels` eklendi → resim kaydında `vtags` (3–6 küçük harf, '#'siz, tekrar yok); ocrBackfill eski resimleri de etiketler (eski köprü labels döndürmezse oturumda bir daha sormaz); vtags aramaya girer, ayrıntı penceresinde "Resimde: …" satırı, sol çubukta "Resimlerde bulunan etiketler N". Köprü değişti: ana klasörde `systemctl --user restart hizli-note-bridge` gerekir. (f) etiket çipleri soluk (renk %8 zemin, yazı %45 renk + metin; AA: açık ≥5.9, koyu ≥5.2), liste/galeri/pano kartında en çok 2 çip + "+N", kart tür simgesi tek renk (gri), seçili pano kartı tek 2 px vurgu çerçevesi; style.css'teki kopya 114 bloğu silindi. a/c/d/e bağlı maddelere taşındı: 103b, 99a, 131-0, 106a) **Locus'tan alınacaklar** (Pavel Macek, LinkedIn video 2026-11, macOS "görsel defter"; video indirildi, kare kare + konuşma
        yazıya döküldü: "every notes app … is made mostly for text and half of what I keep is pictures … gallery, easy to browse visually …
        when I need more room to think I can use a canvas view … pictures get tagged automatically … plain files in a folder, Markdown and
        pictures … nothing's locked away in a database"). Kareler: design/ref-locus/ (commit'lenmez, başkasının görüntüsü).
        (a) **Görsel arama penceresi**: yazdıkça sonuç bir ızgara (resimler büyük, notlar küçük belge kartı); üstte eşleşen etiket çipleri sayılarıyla
            ("# logo 14"), sağda tür sayıları (Hepsi 50 · Resim 39 · Not 10 · Klasör 0); **Tab = etikete daralt**: etiket kutuya çip olur, altta
            "Daha da daralt:" birlikte geçen etiketler; sonuçlar yeni yerlerine FLIP ile kayar (titreme yok). Altta tuş ipuçları (↵ Aç · ⇥ Etikete
            daralt · Ctrl+K Eylemler); ilk satır "Koleksiyon olarak kaydet…" (= kayıtlı arama). 103b/104e/95e ile birlikte yap.
        (b) **Resimlere otomatik içerik etiketi**: köprü yapay zekâsı resme bakıp 3–6 etiket (nesne, renk, stil, "siyah beyaz", "logo"), OCR'nin yanında;
            sol çubukta "Bulunan etiketler 1445" sayacı; aramada bu etiketler de bulunur. Köprü yoksa sessizce atla.
        (c) **Galeri ↔ pano geçişi aynı kartlarla**: görünüm değişince her kart galeri yerinden panodaki yerine uçar (çapraz FLIP), çapraz solma değil.
            99a masonry galeri ile birlikte.
        (d) **Koleksiyon/proje kartı**: üstünde 2–3 içeriğin küçük önizlemesi üst üste (klasör sekmesi gibi), altında "3 not · 38 resim".
        (e) **Notlar ana ızgarada gerçek mini belge**: onay listesi kutucuklarıyla, notun içindeki resim kartta görünür, tıklamadan işaretlenebilir (106a/106d).
        (f) **Sade görünüm dersi**: bol beyaz, tek vurgu rengi (seçimde 2 px mavi çerçeve), yumuşak gölge, küçük gri yan çubuk yazısı; renkli
            çipler azken daha temiz. KARAR (2026-11-23): ayrı "Sade" ayarı YOK; renkli çipler kalır ama sakinleşir: renkler daha soluk
            (düşük doygunluk, AA kontrast korunur), kartta en çok 2 çip + "+N", tür simgesi tek renkli; seçim çerçevesi tek vurgu rengi.
        Alınmaz: Mac'e özel yerel uygulama, iCloud, diskte klasör saklama (Nts PWA + IndexedDB + GitHub; Markdown dışa aktarma zaten 107j).

- [ ] 131. **Yapay zekâ ile otomatik klasörler (sahip: "5000 şey varsa 5000 kaydırma çok kötü")**: galerinin (ve listenin) en üstünde Locus'taki
        gibi klasör kartları: kartın üstünde içindeki 2–3 kaydın küçük önizlemesi klasör sekmesinden taşar, altta ad + "13 resim · 2 not".
        Tıklayınca klasörün içi açılır (geri tuşu döner). Klasörler sanal: kayıt taşınmaz, bir kayıt birkaç klasörde olabilir.
        Kaynaklar (önce ucuz olanlar, yapay zekâsız hemen çalışır): etiket, proje, kaynak (WhatsApp sohbeti "Annem"), site (github.com),
        tür (Resimler, PDF'ler), zaman (2025, Kasım). Sonra yapay zekâ: 104f gömmeleriyle kümeleme + köprü kümeye kısa ad verir
        ("Ev tadilatı", "Logo fikirleri"); yeni kayıt gelince en yakın klasöre kendiliğinden girer. Kullanıcı: adlandır, sabitle, birleştir,
        gizle, "bu kayıt buraya ait değil". 5000 kayıt → ~20–40 klasör; 10k kayıtta hızlı (sanal liste, önizlemeler tembel).
        (0) ÖNCE `design/folders.html`: 2–3 klasör kartı stili, açık/koyu + telefon; sahip seçsin. 130d bunun içinde, 99a ile uyumlu.
            [?] (2026-11-23, B hattı) örnek hazır: design/folders.html — A Cep (Locus gibi sekmeli arka kapak, 3 kayıt eğik taşar, buzlu ön kapak), B Yığın (yelpaze deste, kutusuz), C Albüm (1 büyük + 2 küçük mozaik, renkli klasör simgesi). Üstüne gelince kalkma, tıklayınca FLIP ile açılma + geri tuşu/Esc, reduced-motion, telefonda 2 sütun. Görüntüler design/ux/131-folders-*.png. Sahip ✓/✗ verince 131 seçilen stille yapılır.
            [?] 131-0b (2026-11-23, B hattı) sahip A/B/C'den hiçbirini seçmedi → design/folders.html'e 7 yeni yön eklendi (A–C kaldı): D Dosya (Mac/Dosyalar klasör simgesi klasör renginde, baş harf kabartma, ön kapak eğilir), E Ayraç (renkli sekmede ad + kâğıt kenarları + 3 kare), F Kolaj (kenardan kenara 4'lü mozaik, ad koyu geçişte), G Şerit (tek satır: simge + ad + küçük resim şeridi, telefonda tek sütun), H Çekmece (kartoteks: yuvada dik kayıtlar, etiketlik + tutamak), I Zarf (açık zarf, kayıtlar yukarı kayar), J Deste (düz albüm destesi + sayı rozeti). Hepsi açık+koyu, telefon 2 sütun (G hariç), hover/odak animasyonu, FLIP açılış, reduced-motion; her stilde ✓/✗ + not, altta "Seçimlerimi indir" → folders-choices.json. Sahip seçince 131 o stille yapılır.
        GÜZEL GÖRÜNÜM ŞART (sahip, 2026-11-23: "güzel görünümlü olsun"): Locus kalitesi — gerçek klasör hissi (arka sekme + öndeki kapak,
        içeriden 2–3 kart/resim hafif eğik taşar), yumuşak katmanlı gölge, 14–16 px köşe, bol boşluk, sakin yazı (ad 600, sayı gri küçük);
        üstüne gelince/dokununca içindekiler biraz yukarı çıkar (150–200 ms, reduced-motion'da yok); açılınca kart klasörün içine
        büyüyerek geçer (FLIP, 102); koyu temada da aynı kalite; telefonda 2 sütun, 44 px. Örnek sayfada her stilin ekran görüntüsü
        (masaüstü + telefon, açık + koyu) design/ux'e; görüntüye bakmadan "güzel" deme.
- [x] 132. **Renkle arama**: küçük resim üretilirken baskın 1–3 renk çıkarılır (yapay zekâsız, çevrimdışı); `renk:mavi` / "mavi resimler",
        arama çiplerinde renk noktaları; "siyah beyaz" otomatik. 104d dilbilgisine `renk:` alanı (tr/en/ar: renk/color/لون).
        [x] 2026-11-23, A hattı: query.js palette() 32×32 pikselden 12 renk kovası (kırmızı…mor + pembe, kahverengi, siyah, beyaz, gri),
            ≥ %12 olan ilk 3 + neredeyse renksizse 'bw'; kayda `hues` (elle verilen renk etiketi `color` ayrı kalır, renk: ikisine de bakar).
            Küçük resim yapılırken / ekranda yüklenirken hesaplanır; görünmeyenler boşta 6'şar (buluttan tam resim indirmez, yalnız yerel dosya
            ya da bulut önizlemesi). Renk adları tr/en/ar dizine girer: düz "mavi" / "أزرق" de bulur; arama çipinde renk noktası.
            23 yeni test (179 geçiyor). Eksik: "mavi resimler" doğal cümlesi → çip 104a/105'te; mevcut resimler ilk açılışta yavaş yavaş dolar.
- [x] 133. **Benzer resimler/kayıtlar**: kayıt penceresinin altında "Benzerleri" şeridi (104f gömmeleri; yoksa etiket + site + zaman yakınlığı).
        [x] 2026-11-23, B hattı: kayıt penceresinin en altında "Benzerleri · N" şeridi (yana kayan 112 px kartlar, resimde küçük resim,
            yoksa tür simgesi + 2 satır başlık; telefonda 120 px). app.js simOf(): ortak konu +3, ortak "resimde" etiketi +1, aynı site +2,5,
            aynı proje +1,5 / sohbet +1, ortak renk +0,7; zaman ve tür yalnız destekler (tek başına benzer yapmaz), eşik 2,5, en çok 12;
            "Bağlantılı" olanlar tekrar çıkmaz. Anlamsal arama açıksa sem.js 'like' (kaydın kendi saklı vektörü, model çalışmaz, z ≥ 2,2)
            en çok 8 anlam komşusu ✦ ile başa gelir; şerit yüksekliği değişmez (ölçüldü, 0 px). Testte Sem.like taklit edildi (model
            headless'ta inmez); gerçek modelle sahip denesin. phone-audit kayıt pencereleri 0 hata.
- [x] 134. **Galeride çoklu seçim**: sürükleyerek kutu çiz / uzun bas + dokun; seçilenlere tek seferde etiket, sil, klasöre/panoya taşı;
        altta küçük eylem çubuğu "12 seçili". Telefon önce.
        [x] 2026-11-23, A hattı: app.js `Sel` (Ctx'in üstünde). Telefon: kutucuğa uzun bas → seçer (bağlam menüsü galeride açılmaz),
            sonra dokunuşlar ekler/çıkarır. Masaüstü: boş yerde fareyle sürükle → seçim kutusu (kenarda kendiliğinden kayar), Ctrl/⌘+tık,
            Shift+tık aralık, galerinin üstünde "Seç"/"Bitti" düğmesi, Ctrl+A, Delete, Esc. Seçim modunda kutunun yerine alt çubuk:
            × · "N seçili" · Tümü/Hiçbiri · Etiket (yaz + sık kullanılanlar) · Panoya (Ana pano + panolar, hepsinde olanda ✓) · Sil
            (çöpe, "Geri al" hepsini geri getirir). Galeriden çıkınca seçim biter. Klasör henüz yok (131) → klasör yerine panolar.
            Playwright: 4 yapılandırmada kutu/Ctrl/Shift/uzun bas/dokun/etiket/pano/sil+geri al/tümü/çıkış geçti, konsol hatası yok.
- [x] 136. (2026-11-23: kutu soldan sağa: "+" (ek, her modda yerinde; Ara'da dosya seçilirse Not'a geçer) · TEK mod düğmesi (simge + ad: Not / Ara (sarı) / Sor (accent)) · yazı · gönder. Dokunma ya da Tab = sıradaki mod, Shift+Tab geri; düğme yeni ada göre 180 ms genişler, ad aşağıdan kayarak gelir, reduced-motion'da anında. Tab artık boş kutuda da mod değiştirir (Esc kutudan çıkar). Üç yan yana düğme, "Tab" kutucuğu, telefon menüsü, "Claude'a soruyorsun · Esc Not moduna dön" satırı ve ipuçlarındaki <kbd> kalktı. Placeholder: "Not yaz…" / "Ara…" / "Sor…". Gönder düğmesi Sor'da da yuvarlak ✦ (üç kez "Sor" yazmasın). Not'ta yalnız "N benzer kayıt" ve soru yazınca "Claude'a sor" çipi kalır. 1366 açık/koyu + 390 açık/koyu + 360: çakışma 0, telefonda 44 px, konsol hatası yok) **Kutu (mod seçici) arayüzü karışık** (sahip 2026-11-23, ekran görüntüsü: "bu kısımda büyük bir sorun var, UI/UX"):
        103b'den sonra kutuda yan yana ✎ Not · 🔍 · ✦ · Tab · + ve eski ipucu "Not yaz · - görev · ? yapay zekâya sor · / ara" var →
        aynı iş iki yoldan anlatılıyor, "+" dördüncü mod gibi duruyor, hap içinde hap, kalabalık. Sade bir düzen: modlar tek bir yerde,
        placeholder yalnız seçili modu anlatsın, "+" (ek) modlardan ayrı ve belli; masaüstü + telefon (360/390) ekran görüntüsü.
        KARAR (sahip 2026-11-23): ChatGPT gibi — en solda "+" (ek), hemen yanında TEK mod düğmesi (seçili modun simgesi + adı:
        ✎ Not / 🔍 Ara / ✦ Sor); Tab'a basınca (ya da düğmeye dokununca) sıradaki moda güzel, kısa bir animasyonla geçer (simge/yazı
        kayarak değişir, 150–200 ms, reduced-motion'da anında). Üç yan yana mod düğmesi ve "Tab" kutucuğu kalkar. Yazı alanı
        olabildiğince TEMİZ: placeholder kısa, yalnız seçili mod ("Not yaz…", "Ara…", "Sor…"), eski "- görev · ? sor · / ara" ipucu yok.
- [x] 137. (2026-11-23: ⋯ altından seçilen kaynak / proje-liste / konu / renk çubukta ⋯'nin altında accent düğme olur (simge ya da renk noktası, köşede ×, ipucu "Bilgisayar · kaldır"); yeni seçilen 220 ms "pop" ile gelir, reduced-motion'da yok; tıklayınca o süzgeç kalkar. Çubuk gizliyken ">" üstünde accent nokta + ipucunda açık süzgeçler. Telefonda Filtre düğmesi süzgeç açıkken accent. ⋯ artık kendisi renklenmiyor (bilgi yeni düğmede). 1366 açık/koyu + 390 açık/koyu, konsol hatası yok) **Seçili süzgeç sol çubukta görünmüyor** (sahip 2026-11-23, ekran görüntüsü: "Bilgisayar'ı seçtik, seçildiğine dair bir şey
        görünmüyor; seçildiği anda soldaki barda bir şey gözükmesi lazım"): ⋯ menüsünden Kaynak / konu / renk / proje / liste seçilince menü
        kapanıyor ve çubukta yalnız ⋯ hafifçe renkleniyor → fark edilmiyor. Çubukta ⋯'nin altında seçili her süzgeç için belirgin bir
        düğme (simgesi, accent zemin, köşede ×; üstüne gelince "Bilgisayar · kaldır"), seçildiği anda kısa bir "pop" animasyonu
        (reduced-motion'da yok); tıklayınca süzgeç kalkar. Çubuk gizliyken ">" kulakçığında nokta. Telefonda Filtre düğmesi accent olur.
- [x] 135. (2026-11-23: başlık saklanmıyor, türetiliyor (titleOf → autoTitle): resim/PDF adı anlamsızsa (IMG-/VID-/PXL_/Screenshot_…_Chrome/Ekran görüntüsü/WhatsApp Image, ya da harf kelimesi kalmayan ad) OCR'nin ilk anlamlı satırı (durum çubuğu, sayı, URL atlanır; tr/ar/en; 70 harf), yoksa yapay zekâ özetinin ilk cümlesi başlık olur; dosya adı listede/galeride alt satırda, öğe penceresinde başlığın altında. Kullanıcı başlığı (userTitle) ya da anlamlı yapay zekâ başlığı varsa dokunulmaz. 4 yapılandırma ekran görüntüsü, konsol hatası yok) **Ekran görüntüsüne otomatik başlık**: "IMG-20251216-WA0014.jpg" gibi anlamsız adlarda OCR'nin ilk anlamlı satırı (ya da köprü
        yapay zekâsının kısa açıklaması) başlık olur; dosya adı alt satırda kalır. Kullanıcı başlığı değiştirdiyse dokunulmaz.
- [x] 138. (2026-11-23: pano kartında sağ tık (telefonda uzun bas) menüsünde "Bağla…" → alttaki çubukta "Bağlanacak kartı seç" (not kutusu o sırada gizlenir), öteki karta tıkla/dokun → bağlanır, "Bağlandı · Geri al"; Esc ya da × iptal, bu sırada pano kaydırılabilir. Shift+tık (ya da menüde "Seç (çoklu bağla)") ile 2+ kart → "N kart seçili · Bağla" → zaman sırasında zincir. Bağlı kartın menüsünde "Bağlantıyı kaldır: <başlık>" (en çok 5). Veri i.links + i.lk {öteki: +zaman ekleme / −zaman kaldırma}; mergeItem bağları birleştirir, sonraki kaldırma eski eklemeyi yener (iki cihazda kaldırılan bağ geri gelmez). Kayıt penceresindeki "Bağlantılı" listesi bunları gösterir (relIndex). Telefonda uzun basınca kart artık menüyle birlikte açılmıyor. 1366 açık/koyu + 390 açık/koyu, konsol hatası yok) **Elle bağla** (sahip: "bağlamak istesem napmam lazım, yok öyle özellik").
- [x] 139. (2026-11-23, A hattı) **Panoda fareyle kutu seçimi** (sahip: "mouse ile bir yere basıp birkaç tane eleman seçebileyim"): seç aracında boş yerde
        sürükle → yarı saydam accent dikdörtgen; değdiği kartlar, panoya yazılan yazı/notlar ve çizimler seçilir (Shift = ekle, Ctrl/⌘ = aç-kapa;
        Shift/Ctrl+tık tek kart). Seçim 138'in Link.sel kümesi (tek seçim modeli; bağlama yalnız gerçek kartları zincirler). 2+ seçilide hepsinin
        çevresinde kesik çizgili çerçeve: seçili karttan ya da çerçevenin içinden sürükle → hepsi birlikte taşınır (çizimlerin noktaları da kayar).
        Alt çubuk: × · "N seçili" · Bağla · Etiket · Hizala (sola alt alta / üste yan yana / düzenli diz, Geri al) · Sil (Geri al). Ctrl+A hepsi,
        Delete/Backspace sil, Esc ya da boş yere tık bırakır. Sağ tık seçili kartta: renk/öncelik hepsine, "Seçilen N kartı bağla / etiketle /
        Hizala / Seçilenleri sil (N)". Boşlukla sürükleme, orta tuş ve tekerlek = kaydırma kalır. Telefon: boş yerde parmağı ~0,4 sn tut (titrer) +
        sürükle = kutu; hızlı kaydırma pano kaydırır, boş yere dokunuş bırakır. Playwright 1366 açık/koyu + 390 açık/koyu (CDP dokunma), konsol
        hatası yok. Not: kartlar taşınınca "yerleşmiş" olur ve taşınmamış gün sütunları onların sağına geçer (eski davranış, 91/109 ile aynı).
- [x] 140. (2026-11-23, B hattı) **Panodaki not ve yazı araçları yeniden** (sahip: "çok kötü"): araçla tıkla/dokun → kutu açılır ve imleç orada (dokunmadan sonraki fare olayları engellendi, telefonda odak kaçmıyor); notta bir dokunuş seçer, ikinci dokunuş ya da çift tık imlecin olduğu yerden yazdırır; dışarı tıkla / Esc / Ctrl+Enter bitirir; boş kalırsa silinir. Satır blokları: `# ` başlık, `- ` madde, `[] ` onay kutusu (yazarken dönüşür, boş maddede Enter listeyi bitirir, satır başında Backspace geri alır), Ctrl+B/I kalın/italik; saklama yine Markdown (stHtml/stDom/stPlain, başlıkta işaretler görünmez). Onay kutusu kartı açmadan işaretlenir. Yazarken notun üstünde yüzen biçim çubuğu: B, I, H, madde, onay, hizala (sol/orta/sağ), A−/A+, 6 renk (yazıda varsayılan + 5 renk); telefonda iki satır, 44 px. Not köşeden boyutlandırılır (i.w/i.h), yazının köşesi harf boyunu değiştirir. Telefonda klavye açılınca pano notu klavyenin, alt kutunun ve çubuğun üstüne kaydırır (yeniden boyutta fit yapılmaz). Yakınlaştırma durunca katman bırakılır → yazılar keskin (.plane.moving). 1366 + 390, açık/koyu, konsol hatası yok.

- [x] 141. (2026-11-23, B hattı) **Genel native'leşme** (sahip: "başka ne native'leşmesi lazımsa yap"): önce tools/native-audit.md (24 konu: ✓ vardı /
        ★ yapıldı / → başka madde), sonra 11 iş: her `title` tek tip ipucu (450 ms, ardışıkta anında, klavye odağında da); "?" = klavye kısayolları
        listesi (Ayarlar'da da); sağ tık menüsü klavyeyle (Menü tuşu/Shift+F10, ↑↓ Home End, Esc karta döner); liste satırı ve galeri kutucuğu
        Tab ile odaklanır, Enter açar, oklar gezer; telefonda alt sayfa tutamağı + aşağı çekip kapatma (azı yaylanır, kapanış Esc ile aynı yol);
        arayüz yazısı seçilemez + iOS uzun bas önizlemesi yok (yazı alanları seçilebilir); her düğmede basılma; ince kaydırma çubukları;
        titreşim (yıldız, görev bitti, sayfa kapandı); manifest: "Ara" kısayolu (sc-find.png, ?do=find), launch_handler navigate-existing, lang.
        Playwright 1366 açık/koyu + 390 açık/koyu (CDP dokunmayla sürükleme), konsol hatası yok.

- [?] 142-0. (2026-11-23, B hattı) **design/motion.html — imza animasyon örnekleri** (bugünkü Nts görünümü, yeni stil yok; yalnız transform/opacity,
        yay eğrisi CSS linear() ile; üstte "Hareketi azalt" önizlemesi + sistem ayarı). 6 konu, 22 elle denenebilir varyant: 1 tutma (A yay + hıza göre
        eğilme ≤6°, B asılı kâğıt sarkaç, C sade kalkış, D bas–kalk dokunsal), 2 sürüklerken (A hayalet yer tutucu, B nefes alan accent yer, C kuyruklu
        iz + sırayla FLIP), 3 bırakma (A yaylı oturma + halka, B nokta ızgarasına mıknatıs, C klasör/etiket/pano hedefi yutar + sayı, D parıltı + kıvılcım),
        4 dışarıdan dosya (A tüm alan karşılama, B ikonlar kavisle uçup karta döner, C sessiz kenar ışığı + "+3" hapı; Oynat ya da gerçek dosya sürükle),
        5 ipucu (A 141'deki gecikmeli + kısayol rozeti, B ok imleci izler, C tek kayan ipucu, D telefonda basılı tut + kaydır), 6 logodan imza (A nokta
        zıplar + "Kaydedildi", B satırlar yazılır, C bağlandı: nokta karttan karta uçar, D balon nefesi). ✓/✗ + not → motion-choices.json.
        Test: 1366/390 × açık/koyu, fare ve CDP dokunmayla sürükleme, hareketi azalt açıkken de, konsol hatası 0, yatay taşma 0. Sahibin seçimi bekleniyor.

## Her sürümde
- `sw.js` içindeki `VERSION`'ı artır.
