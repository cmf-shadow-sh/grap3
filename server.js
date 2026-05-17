const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/api/grab', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL eksik.' });

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        const html = await response.text();
        
        // Sayfadaki tırnak işaretleri içindeki tüm video linklerini (mp4, webm vb.) yakala
        const urlRegex = /https?:\/\/[^"'\s<>]+?\.(?:mp4|webm|m4v)[^"'\s<> ]*/gi;
        const allUrls = html.match(urlRegex) || [];
        
        // Benzersiz linkleri temizle
        const uniqueUrls = [...new Set(allUrls)];
        const formats = {};

        // Tüm linkleri tek tek dönerek kalitelerine göre grupla (Aynı anda hepsini yakalar)
        uniqueUrls.forEach(videoUrl => {
            const lowerUrl = videoUrl.toLowerCase();
            
            if (lowerUrl.includes('1080') || lowerUrl.includes('1080p') || lowerUrl.includes('hd1080')) {
                if (!formats['1080p (Full HD)']) formats['1080p (Full HD)'] = videoUrl;
            } 
            if (lowerUrl.includes('720') || lowerUrl.includes('720p') || lowerUrl.includes('hd720')) {
                if (!formats['720p (HD)']) formats['720p (HD)'] = videoUrl;
            } 
            if (lowerUrl.includes('480') || lowerUrl.includes('480p')) {
                if (!formats['480p (Orta Kalite)']) formats['480p (Orta Kalite)'] = videoUrl;
            } 
            if (lowerUrl.includes('360') || lowerUrl.includes('360p')) {
                if (!formats['360p (Standart)']) formats['360p (Standart)'] = videoUrl;
            } 
            if (lowerUrl.includes('240') || lowerUrl.includes('240p')) {
                if (!formats['240p (Mobil Düşük)']) formats['240p (Mobil Düşük)'] = videoUrl;
            }
        });

        // Eğer hiçbir kalite ibaresi bulunamadıysa ama elimizde ham video linkleri varsa listele
        if (Object.keys(formats).length === 0 && uniqueUrls.length > 0) {
            uniqueUrls.slice(0, 3).forEach((link, index) => {
                formats[`Otomatik Kaynak Link - Seçenek ${index + 1}`] = link;
            });
        }

        // Klasik HTML5 video etiketini de yedek olarak tara
        if (Object.keys(formats).length === 0) {
            const videoTagRegex = /<video[^>]*src=["']([^"']+)["']/gi;
            let match;
            let tagIndex = 1;
            while ((match = videoTagRegex.exec(html)) !== null) {
                let streamUrl = match[1];
                if (streamUrl.startsWith('//')) streamUrl = 'https:' + streamUrl;
                formats[`HTML5 Video Kaynağı ${tagIndex}`] = streamUrl;
                tagIndex++;
            }
        }

        if (Object.keys(formats).length === 0) {
            return res.status(404).json({ error: 'Sitedeki video kaliteleri veya linkleri toplu halde ayrıştırılamadı.' });
        }

        // Ön yüze tüm kaliteleri bir paket halinde gönderiyoruz
        return res.status(200).json({ formats });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Toplu Kalite Listeleme Motoru Aktif.`);
});
