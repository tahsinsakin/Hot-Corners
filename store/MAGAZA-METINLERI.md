# Hot Corners — Chrome Web Mağazası bilgileri

Geliştirici panelindeki (chrome.google.com/webstore/devconsole) alanlara aşağıdakileri kopyala.

---

## Mağaza girişi (Store listing)

**Ad:** Hot Corners

**Özet (manifest'ten gelir, 132 karakter sınırı):**
macOS'teki gibi etkin köşeler: fareyi sayfanın köşesine götür, atadığın görev çalışsın.

**Kategori:** Verimlilik araçları (Productivity → Tools / Workflow & Planning)

**Dil:** Türkçe

### Ayrıntılı açıklama (Türkçe)

Mac'teki Etkin Köşeler (Hot Corners) özelliğini Chrome'a getirir. Fareyi sayfanın dört köşesinden birine götür, o köşeye atadığın görev anında çalışsın.

Ne yapabilirsin?
• Sekme görünümü: Tüm pencerelerdeki sekmeleri önizlemeleriyle ızgara halinde gör, yazarak ara, tek tıkla geç (Mission Control gibi).
• Sekmeler: Son kullanılan sekmeye dön, sonraki/önceki sekme, yeni sekme, sekmeyi kapat, kapatılanı geri aç, çoğalt, sabitle, sesini kapat.
• Sayfa: Geri, ileri, yenile, en üste veya en alta kaydır.
• Pencere: Yeni pencere, küçült, tam ekran.
• Özel: Bir köşeye istediğin adresi bağla.

Mac'teki gibi tuş şartı: Bir köşeyi yalnızca Shift, Ctrl veya Alt basılıyken çalışacak şekilde ayarlayabilirsin. Böylece fare yanlışlıkla köşeye kaçtığında hiçbir şey olmaz.

Ayrıca:
• Bekleme süresi ve köşe alanı ayarlanabilir.
• Tam ekran videolarda otomatik olarak devre dışı kalır.
• İstediğin sitelerde tek tıkla kapatılabilir.
• Tek tuşla tamamen kapat / aç (varsayılan Ctrl+Shift+H); kapalıyken simge griye döner.
• 15 dakika, 1 saat veya Chrome kapanana kadar duraklat; süre bitince kendiliğinden açılır.
• Simgeye sağ tıklayarak hızlı menü: kapat, duraklat, bu sitede kapat.
• Sekme görünümü için klavye kısayolu (varsayılan Ctrl+Shift+Space).
• Açık ve koyu tema.

Gizlilik: Hiçbir veri toplanmaz, hiçbir sunucuya gönderilmez. Ayarların Chrome hesabında, sekme önizlemeleri yalnızca bu oturum boyunca tarayıcının belleğinde tutulur.

Not: Chrome'un kendi sayfalarında (yeni sekme, ayarlar, Web Mağazası) eklentiler çalışamaz. Köşeler, sekme çubuğunun altındaki sayfa alanının köşeleridir. F11 ile tam ekrandayken gerçek ekran köşeleri gibi çalışır.

### Detailed description (English, optional second language)

Brings macOS Hot Corners to Chrome. Move the pointer into one of the four corners of the page and the action you assigned to that corner runs.

• Tab overview: see every tab of every window as a grid with previews, type to search, click to switch (like Mission Control).
• Tabs: last used tab, next/previous, new, close, reopen closed, duplicate, pin, mute.
• Page: back, forward, reload, scroll to top/bottom.
• Window: new window, minimise, fullscreen.
• Custom: open any address from a corner.

Like on a Mac, a corner can require Shift, Ctrl or Alt to be held, so accidental moves do nothing. Turn everything off with one shortcut (Ctrl+Shift+H), pause for 15 minutes or an hour from the toolbar icon, adjustable delay and corner size, off in fullscreen video, per-site off switch, keyboard shortcut for the overview, light and dark theme.

Privacy: no data is collected or sent anywhere.

### Görseller
- Mağaza simgesi 128×128: `icons/icon128.png` (eklenti klasöründe)
- Küçük tanıtım kutusu 440×280: `promo-small-440x280.png`
- Büyük tanıtım (marquee) 1400×560: `promo-marquee-1400x560.png` (isteğe bağlı)
- **Ekran görüntüleri 1280×800 (en az 1, en çok 5): kendin almalısın.** Öneri:
  1. Sekme görünümü açıkken birkaç sekmeli bir pencere.
  2. Ayarlar sayfası (köşeler bölümü).
  3. Araç çubuğundaki hızlı ayar penceresi açıkken bir sayfa.
  Pencereyi 1280×800 boyutuna getirip Windows'ta Win+Shift+S ile alabilirsin.

---

## Gizlilik sekmesi (Privacy practices)

**Tek amaç (Single purpose):**
Kullanıcının sayfa köşelerine fareyle gittiğinde, kendi seçtiği tarayıcı görevlerini (sekme değiştirme, sekme görünümü, sayfa ve pencere işlemleri) çalıştırmak.

**İzin gerekçeleri (Permission justification):**

| İzin | Gerekçe |
|---|---|
| `storage` | Kullanıcının köşe ayarlarını ve devre dışı site listesini kaydetmek; sekme önizlemelerini oturum boyunca bellekte tutmak. |
| `tabs` | Sekme görünümünde sekmelerin başlık ve adreslerini göstermek; sekmeler arasında geçmek, sekme açmak, kapatmak, sabitlemek ve sesini kapatmak. |
| `sessions` | "Kapatılan sekmeyi geri aç" görevini çalıştırmak. |
| `scripting` | Eklenti kurulduğunda zaten açık olan sekmelerde köşe algılamayı sayfa yenilenmeden başlatmak. |
| `favicon` | Sekme görünümünde ve ayarlarda sitelerin simgelerini göstermek. |
| `alarms` | Kullanıcı eklentiyi 15 dakika veya 1 saat duraklattığında, süre bitince otomatik olarak yeniden açmak. |
| `contextMenus` | Araç çubuğu simgesine sağ tıklayınca açılan menüyü (kapat/aç, duraklat, bu sitede kapat) göstermek. |
| Ana makine izni `<all_urls>` | Köşe algılama her sitede çalışmalı; bu yüzden içerik betiği tüm sayfalara eklenir. Sekme görünümündeki önizlemeler için görünür sekmenin ekran görüntüsü (captureVisibleTab) de bu izni gerektirir. Görüntüler küçültülüp yalnızca tarayıcı oturumunda tutulur, hiçbir yere gönderilmez. |

**Uzak kod (Remote code):** Hayır, uzak kod kullanılmıyor. Tüm kod pakete dahil.

**Veri kullanımı (Data usage):** Hiçbir kutuyu işaretleme (veri toplanmıyor). Alttaki üç onayı işaretle:
- Kullanıcı verilerini onaylanmış kullanım durumları dışında üçüncü taraflara satmıyorum/aktarmıyorum.
- Kullanıcı verilerini öğenin tek amacıyla ilgisiz amaçlarla kullanmıyorum/aktarmıyorum.
- Kullanıcı verilerini kredi değerliliği belirlemek veya borç verme amacıyla kullanmıyorum/aktarmıyorum.

**Gizlilik politikası URL'si:** Gizlilik politikası sayfasının bağlantısı (ayrıca verildi).

---

## Gönderim notları
- Yüklenecek dosya: `hot-corners-1.2.0.zip` (manifest.json zip'in kök dizininde).
- İlk yayın incelemesi `<all_urls>` izni yüzünden genellikle birkaç gün sürer; gerekçe metni bunun içindir.
- Mağazada "Hot Corners" adında başka eklentiler de var. Ad zorunlu olarak benzersiz olmak zorunda değil, ama ayırt edici bir ad (ör. "Hot Corners — Köşe Görevleri") aramada öne çıkmana yardım eder.
- Her güncellemede manifest.json içindeki `version` değerini artır.
