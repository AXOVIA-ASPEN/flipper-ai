import unittest
from marketplace_integrations.mercari_normalizer import MercariListingNormalizer, StandardCondition

class TestMercariListingNormalizer(unittest.TestCase):
    def setUp(self):
        self.normalizer = MercariListingNormalizer()

    def test_condition_normalization(self):
        test_cases = [
            ('Brand New', StandardCondition.NEW),
            ('New with tags', StandardCondition.NEW),
            ('Like New', StandardCondition.LIKE_NEW),
            ('Very Good Condition', StandardCondition.VERY_GOOD),
            ('Good', StandardCondition.GOOD),
            ('Acceptable', StandardCondition.ACCEPTABLE),
            ('Poor, Has Flaws', StandardCondition.POOR)
        ]
        
        for input_condition, expected_condition in test_cases:
            with self.subTest(input_condition=input_condition):
                normalized = self.normalizer.normalize_condition(input_condition)
                self.assertEqual(normalized, expected_condition)

    def test_seller_info_extraction(self):
        sample_listing = {
            'seller_username': 'test_seller',
            'seller_rating': 4.8,
            'seller_total_sales': 250,
            'seller_join_date': '2023-01-15'
        }
        
        seller_info = self.normalizer.extract_seller_info(sample_listing)
        
        self.assertEqual(seller_info, {
            'seller_name': 'test_seller',
            'seller_rating': 4.8,
            'total_sales': 250,
            'joined_date': '2023-01-15'
        })

    def test_complete_listing_normalization(self):
        sample_listing = {
            'id': 'mercari_123456',
            'title': 'Nike Air Max Running Shoes - Like New',
            'description': 'Gently used Nike Air Max in excellent condition',
            'price': 79.99,
            'image_urls': ['https://example.com/shoe1.jpg', 'https://example.com/shoe2.jpg'],
            'condition': 'Like New',
            'seller_username': 'shoe_seller',
            'seller_rating': 4.9,
            'seller_total_sales': 500,
            'seller_join_date': '2022-06-01',
            'category': 'Shoes',
            'shipping_cost': 5.99,
            'shipping_method': 'USPS Priority',
            'listing_url': 'https://mercari.com/listing/123456'
        }
        
        normalized_listing = self.normalizer.normalize_listing(sample_listing)
        
        expected_keys = [
            'platform', 'platform_id', 'title', 'description', 'price', 
            'images', 'condition', 'seller_info', 'category', 'brand',
            'shipping_cost', 'shipping_method', 'url'
        ]
        
        for key in expected_keys:
            self.assertIn(key, normalized_listing)
        
        self.assertEqual(normalized_listing['platform'], 'Mercari')
        self.assertEqual(normalized_listing['platform_id'], 'mercari_123456')
        self.assertEqual(normalized_listing['price'], 79.99)
        self.assertEqual(normalized_listing['condition'], 'LIKE_NEW')
        self.assertEqual(normalized_listing['brand'], 'Nike')

if __name__ == '__main__':
    unittest.main()