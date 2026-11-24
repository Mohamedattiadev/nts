# Nts'e gönder (Chrome / Brave eklentisi, 95g)

Sağ tık → **Sayfayı / Linki / Seçili yazıyı / Resmi Nts'e gönder**. Araç çubuğu simgesi ya da **Alt+Shift+S** bu sayfayı (seçili yazı varsa onunla) gönderir.
Gönderilen şey bu bilgisayardaki Nts köprüsünün gelen kutusuna (`POST /inbox`, `hn` komutuyla aynı) gider; açık Nts birkaç saniye içinde alır, kaynak süzgeci **Tarayıcı**.

## Kurulum

1. `chrome://extensions` (Brave: `brave://extensions`) → sağ üstte **Geliştirici modu** aç.
2. **Paketlenmemiş öğe yükle** → bu `extension/` klasörünü seç.
3. Açılan ayarlarda port + anahtar: terminalde `hn --token` yazar. **Kaydet ve dene** → "Bağlandı ✓".
4. İstersen **Resimleri dosya olarak gönder** (tüm sitelere erişim izni ister); izin yoksa başka siteden gelen resim link olarak gider.

Köprü kapalıysa simgede kırmızı **!** çıkar, üstüne gelince nedeni yazar.
