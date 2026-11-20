# ⚡ Hızlı Not

WhatsApp'ta kendine attığın link, not ve dosyaları tek yerde topla. Uygulama tarihe göre dizer, Claude ile düzenler ve sorularını cevaplar.

**Uygulama:** https://mohamedattiadev.github.io/hizli-note/

- **Kaydet:** yapıştır, yaz ya da dosya bırak. Android'de herhangi bir uygulamadan **Paylaş → Hızlı Not**. Bilgisayarda `hn`.
- **Görünümler:** Liste (gün gün), Board (sonsuz whiteboard, bağlantılar ok olarak), Galeri, Konular.
- **Arama:** anında çalışır, Türkçe karakter ve küçük yazım hatalarını tolere eder. `?` ile başlarsan Claude'a sorar.
- **AI:** yeni kayıtlara başlık, özet ve etiket koyar, bağlantılı olanları bulur. Senin Claude aboneliğinle çalışır (bilgisayardaki `claude` CLI üzerinden).
- **WhatsApp içe aktarma:** Sohbet → ⋮ → Diğer → Sohbeti dışa aktar → Medya dahil. Çıkan .zip'i Menü → WhatsApp ile içeri al. Tekrar içeri alınca çift kayıt oluşmaz.
- **Senkron:** private bir GitHub reposuna otomatik yedeklenir (`items/YYYY-MM.json`, `files/YYYY-MM/…`). Resimler yüklemeden önce küçültülür. Repo dolunca `-2`, `-3`… reposuna geçer.

## Bilgisayar kurulumu (bir kez)
```bash
bash bridge/install.sh            # köprü servisi, hn komutu, dosya yöneticisine "Hızlı Not'a gönder"
sudo tailscale serve --bg --https=8788 http://127.0.0.1:8787   # telefondan erişim (sadece senin cihazların)
```
Hyprland kısayolu (panodakini gönderir): `bind = SUPER SHIFT, N, exec, hn --clip`

```bash
hn "bir not ya da https://link"   # metin
hn rapor.pdf foto.jpg            # dosyalar
hn --clip                        # pano (metin, resim ya da kopyalanmış dosyalar)
```
PC'den gönderilenler köprüde bekler. Uygulama açık olan ilk cihaz (telefon ya da PC) onları alır, senkron da diğerine taşır.

## Telefonda
1. Siteyi Chrome'da aç → ⋮ → **Uygulamayı yükle**.
2. Menü → Claude köprüsü: adres `https://<pc>.<tailnet>.ts.net:8788`, token `~/.config/hizli-note/bridge.json` içinde. Telefonda Tailscale açık olmalı.
3. Menü → GitHub senkronu: repo `Mohamedattiadev/hizli-note-data`. Token: fine-grained, sadece bu repo, Contents: Read and write.
