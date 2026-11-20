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
- [ ] 4. Sayfa içinde sürüklenen şey (resim, seçili yazı) kutuya kopya olarak düşüyor. Sebep: `wire()` içindeki pencere
       düzeyi `dragenter/drop` her sürüklemeyi alıyor. Çözüm: belge içinden başlayan sürüklemeyi `dragstart`'ta işaretle
       ve yok say; küçük resimlere `draggable="false"`.
- [ ] 5. Uzaklaşınca gün başlıkları okunmuyor. Başlıklar her yakınlıkta okunur boyutta kalsın; %70 altında kartlarda tarih görünsün.
- [ ] 6. Açık temada pano %48'de boş görünüyor (`feedback-21`). Görünüm/tema değişince `fit()` kartları ekranın dışında bırakmasın.
- [ ] 7. Yazı kutusu listenin üstünde zor görünüyor (`feedback-19`). Kutunun arkasına düz/yumuşak geçişli arka plan, koyu temada daha belirgin kenar.
- [ ] 8. Kayıt penceresi boş ve kötü (`feedback-16`). Resim sol tarafı doldursun, bilgi sütunu sıkı, "Bağlantılı" küçük çipler,
       işlemler alttaki büyük çubuk yerine üstte ince bir çubukta.

## C. Claude bağlantısı ve ayarlar
- [ ] 9. Claude kendiliğinden bağlansın (`feedback-22`). Sebep: köprü servisi durdurulmuştu ve 8790 gibi başka bir
       localhost portunun kendi veritabanı var, token'ı yok. Çözüm: her `http://localhost:*` sayfasında
       `http://127.0.0.1:8787/config`'ten token al (köprüde `/config`'i localhost kaynaklarına aç); servise `Restart=always`.
- [ ] 10. Claude kapalıyken sade açıklama + tek işlem: PC'de "Köprüyü başlat" (kopyalanabilir
        `systemctl --user start hizli-note-bridge`), telefonda "Bilgisayar kapalı ya da Tailscale bağlı değil".
- [ ] 11. Ayarları sadeleştir: sadece 3 bölüm. **Hesap** (Google girişi, senkron durumu, şifre), **Görünüm** (tema, ana renk),
        **Claude** (tek durum satırı + "Bağlan"; adres/token "Elle ayarla" altında). WhatsApp içe aktarma, yedek, geri yükleme
        "Kayıtları taşı" alt sayfasına; eski GitHub senkronu en altta "Gelişmiş"e.

## D. Ekranı sadeleştir
- [ ] 12. Önce sahibe 2 seçeneği ekran görüntüsüyle göster, seçtiğini yap. Önerim: Pano/Liste/Galeri geçişi sol araç
        çubuğunun en üstüne (üst ortadaki kalkar); yakınlaştırma araçları sadece yakınlaştırırken/pano üstündeyken görünsün,
        boş yere çift tık = hepsini göster; sağ üstte sadece ayarlar; altta sadece kutu.
- [ ] 13. Açılır menüler daha güzel olsun (filtre/konular menüsü, arama sonuçları): yumuşak gölge, büyük satırlar, ikonlar,
        bölüm başlıkları, arama sonuçlarında ↑/↓/Enter ile gezinme.

- [ ] 13a. **Sol araç çubuğuna "Fotoğraflar" filtresi** (sahip, 2026-11-20): şu an Tümü / Link / Not / Dosya / Yıldızlı / Konular var;
        resimler ayrı bir ikonla (resim ikonu) kendi filtresine gelsin, "Dosya" resim olmayan dosyaları göstersin. Telefondaki filtre menüsünde de olsun.

- [ ] 14. **Yazı kutusundaki ikonlar tam ortalı değil** (`feedback-23`): `+`, ✦ ve ↑ yazı satırıyla aynı hizada değil.
        Tek satırda hepsi dikey ortada; kutu büyüdükçe (çok satır) düğmeler altta hizalı kalsın. Ekran görüntüsünde yakından kontrol et.
- [ ] 15. **Kutudaki düğmeler kafa karıştırıyor** (`feedback-23`): ↑ ok "kaydet" diye anlaşılmıyor, ✦ (Claude) düğmesi
        ne olduğu belli değil. Çözüm önerisi: ayrı ✦ düğmesini kaldır; sağda tek, yazılı düğme: normalde "Kaydet",
        yazı soruysa (sonu `?`) "Claude'a sor" olur ve rengi değişir. Kutunun içinde ya da altında küçük ipucu:
        "Enter: kaydet · sonu ? ise Claude'a sorar". Telefonda yazı sığmazsa ikon + kısa yazı ("Kaydet" / "Sor").
        İstersen solda küçük bir seçici: "Not | Sor" (sorma modunu `?` beklemeden açar). Sahibe 2 seçeneği ekran görüntüsüyle göster.

