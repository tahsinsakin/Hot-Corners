# Hot Corners

macOS'teki Etkin Köşeler (Hot Corners) özelliğini Chrome'a getiren eklenti. Fareyi sayfanın dört köşesinden birine götürünce o köşeye atanmış görev çalışır.

![Hot Corners](store/promo-marquee-1400x560.png)

## Özellikler

- **Sekme görünümü:** Tüm pencerelerdeki sekmeler önizlemeleriyle ızgara halinde gösterilir; yazarak arama, ok tuşları ve Enter ile geçiş yapılır.
- **20 civarı görev:** son kullanılan sekme, sonraki/önceki sekme, yeni sekme, sekmeyi kapat, kapatılanı geri aç, çoğalt, sabitle, sesi kapat, geri, ileri, yenile, en üste/alta kaydır, yeni pencere, küçült, tam ekran, adres aç.
- **Tuş şartı:** Bir köşe yalnızca Shift, Ctrl veya Alt basılıyken çalışacak şekilde ayarlanabilir.
- **Hızlı kontrol:** `Ctrl+Shift+H` ile tamamen kapat/aç; 15 dk, 1 saat veya Chrome kapanana kadar duraklat; site bazında kapat. Araç çubuğu simgesi durumu gösterir (gri + `OFF`, `II`, `–`).
- **Ayarlar:** bekleme süresi, köşe alanı, köşede ışık efekti, tam ekran videoda devre dışı kalma.
- Açık ve koyu tema, Türkçe arayüz.

## Klasörler

| Klasör | İçerik |
|---|---|
| `extension/` | Eklentinin kendisi (Manifest V3). Mağazaya yüklenen zip bu klasörden oluşur. |
| `store/` | Mağaza görselleri, mağaza metinleri (`MAGAZA-METINLERI.md`) ve gizlilik politikası sayfası. |
| `tools/` | İkon/görsel üretici, paketleme betiği ve mantık testleri. |

## Geliştirme

**Yerelde denemek:** `chrome://extensions` → Geliştirici modu → **Paketlenmemiş öğe yükle** → `extension` klasörünü seç. Kod değişince eklenti kartındaki yenile simgesine bas, açık sekmeleri de yenile.

**Testler** (Node 18+, ek paket gerekmez; Chrome API'leri sahte nesnelerle taklit edilir):

```bash
node tools/test-corners.js      # köşe algılama, tuş şartı, bekleme süresi, tam ekran
node tools/test-background.js   # aç/kapat, duraklatma, simge durumu, sağ tık menüsü
```

**İkonları ve mağaza görsellerini yeniden çizmek** (Python 3, Pillow, NumPy):

```bash
python3 tools/draw_icons.py
```

**Mağaza paketi:**

```bash
./tools/package.sh   # dist/hot-corners-<sürüm>.zip
```

Her yayında `extension/manifest.json` içindeki `version` değerini artır.

## Mimari kısaca

- `content.js` her sayfada çalışır: imlecin köşede olup olmadığını izler, sekme görünümünü (Shadow DOM içinde) çizer, bildirimleri gösterir.
- `background.js` sekme/pencere işlemlerini yapar, önizleme görüntülerini alır, kısayolları, duraklatmayı, simge durumunu ve sağ tık menüsünü yönetir.
- `shared.js` görev listesi, varsayılan ayarlar ve ayar okuma/yazma yardımcıları.
- `popup.*` araç çubuğundaki hızlı ayar penceresi, `options.*` tam ayarlar sayfası, `ui.*` ikisinin ortak parçaları.
- Ayarlar `chrome.storage.sync`, duraklatma durumu `chrome.storage.local`, önizlemeler `chrome.storage.session` içinde tutulur. Eklenti hiçbir sunucuya veri göndermez.
