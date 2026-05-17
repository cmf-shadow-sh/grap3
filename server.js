const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/api/grab', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL eksik.' });

    try {
        // Gerçek bir tarayıcı gibi istek atıp bot engellerini bypass ediyoruz
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });

        const html = await response.text();

        // 1. Alternatif: HTML içinde doğrudan sızdırılmış temiz .mp4 linklerini avla
        const mp4Regex = /(https?:\/\/[^"'\s<>]+?\.(?:mp4|webm|m4v)[^"'\s<>]*)/i;
        const matchMp4 = html.match(mp4Regex);
        if (matchMp4 && matchMp4[1]) {
            return res.status(200).json({ videoUrl: matchMp4[1] });
        }

        // 2. Alternatif: Standart HTML5 video etiketlerini kontrol et
        const videoTagRegex = /<video[^>]*src=["']([^"']+)["']/i;
        const matchTag = html.match(videoTagRegex);
        if (matchTag && matchTag[1]) {
            let streamUrl = matchTag[1];
            if (streamUrl.startsWith('//')) streamUrl = 'https:' + streamUrl;
            return res.status(200).json({ videoUrl: streamUrl });
        }

        // 3. Alternatif: Büyük oynatıcıların (setVideoUrlHigh vb.) fonksiyon parametrelerini ayıkla
        const jsParamRegex = /setVideoUrl(?:High|Low)?\s*\(\s*['"]([^'"]+)['"]\s*\)/i;
        const matchJs = html.match(jsParamRegex);
        if (matchJs && matchJs[1]) {
            return res.status(200).json({ videoUrl: matchJs[1] });
        }

        return res.status(404).json({ error: 'Bu sitenin video kaynağı doğrudan tespit edilemedi.' });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başarıyla başlatıldı.`);
});
