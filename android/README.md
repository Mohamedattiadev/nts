# Nts'e kaydet (Android yardımcı uygulaması, 96)

Telefonda herhangi bir uygulamada metni seç → ⋮ (ya da seçim menüsü) → **Nts'e kaydet**. Yardımcı, metni
`https://mohamedattiadev.github.io/nts/?do=new&text=…` linkiyle açar; telefonda kurulu Nts (PWA) bu linki yakalar,
kaydeder ve "Kaydedildi · Aç" der. Ayrı bir uygulama simgesi yoktur, veriler Nts'in kendi verisidir (ayrı kopya yok).

Neden PWA'nın kendisi değil: Android seçim menüsüne yalnız `ACTION_PROCESS_TEXT` alan yerel uygulamalar girebilir.
Paylaş → Nts yolu (share_target) zaten PWA'nın kendisinde var.

**Ana ekran widget'ı (107b):** ana ekranda boş yere uzun bas → Widget'lar → Nts. Düğmeler: Yeni not · Sesli not (kayıt hemen başlar) ·
Ara · Yapılacaklar; logo Nts'i açar. Hepsi aynı Nts linklerini açar (`?do=new`, `?do=voice`, `?do=find`, `?view=todo`).

Kurulum: `nts-kaydet.apk`'yı telefona at, aç, "bilinmeyen kaynak" iznini ver, kur. Nts önce PWA olarak kurulu olmalı
(Chrome → Ana ekrana ekle / Yükle); değilse link Chrome'da açılır ve yine kaydeder.

Derleme (Gradle yok, kütüphane yok, ~25 KB): `android/build.sh` → `android/out/nts-kaydet.apk`.
İmza anahtarı repoda DEĞİL: `~/.nts-android/nts.jks` + `~/.nts-android/keystore.properties`. Anahtar kaybolursa
güncelleme üstüne kurulamaz (kaldır-kur gerekir) — yedekle.
