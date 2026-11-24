PARALEL HATLAR (sahip, 2026-11-23: "iş hızlansın, 2 oturum 2 oturum, her oturum tek iş, token fazla kullanılmasın"):
İki hat (A, B) aynı anda çalışır; her oturum TEK madde yapar, sonra kendi hattına devreder. Her hat kendi git worktree'sinde:
A → ../hizli_note-A (dal lane-A, test sunucusu port 8791), B → ../hizli_note-B (dal lane-B, port 8792). Ana klasör (hizli_note)
ve oradaki commit'lenmemiş değişiklikler sahibin/eski zincirin: DOKUNMA.
1. Başla: `git fetch -q && git status --short` temizse `git reset -q --hard origin/main`. Sunucu: `python3 -m http.server <port> --bind 127.0.0.1`
   (kendi klasöründen, arka planda); testler `NTS_URL=http://127.0.0.1:<port>/ node ...` (nts-playwright-test dosyaları bunu okur).
2. Madde seç: aşağıdaki SIRA'da yukarıdan ilk `- [ ]` (`[~A]`/`[~B]`/`[?]`/`[x]` olanları atla). Öteki hattın şu an yaptığı maddeyle aynı
   dosya bölgesine dokunacaksa (ör. ikisi de pano kartı) bir sonrakini al. `[ ]` → `[~A]` (ya da `[~B]`) yap, commit "NEXT_SESSION: A takes N",
   `git push origin HEAD:main`. Push reddedilirse `git pull --rebase origin main`; madde bu arada alınmışsa başka madde seç. Push = kilit.
3. Yap (KURALLAR aynen geçerli: telefon önce, ekran görüntüsü, konsol hatası yok, node --check). "ÖNCE örnek sayfası … sahip seçsin"
   maddelerinde örnek sayfayı yap, maddeyi `[?]` yap, seçimi sahibe sor (son mesajında).
4. Bitir: PLAN.md'de [x] + not, burada `[~A]` → `[x]` + hash. Commit'ten ÖNCE `git status --short` ve `git diff --cached --stat`: yalnız
   kendi dosyaların. sw.js VERSION: `git pull --rebase origin main` SONRASI origin'deki sayının bir fazlası (çakışırsa büyüğü +1).
   `git pull --rebase origin main && git push origin HEAD:main`; çakışmada iki tarafın işini de koru, node --check ile doğrula.
   Pages'te yeni VERSION'ı kontrol et.
5. `tools/handoff.sh A` (ya da B) çalıştır ve dur. Hiç `[ ]` kalmadıysa devretme; sahibe kısa Türkçe özet + sorular.
Ders (2026-11-23): başka oturumun `git add` ile hazırladığı (staged) dosyalar senin commit'ine girer → commit'ten önce `git diff --cached
--stat` bak, yabancı dosya varsa `git restore --staged <yol>` değil, dokunmadan bekle/ayrı çalış (worktree bu yüzden).

