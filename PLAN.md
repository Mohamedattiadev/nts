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

## R. Sahibin 6. geri bildirimi (2026-11-21)
- [ ] 91. **"Düzenle" (katman düğmesi) "Günlere göre dizildi" diyor ama hiçbir şey dizilmiyor** (ekran görüntüsü: "Dün" etiketli taşınmış
        kart Bugün sütununda kaldı). Şüphe: `Board.tidy()` → `setPos(i, undefined)` + `savePos` kayıtları yerinde değiştiriyor, `S.items`
        dizisi yenilenmiyor → `visible()` önbelleği / `Board._key` / `Board.M` eski kalıyor (kural: items dizisi hep yenilenir, yerinde
        değiştirilmez). Proje panosunda `posBy` için de aynı. Taşınmış kart + Düzenle → kart kendi günüyle aynı sütuna dönmeli; Playwright ile kanıtla.
- [ ] 92. **Bugün ile dün yan yana ayırt edilmiyor:** gün sütunlarına hafif zemin bandı (günler dönüşümlü ton) ya da ince dikey ayırıcı,
        "Bugün" ana renkle vurgulu, başlıkta tarih + hafta günü ("Dün · 20 Kasım Cuma"), bir günün alt sütunları (4'erli) tek blok gibi dursun
        (aradaki boşluk küçük, günler arası boşluk büyük). Masaüstü + telefon, açık + koyu.
- [ ] 93. **Yapay zekâya pano hazırlat:** kutuya "poultrycare için pano hazırla" / "yazılımla ilgili ipuçlarını topla" yazınca seçili yapay zekâ
        (87) tüm kayıtlardan ilgilileri seçer, yeni proje panosu açar (`boards` + `posBy`), kartları başlıklı gruplara dizer (ör. Belgeler /
        Linkler / Görevler / Fikirler / Kişiler), en üste kısa özet yapışkan notu koyar; tek tıkla geri alınır. Köprüde yeni uç (`/board-plan`,
        sadece id + grup döner, metin göndermez fazlası). Kutudaki "Claude'a sor" cevabında "Pano yap" düğmesi de olsun.
- [ ] 94. **Daha native his + hız** (sahip: "daha native, daha hızlı, daha efektli olsun"):
        (a) görünüm geçişleri View Transitions API ile (Pano↔Liste↔Galeri, kayıt penceresi tıklanan karttan büyüyerek açılır/kapanır);
        (b) dokunma geri bildirimi: `:active` hafif küçülme, telefonda kısa titreşim (kaydet, görev bitti, sil), yalnız transform/opacity animasyonu;
        (c) kalem: `getCoalescedEvents()` + `requestAnimationFrame` ile pürüzsüz çizgi, uzun çizimde canvas katmanı;
        (d) resimler `decode()` sonrası yumuşak belirsin, iskelet yükleme her yerde;
        (e) açılış: ilk ekranda gerekmeyen modülleri (LaTeX, şifreler, içe aktarma, okuma, KaTeX) sonradan yükle, kabuk SW'den anında;
            hedef telefonda ilk ekran < 300 ms, her dokunuşa < 100 ms tepki (Playwright ile ölç, bench.log'a yaz);
        (f) PWA: uygulama ikonunda bekleyen görev sayısı (Badging API), masaüstünde `display_override: window-controls-overlay`.
- [ ] 95. **Öneriler (sahip onayladı 2026-11-21, ayrı ayrı yap: 95a–95g):** sesli not (basılı tut → kaydet → yapay zekâ yazıya döker); sabah özeti bildirimi
        (dün kaydettiklerin + bugünkü görevler); okuma listesinde "3 gün sonra tekrar göster"; ekran görüntüsünde tarih görünce "göreve çevireyim mi";
        Ctrl+K komut paleti (her şeye tek yerden); salt okunur paylaşılabilir pano linki; tarayıcı eklentisi (sağ tık → Nts'e gönder);
        gerçek native gerekirse aynı kodla Tauri (masaüstü) / Capacitor (telefon) sarmalayıcı.
        95a sesli not · 95b sabah özeti bildirimi · 95c okuma listesinde "3 gün sonra tekrar" · 95d resimde tarih → "göreve çevir?"
        · 95e Ctrl+K komut paleti · 95f salt okunur paylaşılan pano linki · 95g tarayıcı eklentisi (sağ tık → Nts'e gönder).
- [ ] 96. **Telefonda metni seçince ⋮ menüsünde "Nts'e kaydet"** (sahip): PWA o menüye giremez (Android'de sadece ACTION_PROCESS_TEXT
        alan native uygulama). Çözüm: Bubblewrap ile TWA Android paketi (aynı site, tam ekran) + içinde PROCESS_TEXT alan küçük bir
        aktivite → seçili metni `https://mohamedattiadev.github.io/nts/?do=new&text=…` ile açar, uygulama kaydeder ve "Kaydedildi" der.
        `assetlinks.json` (`.well-known`, Pages'te), imzalı APK `docs/` değil Releases'e; sahibe kurulum: APK'yı telefona at, kur.
        Bu arada "Paylaş → Nts" yolunun (share_target) Android'de metin için çalıştığını da doğrula. iPhone'da seçim menüsüne ekleme yok.

## Her sürümde
- `sw.js` içindeki `VERSION`'ı artır.
