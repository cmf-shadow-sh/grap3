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
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });

        const html = await response.text();
        
        // Sayfa içindeki tüm gizli veya açık video linklerini yakala
        const urlRegex = /(https?:\/\/[^"'\s<>]+?\.(?:mp4|webm|m4v)[^"'\s<>]*)/gi;
        const allUrls = html.match(urlRegex) || [];
        
        // Benzersiz linkleri filtrele
        const uniqueUrls = [...new Set(allUrls)];
        
        // Kaliteleri depolayacağımız bir nesne
        const formats = {};

        // Yakalanan linklerin içindeki kalite ibarelerini analiz et
        uniqueUrls.forEach(videoUrl => {
            const lowerUrl = videoUrl.toLowerCase();
            
            if (lowerUrl.includes('1080') || lowerUrl.includes('1080p') || lowerUrl.includes('hd1080')) {
                formats['1080p (Full HD)'] = videoUrl;
            } else if (lowerUrl.includes('720') || lowerUrl.includes('720p') || lowerUrl.includes('hd720')) {
                formats['720p (HD)'] = videoUrl;
            } else if (lowerUrl.includes('480') || lowerUrl.includes('480p')) {
                formats['480p (Orta)'] = videoUrl;
            } else if (lowerUrl.includes('360') || lowerUrl.includes('360p')) {
                formats['360p (Düşük)'] = videoUrl;
            } else if (lowerUrl.includes('240') || lowerUrl.includes('240p')) {
                formats['240p (Çok Düşük)'] = videoUrl;
            }
        });

        // Eğer yukarıdaki etiketlerden hiçbirini bulamadıysa ama elimizde bir video linki varsa, 
        // bunu "Varsayılan Kalite" olarak en başa ekle
        if (uniqueUrls.length > 0 && Object.keys(formats).length === 0) {
            formats['Varsayılan Standart Kalite'] = uniqueUrls[0];
        }

        // Eğer hiçbir şey bulunamadıysa HTML5 etiketini kontrol et
        if (Object.keys(formats).length === 0) {
            const videoTagRegex = /<video[^>]*src=["']([^"']+)["']/i;
            const matchTag = html.match(videoTagRegex);
            if (matchTag && matchTag[1]) {
                let streamUrl = matchTag[1];
                if (streamUrl.startsWith('//')) streamUrl = 'https:' + streamUrl;
                formats['Varsayılan Standart Kalite'] = streamUrl;
            }
        }

        if (Object.keys(formats).length === 0) {
            return res.status(404).json({ error: 'Sitede seçilebilir video kalitesi bulunamadı.' });
        }

        // Ön yüze kaliteleri nesne olarak fırlatıyoruz
        return res.status(200).json({ formats });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Kalite Destekli Motor ${PORT} portunda aktif.`);
});