Nts projesine devam et: /home/ati/Attia-Pro/Projects/hizli_note (uygulama **Nts**, repo `nts`, https://mohamedattiadev.github.io/nts/). Türkçe konuş.

İlk iş: PLAN.md'yi oku (özellikle "P. Sahibin 5. geri bildirimi"), sonra şu skill'leri oku:
~/.claude/skills/nts-playwright-test (lib.mjs, addimg.mjs, seedyears.mjs, audit.mjs, twodevice.mjs → scratchpad'e kopyala) ve
~/.claude/skills/parallel-claude-sessions.

SIRA (sadece [ ] olanlar, sırayla; [~] başka oturumda, atla):
- [x] 86 pano araçları kutuyla çakışıyor + çalışmayan düğmeler (8b1e792)
- [x] 89 logo (.mark) koyu tema, boy, hiza, accent rengi (8b1e792)
- [x] 88 sol çubuk kapanınca sıralı animasyon → yalnız ">" (8b1e792)
- [x] 90 çizimde titreme + genel yumuşak geçişler (006f87f)
- [x] 103a görünüm değişince arama listesi kapansın; arama listesi açıkken galeri önizleme paneli gizlensin (üst üste binme) (0667a1e)
- [x] 92b uzaktayken gün başlığı kesiliyor ("BU… 3"): hiçbir yakınlıkta kesilmesin, ters ölçekle okunur kalsın; %10–%200 tara (PLAN 92'deki ek not) + günler arası net ayrım: bant + ince dikey çizgi, her yakınlıkta görünür (0667a1e)
- [x] 98 telefonda pano görünümü çok kötü (383a3a7)
- [x] 111 açık tema telefonda çalışmıyor (d426e46)
- [x] 109 pano hataları: zoom bazen çalışmıyor, kartlar cihazlar arasında kötü yere kayıyor, içerik ekleme düğmeleri, gün arası çizgi hiç görünmüyor (94bf03e)
- [x] 113 ">" sekmesi çubuğun dikey ortasında + logo/sol çubuk hizası (b5479b7)
- [x] 101 TELEFON ÖNCE: phone-audit.mjs (4 boyut × 2 tema, tüm ekranlar/pencereler: üst üste binme, taşma, boş alan, 44 px, güvenli alan, aç/kapa + geri tuşu) → hepsini 0'a indir; PLAN 101 (1d5137f)
- [x] 125 kutunun yazısı telefonda ortada (bu oturum)
- [x] 126 HATA: panoda taşırken kart en sola kaçıyor + sayfa "yenileniyor" → sürüklerken gelen güncelleme beklesin (PLAN 126, twodevice ile kanıtla) (9f10873)
- [x] 127 liste görünümünde sağdaki önizleme (.peek) kutunun üstüne biniyor (1366×768) → çakışma 0 (9f10873)
- [x] 128 pano kartında etiketler kesik ("# y…") → alt satıra insin, gerekirse "+2" (9f10873)
- [x] 129 "Düzenle" bağlı kartları çok yakın koyuyor, bağ çizgisi görünmüyor → ≥48 px (108 ile) (d90b5fe)
- [x] 102 (başlangıç işi tools/wip-102.patch: `git apply tools/wip-102.patch`, resim önizlemesi yer tutar + growTo; sonra patch'i sil) hareket kuralları: geldiği yere geri dön, FLIP, zıplama yok (layout-shift ~0), 150–250 ms, reduced-motion (PLAN 102; 94a/b ile birlikte) (733d9b0)
- [x] 108 bağlantı çizgileri: kenardan yumuşak eğri, kartı delmez, normalde silik / üstüne gelince belirgin, uzakta gizli (PLAN 108) (71c37c4)
- [x] 130 Locus'tan alınacaklar: 130b (resimlere otomatik içerik etiketi) + 130f (sakin çipler) yapıldı (9a74f81); kalanlar bağlı maddelerde: 130a → 103b/104e, 130c → 99a, 130d → 131-0, 130e → 106a
- [x] 131-0 (+130d) ÖNCE design/folders.html (klasör kartı stilleri, ÇOK GÜZEL görünüm şart — Locus kalitesi, PLAN 131; sahip seçsin; [?]) → 131 yapay zekâ ile otomatik klasörler (PLAN 131) — ÖRNEK HAZIR: design/folders.html (A Cep · B Yığın · C Albüm), sahibin seçimi bekleniyor (7d83168) → sahip hiçbirini seçmedi, daha farklı stiller istedi: 131-0b
- [x] 103b (+130a görsel arama penceresi, PLAN 130a) tek kutu modları: ✎ Not · 🔍 Ara · ✦ Sor seçici, Enter/simge/placeholder moda göre, Not'ta sadece "N benzer kayıt" çipi (PLAN 103b); Ara modu canlı: Enter'sız her harfte süz (sayfa da), "poul · 4 kayıt ×" çipi, Enter = ilk sonucu aç; yazarken TİTREME YOK (baştan çizme yok, sınıfla gizle + FLIP) (db99aa5)
- [x] 118 kutu placeholder + Tab ipucu + işarete göre düğme simgesi (103b ile birlikte yap) (db99aa5)
- [x] 136 ÇOK ÖNEMLİ kutu/mod seçici arayüzü karışık (sahip, ekran görüntüsü; PLAN 136): B 104f'te (kutuya dokunmuyorsa) al; sahip karar verdi: en solda "+" (ChatGPT gibi), yanında TEK mod düğmesi, Tab ile 3 mod arasında güzel animasyonla geçiş, yazı alanı temiz (kısa placeholder, eski ipuçları yok) (dcbe02c)
- [x] 104a+104b+104c akıllı arama: doğal dil süzgeç çipleri, yazım hatası toleransı, her yerde ara + vurgulu alıntı (PLAN 104) (91a534a)
- [x] 104d ÇOK ÖNEMLİ arama dili ayrıştırıcısı: regex /…/ (güvenli), joker, VEYA/|, -hariç, parantez, "tam ifade", alanlar (başlık: url: site: uzantı: etiket: proje: sohbet: kaynak:), tarih (2024-03, aralık, >, son:7g, dün), is:/has:, boyut:, sırala: + ≥60 birim testi (tools/test/) + 3 dil: Arapça normalleştirme, Türkçe İ/ı, anahtar sözcükler tr/en/ar, testlerde her dil (f8faa08)
- [x] 104e ÇOK ÖNEMLİ otomatik tamamlama + "?" sözdizimi kartı + sıralama/gruplar + boş kutu önerileri (da76e01)
- [x] 104f ÇOK ÖNEMLİ anlamsal arama: cihazda çok dilli gömme modeli (sem.js Worker, ~140 MB bir kez) + "Yapay zekâ ile ara" (bb86e39)
- [x] 137 seçili süzgeç (Kaynak/konu/renk/proje) sol çubukta belirgin görünsün, seçildiği anda (sahip, ekran görüntüsü; PLAN 137) (f5c8413)
- [x] 104g ÇOK ÖNEMLİ uçtan uca: 10k kayıtta tuş < 50 ms, telefonda da, kayıtlı aramalar yeni dili saklar; ekran görüntüleri + PLAN notu (83a16ec)
- [x] 138 ÇOK ÖNEMLİ elle BAĞLA (sahip: "bağlamak istesem napmam lazım, yok öyle özellik"): pano kartında sağ tık → "Bağla…" → öteki karta tıkla (Esc iptal, ipucu "bağlanacak kartı seç"); Shift ile 2+ kart seç → "Bağla"; telefonda uzun bas → menü → Bağla → öteki karta dokun; bağlı kartta "Bağlantıyı kaldır". Veri i.links (çizim 108'de 'man' türü olarak var, oluşturan yok); iki cihaz senkronu + kayıt penceresindeki "Bağlantılı" listesi. Masaüstü + telefon ekran görüntüsü. (bab8925)
- [x] 104g2 telefonda çok geniş eşleşmede (8k sonuç) tuş ~100 ms → < 50: Find.list kısmi sıralama (en iyi 24), sonuç penceresi FLIP ölçümü azalsın (PLAN 104g notu; keybench.mjs ile ölç) (823068b)
- [x] 106-0b ÖNCE rich-ui.html'i YÜKSELT (sahip: "çok beğendim ama biraz daha upgrade lazım, daha native görünsün, daha fazla şey olsun"): ✓ seçilenleri (design/rich-ui-choices.json) daha yerli/native uygulama hissiyle yeniden çiz (sistem fontu, iOS/Android/macOS gibi gölge-köşe-boşluk, yumuşak dokunma geri bildirimi, açık+koyu, telefon 390 px), her bölüme 2–3 YENİ örnek ekle (ör. takvim/etkinlik kartı, konum, kişi kartı, tarif, fatura/makbuz, ses notu dalga formu, alıntı, karşılaştırma tablosu, zaman çizelgesi, hava durumu); seçilmeyenler (c-glass, a-link-C …) çıkarılsın; ✓/✗ + not + "Seçimlerimi indir" kalsın; madde [?], sahip seçsin. 106a–e bu seçimden sonra. — ÖRNEK HAZIR (A, 2026-11-23): design/rich-ui.html (25 eski ✓ yerli hisle + 16 YENİ), sahibin seçimi bekleniyor (6c76e47) → SAHİP SEÇTİ (2026-11-23, design/rich-ui-choices-2.json): b-menu-A/B ✗, gerisi ✓ + notlar → 106-0c
- [x] 139 ÇOK ÖNEMLİ panoda fareyle KUTU SEÇİMİ (sahip: "mouse ile bir yere basıp birkaç tane eleman seçebileyim"): boş yerde sürükle → yarı saydam accent dikdörtgen, içine/değdiği kartlar + yazılar + yapışkan notlar + çizimler seçilir (Shift = ekle, Ctrl/Cmd = çıkar/aç-kapa); Ctrl+A hepsi, Esc bırakır; seçiliyken birlikte taşı, Delete sil (geri al), sağ tık menüsü (Bağla, Etiketle, Sil, Hizala/Düzenle); boşlukla sürükleme/orta tuş = kaydırma kalır; telefonda uzun bas + sürükle. 134 (galeri) ve 138 (Shift seçim) ile aynı seçim modelini kullan. (ed40acf)
- [-] 143-0 ERTELENDİ ŞİMDİ (sahip açmak istedi, 140/141/142-0'dan önce; sahip rich-ui için "hepsi AI slop" dedi → kimlik bunun cevabı) ÖNCE design/identity.html — Nts'e ÖZGÜ arayüz kimliği (sahip: "UI da daha özgü, unique tasarım"): sıradan "shadcn/AI şablonu" görünümünden çık. 3–4 belirgin YÖN, her biri aynı gerçek ekranları gösterir (pano + kart, liste satırı, kutu/mod düğmesi, sol çubuk, kayıt penceresi, boş durum, telefon 390 px), açık + koyu: ör. (A) kâğıt/defter — hafif doku, mürekkep çizgisi, el yazısı vurgu; (B) yumuşak fiziksel — kabartmalı düğmeler, katmanlı kartlar, belirgin derinlik; (C) editoryal — güçlü tipografi, büyük başlıklar, ince çizgiler, az renk; (D) Nts işareti ailesi — logodaki tek kalın işaretten türeyen köşe/ikon/ayraç dili. Her yön için: renk tokenları, yazı tipi (Google Fonts, Türkçe + Arapça destekli), köşe/gölge/çizgi kuralları, ikon stili, imza ayrıntı (ör. kartın köşe kıvrımı, accent çentik). ✓/✗ + not + "Seçimlerimi indir"; madde [?], sahip seçsin → 143 seçilen kimliği tokenlarla tüm uygulamaya yay (142 animasyonları ve 141 native işleriyle uyumlu; AA kontrast, phone-audit 0). — 1. tur (A Defter…D) sahip: "çok kötü, bizim tasarımı al üstüne yap" → 2. TUR HAZIR: design/identity.html gerçek uygulamanın kopyası (design/identity/snap-*.html + skins.css): Şimdi · 1 İşaret · 2 Sıcak · 3 Derinlik · 4 Tür rengi, seçim bekleniyor → sahip (2026-11-23): "güzel değiller, boşver, sonra bakarız" — iki tur da reddedildi; bugünkü tasarım kalıyor, kimlik işine sahip yeniden isteyene kadar dokunma
- [x] 106-0c sahip seçti (2026-11-24): 51 örneğin hepsi ✓ → design/rich-ui-choices-3.json; 9'u "AI slop olmasın" notlu → 106s
- [x] 140 ÇOK ÖNEMLİ panodaki YAZI ve NOT (yapışkan not) araçları "çok kötü" (sahip) → yeniden yap, native hissiyle: tıkla → anında yazmaya başla (imleç orada, placeholder yok), otomatik büyüyen kutu, rahat font/satır aralığı, kalın/italik/liste/başlık kısayolları, küçük yüzen biçim çubuğu (renk, boy, hizalama), not rengi paleti (5–6 sakin renk, koyu temada da), köşeden boyutlandırma, çift tıkla düzenle / dışarı tıkla bitir, boş kalırsa kendiliğinden silinsin, kaydırma-yakınlaştırmada keskin; Figma/FigJam/Apple Freeform/Miro'ya bak. Masaüstü + telefon (yazarken klavye kutuyu kapatmasın), açık + koyu ekran görüntüsü. (18e15d2)
- [x] 141 ÇOK ÖNEMLİ uygulamanın genel "native"leşmesi (sahip: "başka ne native'leşmesi lazımsa yap"): önce tools/native-audit.md listesi çıkar, sonra en etkili ~10 tanesini yap. Bak: sistem fontu/ikon tutarlılığı, :active/basılma geri bildirimi her düğmede, seçilemeyen arayüz yazısı (user-select), sağ tık menüsü her yerde (liste/galeri/pano) aynı ve klavyeyle gezilir, klavye kısayolları (Ctrl+Z/Y, Delete, Ctrl+A, ok tuşları, Enter/Esc) + "?" listesi, kaydırma fiziği/overscroll, sürükle-bırak (dosya + kartlar) ve gölgesi, odak halkası, ipucu (tooltip) gecikmesi, telefonda alt sayfa (bottom sheet) + sürükleyip kapat, kaydır-sil/arşivle hareketleri, titreşim (navigator.vibrate) uzun basmada, pencere geçişleri, PWA: başlık çubuğu rengi, kısayollar (manifest shortcuts), paylaşım hedefi. Her biri masaüstü + telefon. (ef936db)
- [x] 142-0 sahip seçti (2026-11-24) → design/motion-choices.json; uygulama 142
- [x] 131-0b sahip seçti (2026-11-24): A B C D E ✓ (F–J işaretsiz = alınmaz) → design/folders-choices.json; uygulama 131
- [x] 105a+105c+105d doğal cümle → "Anladığım" çipleri, asla boş sonuç yok, niyet tahmini (PLAN 105) (b57c737)
- [x] 105b+105g doğrudan cevap kartı + kullandıkça öğrenen sıralama (c637cb7)
- [x] 105e+105f+105h sesle arama, resimle arama, çevrimdışı kontrol + 15 cümlelik persona testi (tr/en/ar) (2a3dbfb)
- [x] 132 renkle arama (104d'ye renk: alanı) (ad27736)
- [x] 133 benzer kayıtlar şeridi (104f'den sonra) (7e459a6)
- [x] 134 galeride çoklu seçim (314a354)
- [x] 135 ekran görüntüsüne otomatik başlık (6c95038)
- [x] 106-0 ÖNCE örnek sayfası design/rich-ui.html: 106a–e için 2–3'er canlı örnek + ✓/✗ + not; sahibe göster, seçimlerini bekle ([?]); 106a–e sadece ✓ olanlarla — ÖRNEK HAZIR: design/rich-ui.html (35 örnek, ✓/✗ + not, "Seçimlerimi indir"), sahibin seçimi bekleniyor (0a99e99) → SAHİP SEÇTİ (2026-11-23, design/rich-ui-choices.json): ✓ a-link-A/B, a-media-A/B/C, a-pdf-A, a-code-B, a-wa-A/B, a-note-A, b-menu-A/B/C, c-cover-A, c-empty-A, d-count-A/B/C, d-prog-B, d-check-A, d-chart-A/B, e-ans-A/B/C; seçilmeyen: a-link-C, a-pdf-B, a-code-A, a-note-B, c-cover-B, c-empty-B, c-glass-A/B, d-prog-A, d-check-B
- [x] 106s ÖNCE "AI slop" temizliği (sahip 2026-11-24: "ai slopleri düzelt, hallet" — yeniden SORMA, düzeltip doğrudan 106a'ya geç): rich-ui.html'de
  e-ans-B, e-ans-C, a-quote-A, n-book-A, n-film-A, n-price-A, n-parcel-A, n-gh-A, n-med-A + a-event-B'nin boşlukları. PLAN 106s'deki ölçütlerle;
  aynı kurallar 106a–e'nin TÜM kartlarına uygulanır (bkz. PLAN 106s) (47b9b79)
- [x] 106a (+130e notlar gerçek mini belge) zengin kart önizlemeleri (link görsel+renk, gömülü video/müzik/harita, PDF kapak, renkli kod, WhatsApp balonları) (b206c19)
- [x] 106b zengin not düzenleyici ("/" menüsü, Markdown kısayolları, onay listesi, tablo, resim; saklama Markdown) — sahip: TAM hâliyle (tablo + "/" menüsü dahil) (1815067)
- [x] 106c daha canlı görünüm (kapak resmi, hafif cam, boş durum çizimleri; AA kontrast) (49c0d0a)
- [x] 106d etkileşimli parçalar (geri sayım, ilerleme, onay listesi ilerlemesi, CSV grafik) — sahip: kalsın; varyantları 106-0'da göster (ff441a4)
- [x] 106e zengin yapay zekâ cevapları (OpenUI fikri, vanilla): izinli parça şeması → kartlar, tablo, zaman çizelgesi, onay listesi, grafik, eylem düğmeleri (PLAN 106e) (3ab0f18)
- [x] 97 Tüm verileri sil + kendi onay penceremiz ("SİL" yaz), bu cihaz / her yerden; sahte Supabase ile test (cbc629e)
- [x] 88b sol çubuk kapanışı DÜZELT (sahip, ekran görüntüleri): kapanınca filtre çubuğu gider, çizim paleti KALIR (panoda), "<" düğmesinin durduğu yerde (paletin üstünde) küçük ">" görünür; palet açık değilse yalnız ">". Kapanış/açılış ~150 ms (şu an çok yavaş), iki adım bekletmeden. Masaüstü açık+koyu, ekran görüntüsü. (ce05177)
- [x] 88c ">" sekmesi paletin SAĞINDAN çıksın (paletin üstünde ayrı kutu değil; paletle aynı zemin, yapışık kulakçık). PLAN 88c. (001f6f0)
- [x] 87 ilk açılışta Claude / Codex / Gemini seçimi (köprü de; bridge/server.mjs değişince `systemctl --user restart hizli-note-bridge`) (3df1968)
- [x] 91 "Düzenle" dizmiyor (Board.tidy yerinde değiştiriyor, S.items yenilenmiyor — PLAN 91'deki şüpheyi önce kanıtla) (c7e6d5e)
- [x] 92 bugün / dün sütunları ayırt edilsin (zemin bandı, ayırıcı, Bugün vurgusu, başlıkta tarih) (3c4cfcd)
- [x] 94a+94b View Transitions geçişleri + dokunma geri bildirimi (be289c8)
- [x] 94c+94d pürüzsüz kalem + resim/iskelet yumuşak yükleme (9164705)
- [x] 112 derin kullanıcı testi: her düğme tek tek (masaüstü + telefon) (19a52b6)
- [x] 142 imza animasyonları uygula (804f7ca) (PLAN 142; design/motion-choices.json): tutma m1-A (+m1-B sarkaç ÇOK DAHA AZ), sürükleme m2-A+m2-B
  DAHA YAVAŞ, bırakma m3-C + m3-D abartısız, dosya m4-B, ipucu m5-B, logo m6-A (+m6-C yeniden, "çok kötü"); 60 fps, reduced-motion, telefon
- [x] 131 otomatik klasörler (95245e1; yapay zekâsız kaynaklar + A–E stil + ayar; kalan 131b) (PLAN 131; design/folders-choices.json): stiller A Cep, B Yığın (animasyonu korunsun), C Albüm, D Dosya (daha güzel
  yap), E Ayraç (etiket sekmesini sahip çok beğendi); varsayılanı E, ayarda seçilebilir
- [x] 131b (c3819ba) otomatik klasörlere yapay zekâ: 104f gömmeleriyle kümeleme, köprü kümeye kısa ad verir, yeni kayıt en yakın klasöre; birleştir, "bu kayıt buraya ait değil"; 10k kayıtta ölçüm (PLAN 131 notu)
- [x] 110 senkron sadeleşsin (tek durum noktası) + iki cihaz testi (a78ded9)
- [~] 114 liste/galeri kartlarında etiket + simge (decfec6, kısmen)
- [x] 115 görünüm seçici 10 sn sonra gizlenir, yaklaşınca iner (b15e567)
- [x] 116 logo = pano seçici (sağ alttan taşı) (fbfa07f)
- [x] 117 yüzen arayüz altındaki kartı kapatmasın (saydamlaş) (15ef8b5)
- [x] 119-0 sahip seçti: A Kalem ama "çok kötü, upgrade et" → 119-0b (design/zoomout-choices.json)
- [?] 119 ÇOK ÖNEMLİ uzaklaşınca kesik çizgili kümeler + oklar (önce design/zoomout.html, sahip seçer) — ÖRNEK HAZIR: design/zoomout.html (A Kalem · B Balon · C Ada + ok nedenleri), sahibin seçimi bekleniyor (767ba37)
- [x] 120 yapay zekâ imleci (Figma gibi, ad + logo rengi) (5e5578d)
- [x] 121 cam görünüm ayarı (sahip 2026-11-23: öne alınmasın, sırası gelince) + turun sonunda Düz/Cam seçimi (d1198ca)
- [x] 122 turda Google ile giriş / Misafir seçimi (f73e1f5)
- [x] 123-0 sahip seçti: t-B Üç kadran + süzgeçte (design/dial-choices.json) → 123-1
- [?] 123 kasa çarkı tarih/etiket seçici (önce design/dial.html, sahibe sor) — ÖRNEK HAZIR: design/dial.html (tarih: A Kasa · B Üç kadran · C Bavul kilidi; etiket: A Tam halka · B Alt yay; nerede kullanılsın), sahibin seçimi bekleniyor (ab7efb3)
- [x] 124 tanıtım sayfası (site/) + README düğmesi (e1eaf25)
- [x] 94e+94f açılış hızı (lazy modüller, ölçüm) + Badging / window-controls-overlay (9b353df)
- [x] 93 yapay zekâya pano hazırlat (87'den sonra; köprüde /board-plan) (c565969)
- [x] 96 Android seçim menüsünde "Nts'e kaydet" (Bubblewrap TWA + PROCESS_TEXT; ?do=new&text= desteği; assetlinks.json) (ab140a2)
- [x] 95e Ctrl+K komut paleti (f657ed1)
- [x] 95a sesli not (basılı tut → kaydet → yapay zekâ yazıya döker; köprü yoksa sadece ses dosyası) (f198621; phone-audit bitmedi, köprü restart gerek)
- [x] 95c+95d okuma listesinde "3 gün sonra tekrar" + resimde tarih → "göreve çevir?" (7955949)
- [x] 95b sabah özeti bildirimi (Remind/SW bildirimi; Claude özeti köprüden) (5077000; CİHAZ TESTİ: yüklü uygulamada sabah bildirimi; köprü restart gerek; phone-audit yine 15 dk sınırında bitmedi)
- [x] 144 imleçler daha canlı (sahip 2026-11-24: "Claude imleci güzel ama daha animasyonlu, daha hareketli olmalı; ona benzer bir tane de benim olsun"): PLAN 144 (19b19d5)
- [x] 145 panodaki zengin kartlar panoda ÇALIŞSIN: tıkla → yerinde açılır/oynar (PDF sayfa çevir, ses/sesli not oynat, video, harita, onay listesi…) + kartta "büyüt" düğmesi → açılır pencerede (sağ tık menüsünde de "Pencerede aç"); PLAN 145 (c63aafa)
- [x] 146 HATA (sahip, design/feedback-24.png): logo/pano seçici açılır listesi (116) sol çubuğun ÜSTÜNE biniyor + "Pano: Genel — değiştir" ipucu listenin "PANOLAR" başlığını kapatıyor; PLAN 146 (31e60c2; sw v97)
- [x] 123-1 kasa çarkı tarih seçici: sahip B Üç kadran + süzgeçte kullanılsın; "o güzel his yok" → bugünkü Nts arayüzüne uygun, çok yumuşak, ← → (ve ↑ ↓) ile hareket; PLAN 123-1 — YAPILDI: t-B aslında etiket 'Alt yay', süzgeçte konu yayı olarak (8de0da7)
- [?] 119-0b design/zoomout.html YENİ TUR: sahip A Kalem seçti ama "çok kötü, daha iyi daha görünümlü olsun" → A ailesinden 3 çok daha güzel varyant (bugünkü Nts görünümü, Locus kalitesi); ok nedenleri sahip "en uygun neyse" → sen seç, gerekçesiyle göster; [?] yap, sahip seçsin; PLAN 119-0b — ÖRNEK HAZIR: design/zoomout.html 2. tur (A1 Çerçeve · A2 Fosfor · A3 Mürekkep + ok kuralları önerisi), sahibin seçimi bekleniyor (45cd9b1)
- [x] 147 ÇOK ÖNEMLİ akıcılık (sahip 2026-11-24: "neden çok smooth değil, yavaş application?"): ÖNCE ÖLÇ, sonra düzelt; PLAN 147 (f058825)
- [ ] 147b akıcılık 2. tur (PLAN 147 sonu): telefonda kutuya ilk dokunuşta 1–2 sn uzun görev, görünüm değişimi <100 ms, pano yakınlaştırma 4x'te ≥45 fps, kayıt penceresi açılışı; tools/perf.mjs ile eski sürüme karşı dönüşümlü ölç
- [x] 147c akıcılık: BÜTÜN uygulama (sahip: "çok hızlı olsun bütün app") — tools/perf.mjs'e ölçülmemiş ekranları ekle: Yapılacaklar, süzgeç/⋯ penceresi, Tarihe git, arama sonuç penceresi + Enter ile açma, Sor cevabı, okuma sayfası, Ayarlar sayfaları, Şifrelerim, Çöp, pano seçici, içe aktarma (WhatsApp zip 1000 kayıt), senkron gelirken; en kötülerini düzelt, kalanı 147d… (c693556, sw v104)
- [ ] 147d akıcılık: telefonda her pencere (showModal) arkadaki 10k satırlık liste yüzünden 300–1300 ms (Çöp, okuma, Ayarlar, kayıt penceresi) → sebebi kanıtla (inert/top-layer stil hesabı?), düzelt; tools/perf.mjs ONLY=trash,reader,settings,itemOpen; PLAN 147c sonu
- [x] 148 ÇOK ÖNEMLİ yapay zekâ az token harcasın (çok kayıt olunca): ölç + kes; PLAN 148 (00f90e8; sw v99; 1000 WhatsApp -%41, resim -%40, tekrar -%100; köprü restart gerek)
- [x] 95g tarayıcı eklentisi (Chrome/Brave MV3: sağ tık → Nts'e gönder, köprünün /inbox ucuna; extension/ klasörü) (9a1313d; sw v100; köprü restart gerek; cihaz testi sahipte)

KURALLAR (sahip):
- 3 DİL: kullanıcı Arapça + İngilizce + Türkçe yazar; her giriş/gösterim dir="auto", arama üç dilde (Arapça normalleştirme, Türkçe İ/ı) — PLAN 104 notu.
- TELEFON ÖNCE (sahip, 2026-11-21): her arayüz işi telefonda (360/390 px) kusursuz olmadan bitmez; 101'den sonra phone-audit.mjs her işte 0 hata.
- Vanilla JS, derleme yok, arayüz Türkçe. Her arayüz değişikliğinden sonra Playwright ile ekran görüntüsü (masaüstü 1366x768 + telefon
  390x844, açık + koyu), görüntüye bakmadan "bitti" deme, konsol hatası olmasın, `node --check app.js` geçsin. Testlerde hn-tour=1 (lib.mjs yapıyor).
- Sunucu: `curl -s 127.0.0.1:8790` çalışmıyorsa `python3 -m http.server 8790 --bind 127.0.0.1` (arka planda). Köprü http://localhost:8787;
  gerçek köprüyle testte lib.mjs `bridge:true` (gelen kutusu, snapshot, import kuyruğu korunur). Gerçek GitHub/Supabase'e yazma, taklit et.
- Her maddeyi bitirince PLAN.md'de [ ] → [x] (kısa not + tarih), bu dosyada da [x] + commit hash. Kararını veremediğin şeyi en sona biriktir.
- sw.js VERSION'ı her sürümde artır (şu an v32; commit'ten hemen önce tekrar oku).
- COMMIT: sahip istemiyor → commit mesajına "Co-Authored-By: Claude" ve Claude imzası EKLEME. Sadece kendi dosyalarını `git add` et.
  Commit + push için ayrıca izin bekleme (sahip verdi). Push'tan sonra Pages'te yeni sw VERSION'ın açıldığını kontrol et.
- Yeni, tekrar eden bir yöntem öğrenirsen ~/.claude/skills altına yaz.

TOKEN KURALI (sahip): tutumlu ol. Bir oturumda TEK madde (bkz. PARALEL HATLAR en üstte); sonra PLAN.md ve bu dosyayı güncelle (bitenler / kalanlar / tam sıradaki
adım), commit + push, `tools/handoff.sh` çalıştır (yeni kitty penceresinde taze oturum açar) ve dur. Hiç [ ] kalmadıysa handoff yapma,
sahibe tek mesajda Türkçe kısa özet + biriken soruları yaz. Büyük dosyaları (app.js ~3700 satır) baştan sona okuma, grep ile ilgili yere git.

NOT (2026-11-23): 126+127+128'in işi (app.js, style.css, sw v45, PLAN [x]) yanlışlıkla başka bir oturumun commit'ine girdi: 9f10873 (mesajı yalnız PLAN 131 diyor). İş tam ve push'lu; tekrar commit etmeye çalışma (126/127/128 burada [x] yapıldı).

(ESKİ, tek zincir; hatlar PARALEL HATLAR'a uyar) TAM SIRADAKİ ADIM: 126 (taşırken kaçan kart — gerçek hata, önce bu), sonra 127 + 128. Sonra handoff. 102'ye başlanmış, commit'lenmemiş
iş ağaçta duruyor (app.js: AR haritası + growTo(), resim önizlemesi yer tutar ve yumuşakça büyür; style.css'te 114 bloğu 101 bloğunun altına
taşınmış + yabancı LaTeX bloğu): dokunmadan önce `git diff` ile bak, 102'yi yaparken bunun üstüne devam et.

KARAR (sahip, 2026-11-23): ayrı "Sade" ayarı yok — renkli etiket çipleri kalır ama sakinleşir (soluk renk, kartta en çok 2 çip + "+N"); 128 ile birlikte yap.

BİLGİ (2026-11-23, 10. oturum): sahip Locus videosunu (LinkedIn, Pavel Macek) istedi: yt-dlp LinkedIn videosunu doğrudan indiriyor;
konuşma için scratchpad'de venv + faster-whisper (small, int8), ses ffmpeg ile f32le 16 kHz'e çevrilip numpy dizisi olarak verildi (av sürümü
metadata_errors hatası veriyor). Bulgular PLAN U/130. 125: telefonda .composer textarea padding 11px (44 px). sw v44.

BİLGİ (2026-11-22, 9. oturum): 109 bitti (94bf03e, v36). Zoom: Board.zoomAt S.cam null'da çıkar; tekerlek ctrl ile, fare tıkı (deltaMode
ya da |deltaY|≥50) 1,2×, dokunmatik yüzey exp(-d*.01) ±30 sınırlı; düz tekerlek hâlâ kaydırır (sahibe sorulacak: fare tekerleği yakınlaştırsın mı?).
#months'ta pointerdown pts'e girer ama sürükleme/capture yok, .months-grid touch-action pan-y. Board.render sonu artık yalnız `!S.cam` ise fit
(anyVisible kontrolü sadece resize'da). Ctx uzun-basma: 2. parmakta iptal. Konum: setPos posAt/posByAt damgalar, keepPos(m,l,r) mergeItem'da ve
GH.merge'in kirli olmayan yolunda (yerel konum daha yeniyse korunur, GH._repush → Cloud.pull markDirty). Yapıştır/bırak: ownField (dialog,
contenteditable, başka alan) kendi içeriğini alır; save() hata verirse yazı+dosyalar kutuya geri döner; ataç label tabIndex=0 role=button.
Gün çizgisi: plane --dayh (en uzun gün, ≥320), .day-band::before %22 metin rengi, Bugün'de accent. phone-audit.mjs'te #answer null düzeltildi (skill'e kopyalandı).

BİLGİ (2026-11-22, 8. oturum): sahibin 8. geri bildirimi PLAN "T" bölümüne 109–124 olarak yazıldı (07bc8a0). 111 (d426e46, v34): kök
neden Android Chrome otomatik karartması; [data-theme="light"] artık `color-scheme: only light` + index.html'de meta color-scheme. Headless
bunu taklit edemiyor, sahip telefonda doğrulasın. 113 (b5479b7, v35): .mark 44×44 (çubukla aynı), Rail.place ">"yi çubuğun/paletin dikey
ortasına koyar. phone-audit.mjs TASLAĞI skill klasöründe (ilk koşu: pano/liste/galeri/yapılacak'ta small/tight/overlap var; diğer ekranlar
closeAnswer ReferenceError yüzünden ölçülmedi, düzeltildi — yeniden koş). Not: 92b'nin gün arası çizgisi masaüstü pano ekran görüntüsünde
görünüyordu; sahip "hiç görünmüyor" diyor → telefonda ve farklı yakınlıklarda bak. style.css'teki yabancı LaTeX taşıması hâlâ ayrı duruyor.

BİLGİ (2026-11-21, 7. oturum): 103a+92b bitti (0667a1e, v33). 103a: `S.hitsOff` + `hideHits()` (app.js closeAnswer üstünde); setView
değişince ve Back.open (her dialog) çağırır; renderHits hitsOff'ta listeyi kapatır (qchip değil); kutuya yazınca/focus olunca geri açılır.
CSS: `body:has(#hits.hits:not([hidden]):not(.closing)) .peek` opacity 0. 92b: `Board.fitHeads()` (cull sonunda): başlık genişliği bir kez
ölçülür (hd._lf tam, hd._ls kısa), ekrandaki bant genişliğine göre '' / .sh (kısa) / .vert (bandın üstünde sideways-lr); .col-head'te artık
max-width/ellipsis yok; .far'da bantlar kalır; `.day-band::before` gün arası çizgi, genişlik max(1px, 1px*--ik). Pano k<~.14'te ay ızgarası
(başlık yok). style.css'teki yabancı LaTeX taşıması hâlâ commit'lenmemiş (update-index yöntemiyle ayrı stage'lendi).

BİLGİ (2026-11-21, 6. oturum): 94a+94b (be289c8, v31) ve 94c+94d (9164705, v32) bitti. setView: değişince `document.startViewTransition(render)`
(html.vt sınıfı sadece geçişte #main'e view-transition-name verir; render bir kare SONRA olur, S.view hemen değişir); destek yoksa eski .vin.
`Morph` (app.js, Back'in üstünde): openItem'da Morph.open(dlg,id) tıklanan karttan WAAPI ile büyütür, dlg'ye .morph (CSS giriş animasyonunu
kapatır, kapanınca kalkar); Morph.close(dlg) karta küçülüp sonra dlg.close() — ×, Esc (oncancel preventDefault), dışına tık, Sil bunu
kullanır; Android geri tuşu hâlâ direkt kapatır (102'de bakılabilir). `reduced()` ve `haptic(ms)` (yalnız pointer:coarse) yardımcıları
orada; kaydet 8, görev bitti 12, sil (removeItem) 14 ms. Ink.move: getCoalescedEvents + rAF (d.raf, d.r). thumbIO: .loading iskelet +
img.decode() sonra ekler. Başka bir oturum PLAN/NEXT_SESSION'a 104–106 maddelerini yazıyor: düzenlemeden önce dosyayı yeniden oku.

BİLGİ (2026-11-21, 5. oturum): 98/97/88c bitti (sw v30). 98: Board.fit telefonda (innerWidth<900) k=1, en yeni gün sağda (içerik
ekrana sığarsa en az .7); #penBtn (.m-only, Ink.init #boardTools'un başına ekler) paleti açar + kalemi seçer, #pal artık her genişlikte
yalnız S.palOpen ile görünür; telefonda #tidyBtn gizli. 97: `Wipe` (app.js, `const Tour` üstünde), #wipe dialog; rmFiles storage
klasörlerini /object/list ile özyinelemeli gezip DELETE {prefixes} ile siler; sonra Cloud.signOut, DB.clear(items/files/kv), caches,
localStorage (hn-tour/hn-ai geri yazılır), location.replace. 88c: Rail.place railOff+palet açıksa #railTab.ear + --rt-left (16+palet
genişliği-1). style.css'teki yabancı LaTeX taşıması hâlâ commit'lenmemiş: kendi bloğunu `git show HEAD:style.css > x; sed -n '/^\/\* <blok>/,$p'
style.css >> x; git update-index --cacheinfo 100644,$(git hash-object -w x),style.css` ile ayrı stage'le.

BİLGİ (2026-11-21, 4. oturum): 88b/91/92 bitti (sw v27). Rail.place() "<" konumunu ölçüp --rt-top ile ">" sekmesini aynı yere koyar;
rail-off'ta palet kalır (translateX -54px). 91'in kökü: render() vkey'i `S.items` KİMLİĞİNE bakar → kayıtları yerinde değiştirip
render() çağırmak hiçbir şey çizmez; değiştirdikten sonra `S.items = [...S.items]`. 92: Board.layout gün başına .day-band (içinde
.col-head), Board.IN=12 iç aralık, GAP=76; fmtDay0d(key) tarih+gün adı. style.css'te başka oturuma ait commit'lenmemiş LaTeX bloğu
taşıması duruyor (dokunma; git update-index ile kendi parçanı ayrı commit'le).

BİLGİ (2026-11-21, 3. oturum): 90 bitti (006f87f): Ink.render() artık id ile fark alıyor (path._k anahtarı), Ink.end() canlı path'i
kalıcıya çeviriyor; yumuşak geçişler: .vin (setView), .pop.closing (Pop.close), .bcard.born / .bcard.gone. 87 bitti (3df1968, sw v24):
aiName()/aiTo()/aiOf() (app.js, `const Tour` üstünde) — yeni arayüz metninde "Claude" yazma, bunları kullan; AiPick.maybe() turdan önce
bir kez (localStorage hn-ai); köprüde conf.ai + POST /ai-conf, /health → {ai, have}; runClaude() seçime göre runOther('codex'|'gemini')
çağırır (şema prompt'a, JSON cevaptan kesilir). lib.mjs artık hn-ai=1 koyar (`aipick:true` ile kapatılır). Paralel bir oturum da
aynı ağaçta commit atıyor (LaTeX, logo): `git add` öncesi `git diff` ile yabancı parça var mı bak.

BİLGİ (2026-11-21, 2. oturum): 86/88/89 bitti (8b1e792, sw v19). Panoda `body.board-view .dock` artık `--bt-w` (araç genişliği, JS ölçer)
ile sola kayıp daralıyor. setView aynı görünüme tekrar geçince kamerayı silmiyor. Logo inline SVG (.mk-b/.mk-l/.mk-d), sol çubuk kapanınca
palet CSS ile (body.rail-off .board-tools.pal) gizleniyor, #railTab'da yalnız ">" var.

BİLGİ (önceki oturum, 2026-11-21): 56–65, 74, 76–85 bitti (son commit 572b090, sw v18). Çakışma ölçümü: 1440 px altında kutu ile
`#boardTools` çakışıyor (1366: 9 px, 1280: 52 px, 1100: 142 px). Logo = beyaz zeminli mesaj balonu (icons/icon.svg, sahip B'yi seçti);
.mark şu an `background: #fff url(icons/icon.svg)` 24 px (style.css ~57). Çizim: Ink.end() canlı path'i siliyor + upsert → Ink.render()
`#ink` innerHTML'ini baştan kuruyor (titremenin sebebi). Sol çubuk: Rail.fold / #railTab (index.html), palet #pal.
Sahibe sorulacaklar (bekliyor): 25 link-preview yayını ve nts_heavy SQL (Supabase CLI yok, sahibin girişi lazım), gerçek "GitHub'ı bağla"
(uygulamada sahip yapar), gerçek WhatsApp sohbet zip'i (Downloads'taki zip sohbet değil, sadece 3 foto), 3/3a/3b + 74 gerçek cihaz testi (sahip yapacak).
- [x] 99a galeri gerçekten görsel (masonry, yazısız) + 130c galeri↔pano aynı kartlarla uçarak geçiş (78bdc99; sw v102)
- [ ] 152 kopya yok (sahip: "bütün linkler veya fotolar zipten tekrarlanmasın"): aynı link/foto/dosya bir kez; içe aktarmada ve uygulamada; PLAN 152
- [x] 150 HATA (sahip, design/feedback-28.png): "Finential" panosu BOMBOŞ, "bütün notları göstermiyor" → önce sebebi kanıtla, düzelt; PLAN 150 (df9076c; sw v103)
- [~A] 151 HATA (sahip, design/feedback-27.png): sol üstteki logo/pano seçici kutusu çirkin (simge üstte, ad altta, ⌄ en altta, uzun ad kesik) → tek satır; PLAN 151
- [ ] 131-1 klasör kartı = D Dosya, CAM (şeffaf) ama aynı renkler (sahip seçti, design/folders-choices-3.json) + feedback-25 sorunları; uygulamada varsayılan yap; PLAN 131-1
- [ ] 149 zaman çizgisi (sağdaki yıl şeridi, design/feedback-26.png): daha yumuşak + ay çentikleri ("-") ve ay adları + önizleme kutusu (.peek) zaman çizgisinin üstüne binmesin (design/feedback-29.png); PLAN 149
- [ ] 99b Takvim görünümü
- [ ] 100 Yapılacaklar basit liste kalır + isteğe bağlı küçük "Yapılıyor" etiketi (3 sütun YOK, sahip küçülttü; PLAN 100)
- [ ] 107a "Gelen kutusunu temizle" kaydırmalı kartlar (telefon önce)
- [ ] 107e doğal dille hatırlatma + bildirimde ertele düğmeleri
- [ ] 107k erişilebilirlik ayarları (yazı boyutu, yüksek kontrast, büyük dokunma, hareketi azalt)
- [ ] 107b Android ana ekran widget'ı (96'dan sonra)
- [ ] 107m ilk açılışta örnek verilerle dene + tek tıkla sil
- [ ] 107f kendiliğinden toparlama (birleştir?, kırık link, arşiv önerisi)
- [ ] 107d başka uygulamalardan taşıma (Keep, Apple Notes, Notion, Evernote, Telegram)
- [ ] 107l parmak izi/yüzle kilit (WebAuthn) + kayıt gizleme
- [ ] 107j dışa aktarma: pano PDF + Obsidian/Markdown eşitleme
- [ ] 107c e-posta ile gönderme + Telegram botu — sahibe servis/anahtar gerekecek, en sona sor
