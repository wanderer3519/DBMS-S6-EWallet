const fs = require('fs');
const path = require('path');
const https = require('https');

const categories = [
    'electronics',
    'clothing',
    'books',
    'home',
    'sports',
    'default'
];

const imageUrls = {
    electronics: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500&h=500&fit=crop',
    clothing: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&h=500&fit=crop',
    books: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&h=500&fit=crop',
    home: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=500&h=500&fit=crop',
    sports: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=500&h=500&fit=crop',
    default: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop'
};

const downloadImage = (url, category) => {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${response.statusCode}`));
                return;
            }

            const filePath = path.join(__dirname, '../public/images/products', `${category}.jpg`);
            const fileStream = fs.createWriteStream(filePath);
            
            response.pipe(fileStream);
            
            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Downloaded ${category}.jpg`);
                resolve();
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
};

const downloadAllImages = async () => {
    const imagesDir = path.join(__dirname, '../public/images/products');
    
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    for (const category of categories) {
        try {
            await downloadImage(imageUrls[category], category);
        } catch (err) {
            console.error(`Error downloading ${category}.jpg:`, err);
        }
    }
};

downloadAllImages(); 