## E. Yeni özellikler
- [ ] 16. **Otomatik yapılacaklar listesi (numaralı: 1- 2- 3-).** Claude her yeni kaydı düzenlerken görev mi diye bakar
        (`bridge/server.mjs` organize çağrısı, `ORGANIZE_SCHEMA`'ya `todo: { text, due? }`). "Yarın 10:30 diş randevusu" →
        tarihli görev. "Yapılacaklar" görünümü: numaralı liste (1., 2., 3. …), onay kutusu, sürükleyerek sıra değiştirme,
        tarihi yaklaşan üstte, geçen kırmızı; işaretlenen biter ve senkronlanır. Elle de görev eklenebilir
        (kutuda "- " ya da "1. " ile başlayan satırlar → her satır bir görev).
- [ ] 17. **Akıllı listeler, otomatik.** Claude her kaydı birkaç sabit listeye koyar: "Bakılacaklar", "Beğendiklerim",
        "Önemli", "Yapılacaklar" + proje listeleri (ör. poultrycare). `lists: [...]`; sahip elle taşırsa Claude dokunmaz
        (`userLists: true`). Düğme yok: bilgisayar açık ve köprü bağlıyken arka planda kendisi yapar; telefondan
        kaydedilenler PC açılınca sıralanır. Listeler sol çubukta sayılarıyla; ad değiştirme/gizleme ayarlarda.
- [ ] 18. **Renk ve öncelik.** Ayarlarda uygulamanın ana rengini seç (hazır renkler + özel; açık/koyu için `--accent`,
        `theme-color`). Kayıtlara renk etiketi (kırmızı/turuncu/sarı/yeşil/mavi/mor) ve öncelik (yüksek/normal/düşük):
        kartta/satırda renkli kenar; filtrele ve sırala; pencereden ve sağ tık / uzun basma menüsünden değiştir.
- [ ] 19. **Panoda not ve çizim (Excalidraw gibi).** Boş yere çift tık → yerinde yazılan yapışkan not. Küçük araç paleti:
        seç, not, kalem, ok, dikdörtgen, yazı, silgi. Çizimler kendi kayıt türü (`type: 'draw'`, pano koordinatında SVG yolları),
        senkronlanır. Excalidraw'ı (MIT) CDN'den gömmek mi, küçük kendi katmanımız mı: telefonda da çalışan hafif olanı seç.
- [ ] 20. **Listede ve galeride üzerine gelince önizleme.** Sağda büyük önizleme kartı (resim, PDF ilk sayfa, link görseli +
        açıklama, not metni) + hızlı işlemler; tıklayınca pencere açılır. Sadece masaüstü.
- [ ] 21. **Tanıtım turu.** İlk açılışta (ve ayarlarda "Nasıl kullanılır?") 5–6 adım, Geri / İleri / Atla; her adım bir
        parçayı gösterir: kutu, sol çubuk, kart sürükleme, `?` ile Claude'a sorma, Google girişi.
- [ ] 22. **Logo: sadece ikon.** `design/logo-source.png`tan yazısız ikon: yuvarlak köşeli not, çizgiler, turuncu kalem ve
        parıltı, koyu çerçeve. Temiz SVG (`icons/icon.svg`), `icon-192/512.png` + maskable, CSS `.mark`, manifest.
        Varsayılan ana renk turuncu olabilir.

## F. Rakip incelemesinden (Linkwarden, Karakeep, linkding, Readeck, Raindrop, mymind, Readwise Reader)
- [ ] 23. Linkin okunur kopyasını sakla (köprü makale metni + ana görsel) ve okuma görünümü + metin işaretleme.
- [ ] 24. Nts için MCP sunucusu (köprü: ara / ekle / listele) → Claude Code'dan "geçen hafta ne kaydettim?".
- [ ] 25. Kendi link önizleme servisimiz (Supabase Edge Function), microlink yerine: sınır yok, linkler başka yere gitmez.
- [ ] 26. "Kaydettin ama bakmadın" haftalık liste.
- [ ] 27. Tarayıcı yer imlerini içe aktar (Netscape HTML dosyası).

## Her sürümde
- `sw.js` içindeki `VERSION`'ı artır.
