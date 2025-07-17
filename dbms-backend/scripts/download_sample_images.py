import logging
import os

import requests

logger = logging.getLogger(__name__)


# Sample image URLs
sample_images = {
    "smartphone.jpg": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80",
    "laptop.jpg": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&q=80",
    "earbuds.jpg": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80",
    "smartwatch.jpg": "https://images.unsplash.com/photo-1544117519-31a4b719223d?w=500&q=80",
    "console.jpg": "https://images.unsplash.com/photo-1486401899868-0e435ed85128?w=500&q=80",
}


def download_images():
    # Create products directory if it doesn't exist
    products_dir = os.path.join("uploads", "products")
    os.makedirs(products_dir, exist_ok=True)

    logger.info("Downloading product images...")

    for filename, url in sample_images.items():
        try:
            filepath = os.path.join(products_dir, filename)

            # Skip if file already exists
            if os.path.exists(filepath):
                logger.info(f"Image already exists: {filename}")
                continue

            logger.info(f"Downloading {filename}...")
            response = requests.get(url)
            response.raise_for_status()

            with open(filepath, "wb") as f:
                f.write(response.content)
            logger.info(f"Successfully downloaded {filename}")

        except Exception as e:
            logger.info(f"Error downloading {filename}: {str(e)}")


if __name__ == "__main__":
    download_images()
    logger.info("Image download process completed!")
