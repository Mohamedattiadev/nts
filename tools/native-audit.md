# 141 · Native denetimi (2026-11-23, B hattı)

Uygulamayı "yerli uygulama gibi mi?" diye taradım. ✓ = zaten vardı, ★ = bu turda yapıldı, → = başka maddede.

| Konu | Durum | Not |
|---|---|---|
| Sistem fontu / ikonlar | ✓ | Inter → system-ui yedeği, tek çizgi ikon seti (I) |
| Basılma geri bildirimi | ★ | .icon-btn/.chip/.btn vardı; menü satırları, ayar satırları, seçim çubuğu, araçlar, sol çubuk, renk noktaları da basınca küçülür (`scale`, reduced-motion'da yok) |
| Arayüz yazısı seçilemez | ★ | düğme, çubuk, menü, kart/satır: uzun basınca kopyala menüsü çıkmaz; yazı alanları, kutular, düzenlenen notlar seçilebilir kalır |
| iOS uzun bas önizlemesi | ★ | `-webkit-touch-callout: none` aynı yerlerde |
| Sağ tık menüsü her yerde | ✓ | liste/galeri/pano aynı Ctx menüsü |
| Menü klavyeyle | ★ | Menü tuşu / Shift+F10 açar, ↑↓ Home End Tab gezer, Esc karta döner, role=menu |
| Liste/galeri klavyeyle | ★ | satır ve kutucuklar Tab ile odaklanır, Enter/Boşluk açar, ↑↓ (galeride ←→ ve üst/alt kutucuk) gezer |
| Kısayollar + "?" listesi | ★ | "?" tuşu ya da Ayarlar → "Klavye kısayolları" (masaüstü): Genel, Arama, Pano (araç harfleri TOOLS'tan), Pencereler |
| Ctrl+Z/Y, Delete, Ctrl+A, Esc | ✓ | 139/140/Ink |
| İpucu (tooltip) | ★ | her `title` tek tip ipucu olur: 450 ms gecikme, ardışık düğmede anında, klavye odağında da, basınca/kaydırınca/yazınca kaybolur; sol çubuğun kendi ipucu kalır. Animasyonlu imza sürümü → 142-0 |
| Telefonda alt sayfa | ★ | tutamak çizgisi; üstten (ya da içerik en üstteyken her yerden) aşağı çek → üçte birden fazla ya da hızlı fiske = kapanır (Esc/geri tuşuyla aynı yol, not kaydedilir), azı yerine yaylanır; titreşim |
| Titreşim | ★ | uzun basma (vardı) + yıldızlama, görev bitirme, sayfayı kapatma |
| Kaydırma çubukları | ★ | her yerde ince, tema renginde |
| Odak halkası | ✓ | :focus-visible accent; satırlarda içe |
| Kaydırma fiziği / overscroll | ✓ | html overscroll-behavior-y: none, pencerelerde contain |
| Seçim rengi, color-scheme, theme-color | ✓ | ::selection accent-soft, 111 |
| PWA kısayolları | ★ | "Ara" kısayolu eklendi (sc-find.png, ?do=find → Ara modu + kutu) |
| PWA başlatma | ★ | `launch_handler: navigate-existing` (kısayol/paylaşım açık pencereyi kullanır), `lang: tr`, `categories` |
| Paylaşım hedefi | ✓ | share_target (dosya dahil) |
| Dosya sürükle-bırak | ✓ | kutuya; kart sürükleme gölgesi/animasyonu → 142-0/142 |
| Kaydır-sil/arşivle | → 107a | "Gelen kutusunu temizle" kaydırmalı kartlar |
| Pencere geçişleri | ✓ | 102 Morph (karttan açılır, karta döner) |
| Badging / window-controls-overlay | → 94e+94f | |
| Komut paleti Ctrl+K | → 95e | |
